"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { usePatients, Patient, extractToothSchedulesFromTableData } from '../../context/PatientContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import DentitionChart, { parseEffectiveAge, extractDiagnosedTeeth } from '../../components/DentitionChart';
import ToothSchedulerModal from '../../components/ToothSchedulerModal';
import { ToothIcon } from '../../components/ToothIcon';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar,
  Users,
  Phone,
  AlertCircle,
  CheckCircle2,
  FolderKanban,
  Plus,
  Stethoscope,
  Activity,
  ChevronRight,
  CreditCard,
  Check,
  X,
  ArrowLeft,
  Clock,
  Sparkles,
  ShieldCheck,
  Search
} from 'lucide-react';

/**
 * Automatically format patient name to Title Case as typed
 * e.g., "mumin muhammed ghareeb" -> "Mumin Muhammed Ghareeb"
 */
export const formatPatientName = (input: string): string => {
  if (!input) return '';
  return input.replace(/(?:^|[\s\-'])\p{L}/gu, m => m.toUpperCase());
};

/**
 * On blur cleanup, handles all-caps words (e.g. "MUMIN" -> "Mumin")
 */
export const normalizeFullNameOnBlur = (input: string): string => {
  if (!input) return '';
  return input
    .split(/(\s+)/)
    .map(segment => {
      if (/^\p{Lu}{2,}$/u.test(segment)) {
        return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
      }
      return segment.replace(/(?:^|[\s\-'])\p{L}/gu, m => m.toUpperCase());
    })
    .join('');
};

function PatientFormContent() {
  const { addPatient, addVisit, editAppointment, patients, isLoading, error } = usePatients();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isStaffAuth, isReceptionAuth } = useAuth();

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [successBanner, setSuccessBanner] = useState<{
    name: string;
    clinicId?: string;
    id: string;
  } | null>(null);

  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  const [schedulerInitialToothId, setSchedulerInitialToothId] = useState<string | undefined>(undefined);
  const [localError, setLocalError] = useState<string | null>(null);

  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  // Role flags
  const isStaff = Boolean(isStaffAuth);
  const isReception = Boolean(isReceptionAuth);

  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    hospitalFileNumber: '',
    mobileNumber: '',
    sex: '',
    ageOfDiagnosis: '',
    diagnosis: '',
    treatment: '',
    currentTreatment: '',
    history: '',
    pastMedicalHistory: '',
    drugHistory: '',
    pastSurgicalHistory: '',
    examination: '',
    note: '',
    totalCost: '',
    amountPaid: '',
    remainingBalance: '',
    tableData: '',
    followUpDate: '',
  });

  // Chart-driven diagnosed teeth extracted from dentition chart JSON
  const diagnosedTeeth = useMemo(() => {
    return extractDiagnosedTeeth(formData.tableData);
  }, [formData.tableData]);

  // General non-tooth diagnoses and customized tooth treatments
  const [generalDiagnoses, setGeneralDiagnoses] = useState<string[]>([]);
  const [customDiagnosisInput, setCustomDiagnosisInput] = useState('');
  const [toothTreatments, setToothTreatments] = useState<Record<string, string>>({});
  const [generalTreatmentNotes, setGeneralTreatmentNotes] = useState('');

  // Synchronize compiled diagnosis string into formData
  useEffect(() => {
    const parts: string[] = [];
    diagnosedTeeth.forEach(t => {
      let desc = `${t.name} (Tooth #${t.toothId}, ${t.palmer}): ${t.conditionLabel}`;
      if (t.surfaces && t.surfaces.length > 0) desc += ` [Surfaces: ${t.surfaces.join('')}]`;
      if (t.notes) desc += ` (${t.notes})`;
      parts.push(desc);
    });
    generalDiagnoses.forEach(g => {
      if (g.trim()) parts.push(g.trim());
    });
    const compiled = parts.join('; ');
    setFormData(prev => (prev.diagnosis === compiled ? prev : { ...prev, diagnosis: compiled }));
  }, [diagnosedTeeth, generalDiagnoses]);

  // Synchronize compiled treatment string into formData
  useEffect(() => {
    const parts: string[] = [];
    diagnosedTeeth.forEach(t => {
      const plan = toothTreatments[t.toothId]?.trim();
      if (plan) {
        parts.push(`Tooth #${t.toothId} (${t.palmer} ${t.name}): ${plan}`);
      }
    });
    if (generalTreatmentNotes.trim()) {
      parts.push(`General / Overall: ${generalTreatmentNotes.trim()}`);
    }
    const compiled = parts.join('; ');
    setFormData(prev => (prev.treatment === compiled ? prev : { ...prev, treatment: compiled }));
  }, [diagnosedTeeth, toothTreatments, generalTreatmentNotes]);

  // Pre-fill from query parameters (appointments workflow)
  useEffect(() => {
    const name = searchParams.get('name');
    const phone = searchParams.get('phone');
    const notes = searchParams.get('notes');
    const apptId = searchParams.get('appointmentId');

    if (apptId) {
      setAppointmentId(apptId);
    }
    if (name || phone || notes) {
      setFormData(prev => ({
        ...prev,
        name: name || prev.name,
        mobileNumber: phone || prev.mobileNumber,
        note: notes || prev.note,
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    const lowerQuery = searchQuery.toLowerCase();
    const results = patients.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) || 
      (p.clinicId && p.clinicId.toLowerCase().includes(lowerQuery)) ||
      (p.mobileNumber && p.mobileNumber.toLowerCase().includes(lowerQuery))
    );
    setSearchResults(results);
  }, [searchQuery, patients]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Dismiss success banner as soon as user types
    if (successBanner) setSuccessBanner(null);

    if (name === 'name') {
      const formatted = formatPatientName(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));
      return;
    }
    if (name === 'totalCost' || name === 'amountPaid' || name === 'remainingBalance') {
      const formatted = value.replace(/[^0-9.]/g, '');
      setFormData(prev => {
        const next = { ...prev, [name]: formatted };
        if (name === 'totalCost' || name === 'amountPaid') {
          const c = parseFloat(name === 'totalCost' ? formatted : prev.totalCost);
          const p = parseFloat(name === 'amountPaid' ? formatted : prev.amountPaid);
          if (!isNaN(c) && !isNaN(p)) {
            const diff = Math.max(0, c - p);
            next.remainingBalance = diff % 1 === 0 ? diff.toString() : diff.toFixed(2);
          } else {
            next.remainingBalance = '';
          }
        }
        return next;
      });
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleResetForNextPatient = () => {
    setFormData({
      name: '',
      dob: '',
      hospitalFileNumber: '',
      mobileNumber: '',
      sex: '',
      ageOfDiagnosis: '',
      diagnosis: '',
      treatment: '',
      currentTreatment: '',
      history: '',
      pastMedicalHistory: '',
      drugHistory: '',
      pastSurgicalHistory: '',
      examination: '',
      note: '',
      totalCost: '',
      amountPaid: '',
      remainingBalance: '',
      tableData: '',
      followUpDate: '',
    });
    setGeneralDiagnoses([]);
    setCustomDiagnosisInput('');
    setToothTreatments({});
    setGeneralTreatmentNotes('');
    setFormSubmitted(false);
    setSelectedPatient(null);
    setMode('new');
    setSearchQuery('');
    setCurrentStep(1);
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reception only has 1 step — always submit immediately
    if (currentStep < 3 && !isReception) {
      setCurrentStep(prev => Math.min(3, prev + 1));
      return;
    }

    setLocalError(null);

    try {
      setFormSubmitted(true);
      
      // Merge per-tooth treatment plans into tableData so they appear in Dental records
      let finalizedTableData = formData.tableData;
      try {
        const parsed = finalizedTableData ? JSON.parse(finalizedTableData) : { type: 'dentition_chart', version: 5, teeth: {} };
        const teeth = parsed.teeth || {};
        Object.entries(toothTreatments).forEach(([tId, plan]) => {
          if (plan && plan.trim()) {
            if (!teeth[tId]) {
              teeth[tId] = { condition: 'caries', surfaces: ['O'], treatment: plan.trim() };
            } else {
              teeth[tId].treatment = plan.trim();
            }
          }
        });
        parsed.teeth = teeth;
        finalizedTableData = JSON.stringify(parsed);
      } catch (tdErr) {
        console.error('Error merging tooth treatments into tableData:', tdErr);
      }

      // General visit title for invoices & records
      const visitTreatmentDesc = generalTreatmentNotes.trim() || 'Dental Consultation & Clinical Services';

      let createdPatient: Patient | null = null;
      if (mode === 'existing' && selectedPatient) {
        const res = await addVisit(selectedPatient.id, {
          ...formData,
          treatment: visitTreatmentDesc,
          tableData: finalizedTableData,
          clinicId: '',
          amountPaid: formData.amountPaid,
          totalCost: formData.totalCost,
          remainingBalance: formData.remainingBalance
        });
        createdPatient = res && (res as any).patient 
          ? (res as any).patient 
          : { ...selectedPatient, ...formData, treatment: visitTreatmentDesc, amountPaid: formData.amountPaid, totalCost: formData.totalCost, remainingBalance: formData.remainingBalance, tableData: finalizedTableData };
      } else {
        const res = await addPatient({
          ...formData,
          treatment: visitTreatmentDesc,
          tableData: finalizedTableData,
          clinicId: '',
          amountPaid: formData.amountPaid,
          totalCost: formData.totalCost,
          remainingBalance: formData.remainingBalance
        });
        createdPatient = res || null;
      }

      // If registered from an appointment, update appointment status to Completed
      if (appointmentId) {
        try {
          await editAppointment(appointmentId, { status: 'Completed' });
        } catch (apptErr) {
          console.error('Failed to complete appointment:', apptErr);
        }
      }

      if (createdPatient) {
        // Show clean success notification
        setSuccessBanner({
          name: createdPatient.name,
          clinicId: createdPatient.clinicId || '',
          id: createdPatient.id,
        });
        // Instantly reset the form so staff/doctor can add new data immediately without any ugly blocking screen!
        handleResetForNextPatient();
      }
    } catch (err) {
      console.error('Error submitting patient data:', err);
      setLocalError('Failed to register patient. Please check your inputs and try again.');
      setFormSubmitted(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const totalSteps = isReception ? 1 : 3;

  return (
    <div className="min-h-screen bg-[#F8FAFB] dark:bg-[#0A0E0F] py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Dental Patient Registration
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              {isReception ? 'Fast patient check-in, phone number, and admission billing' : 'Complete clinical record, 3D dentition chart, and treatment plan'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/dashboard/patients')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-[#141b1e] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-2xs transition-all cursor-pointer"
            >
              <FolderKanban className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Patients Directory</span>
            </button>
          </div>
        </div>

        {/* Clean Instant Success Toast / Banner */}
        <AnimatePresence>
          {successBanner && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              className="p-4 rounded-[22px] bg-gradient-to-r from-teal-500/15 via-emerald-500/10 to-teal-500/15 border border-teal-500/30 text-teal-900 dark:text-teal-100 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#008294] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    <span>Patient &ldquo;{successBanner.name}&rdquo; registered successfully!</span>
                    {successBanner.clinicId && (
                      <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-teal-600/20 text-teal-900 dark:text-teal-200">
                        ID: {successBanner.clinicId}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-teal-700 dark:text-teal-300 mt-0.5">
                    Form has been automatically refreshed. Ready to register the next patient!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/patients?id=${successBanner.id}`)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-[#008294] hover:bg-[#006e7d] shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>View Record</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSuccessBanner(null)}
                  className="p-1.5 rounded-full text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 transition-colors cursor-pointer"
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Local Error Banner */}
        {(localError || error) && (
          <div className="p-4 rounded-[20px] bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{localError || error}</span>
            </div>
            <button
              type="button"
              onClick={() => setLocalError(null)}
              className="text-red-400 hover:text-red-600 dark:hover:text-red-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── MAIN ONBOARDING CARD WRAPPER ── */}
        <div className="rounded-[28px] border-2 border-gray-100 bg-[#F5F5F7] p-2 sm:p-3 shadow-xl dark:border-[#1e2629] dark:bg-[#0c1214]">
          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-3">
            
            {/* LEFT: MULTI-STEP CARD */}
            <div className="flex flex-col rounded-[22px] bg-white p-5 sm:p-7 shadow-xs dark:bg-[#111719]">
              
              {/* Header inside Left Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                    {isReception
                      ? 'Patient Information'
                      : currentStep === 1
                      ? 'Step 1: Personal Details'
                      : currentStep === 2
                      ? 'Step 2: Medical History'
                      : 'Step 3: Dentition Chart & Treatment'}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {isReception
                      ? 'Fill in basic patient details and payment'
                      : currentStep === 1
                      ? 'Enter patient demographic details'
                      : currentStep === 2
                      ? 'Systemic medical background and past dental history'
                      : 'Mark tooth pathologies, surface cavities, and treatment pricing'}
                  </p>
                </div>

                {/* Mode toggle pills (New vs Existing) */}
                {!isReception && (
                  <div className="flex items-center bg-gray-100 dark:bg-[#1a2327] p-1 rounded-full self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('new');
                        setSelectedPatient(null);
                        setSearchQuery('');
                      }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        mode === 'new'
                          ? 'bg-white dark:bg-[#111719] text-[#008294] dark:text-teal-400 shadow-xs'
                          : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                      }`}
                    >
                      New Patient
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('existing')}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        mode === 'existing'
                          ? 'bg-white dark:bg-[#111719] text-[#008294] dark:text-teal-400 shadow-xs'
                          : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                      }`}
                    >
                      Returning Patient
                    </button>
                  </div>
                )}
              </div>

              {/* Dashed divider as inspired by onboarding-setup.tsx */}
              <div className="my-5 border-t-[1.6px] border-dashed border-gray-200 dark:border-gray-800" />

              {/* Existing Patient Search Dropdown */}
              {mode === 'existing' && !selectedPatient && (
                <div className="mb-6 space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Find Existing Patient
                  </label>
                  <div className="relative">
                    <Search className="absolute inset-y-0 left-3.5 my-auto w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search patient by name, mobile, or clinic ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#161d20] text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  {searchQuery && searchResults.length > 0 && (
                    <div className="border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-[#161d20] overflow-hidden shadow-lg divide-y divide-gray-100 dark:divide-gray-800">
                      {searchResults.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPatient(p);
                            setFormData(prev => ({
                              ...prev,
                              name: p.name,
                              dob: p.dob || '',
                              sex: p.sex || '',
                              mobileNumber: p.mobileNumber || '',
                              hospitalFileNumber: p.hospitalFileNumber || '',
                            }));
                            setSearchQuery('');
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs font-bold text-gray-900 dark:text-white">{p.name}</span>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {p.clinicId && <span className="mr-2 font-mono">ID: {p.clinicId}</span>}
                              {p.mobileNumber && <span>📞 {p.mobileNumber}</span>}
                            </div>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between space-y-6">
                
                {/* ── STEP 1: PERSONAL DETAILS ── */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                        Patient Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        onBlur={() => {
                          setFormData(prev => ({
                            ...prev,
                            name: normalizeFullNameOnBlur(prev.name)
                          }));
                        }}
                        required
                        disabled={isLoading || formSubmitted}
                        placeholder="e.g. Mumin Muhammed Ghareeb"
                        className="h-11 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#141b1e] px-4 text-xs font-semibold text-gray-900 dark:text-white outline-none focus:bg-white dark:focus:bg-[#161d20] focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-gray-400"
                      />
                    </div>

                    {/* Gender pill selector inspired by onboarding-setup.tsx */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                        Gender
                      </label>
                      <div className="flex gap-2">
                        {[
                          { id: 'Male', label: 'Male' },
                          { id: 'Female', label: 'Female' },
                        ].map((opt) => {
                          const active = formData.sex === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, sex: opt.id }))}
                              className={`flex items-center gap-2 rounded-xl border-[1.5px] px-5 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                                active
                                  ? 'border-teal-500/50 bg-teal-500/10 text-teal-700 dark:border-teal-500/60 dark:bg-teal-950/40 dark:text-teal-300 shadow-2xs'
                                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-800 dark:bg-[#141b1e] dark:text-gray-400 dark:hover:border-gray-700'
                              }`}
                            >
                              {active && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />}
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Grid: Age & Mobile Number */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                          Age / Date of Birth
                        </label>
                        <input
                          type="text"
                          name="dob"
                          value={formData.dob}
                          onChange={handleChange}
                          placeholder="e.g. 25, or 1999-04-12"
                          className="h-10 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#141b1e] px-4 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                          Mobile Number
                        </label>
                        <div className="relative">
                          <Phone className="absolute inset-y-0 left-3.5 my-auto w-3.5 h-3.5 text-gray-400" />
                          <input
                            type="text"
                            name="mobileNumber"
                            value={formData.mobileNumber}
                            onChange={handleChange}
                            placeholder="e.g. 07510201840"
                            className="h-10 w-full pl-9 pr-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#141b1e] text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Hospital File Number (Optional) */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                        Hospital File # (Optional)
                      </label>
                      <input
                        type="text"
                        name="hospitalFileNumber"
                        value={formData.hospitalFileNumber}
                        onChange={handleChange}
                        placeholder="e.g. HF-8821"
                        className="h-10 w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#141b1e] px-4 text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    {/* Reception Only: Direct Payment Fields on Step 1 */}
                    {isReception && (
                      <div className="p-4 rounded-2xl bg-teal-500/5 dark:bg-teal-950/20 border border-teal-500/20 space-y-3 pt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                            Admission Payment (USD)
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Total Cost</label>
                            <input
                              type="text"
                              name="totalCost"
                              value={formData.totalCost}
                              onChange={handleChange}
                              placeholder="0.00"
                              className="h-10 w-full px-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111719] text-xs font-mono font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Amount Paid</label>
                            <input
                              type="text"
                              name="amountPaid"
                              value={formData.amountPaid}
                              onChange={handleChange}
                              placeholder="0.00"
                              className="h-10 w-full px-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111719] text-xs font-mono font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── STEP 2: MEDICAL HISTORY ── */}
                {currentStep === 2 && !isReception && (
                  <div className="space-y-4">
                    {/* Date of Diagnosis / Condition Onset */}
                    <div className="p-3.5 rounded-2xl bg-teal-500/5 dark:bg-teal-950/20 border border-teal-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          <span>Condition Onset Date</span>
                        </label>
                        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">Quick Shortcuts</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <input
                          type="date"
                          name="ageOfDiagnosis"
                          value={formData.ageOfDiagnosis}
                          onChange={handleChange}
                          className="h-9 px-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111719] text-xs font-semibold outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        {[
                          { label: 'Today', days: 0 },
                          { label: '1 Wk Ago', days: -7 },
                          { label: '1 Mo Ago', months: -1 },
                          { label: '6 Mos Ago', months: -6 },
                        ].map((btn, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              const d = new Date();
                              if (btn.days !== undefined) d.setDate(d.getDate() + btn.days);
                              if (btn.months !== undefined) d.setMonth(d.getMonth() + btn.months);
                              setFormData(prev => ({ ...prev, ageOfDiagnosis: d.toISOString().split('T')[0] }));
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-white dark:bg-[#161d20] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-teal-50 hover:text-teal-600 transition-colors cursor-pointer"
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Medical History */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                        Past Medical History & Chronic Illnesses
                      </label>
                      <textarea
                        name="pastMedicalHistory"
                        value={formData.pastMedicalHistory}
                        onChange={handleChange}
                        rows={2}
                        placeholder="e.g. Hypertension, Diabetes, Asthma, Hepatitis, Bleeding disorders..."
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#141b1e] text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    {/* Drug History */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                        Drug History & Known Allergies
                      </label>
                      <textarea
                        name="drugHistory"
                        value={formData.drugHistory}
                        onChange={handleChange}
                        rows={2}
                        placeholder="e.g. Penicillin allergy, Aspirin, Blood thinners, Local anesthetic sensitivity..."
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#141b1e] text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>

                    {/* Surgical History */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                        Past Surgical & Dental History
                      </label>
                      <textarea
                        name="pastSurgicalHistory"
                        value={formData.pastSurgicalHistory}
                        onChange={handleChange}
                        rows={2}
                        placeholder="e.g. Previous tooth extractions, implants, maxillofacial surgery..."
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#141b1e] text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                )}

                {/* ── STEP 3: DENTITION CHART & TREATMENT ── */}
                {currentStep === 3 && !isReception && (
                  <div className="space-y-6">
                    {/* Dentition Chart */}
                    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-2 sm:p-4 bg-gray-50/40 dark:bg-[#141b1e]/50">
                      <DentitionChart
                        value={formData.tableData}
                        onChange={(newChartValue) => {
                          setFormData(prev => ({
                            ...prev,
                            tableData: newChartValue
                          }));
                        }}
                        patientAge={formData.dob}
                        disabled={isLoading || formSubmitted}
                        onScheduleTooth={(tooth) => {
                          const toothId = typeof tooth === 'string' ? tooth : tooth.id;
                          setSchedulerInitialToothId(toothId);
                          setShowSchedulerModal(true);
                        }}
                      />
                    </div>

                    {/* Clinical Diagnoses derived from chart */}
                    <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-[#141b1e] border border-gray-200 dark:border-gray-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          <span>Chart Findings ({diagnosedTeeth.length + generalDiagnoses.length})</span>
                        </label>
                      </div>

                      {diagnosedTeeth.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {diagnosedTeeth.map(t => (
                            <div
                              key={t.toothId}
                              className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-[#161d20] border border-gray-100 dark:border-gray-800"
                            >
                              <span className="w-6 h-6 rounded-lg bg-[#008294] text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                #{t.toothId}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                  {t.name} <span className="text-gray-400 font-mono">({t.palmer})</span>
                                </div>
                                <div className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold">
                                  {t.conditionLabel}{t.surfaces && t.surfaces.length > 0 ? ` · ${t.surfaces.join('')}` : ''}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">
                          Click any tooth in the chart above to mark caries, restorations, RCT, etc.
                        </p>
                      )}

                      {/* General diagnoses / tags */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={customDiagnosisInput}
                          onChange={e => setCustomDiagnosisInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (customDiagnosisInput.trim()) {
                                setGeneralDiagnoses(prev => [...prev, customDiagnosisInput.trim()]);
                                setCustomDiagnosisInput('');
                              }
                            }
                          }}
                          placeholder="Add general finding (e.g. Gingivitis) & press Enter..."
                          className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161d20] text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-teal-500"
                        />
                        {customDiagnosisInput.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              setGeneralDiagnoses(prev => [...prev, customDiagnosisInput.trim()]);
                              setCustomDiagnosisInput('');
                            }}
                            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-[#008294] text-white cursor-pointer"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tooth-specific treatment planner */}
                    {diagnosedTeeth.length > 0 && (
                      <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-[#141b1e] border border-gray-200 dark:border-gray-800 space-y-3">
                        <label className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          <span>Planned Procedure per Diagnosed Tooth</span>
                        </label>
                        <div className="space-y-2">
                          {diagnosedTeeth.map(t => (
                            <div key={t.toothId} className="flex items-center gap-2">
                              <span className="w-7 text-xs font-mono font-bold text-[#008294]">#{t.toothId}</span>
                              <input
                                type="text"
                                value={toothTreatments[t.toothId] || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setToothTreatments(prev => ({ ...prev, [t.toothId]: val }));
                                }}
                                placeholder={`Procedure for tooth #${t.toothId} (${t.conditionLabel})...`}
                                className="flex-1 h-9 px-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161d20] text-xs text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-teal-500"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Billing Suite (USD) */}
                    <div className="p-4 rounded-2xl bg-teal-500/5 dark:bg-teal-950/20 border border-teal-500/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          <span>Treatment Payment (USD $)</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Total Cost</label>
                          <input
                            type="text"
                            name="totalCost"
                            value={formData.totalCost}
                            onChange={handleChange}
                            placeholder="0.00"
                            className="h-10 w-full px-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111719] text-xs font-mono font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">Amount Paid</label>
                          <input
                            type="text"
                            name="amountPaid"
                            value={formData.amountPaid}
                            onChange={handleChange}
                            placeholder="0.00"
                            className="h-10 w-full px-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111719] text-xs font-mono font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Clinical Notes */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                        Additional Clinical & Treatment Notes
                      </label>
                      <textarea
                        name="note"
                        value={formData.note}
                        onChange={handleChange}
                        rows={2}
                        placeholder="e.g. Advised oral hygiene instructions, prescribed amoxicillin 500mg TDS, recall in 6 months..."
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#141b1e] text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                )}

                {/* Footer Navigation Bar inspired by onboarding-setup.tsx */}
                <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
                  
                  {/* Step counter & pills */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      STEP {currentStep} / {totalSteps}
                    </span>
                    <div className="ml-2 flex gap-1">
                      {Array.from({ length: totalSteps }).map((_, i) => (
                        <span
                          key={i}
                          className={`h-4 w-1.5 rounded-full transition-colors ${
                            i + 1 <= currentStep ? 'bg-[#008294]' : 'bg-gray-200 dark:bg-gray-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {currentStep > 1 && (
                      <button
                        type="button"
                        onClick={prevStep}
                        className="h-10 px-4 rounded-full border border-gray-200 dark:border-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer flex items-center gap-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back</span>
                      </button>
                    )}

                    {currentStep < totalSteps ? (
                      <motion.button
                        key="continue-btn"
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={nextStep}
                        className="h-10 px-6 rounded-full bg-[#008294] hover:bg-[#006e7d] text-white text-xs font-semibold shadow-md shadow-teal-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Continue</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </motion.button>
                    ) : (
                      <motion.button
                        key="submit-btn"
                        type="submit"
                        disabled={isLoading || formSubmitted || !formData.name.trim()}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="h-10 px-7 rounded-full bg-[#008294] hover:bg-[#006e7d] text-white text-xs font-bold shadow-md shadow-teal-500/25 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Saving Patient...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Register Patient</span>
                          </>
                        )}
                      </motion.button>
                    )}
                  </div>
                </div>

              </form>
            </div>

            {/* RIGHT: LIVE CLINICAL PREVIEW CARD */}
            <div className="flex flex-col rounded-[22px] bg-gradient-to-br from-teal-500/10 via-white to-gray-50 dark:from-[#111719] dark:via-[#131b1e] dark:to-[#0f1416] p-5 sm:p-6 border border-teal-500/20 dark:border-teal-500/20 shadow-xs justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    Live Record Preview
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-300">
                    {mode === 'existing' && selectedPatient ? selectedPatient.clinicId : 'AUTO ID'}
                  </span>
                </div>

                {/* Avatar & Patient Name */}
                <div className="mt-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#008294] to-[#0d9488] text-white font-extrabold text-2xl flex items-center justify-center shadow-lg shadow-teal-500/25 ring-4 ring-white dark:ring-[#141b1e]">
                    {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <h3 className="mt-3 text-base font-bold text-gray-900 dark:text-white">
                    {formData.name || 'Patient Name'}
                  </h3>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap justify-center text-xs text-gray-500 dark:text-gray-400">
                    {formData.sex && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] font-semibold">
                        {formData.sex}
                      </span>
                    )}
                    {formData.dob && (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] font-semibold">
                        Age: {formData.dob}
                      </span>
                    )}
                  </div>
                  {formData.mobileNumber && (
                    <p className="mt-1.5 text-xs text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      <span>{formData.mobileNumber}</span>
                    </p>
                  )}
                </div>

                {/* Quick Snapshot cards */}
                <div className="mt-6 space-y-2.5">
                  {/* Financial snapshot */}
                  <div className="p-3 rounded-xl bg-white dark:bg-[#161d20] border border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-teal-600" /> Payment
                    </span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      {formData.totalCost ? `$${Number(formData.totalCost).toLocaleString()}` : '$0'}
                      {formData.amountPaid ? ` (Paid $${Number(formData.amountPaid).toLocaleString()})` : ''}
                    </span>
                  </div>

                  {/* Dental findings snapshot */}
                  <div className="p-3 rounded-xl bg-white dark:bg-[#161d20] border border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
                      <ToothIcon className="w-3.5 h-3.5 text-teal-600" /> Marked Teeth
                    </span>
                    <span className="font-bold text-[#008294] dark:text-teal-400">
                      {diagnosedTeeth.length} {diagnosedTeeth.length === 1 ? 'tooth' : 'teeth'}
                    </span>
                  </div>

                  {/* Medical Condition Snapshot */}
                  {formData.pastMedicalHistory && (
                    <div className="p-3 rounded-xl bg-white dark:bg-[#161d20] border border-gray-100 dark:border-gray-800 text-xs">
                      <span className="text-gray-400 text-[10px] uppercase font-bold block mb-0.5">Medical History</span>
                      <p className="text-gray-700 dark:text-gray-300 text-[11px] line-clamp-2">
                        {formData.pastMedicalHistory}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Neom Assurance Badge */}
              <div className="mt-6 pt-4 border-t border-teal-500/20 text-center">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-teal-700 dark:text-teal-400">
                  <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Neom Dental System • Instant Sync</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ── TOOTH PROCEDURE SCHEDULER MODAL ── */}
        {showSchedulerModal && (
          <ToothSchedulerModal
            isOpen={showSchedulerModal}
            onClose={() => setShowSchedulerModal(false)}
            patient={(selectedPatient || {
              id: 'temp-preview',
              clinicId: 'NEW',
              name: formData.name || 'New Patient',
              dob: formData.dob,
              sex: formData.sex,
              mobileNumber: formData.mobileNumber,
              tableData: formData.tableData,
              totalCost: formData.totalCost,
              amountPaid: formData.amountPaid,
              remainingBalance: formData.remainingBalance,
              createdAt: new Date().toISOString()
            }) as any}
            initialToothId={schedulerInitialToothId}
            onScheduled={(newSch) => {
              try {
                const currentTableData = formData.tableData ? JSON.parse(formData.tableData) : {};
                const existing = currentTableData.scheduledProcedures || [];
                setFormData(prev => ({
                  ...prev,
                  tableData: JSON.stringify({
                    ...currentTableData,
                    scheduledProcedures: [...existing, newSch]
                  })
                }));
              } catch (e) {
                console.error(e);
              }
            }}
          />
        )}

      </div>
    </div>
  );
}

export default function PatientForm() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFB] dark:bg-[#0A0E0F]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-600"></div>
      </div>
    }>
      <PatientFormContent />
    </Suspense>
  );
}