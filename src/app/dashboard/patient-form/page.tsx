"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import { usePatients, Patient, ToothSchedule, extractToothSchedulesFromTableData } from '../../context/PatientContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import DentitionChart, { parseEffectiveAge, ToothRecord, extractDiagnosedTeeth, DiagnosedTooth, CONDITION_CONFIG } from '../../components/DentitionChart';
import ToothSchedulerModal from '../../components/ToothSchedulerModal';
import { ToothIcon } from '../../components/ToothIcon';
import { Badge } from '../../components/ui/badge';
import { generatePatientPDF } from '@/lib/pdfGenerator';
import {
  Calendar,
  Users,
  Zap,
  DollarSign,
  Clock,
  Phone,
  AlertCircle,
  CheckCircle2,
  FileText,
  FolderKanban,
  Plus,
  Trash2,
  Sparkles,
  Stethoscope,
  Activity,
  AlertTriangle,
  ChevronRight,
  CreditCard,
  Check,
  Tag
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
  const [savedPatient, setSavedPatient] = useState<Patient | null>(null);
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  const [schedulerInitialToothId, setSchedulerInitialToothId] = useState<string | undefined>(undefined);
  const [isPrinting, setIsPrinting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [appointmentId, setAppointmentId] = useState<string | null>(null);

  // Role flags
  const isStaff = Boolean(isStaffAuth);
  const isReception = Boolean(isReceptionAuth);

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
    // clinicId is not included here as it's auto-generated
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
    setSearchResults(results.slice(0, 10)); // max 10 results
  }, [searchQuery, patients]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'name') {
      const formattedName = formatPatientName(value);
      setFormData(prev => ({
        ...prev,
        name: formattedName
      }));
      return;
    }
    if (name === 'totalCost' || name === 'amountPaid' || name === 'remainingBalance') {
      const sanitized = value.replace(/[^0-9.]/g, '');
      const parts = sanitized.split('.');
      const formatted = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : sanitized;
      setFormData(prev => {
        const next = { ...prev, [name]: formatted };
        // Auto-calculate remainingBalance when totalCost or amountPaid changes
        // but NOT when the user is directly editing remainingBalance (manual override)
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

  // Reactive age detection for dental dentition chart preview
  const detectedAge = parseEffectiveAge(formData.dob);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reception only has 1 step — always submit immediately
    if (currentStep < 3 && !isReception) {
      nextStep();
      return;
    }

    setLocalError(null);

    try {
      setFormSubmitted(true);
      
      let createdPatient: Patient | null = null;
      if (mode === 'existing' && selectedPatient) {
        const res = await addVisit(selectedPatient.id, { ...formData, clinicId: '', amountPaid: formData.amountPaid, totalCost: formData.totalCost, remainingBalance: formData.remainingBalance });
        createdPatient = res && (res as any).patient 
          ? (res as any).patient 
          : { ...selectedPatient, ...formData, amountPaid: formData.amountPaid, totalCost: formData.totalCost, remainingBalance: formData.remainingBalance, tableData: formData.tableData };
      } else {
        const res = await addPatient({ ...formData, clinicId: '', amountPaid: formData.amountPaid, totalCost: formData.totalCost, remainingBalance: formData.remainingBalance });
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
        setSavedPatient(createdPatient);
      }
    } catch (err) {
      console.error('Error submitting patient data:', err);
      setLocalError('Failed to add patient. Please try again.');
      setFormSubmitted(false);
    }
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
    setSavedPatient(null);
    setSelectedPatient(null);
    setMode('new');
    setSearchQuery('');
    setCurrentStep(1);
    setLocalError(null);
  };

  const formatVisitDateTime = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const markedTeethList = useMemo(() => {
    if (!savedPatient?.tableData) return [];
    try {
      const parsed = JSON.parse(savedPatient.tableData);
      if (parsed && parsed.teeth && typeof parsed.teeth === 'object') {
        const result: Array<{ id: string; condition: string; surfaces?: string[]; notes?: string }> = [];
        Object.entries(parsed.teeth).forEach(([toothId, data]: [string, any]) => {
          if (data && data.condition && data.condition !== 'sound') {
            result.push({
              id: toothId,
              condition: data.condition,
              surfaces: data.surfaces,
              notes: data.notes
            });
          }
        });
        return result;
      }
    } catch {
      // ignore
    }
    return [];
  }, [savedPatient]);

  const savedPatientSchedules = useMemo(() => {
    if (!savedPatient) return [];
    return extractToothSchedulesFromTableData(savedPatient.tableData);
  }, [savedPatient]);

  const [currentStep, setCurrentStep] = useState(1);

  // Functions to navigate steps
  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Dental Patient Registration
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {isReception ? 'Fill in basic dental patient details' : 'Enter patient clinical information and 3D dentition chart'}
          </p>
        </div>

        {savedPatient ? (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-emerald-300 dark:border-emerald-800/80 p-6 sm:p-8 animate-fadeIn mb-10">
            {/* Header / Success Alert */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-3xl shadow-sm">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {savedPatient.name}
                    </h2>
                    <Badge variant="outline" className="font-mono text-xs px-2.5 py-0.5 bg-gray-50 dark:bg-gray-750 border-gray-300 dark:border-gray-600">
                      ID: {savedPatient.clinicId || savedPatient.id.slice(0, 8)}
                    </Badge>
                    {savedPatient.hospitalFileNumber && (
                      <Badge variant="secondary" className="text-xs">
                        File #{savedPatient.hospitalFileNumber}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5 flex-wrap">
                    {savedPatient.sex && <span>{savedPatient.sex} •</span>}
                    {savedPatient.dob && <span>Age: {savedPatient.dob}</span>}
                    {savedPatient.mobileNumber && (
                      <span className="flex items-center gap-1">
                        • <Phone className="w-3.5 h-3.5 text-gray-400" /> {savedPatient.mobileNumber}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Prominent First Visit Box */}
              <div className="w-full md:w-auto bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-3.5 sm:px-5 text-left md:text-right shadow-sm">
                <div className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center md:justify-end gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> FIRST VISIT / ADMISSION
                </div>
                <div className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                  {formatVisitDateTime(savedPatient.createdAt)}
                </div>
                {/* Payment Summary: Total / Paid / Due */}
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {savedPatient.totalCost && Number(savedPatient.totalCost) > 0 && (
                    <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CreditCard className="w-3 h-3 text-gray-500" /> Total: ${Number(savedPatient.totalCost).toLocaleString()}
                    </span>
                  )}
                  {savedPatient.amountPaid && Number(savedPatient.amountPaid) > 0 && (
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-emerald-600" /> Paid: ${Number(savedPatient.amountPaid).toLocaleString()}
                    </span>
                  )}
                  {savedPatient.remainingBalance && Number(savedPatient.remainingBalance) > 0 && (
                    <span className="text-[11px] font-bold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/40 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-700 animate-pulse flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-red-600" /> Due: ${Number(savedPatient.remainingBalance).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Marked Teeth & Findings Summary */}
            <div className="py-6 border-b border-gray-100 dark:border-gray-700 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-2">
                    <ToothIcon className="w-4 h-4 text-amber-500" />
                    <span>Marked Teeth & Findings ({markedTeethList.length})</span>
                  </h3>
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> Click any tooth below to schedule its procedure
                  </span>
                </div>
                {markedTeethList.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {markedTeethList.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setSchedulerInitialToothId(t.id);
                          setShowSchedulerModal(true);
                        }}
                        className="group flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 dark:bg-amber-950/30 dark:hover:bg-amber-900/50 border border-amber-200/80 dark:border-amber-700/50 text-left transition-all hover:scale-[1.03] shadow-xs cursor-pointer"
                      >
                        <span className="w-8 h-8 rounded-lg bg-amber-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                          #{t.id}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-gray-900 dark:text-gray-100 capitalize truncate group-hover:text-amber-700 dark:group-hover:text-amber-300">
                            {t.condition}
                          </div>
                          {t.surfaces && t.surfaces.length > 0 && (
                            <div className="text-[10px] text-gray-500 dark:text-gray-400">
                              Surf: {t.surfaces.join(', ')}
                            </div>
                          )}
                        </div>
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3.5 bg-gray-50 dark:bg-gray-750/50 rounded-xl text-xs text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700">
                    No individual teeth marked with pathology on the dentition chart. You can still schedule any procedure below.
                  </div>
                )}
              </div>

              {/* Scheduled Procedures List */}
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <span>Scheduled Procedures ({savedPatientSchedules.length})</span>
                </h3>
                {savedPatientSchedules.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {savedPatientSchedules.map(sch => (
                      <div
                        key={sch.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                            #{sch.toothId}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-gray-900 dark:text-white">
                              {sch.procedure} {sch.palmer ? `(${sch.palmer})` : ''}
                            </div>
                            <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-indigo-500" /> {sch.targetDate} {sch.targetTime ? `at ${sch.targetTime}` : ''}
                            </div>
                          </div>
                        </div>
                        <Badge variant={sch.status === 'Completed' ? 'success' : 'warning'} className="text-[10px]">
                          {sch.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-xl text-xs text-gray-500 dark:text-gray-400 border border-dashed border-indigo-200 dark:border-indigo-800">
                    No procedures scheduled yet for this patient. Click the orange button below to schedule Tooth Drill, RCT, Crown, etc.
                  </div>
                )}
              </div>
            </div>

            {/* Creative Doctor Action Buttons */}
            <div className="pt-6 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSchedulerInitialToothId(markedTeethList[0]?.id || '16');
                  setShowSchedulerModal(true);
                }}
                className="w-full sm:w-auto flex-1 py-3 px-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>Schedule Tooth Procedure</span>
              </button>

              <button
                type="button"
                disabled={isPrinting}
                onClick={async () => {
                  setIsPrinting(true);
                  try {
                    await generatePatientPDF(savedPatient);
                  } catch (err) {
                    console.error('Print error:', err);
                  } finally {
                    setIsPrinting(false);
                  }
                }}
                className="w-full sm:w-auto py-3 px-5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold rounded-xl border border-gray-200 dark:border-gray-600 shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                <span>{isPrinting ? 'Printing…' : 'Print Visit Sheet'}</span>
              </button>

              <button
                type="button"
                onClick={() => router.push(`/dashboard/patients?id=${savedPatient.id}`)}
                className="w-full sm:w-auto py-3 px-5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold rounded-xl border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <FolderKanban className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Go to Directory</span>
              </button>

              <button
                type="button"
                onClick={handleResetForNextPatient}
                className="w-full sm:w-auto py-3 px-5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-750 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Register Next</span>
              </button>
            </div>
          </div>
        ) : (
          <>
        {/* ── RECEPTION: Simplified single-step form ─────────────────────── */}
        {isReception && (
          <div className="max-w-lg mx-auto">

            {/* New / Returning toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1 mb-6 gap-1">
              <button
                type="button"
                onClick={() => { setMode('new'); setSelectedPatient(null); setSearchQuery(''); setSearchResults([]); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${mode === 'new' ? 'bg-white dark:bg-gray-800 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
              >
                <Plus className="w-4 h-4" /> New Patient
              </button>
              <button
                type="button"
                onClick={() => { setMode('existing'); setSelectedPatient(null); setSearchQuery(''); setSearchResults([]); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${mode === 'existing' ? 'bg-white dark:bg-gray-800 shadow text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
              >
                <Users className="w-4 h-4" /> Returning Patient
              </button>
            </div>

            {/* Returning patient — search */}
            {mode === 'existing' && !selectedPatient && (
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search by name or mobile number…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                {searchQuery && searchResults.length > 0 && (
                  <div className="mt-1 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 overflow-hidden shadow-lg">
                    {searchResults.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPatient(p);
                          setSearchQuery('');
                          setSearchResults([]);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                          {p.mobileNumber && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-gray-400" /> {p.mobileNumber}
                            </span>
                          )}
                          {p.dob && <span>• DOB: {p.dob}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchQuery && searchResults.length === 0 && (
                  <div className="mt-1 p-3 text-sm text-center text-gray-500 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    No patients found for &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            )}

            {/* Returning — selected patient banner */}
            {mode === 'existing' && selectedPatient && (
              <div className="mb-4 flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl border border-indigo-200 dark:border-indigo-800">
                <div>
                  <p className="text-xs text-indigo-500 font-medium mb-0.5">Returning visit for</p>
                  <p className="font-bold text-indigo-900 dark:text-indigo-100">{selectedPatient.name}</p>
                  {selectedPatient.mobileNumber && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-indigo-500" /> {selectedPatient.mobileNumber}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setSelectedPatient(null); setSearchQuery(''); }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-700 shadow-sm transition-colors"
                >
                  Change
                </button>
              </div>
            )}

            {/* Error */}
            {(localError || error) && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-r-lg">
                <span className="font-medium">{localError || error}</span>
              </div>
            )}
            {/* Success */}
            {formSubmitted && !error && !localError && (
              <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-400 text-green-700 rounded-r-lg">
                <span className="font-medium">
                  {mode === 'existing' ? 'New visit logged successfully!' : 'Patient registered successfully!'} Ready for the next one.
                </span>
              </div>
            )}

            {/* Only show the form fields for new patients OR once a returning patient is selected */}
            {(mode === 'new' || (mode === 'existing' && selectedPatient)) && (
              <form
                onSubmit={handleSubmit}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8 space-y-5"
              >
                {/* Full Name — editable only for new, read-only for returning */}
                {mode === 'new' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Full Name <span className="text-red-500">*</span>
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
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white disabled:opacity-70"
                      placeholder="Patient&apos;s full name"
                    />
                  </div>
                )}
                {/* Gender */}
                {mode === 'new' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Gender</label>
                    <select
                      name="sex"
                      value={formData.sex}
                      onChange={handleChange}
                      disabled={isLoading || formSubmitted}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white disabled:opacity-70"
                    >
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                )}
                {/* Age */}
                {mode === 'new' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Age
                    </label>
                    <input
                      type="text"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      disabled={isLoading || formSubmitted}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white disabled:opacity-70"
                      placeholder="e.g. 30"
                    />
                  </div>
                )}
                {/* Mobile */}
                {mode === 'new' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Mobile Number</label>
                    <input
                      type="text"
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleChange}
                      disabled={isLoading || formSubmitted}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white disabled:opacity-70"
                      placeholder="Mobile number"
                    />
                  </div>
                )}
                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                  <textarea
                    name="note"
                    value={formData.note}
                    onChange={handleChange}
                    rows={3}
                    disabled={isLoading || formSubmitted}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white disabled:opacity-70"
                    placeholder="Any additional notes about the patient..."
                  />
                </div>

                {/* Payment Suite (USD) — Total Cost + Amount Paid */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span>Payment (USD)</span>
                    </span>
                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">USD Only</span>
                  </div>

                  {/* Row: Total Cost + Amount Paid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="rec-totalCost" className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Total Treatment Cost</label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-gray-500 dark:text-gray-400 font-bold">$</span>
                        </div>
                        <input
                          type="text" inputMode="decimal"
                          id="rec-totalCost" name="totalCost"
                          value={formData.totalCost}
                          onChange={handleChange}
                          disabled={isLoading || formSubmitted}
                          className="w-full pl-7 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono font-semibold text-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="rec-amountPaid" className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">Amount Paid Now</label>
                      <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-gray-500 dark:text-gray-400 font-bold">$</span>
                        </div>
                        <input
                          type="text" inputMode="decimal"
                          id="rec-amountPaid" name="amountPaid"
                          value={formData.amountPaid}
                          onChange={handleChange}
                          disabled={isLoading || formSubmitted}
                          className="w-full pl-7 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono font-semibold text-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Remaining Balance — read-only auto-calculated display */}
                  {formData.totalCost && formData.amountPaid && (
                    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                      Number(formData.remainingBalance) > 0
                        ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}>
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Balance Remaining</span>
                      <span className={`text-sm font-extrabold font-mono ${
                        Number(formData.remainingBalance) > 0 ? 'text-red-700 dark:text-red-300' : 'text-gray-800 dark:text-gray-200'
                      }`}>
                        {Number(formData.remainingBalance) > 0 ? (
                          <span className="flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                            ${Number(formData.remainingBalance).toLocaleString()} DUE
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                            Fully Paid
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading || formSubmitted || (mode === 'new' && !formData.name.trim())}
                  className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors"
                >
                  {isLoading || formSubmitted
                    ? (mode === 'existing' ? 'Logging Visit…' : 'Registering…')
                    : (mode === 'existing' ? 'Log Return Visit' : 'Register Patient')}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Mode Toggle — hidden for reception */}
        {!isReception && (
          <>
        <div className="max-w-3xl mx-auto mb-8 flex justify-center">
          <div className="inline-flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => { setMode('new'); setSelectedPatient(null); setCurrentStep(1); }}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'new' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
            >
              New Patient
            </button>
            <button
              onClick={() => setMode('existing')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'existing' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
            >
              Existing Patient
            </button>
          </div>
        </div>

        {/* Existing Patient Search */}
        {mode === 'existing' && !selectedPatient && (
          <div className="max-w-3xl mx-auto mb-8">
            <input
              type="text"
              placeholder="Search patient by name, mobile, or clinic ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            {searchQuery && searchResults.length > 0 && (
              <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden shadow-lg">
                {searchResults.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPatient(p);
                      setFormData(prev => ({
                        ...prev,
                        name: p.name,
                        dob: p.dob || '',
                        sex: p.sex || '',
                        mobileNumber: p.mobileNumber || '',
                        hospitalFileNumber: p.hospitalFileNumber || '',
                        diagnosis: '',
                        treatment: '',
                        currentTreatment: '',
                        history: '',
                        pastMedicalHistory: '',
                        drugHistory: '',
                        pastSurgicalHistory: '',
                        examination: '',
                        note: '',
                        followUpDate: ''
                      }));
                      setCurrentStep(2); // Jump straight to medical info
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {p.clinicId && <span className="mr-3">ID: {p.clinicId}</span>}
                      {p.dob && <span>DOB: {p.dob}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {searchQuery && searchResults.length === 0 && (
              <div className="mt-2 p-4 text-center text-gray-500 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                No patients found matching "{searchQuery}"
              </div>
            )}
          </div>
        )}

        {mode === 'existing' && selectedPatient && (
           <div className="max-w-3xl mx-auto mb-8 flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800">
             <div>
               <span className="text-sm text-indigo-600 dark:text-indigo-400 block mb-1">Adding new visit for</span>
               <span className="font-bold text-lg text-indigo-900 dark:text-indigo-100">{selectedPatient.name}</span>
               <span className="text-sm text-indigo-700 dark:text-indigo-300 ml-3">ID: {selectedPatient.clinicId}</span>
             </div>
             <button 
               onClick={() => { setSelectedPatient(null); setCurrentStep(1); }} 
               className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 bg-white dark:bg-gray-800 px-3 py-1.5 rounded shadow-sm border border-indigo-200 dark:border-indigo-700 transition-colors"
             >
               Change Patient
             </button>
           </div>
        )}

        {/* Form Container (Only show if new patient or if existing patient is selected) */}
        {(mode === 'new' || (mode === 'existing' && selectedPatient)) && (
          <>
        {/* Step Navigation */}
        <div className="max-w-3xl mx-auto mb-10">
          <div className="flex justify-between items-center relative">
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 z-0 rounded-full"></div>
            <div 
              className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-indigo-600 z-0 rounded-full transition-all duration-300" 
              style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
            ></div>
            
            {[
              { num: 1, label: 'Personal Info' },
              { num: 2, label: 'Medical Info' },
              { num: 3, label: 'Additional Notes' }
            ].map((step) => (
              <div key={step.num} className="relative z-10 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.num)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-200 shadow-sm ${
                    currentStep === step.num 
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/50' 
                      : currentStep > step.num
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-500 border-2 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {currentStep > step.num ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  ) : step.num}
                </button>
                <span className={`mt-2 text-xs sm:text-sm font-medium ${currentStep === step.num ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {(localError || error) && (
          <div className="mb-6 max-w-3xl mx-auto">
            <div className="p-4 bg-red-50 border-l-4 border-red-400 text-red-700 rounded-r-lg shadow-sm">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                </svg>
                <span className="font-medium">{localError || error}</span>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {formSubmitted && !error && !localError && (
          <div className="mb-6 max-w-3xl mx-auto">
            <div className="p-4 bg-green-50 border-l-4 border-green-400 text-green-700 rounded-r-lg shadow-sm">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                </svg>
                <span className="font-medium">Patient record created successfully! Ready for the next one.</span>
              </div>
            </div>
          </div>
        )}

        {/* Form Container */}
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">
            <div className="p-6 sm:p-10 min-h-[400px]">
              
              {/* STEP 1: Personal Info */}
              {currentStep === 1 && (
                <div className="animate-fadeIn">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 pb-3 border-b border-gray-100 dark:border-gray-700">
                    Step 1: Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Name */}
                    <div className="md:col-span-2">
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
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
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white disabled:opacity-70 transition-all duration-200"
                        placeholder="Enter patient's full name"
                      />
                    </div>

                    {/* Sex */}
                    <div>
                      <label htmlFor="sex" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Gender
                      </label>
                      <select
                        id="sex"
                        name="sex"
                        value={formData.sex}
                        onChange={handleChange}
                        disabled={isLoading || formSubmitted}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white disabled:opacity-70 transition-all duration-200"
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>

                    {/* Age */}
                    <div>
                      <label htmlFor="dob" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Age
                      </label>
                      <input
                        type="text"
                        id="dob"
                        name="dob"
                        value={formData.dob}
                        onChange={handleChange}
                        placeholder="e.g. 8, 25, or 2018-05-20"
                        disabled={isLoading || formSubmitted}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white disabled:opacity-70 transition-all duration-200"
                      />

                    </div>

                    {/* Mobile Number */}
                    <div>
                      <label htmlFor="mobileNumber" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Mobile Number
                      </label>
                      <input
                        type="text"
                        id="mobileNumber"
                        name="mobileNumber"
                        value={formData.mobileNumber}
                        onChange={handleChange}
                        disabled={isLoading || formSubmitted}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white disabled:opacity-70 transition-all duration-200"
                        placeholder="Mobile number"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Medical Info */}
              {currentStep === 2 && (
                <div className="animate-fadeIn">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 pb-3 border-b border-gray-100 dark:border-gray-700">
                    Step 2: Medical Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Clinic ID (display only) */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Clinic ID
                      </label>
                      <div className="w-full px-4 py-3 border border-blue-200 dark:border-blue-700 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 font-medium">
                        {mode === 'existing' && selectedPatient ? selectedPatient.clinicId : 'Auto-generated after submission'}
                      </div>
                      {mode === 'new' && (
                        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                          Format: [PatientNumber(2-digits)][DDMMYY]
                        </p>
                      )}
                    </div>

                    {/* Date of Diagnosis / Condition Onset */}
                    <div className="md:col-span-2 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                        <label htmlFor="ageOfDiagnosis" className="block text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>Date of Diagnosis / Condition Onset</span>
                        </label>
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                          Select date or click quick shortcut
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <input
                          type="date"
                          id="ageOfDiagnosis"
                          name="ageOfDiagnosis"
                          value={formData.ageOfDiagnosis}
                          onChange={handleChange}
                          disabled={isLoading || formSubmitted}
                          className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-sm transition-all duration-200"
                        />
                        {/* Quick shortcuts for fast 1-click entry */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {[
                            { label: 'Today', days: 0 },
                            { label: '1 Wk Ago', days: -7 },
                            { label: '1 Mo Ago', months: -1 },
                            { label: '3 Mos Ago', months: -3 },
                            { label: '6 Mos Ago', months: -6 },
                            { label: '1 Yr Ago', months: -12 },
                          ].map((btn, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                const d = new Date();
                                if (btn.days !== undefined) d.setDate(d.getDate() + btn.days);
                                if (btn.months !== undefined) d.setMonth(d.getMonth() + btn.months);
                                const formatted = d.toISOString().split('T')[0];
                                setFormData(prev => ({ ...prev, ageOfDiagnosis: formatted }));
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors shadow-2xs cursor-pointer"
                            >
                              {btn.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {formData.ageOfDiagnosis && (
                        <p className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Recorded Onset Date: {formData.ageOfDiagnosis}
                        </p>
                      )}
                    </div>

                    {/* Medical History */}
                    {!isStaff && (
                      <div className="md:col-span-2">
                        <label htmlFor="pastMedicalHistory" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Medical History
                        </label>
                        <textarea
                          id="pastMedicalHistory"
                          name="pastMedicalHistory"
                          value={formData.pastMedicalHistory}
                          onChange={handleChange}
                          rows={3}
                          disabled={isLoading || formSubmitted || isStaff}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white disabled:opacity-70 transition-all duration-200"
                          placeholder="Relevant medical history, systemic conditions, chronic illnesses, allergies..."
                        />
                      </div>
                    )}

                    {/* Drug History */}
                    {!isStaff && (
                      <div className="md:col-span-2">
                        <label htmlFor="drugHistory" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Drug History
                        </label>
                        <textarea
                          id="drugHistory"
                          name="drugHistory"
                          value={formData.drugHistory}
                          onChange={handleChange}
                          rows={2}
                          disabled={isLoading || formSubmitted || isStaff}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white disabled:opacity-70 transition-all duration-200"
                          placeholder="Current medications, anesthesia sensitivities, or drug allergies..."
                        />
                      </div>
                    )}

                    {/* Past Surgical History */}
                    {!isStaff && (
                      <div className="md:col-span-2">
                        <label htmlFor="pastSurgicalHistory" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Past Surgical History
                        </label>
                        <textarea
                          id="pastSurgicalHistory"
                          name="pastSurgicalHistory"
                          value={formData.pastSurgicalHistory}
                          onChange={handleChange}
                          rows={2}
                          disabled={isLoading || formSubmitted || isStaff}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white disabled:opacity-70 transition-all duration-200"
                          placeholder="Past dental or general surgeries, extractions, implants..."
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Dentition Chart & Treatment */}
              {currentStep === 3 && (
                <div className="animate-fadeIn">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 pb-3 border-b border-gray-100 dark:border-gray-700">
                    Step 3: Dentition Chart & Treatment
                  </h3>
                  
                  {!isStaff && (
                    <div className="space-y-8">
                      {/* 3D Dentition Chart for Dentist Clinic */}
                      <div>
                        <DentitionChart
                          value={formData.tableData}
                          onChange={(newChartValue) => {
                            setFormData(prev => ({
                              ...prev,
                              tableData: newChartValue
                            }));
                          }}
                          patientAge={formData.dob}
                          disabled={isLoading || formSubmitted || isStaff}
                          onScheduleTooth={(tooth) => {
                            const toothId = typeof tooth === 'string' ? tooth : tooth.id;
                            setSchedulerInitialToothId(toothId);
                            if (savedPatient || selectedPatient) {
                              setShowSchedulerModal(true);
                            } else {
                              alert(`Tooth #${toothId} selected! Finish registering this patient, and the procedure scheduler will open.`);
                            }
                          }}
                        />
                      </div>

                      {/* Fields directly after the chart: Clinical Diagnosis Badges & Per-Tooth Treatment Planner */}
                      <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                        {/* Clinical Diagnoses derived from chart */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-3">
                          <label className="block text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span>Clinical Diagnoses{diagnosedTeeth.length + generalDiagnoses.length > 0 ? ` (${diagnosedTeeth.length + generalDiagnoses.length})` : ''}</span>
                          </label>

                          {diagnosedTeeth.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {diagnosedTeeth.map(t => {
                                return (
                                  <div
                                    key={t.toothId}
                                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                                  >
                                    <span className="w-8 h-8 rounded-lg bg-gray-700 dark:bg-gray-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                      #{t.toothId}
                                    </span>
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                        {t.name} <span className="text-gray-500 dark:text-gray-400 font-mono">({t.palmer})</span>
                                      </div>
                                      <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                                        {t.conditionLabel}{t.surfaces && t.surfaces.length > 0 ? ` · ${t.surfaces.join(', ')}` : ''}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Click any tooth in the chart above to record a finding — it will appear here automatically.
                            </p>
                          )}

                          {/* General diagnoses tags */}
                          {generalDiagnoses.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-200 dark:border-gray-700">
                              {generalDiagnoses.map((gd, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600"
                                >
                                  {gd}
                                  <button
                                    type="button"
                                    onClick={() => setGeneralDiagnoses(prev => prev.filter((_, i) => i !== idx))}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer font-bold"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Custom tag input */}
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
                              placeholder="Add general finding & press Enter..."
                              className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-1 focus:ring-gray-400"
                            />
                            {customDiagnosisInput.trim() && (
                              <button
                                type="button"
                                onClick={() => {
                                  setGeneralDiagnoses(prev => [...prev, customDiagnosisInput.trim()]);
                                  setCustomDiagnosisInput('');
                                }}
                                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-700 dark:bg-gray-600 text-white cursor-pointer"
                              >
                                Add
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Tooth-Specific Treatment Plan */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-3">
                          <label className="block text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Activity className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            <span>Treatment Plan{diagnosedTeeth.length > 0 ? ` (${diagnosedTeeth.length} teeth)` : ''}</span>
                          </label>

                          {diagnosedTeeth.length > 0 ? (
                            <div className="space-y-2">
                              {diagnosedTeeth.map(t => (
                                <div
                                  key={t.toothId}
                                  className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-7 h-7 rounded-lg bg-gray-700 dark:bg-gray-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                      #{t.toothId}
                                    </span>
                                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                                      {t.name} <span className="text-gray-500 dark:text-gray-400 font-mono">({t.palmer})</span>
                                    </span>
                                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                      {t.conditionLabel}
                                    </span>
                                  </div>
                                  <input
                                    type="text"
                                    value={toothTreatments[t.toothId] || ''}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setToothTreatments(prev => ({ ...prev, [t.toothId]: val }));
                                    }}
                                    disabled={isLoading || formSubmitted || isStaff}
                                    placeholder={`Planned procedure for tooth #${t.toothId}...`}
                                    className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Tooth-specific plan will appear here once teeth are diagnosed in the chart above.
                            </p>
                          )}

                          {/* Overall Treatment / Prescription Plan */}
                          <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                              General Treatment & Prescription Notes
                            </label>
                            <input
                              type="text"
                              value={generalTreatmentNotes}
                              onChange={e => setGeneralTreatmentNotes(e.target.value)}
                              disabled={isLoading || formSubmitted || isStaff}
                              placeholder="e.g. Full mouth scaling, Amoxicillin 500mg, oral hygiene instructions..."
                              className="w-full px-3.5 py-2.5 text-xs border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-gray-400"
                            />
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <label htmlFor="note" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Additional Clinical Notes
                          </label>
                          <textarea
                            id="note"
                            name="note"
                            value={formData.note}
                            onChange={handleChange}
                            rows={3}
                            disabled={isLoading || formSubmitted || isStaff}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white disabled:opacity-70 transition-all duration-200"
                            placeholder="Enter any additional clinical notes or observations about the patient..."
                          />
                        </div>

                        {/* Payment Suite — 3 fields: Total Cost, Amount Paid, Remaining Due */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                              <span>Treatment Payment</span>
                            </label>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                              USD ($)
                            </span>
                          </div>

                          {/* Row: Total Cost + Amount Paid */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="totalCost" className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Total Treatment Cost</label>
                              <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                  <span className="text-gray-500 dark:text-gray-400 font-bold text-base">$</span>
                                </div>
                                <input
                                  type="text" inputMode="decimal"
                                  id="totalCost" name="totalCost"
                                  value={formData.totalCost}
                                  onChange={handleChange}
                                  disabled={isLoading || formSubmitted || isStaff}
                                  className="w-full pl-8 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono font-bold text-sm"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                            <div>
                              <label htmlFor="amountPaid" className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1.5">Amount Paid Now</label>
                              <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                  <span className="text-gray-500 dark:text-gray-400 font-bold text-base">$</span>
                                </div>
                                <input
                                  type="text" inputMode="decimal"
                                  id="amountPaid" name="amountPaid"
                                  value={formData.amountPaid}
                                  onChange={handleChange}
                                  disabled={isLoading || formSubmitted || isStaff}
                                  className="w-full pl-8 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono font-bold text-sm"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Remaining Balance — read-only auto-calculated display */}
                          {formData.totalCost && formData.amountPaid && (
                            <div className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border ${
                              Number(formData.remainingBalance) > 0
                                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                            }`}>
                              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Balance Remaining</span>
                              <span className={`text-sm font-extrabold font-mono ${
                                Number(formData.remainingBalance) > 0 ? 'text-red-700 dark:text-red-300' : 'text-gray-800 dark:text-gray-200'
                              }`}>
                                {Number(formData.remainingBalance) > 0 ? (
                                  <span className="flex items-center gap-1.5">
                                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                    ${Number(formData.remainingBalance).toLocaleString()} DUE
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    Fully Paid
                                  </span>
                                )}
                              </span>
                            </div>
                          )}

                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 shrink-0" />
                            Enter total cost and amount paid — remaining balance is auto-calculated.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {isStaff && (
                    <div className="text-center py-10 text-gray-500">
                      Staff accounts do not have permission to add medical notes.
                    </div>
                  )}
                </div>
              )}

              {/* Form Navigation / Submission */}
              <div className="mt-10 pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 1 || isLoading || formSubmitted}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${
                    currentStep === 1
                      ? 'text-gray-400 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                      : 'text-gray-700 bg-gray-200 hover:bg-gray-300 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600'
                  }`}
                >
                  Previous
                </button>

                {currentStep < 3 ? (
                  <button
                    key="next-btn"
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    key="submit-btn"
                    type="submit"
                    disabled={isLoading || formSubmitted}
                    className={`px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-md transition-all flex items-center justify-center ${
                      isLoading || formSubmitted ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg transform hover:-translate-y-0.5'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </>
                    ) : formSubmitted ? (
                      'Submitted!'
                    ) : (
                      'Submit Patient Data'
                    )}
                  </button>
                )}
              </div>

            </div>
          </form>
        </div>
              </>
            )}
          </>
        )}
      </>
    )}


        {/* ── TOOTH PROCEDURE SCHEDULER MODAL ── */}
        {showSchedulerModal && (savedPatient || selectedPatient) && (
          <ToothSchedulerModal
            isOpen={showSchedulerModal}
            onClose={() => setShowSchedulerModal(false)}
            patient={(savedPatient || selectedPatient)!}
            initialToothId={schedulerInitialToothId}
            onScheduled={(newSch) => {
              if (savedPatient) {
                setSavedPatient(prev => {
                  if (!prev) return prev;
                  try {
                    const currentTableData = prev.tableData ? JSON.parse(prev.tableData) : {};
                    const existingSchedules = currentTableData.scheduledProcedures || [];
                    return {
                      ...prev,
                      tableData: JSON.stringify({
                        ...currentTableData,
                        scheduledProcedures: [...existingSchedules, newSch]
                      })
                    };
                  } catch {
                    return prev;
                  }
                });
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
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <PatientFormContent />
    </Suspense>
  );
}