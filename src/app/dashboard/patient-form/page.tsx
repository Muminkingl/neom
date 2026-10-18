"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { usePatients, Patient, Visit, extractToothSchedulesFromTableData } from '../../context/PatientContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import DentitionChart, { parseEffectiveAge, extractDiagnosedTeeth, CONDITION_CONFIG, SingleToothDentalCard } from '../../components/DentitionChart';
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
  Search,
  Pencil
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
  const { addPatient, addVisit, editPatient, editVisit, editAppointment, patients, getPatientVisits, isLoading, error } = usePatients();
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

  // Returning patient specific states
  const [showNewChart, setShowNewChart] = useState(false);
  const [patientVisits, setPatientVisits] = useState<Visit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [editedVisitFinances, setEditedVisitFinances] = useState<Record<string, { cost: string; paid: string }>>({});

  // Fetch visit history when returning patient is selected
  useEffect(() => {
    setEditingVisitId(null);
    setEditedVisitFinances({});
    if (mode === 'existing' && selectedPatient?.id) {
      setLoadingVisits(true);
      getPatientVisits(selectedPatient.id)
        .then(v => setPatientVisits(v || []))
        .catch(() => setPatientVisits([]))
        .finally(() => setLoadingVisits(false));
    } else {
      setPatientVisits([]);
    }
  }, [mode, selectedPatient, getPatientVisits]);

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

  // Historical teeth previously charted for returning patient
  const prevDiagnosedTeeth = useMemo(() => {
    if (!selectedPatient?.tableData) return [];
    return extractDiagnosedTeeth(selectedPatient.tableData);
  }, [selectedPatient]);

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
    setShowNewChart(false);
    setPatientVisits([]);
    setEditingVisitId(null);
    setEditedVisitFinances({});
    setFormSubmitted(false);
    setSelectedPatient(null);
    setMode('new');
    setSearchQuery('');
    setCurrentStep(1);
    setLocalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // In new patient mode, only submit on final step
    if (mode === 'new' && currentStep < 3 && !isReception) {
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
        // 1. Save any edited past visits to database
        if (Object.keys(editedVisitFinances).length > 0) {
          for (const [vId, fin] of Object.entries(editedVisitFinances)) {
            const vCostNum = Number(fin.cost) || 0;
            const vPaidNum = Number(fin.paid) || 0;
            const vBalNum = Math.max(0, vCostNum - vPaidNum);

            if (vId === 'admission') {
              try {
                await editPatient(selectedPatient.id, {
                  totalCost: vCostNum,
                  amountPaid: vPaidNum,
                  remainingBalance: vBalNum,
                });
              } catch (e) {
                console.error('Error updating admission record:', e);
              }
            } else {
              try {
                await editVisit(vId, {
                  amount_paid: vPaidNum,
                  totalCost: vCostNum,
                  remainingBalance: vBalNum,
                });
              } catch (e) {
                console.error(`Error updating visit ${vId}:`, e);
              }
            }
          }
        }

        // 2. Calculate updated cumulative financial totals incorporating any edits
        let baseHistoricalCost = 0;
        let baseHistoricalPaid = 0;

        if (patientVisits.length > 0) {
          patientVisits.forEach(v => {
            let vTable: any = {};
            try { if (v.table_data) vTable = JSON.parse(v.table_data); } catch {}
            const origCost = Number(v.total_cost ?? vTable.totalCost ?? (v as any).totalCost) || 0;
            const origPaid = Number(v.amount_paid ?? vTable.amountPaid ?? (v as any).amountPaid) || 0;
            const cost = editedVisitFinances[v.id]?.cost !== undefined ? (Number(editedVisitFinances[v.id].cost) || 0) : origCost;
            const paid = editedVisitFinances[v.id]?.paid !== undefined ? (Number(editedVisitFinances[v.id].paid) || 0) : origPaid;
            baseHistoricalCost += cost;
            baseHistoricalPaid += paid;
          });
        } else {
          const origCost = Number(selectedPatient.totalCost) || 0;
          const origPaid = Number(selectedPatient.amountPaid) || 0;
          baseHistoricalCost = editedVisitFinances['admission']?.cost !== undefined ? (Number(editedVisitFinances['admission'].cost) || 0) : origCost;
          baseHistoricalPaid = editedVisitFinances['admission']?.paid !== undefined ? (Number(editedVisitFinances['admission'].paid) || 0) : origPaid;
        }

        const newCost = Number(formData.totalCost) || 0;
        const newPaid = Number(formData.amountPaid) || 0;
        const cumulativeCost = baseHistoricalCost + newCost;
        const cumulativePaid = baseHistoricalPaid + newPaid;
        const cumulativeBalance = Math.max(0, cumulativeCost - cumulativePaid);

        const res = await addVisit(selectedPatient.id, {
          ...formData,
          treatment: visitTreatmentDesc,
          tableData: finalizedTableData,
          clinicId: selectedPatient.clinicId || '',
          amountPaid: cumulativePaid,
          totalCost: cumulativeCost,
          remainingBalance: cumulativeBalance
        });
        createdPatient = res && (res as any).patient 
          ? (res as any).patient 
          : { ...selectedPatient, ...formData, treatment: visitTreatmentDesc, amountPaid: cumulativePaid, totalCost: cumulativeCost, remainingBalance: cumulativeBalance, tableData: finalizedTableData };
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
                    {mode === 'existing'
                      ? 'Returning Patient Visit'
                      : isReception
                      ? 'Patient Information'
                      : currentStep === 1
                      ? 'Step 1: Personal Details'
                      : currentStep === 2
                      ? 'Step 2: Medical History'
                      : 'Step 3: Dentition Chart & Treatment'}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {mode === 'existing'
                      ? 'Select existing patient, review documented teeth history, and record new procedures & payments'
                      : isReception
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

              {/* Form Body */}
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between space-y-6">
                
                {/* ══════════════════════════════════════════════════════════════════
                    MODE: RETURNING PATIENT (STREAMLINED VISIT WORKFLOW)
                   ══════════════════════════════════════════════════════════════════ */}
                {mode === 'existing' ? (
                  <div className="space-y-6">
                    {/* 1. If no patient selected yet: Show Search Bar */}
                    {!selectedPatient ? (
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                          <Search className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          <span>Find Existing Patient</span>
                        </label>
                        <div className="relative">
                          <Search className="absolute inset-y-0 left-3.5 my-auto w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search patient by name, mobile, or clinic ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                            className="w-full pl-10 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#161d20] text-xs sm:text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500 shadow-xs"
                          />
                        </div>

                        {/* Search Results list */}
                        {searchQuery && searchResults.length > 0 && (
                          <div className="border border-gray-200 dark:border-gray-800 rounded-2xl bg-white dark:bg-[#161d20] overflow-hidden shadow-xl divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto">
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
                                    pastMedicalHistory: p.pastMedicalHistory || '',
                                    tableData: p.tableData || '',
                                    totalCost: '',
                                    amountPaid: '',
                                    remainingBalance: '',
                                    note: '',
                                  }));
                                  setSearchQuery('');
                                  setShowNewChart(false);
                                }}
                                className="w-full text-left px-4 py-3 hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-colors flex items-center justify-between cursor-pointer"
                              >
                                <div>
                                  <div className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span>{p.name}</span>
                                    {p.clinicId && (
                                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-800 dark:text-teal-300">
                                        ID: {p.clinicId}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-3">
                                    {p.mobileNumber && <span>📞 {p.mobileNumber}</span>}
                                    {p.sex && <span>• {p.sex}</span>}
                                    {p.dob && <span>• Age: {p.dob}</span>}
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </button>
                            ))}
                          </div>
                        )}
                        {searchQuery && searchResults.length === 0 && (
                          <div className="p-6 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-400">
                            No registered patients found matching &ldquo;{searchQuery}&rdquo;.
                          </div>
                        )}
                        {!searchQuery && (
                          <div className="p-8 text-center rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 space-y-1">
                            <Users className="w-8 h-8 text-teal-600/40 mx-auto mb-2" />
                            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Select an existing patient</p>
                            <p className="text-[11px] text-gray-400">Type patient name, phone number, or clinic ID to load their records</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* When patient is selected: */
                      <div className="space-y-6">
                        {/* 1. Patient Profile Summary Card */}
                        <div className="p-4 rounded-2xl bg-teal-500/5 dark:bg-teal-950/20 border border-teal-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-[#008294] text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
                              {selectedPatient.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                                  {selectedPatient.name}
                                </h3>
                                {selectedPatient.clinicId && (
                                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-800 dark:text-teal-300">
                                    ID: {selectedPatient.clinicId}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {selectedPatient.mobileNumber || 'No phone'} • {selectedPatient.sex || 'Patient'} • Age: {selectedPatient.dob || 'N/A'}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPatient(null);
                              setShowNewChart(false);
                            }}
                            className="px-3.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161d20] text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer self-start sm:self-center"
                          >
                            Change Patient
                          </button>
                        </div>

                        {/* 2. Previous Documented Teeth Record */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                              <ToothIcon className="w-4 h-4 text-[#008294]" />
                              <span>Previous Documented Teeth ({prevDiagnosedTeeth.length})</span>
                            </label>
                            <span className="text-[11px] text-gray-400">
                              Documented in previous visits
                            </span>
                          </div>

                          {prevDiagnosedTeeth.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3">
                              {prevDiagnosedTeeth.map(t => (
                                <SingleToothDentalCard
                                  key={t.toothId}
                                  toothId={t.toothId}
                                  condition={t.condition}
                                  surfaces={t.surfaces}
                                  notes={t.notes}
                                  treatment={t.treatment}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 rounded-xl bg-gray-50/60 dark:bg-[#141b1e] border border-dashed border-gray-200 dark:border-gray-800 text-center text-xs text-gray-400">
                              No previous teeth were charted for this patient yet.
                            </div>
                          )}

                          {/* 3. The "New" Option Button to reveal full Dentition Chart */}
                          {!showNewChart ? (
                            <button
                              type="button"
                              onClick={() => setShowNewChart(true)}
                              className="w-full mt-2 py-3.5 px-4 rounded-2xl border-2 border-dashed border-[#008294]/40 hover:border-[#008294] bg-teal-500/5 hover:bg-teal-500/10 text-[#008294] dark:text-teal-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                            >
                              <Plus className="w-4 h-4 text-[#008294]" />
                              <span>+ New — Chart Teeth for Today&apos;s Visit</span>
                            </button>
                          ) : (
                            <div className="space-y-4 pt-2">
                              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-2 sm:p-4 bg-gray-50/40 dark:bg-[#141b1e]/50">
                                <div className="flex items-center justify-between mb-2 px-1">
                                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                    <ToothIcon className="w-4 h-4 text-[#008294]" />
                                    <span>Dentition Charting (Today&apos;s Visit)</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setShowNewChart(false)}
                                    className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-white cursor-pointer"
                                  >
                                    Collapse Chart
                                  </button>
                                </div>
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

                              {/* Planned procedures for newly marked teeth */}
                              {diagnosedTeeth.length > 0 && (
                                <div className="p-4 rounded-2xl bg-gray-50/60 dark:bg-[#141b1e] border border-gray-200 dark:border-gray-800 space-y-3">
                                  <label className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                    <span>Planned Procedure for Today&apos;s Diagnosed Teeth</span>
                                  </label>
                                  <div className="space-y-2">
                                    {diagnosedTeeth.map(t => (
                                      <div key={t.toothId} className="flex items-center gap-2">
                                        <span className="w-7 text-xs font-mono font-bold text-[#008294]">#{t.toothId}</span>
                                        <input
                                          type="text"
                                          value={toothTreatments[t.toothId] || t.treatment || ''}
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
                            </div>
                          )}
                        </div>

                        {/* 4. Treatment Payment (USD $) for Returning Patient */}
                        {(() => {
                          // Dynamic calculation incorporating any edits to past visits in real-time
                          let baseHistoricalCost = 0;
                          let baseHistoricalPaid = 0;

                          if (patientVisits.length > 0) {
                            patientVisits.forEach(v => {
                              let vTable: any = {};
                              try { if (v.table_data) vTable = JSON.parse(v.table_data); } catch {}
                              const origCost = Number(v.total_cost ?? vTable.totalCost ?? (v as any).totalCost) || 0;
                              const origPaid = Number(v.amount_paid ?? vTable.amountPaid ?? (v as any).amountPaid) || 0;
                              const cost = editedVisitFinances[v.id]?.cost !== undefined ? (Number(editedVisitFinances[v.id].cost) || 0) : origCost;
                              const paid = editedVisitFinances[v.id]?.paid !== undefined ? (Number(editedVisitFinances[v.id].paid) || 0) : origPaid;
                              baseHistoricalCost += cost;
                              baseHistoricalPaid += paid;
                            });
                          } else {
                            const origCost = Number(selectedPatient.totalCost) || 0;
                            const origPaid = Number(selectedPatient.amountPaid) || 0;
                            baseHistoricalCost = editedVisitFinances['admission']?.cost !== undefined ? (Number(editedVisitFinances['admission'].cost) || 0) : origCost;
                            baseHistoricalPaid = editedVisitFinances['admission']?.paid !== undefined ? (Number(editedVisitFinances['admission'].paid) || 0) : origPaid;
                          }

                          const historicalTotalBilled = baseHistoricalCost;
                          const historicalAmountPaid = baseHistoricalPaid;
                          const historicalBalanceLeft = Math.max(0, historicalTotalBilled - historicalAmountPaid);

                          const todayCostNum = Number(formData.totalCost) || 0;
                          const todayPaidNum = Number(formData.amountPaid) || 0;
                          const todayBalanceNum = Math.max(0, todayCostNum - todayPaidNum);

                          const updatedTotalBalance = historicalBalanceLeft + todayBalanceNum;

                          return (
                            <div className="p-4 sm:p-5 rounded-2xl bg-teal-500/5 dark:bg-teal-950/20 border border-teal-500/20 space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                  <CreditCard className="w-4 h-4 text-[#008294]" />
                                  <span>Treatment Payment & Balance (USD $)</span>
                                </span>
                                <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-400">
                                  {patientVisits.length} previous visit(s)
                                </span>
                              </div>

                              {/* Historical Ledger Card */}
                              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-white dark:bg-[#161d20] border border-gray-100 dark:border-gray-800 text-center">
                                <div>
                                  <span className="text-[10px] font-bold uppercase text-gray-400 block mb-0.5">Total Billed So Far</span>
                                  <span className="text-xs sm:text-sm font-extrabold font-mono text-gray-900 dark:text-white">
                                    ${historicalTotalBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold uppercase text-gray-400 block mb-0.5">Total Paid So Far</span>
                                  <span className="text-xs sm:text-sm font-extrabold font-mono text-teal-600 dark:text-teal-400">
                                    ${historicalAmountPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold uppercase text-gray-400 block mb-0.5">Previous Balance Due</span>
                                  <span className={`text-xs sm:text-sm font-extrabold font-mono ${historicalBalanceLeft > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500'}`}>
                                    ${historicalBalanceLeft.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>

                              {/* Visits History Breakdown (Paid / Total Money per Visit) */}
                              <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between flex-wrap gap-1">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                                    Visits History Breakdown
                                  </span>
                                  <span className="text-[10px] text-gray-400">
                                    Double-click money or click ✏️ to edit · Saved when you click Save Visit
                                  </span>
                                </div>

                                <div className="space-y-1.5">
                                  {patientVisits.length > 0 ? (
                                    patientVisits.map((v, i) => {
                                      const visitNum = patientVisits.length - i;
                                      let vTable: any = {};
                                      try { if (v.table_data) vTable = JSON.parse(v.table_data); } catch {}
                                      const origCost = Number(v.total_cost ?? vTable.totalCost ?? (v as any).totalCost) || 0;
                                      const origPaid = Number(v.amount_paid ?? vTable.amountPaid ?? (v as any).amountPaid) || 0;
                                      
                                      const isEditing = editingVisitId === v.id;
                                      const curPaidStr = editedVisitFinances[v.id]?.paid ?? String(origPaid);
                                      const curCostStr = editedVisitFinances[v.id]?.cost ?? String(origCost);
                                      const effPaid = editedVisitFinances[v.id]?.paid !== undefined ? (Number(editedVisitFinances[v.id].paid) || 0) : origPaid;
                                      const effCost = editedVisitFinances[v.id]?.cost !== undefined ? (Number(editedVisitFinances[v.id].cost) || 0) : origCost;
                                      const effDue = Math.max(0, effCost - effPaid);
                                      const hasBeenModified = editedVisitFinances[v.id] !== undefined;

                                      const dateStr = v.visited_at 
                                        ? new Date(v.visited_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                        : '';

                                      return (
                                        <div
                                          key={v.id || i}
                                          className="p-3 rounded-xl bg-white dark:bg-[#161d20] border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs"
                                        >
                                          <div className="flex items-center gap-2.5">
                                            <span className="w-6 h-6 rounded-lg bg-teal-500/10 text-[#008294] dark:text-teal-400 font-bold text-xs flex items-center justify-center shrink-0">
                                              {visitNum}
                                            </span>
                                            <div>
                                              <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                <span>Visit {visitNum}</span>
                                                {dateStr && <span className="text-[10px] font-normal text-gray-400">• {dateStr}</span>}
                                                {hasBeenModified && (
                                                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded">
                                                    Edited
                                                  </span>
                                                )}
                                              </div>
                                              {v.treatment && (
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-xs sm:max-w-md">
                                                  {v.treatment}
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          {/* Money Paid / Total Money: Double click to edit */}
                                          {isEditing ? (
                                            <div className="flex items-center gap-1.5 font-mono self-end sm:self-center">
                                              <div className="flex items-center gap-1 bg-teal-500/10 dark:bg-teal-950/30 px-2 py-1 rounded-lg border border-teal-500/30">
                                                <span className="text-[10px] text-teal-800 dark:text-teal-300 font-bold">Paid: $</span>
                                                <input
                                                  type="number"
                                                  step="any"
                                                  value={curPaidStr}
                                                  onChange={e => {
                                                    const val = e.target.value;
                                                    setEditedVisitFinances(prev => ({
                                                      ...prev,
                                                      [v.id]: { cost: prev[v.id]?.cost ?? String(origCost), paid: val }
                                                    }));
                                                  }}
                                                  autoFocus
                                                  className="w-16 h-6 px-1 text-xs font-bold font-mono bg-white dark:bg-[#111719] text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-700 outline-none focus:ring-1 focus:ring-teal-500"
                                                />
                                              </div>
                                              <span className="text-gray-400 font-bold text-xs">/</span>
                                              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                                                <span className="text-[10px] text-gray-600 dark:text-gray-400 font-bold">Total: $</span>
                                                <input
                                                  type="number"
                                                  step="any"
                                                  value={curCostStr}
                                                  onChange={e => {
                                                    const val = e.target.value;
                                                    setEditedVisitFinances(prev => ({
                                                      ...prev,
                                                      [v.id]: { cost: val, paid: prev[v.id]?.paid ?? String(origPaid) }
                                                    }));
                                                  }}
                                                  className="w-16 h-6 px-1 text-xs font-bold font-mono bg-white dark:bg-[#111719] text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-700 outline-none focus:ring-1 focus:ring-teal-500"
                                                />
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => setEditingVisitId(null)}
                                                title="Done editing (saved when you click Save Visit)"
                                                className="px-2 py-1 rounded-lg bg-[#008294] hover:bg-[#006e7d] text-white text-[11px] font-bold shadow-xs transition cursor-pointer flex items-center gap-1"
                                              >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Done</span>
                                              </button>
                                            </div>
                                          ) : (
                                            <div
                                              onDoubleClick={() => {
                                                setEditingVisitId(v.id);
                                                if (!editedVisitFinances[v.id]) {
                                                  setEditedVisitFinances(prev => ({
                                                    ...prev,
                                                    [v.id]: { cost: String(origCost), paid: String(origPaid) }
                                                  }));
                                                }
                                              }}
                                              className="flex items-center gap-2 self-end sm:self-center font-mono cursor-pointer group select-none"
                                              title="Double-click to edit payment (or click the pencil icon)"
                                            >
                                              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 group-hover:underline">
                                                ${effPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </span>
                                              <span className="text-gray-400 text-xs font-bold">/</span>
                                              <span className="text-xs font-bold text-gray-900 dark:text-white group-hover:underline">
                                                ${effCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </span>
                                              {effDue > 0 ? (
                                                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full ml-1">
                                                  Due: ${effDue.toFixed(2)}
                                                </span>
                                              ) : (
                                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full ml-1">
                                                  Paid
                                                </span>
                                              )}
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingVisitId(v.id);
                                                  if (!editedVisitFinances[v.id]) {
                                                    setEditedVisitFinances(prev => ({
                                                      ...prev,
                                                      [v.id]: { cost: String(origCost), paid: String(origPaid) }
                                                    }));
                                                  }
                                                }}
                                                className="opacity-40 group-hover:opacity-100 hover:text-[#008294] text-gray-400 transition p-1 cursor-pointer"
                                                title="Click to edit payment"
                                              >
                                                <Pencil className="w-3 h-3" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    /* Initial visit / admission record */
                                    (() => {
                                      const isEditingAdm = editingVisitId === 'admission';
                                      const admOrigCost = Number(selectedPatient.totalCost) || 0;
                                      const admOrigPaid = Number(selectedPatient.amountPaid) || 0;
                                      const curPaidStr = editedVisitFinances['admission']?.paid ?? String(admOrigPaid);
                                      const curCostStr = editedVisitFinances['admission']?.cost ?? String(admOrigCost);
                                      const effPaid = editedVisitFinances['admission']?.paid !== undefined ? (Number(editedVisitFinances['admission'].paid) || 0) : admOrigPaid;
                                      const effCost = editedVisitFinances['admission']?.cost !== undefined ? (Number(editedVisitFinances['admission'].cost) || 0) : admOrigCost;
                                      const effDue = Math.max(0, effCost - effPaid);
                                      const hasBeenModified = editedVisitFinances['admission'] !== undefined;

                                      return (
                                        <div className="p-3 rounded-xl bg-white dark:bg-[#161d20] border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
                                          <div className="flex items-center gap-2.5">
                                            <span className="w-6 h-6 rounded-lg bg-teal-500/10 text-[#008294] dark:text-teal-400 font-bold text-xs flex items-center justify-center shrink-0">
                                              1
                                            </span>
                                            <div>
                                              <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                <span>Visit 1 (Initial Admission)</span>
                                                {hasBeenModified && (
                                                  <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded">
                                                    Edited
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                {selectedPatient.treatment || 'Initial Consultation & Admission'}
                                              </p>
                                            </div>
                                          </div>

                                          {isEditingAdm ? (
                                            <div className="flex items-center gap-1.5 font-mono self-end sm:self-center">
                                              <div className="flex items-center gap-1 bg-teal-500/10 dark:bg-teal-950/30 px-2 py-1 rounded-lg border border-teal-500/30">
                                                <span className="text-[10px] text-teal-800 dark:text-teal-300 font-bold">Paid: $</span>
                                                <input
                                                  type="number"
                                                  step="any"
                                                  value={curPaidStr}
                                                  onChange={e => {
                                                    const val = e.target.value;
                                                    setEditedVisitFinances(prev => ({
                                                      ...prev,
                                                      admission: { cost: prev.admission?.cost ?? String(admOrigCost), paid: val }
                                                    }));
                                                  }}
                                                  autoFocus
                                                  className="w-16 h-6 px-1 text-xs font-bold font-mono bg-white dark:bg-[#111719] text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-700 outline-none focus:ring-1 focus:ring-teal-500"
                                                />
                                              </div>
                                              <span className="text-gray-400 font-bold text-xs">/</span>
                                              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                                                <span className="text-[10px] text-gray-600 dark:text-gray-400 font-bold">Total: $</span>
                                                <input
                                                  type="number"
                                                  step="any"
                                                  value={curCostStr}
                                                  onChange={e => {
                                                    const val = e.target.value;
                                                    setEditedVisitFinances(prev => ({
                                                      ...prev,
                                                      admission: { cost: val, paid: prev.admission?.paid ?? String(admOrigPaid) }
                                                    }));
                                                  }}
                                                  className="w-16 h-6 px-1 text-xs font-bold font-mono bg-white dark:bg-[#111719] text-gray-900 dark:text-white rounded border border-gray-200 dark:border-gray-700 outline-none focus:ring-1 focus:ring-teal-500"
                                                />
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => setEditingVisitId(null)}
                                                title="Done editing (saved when you click Save Visit)"
                                                className="px-2 py-1 rounded-lg bg-[#008294] hover:bg-[#006e7d] text-white text-[11px] font-bold shadow-xs transition cursor-pointer flex items-center gap-1"
                                              >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Done</span>
                                              </button>
                                            </div>
                                          ) : (
                                            <div
                                              onDoubleClick={() => {
                                                setEditingVisitId('admission');
                                                if (!editedVisitFinances['admission']) {
                                                  setEditedVisitFinances(prev => ({
                                                    ...prev,
                                                    admission: { cost: String(admOrigCost), paid: String(admOrigPaid) }
                                                  }));
                                                }
                                              }}
                                              className="flex items-center gap-2 self-end sm:self-center font-mono cursor-pointer group select-none"
                                              title="Double-click to edit payment (or click the pencil icon)"
                                            >
                                              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 group-hover:underline">
                                                ${effPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </span>
                                              <span className="text-gray-400 text-xs font-bold">/</span>
                                              <span className="text-xs font-bold text-gray-900 dark:text-white group-hover:underline">
                                                ${effCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </span>
                                              {effDue > 0 ? (
                                                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full ml-1">
                                                  Due: ${effDue.toFixed(2)}
                                                </span>
                                              ) : (
                                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full ml-1">
                                                  Paid
                                                </span>
                                              )}
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingVisitId('admission');
                                                  if (!editedVisitFinances['admission']) {
                                                    setEditedVisitFinances(prev => ({
                                                      ...prev,
                                                      admission: { cost: String(admOrigCost), paid: String(admOrigPaid) }
                                                    }));
                                                  }
                                                }}
                                                className="opacity-40 group-hover:opacity-100 hover:text-[#008294] text-gray-400 transition p-1 cursor-pointer"
                                                title="Click to edit payment"
                                              >
                                                <Pencil className="w-3 h-3" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()
                                  )}
                                </div>
                              </div>

                              {/* Today's New Treatment Payment Inputs */}
                              <div className="pt-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 block mb-2">
                                  Today&apos;s Treatment Payment
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                      New Treatment Cost ($)
                                    </label>
                                    <input
                                      type="text"
                                      name="totalCost"
                                      value={formData.totalCost}
                                      onChange={handleChange}
                                      placeholder="0.00"
                                      className="h-10 w-full px-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161d20] text-xs font-mono font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                      Amount Paid Today ($)
                                    </label>
                                    <input
                                      type="text"
                                      name="amountPaid"
                                      value={formData.amountPaid}
                                      onChange={handleChange}
                                      placeholder="0.00"
                                      className="h-10 w-full px-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#161d20] text-xs font-mono font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Real-time Resulting Balance Preview */}
                              {(todayCostNum > 0 || todayPaidNum > 0) && (
                                <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-between text-xs font-semibold">
                                  <span className="text-teal-900 dark:text-teal-200">New Total Outstanding Balance:</span>
                                  <span className="font-mono font-bold text-sm text-[#008294] dark:text-teal-300">
                                    ${updatedTotalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* 5. Clinical notes for today's visit */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                            Visit Clinical Notes & Prescriptions
                          </label>
                          <textarea
                            name="note"
                            value={formData.note}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Enter findings, treatment notes, prescriptions, or follow-up instructions..."
                            className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#141b1e] text-xs text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                          />
                        </div>

                        {/* 6. Dedicated Submit Button for Returning Patient */}
                        <div className="pt-2 flex justify-end">
                          <button
                            type="submit"
                            disabled={isLoading || formSubmitted}
                            className="w-full sm:w-auto px-8 py-3 rounded-full bg-[#008294] hover:bg-[#006e7d] text-white text-xs sm:text-sm font-bold shadow-md shadow-teal-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                          >
                            {isLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Saving Visit Record...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Save Visit & Record Treatment</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ══════════════════════════════════════════════════════════════════
                      MODE: NEW PATIENT (3-STEP WIZARD)
                     ══════════════════════════════════════════════════════════════════ */
                  <>
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
                        <div>
                          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                            <span>Medical History</span>
                          </label>
                          <textarea
                            name="pastMedicalHistory"
                            value={formData.pastMedicalHistory}
                            onChange={handleChange}
                            rows={7}
                            placeholder="Enter patient medical history, chronic conditions, drug allergies, daily medications, and past surgical background..."
                            className="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-[#141b1e] text-xs sm:text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed resize-none shadow-xs"
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

                    {/* Footer Navigation Bar for New Patient Mode */}
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
                  </>
                )}

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