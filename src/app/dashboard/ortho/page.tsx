'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  usePatients,
  Patient,
  OrthoRecord,
  OrthoVisitRow,
  extractOrthoRecord,
} from '@/app/context/PatientContext';
import { OrthoIcon } from '@/components/watermelon/library-dashboard/components/library/icons';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  X,
  Printer,
  Calendar,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Plus,
  Trash2,
  User,
  Phone,
  FileText,
  Activity,
  Layers,
  Check,
  RotateCcw,
  ArrowRight,
  ClipboardList
} from 'lucide-react';

function OrthoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { patients, savePatientOrthoRecord, isLoading } = usePatients();

  // Search & Selected Patient
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Stepper state (1: Background & Plan, 2: Assessment & Brackets, 3: Visits & Consent)
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ortho Form State
  const [formData, setFormData] = useState<OrthoRecord>({
    startingDate: new Date().toISOString().split('T')[0],
    occupation: '',
    address: '',
    chiefComplaint: '',
    dentalHistory: '',
    medicalHistory: '',
    diagnosis: '',
    treatmentPlan1: '',
    treatmentPlan2: '',
    treatmentPlan3: '',
    treatmentPlan4: '',
    treatedArchMax: false,
    treatedArchMan: false,
    treatedArchMaxStatus: '',
    treatedArchManStatus: '',
    applianceLabial: true,
    applianceLingual: false,
    applianceNoTreatment: false,
    bracketSystem: 'MBT',
    slot: '0.022"',
    skeletalClass: 'Class I',
    dentalClass: 'Class I',
    overbite: '',
    overjet: '',
    archWidthNormal: true,
    archWidthCrossbite: false,
    archWidthScissorbite: false,
    otherNotes: '',
    strippingMax: false,
    strippingMan: false,
    strippingOption: 'No',
    impactedTooth: '',
    oralHygiene: 'Good',
    habitTongueThrust: false,
    habitThumbSucking: false,
    habitMouthBreather: false,
    habitOther: '',
    midlineMax: 'Center',
    midlineMan: 'Center',
    visits: [],
    consentSigned: false,
  });

  // Handle URL pre-selection: ?patientId=...
  useEffect(() => {
    const urlPatientId = searchParams.get('patientId');
    if (urlPatientId && patients.length > 0) {
      const match = patients.find((p) => p.id === urlPatientId);
      if (match && (!selectedPatient || selectedPatient.id !== match.id)) {
        handleSelectPatient(match);
      }
    }
  }, [searchParams, patients]);

  // Load existing ortho record when patient is selected
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setSearchQuery('');
    setSuccessBanner(null);
    setErrorMessage(null);

    const existingOrtho = extractOrthoRecord(patient.tableData);
    if (existingOrtho) {
      setFormData({
        startingDate: existingOrtho.startingDate || new Date().toISOString().split('T')[0],
        occupation: existingOrtho.occupation || '',
        address: existingOrtho.address || '',
        chiefComplaint: existingOrtho.chiefComplaint || '',
        dentalHistory: existingOrtho.dentalHistory || '',
        medicalHistory: existingOrtho.medicalHistory || patient.pastMedicalHistory || '',
        diagnosis: existingOrtho.diagnosis || '',
        treatmentPlan1: existingOrtho.treatmentPlan1 || '',
        treatmentPlan2: existingOrtho.treatmentPlan2 || '',
        treatmentPlan3: existingOrtho.treatmentPlan3 || '',
        treatmentPlan4: existingOrtho.treatmentPlan4 || '',
        treatedArchMax: Boolean(existingOrtho.treatedArchMax),
        treatedArchMan: Boolean(existingOrtho.treatedArchMan),
        treatedArchMaxStatus: existingOrtho.treatedArchMaxStatus || '',
        treatedArchManStatus: existingOrtho.treatedArchManStatus || '',
        applianceLabial: existingOrtho.applianceLabial !== false,
        applianceLingual: Boolean(existingOrtho.applianceLingual),
        applianceNoTreatment: Boolean(existingOrtho.applianceNoTreatment),
        bracketSystem: existingOrtho.bracketSystem || 'MBT',
        slot: existingOrtho.slot || '0.022"',
        skeletalClass: existingOrtho.skeletalClass || 'Class I',
        dentalClass: existingOrtho.dentalClass || 'Class I',
        overbite: existingOrtho.overbite || '',
        overjet: existingOrtho.overjet || '',
        archWidthNormal: existingOrtho.archWidthNormal !== false,
        archWidthCrossbite: Boolean(existingOrtho.archWidthCrossbite),
        archWidthScissorbite: Boolean(existingOrtho.archWidthScissorbite),
        otherNotes: existingOrtho.otherNotes || '',
        strippingMax: Boolean(existingOrtho.strippingMax),
        strippingMan: Boolean(existingOrtho.strippingMan),
        strippingOption: existingOrtho.strippingOption || 'No',
        impactedTooth: existingOrtho.impactedTooth || '',
        oralHygiene: existingOrtho.oralHygiene || 'Good',
        habitTongueThrust: Boolean(existingOrtho.habitTongueThrust),
        habitThumbSucking: Boolean(existingOrtho.habitThumbSucking),
        habitMouthBreather: Boolean(existingOrtho.habitMouthBreather),
        habitOther: existingOrtho.habitOther || '',
        midlineMax: existingOrtho.midlineMax || 'Center',
        midlineMan: existingOrtho.midlineMan || 'Center',
        visits: Array.isArray(existingOrtho.visits) ? existingOrtho.visits : [],
        consentSigned: Boolean(existingOrtho.consentSigned),
      });
    } else {
      // Default blank ortho sheet with patient's medical history pre-filled
      setFormData((prev) => ({
        ...prev,
        startingDate: new Date().toISOString().split('T')[0],
        medicalHistory: patient.pastMedicalHistory || '',
        visits: [
          {
            id: `v-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            procedure: 'Initial Orthodontic Consultation & Records',
            payment: '0',
          },
        ],
      }));
    }
  };

  // Filter patients by search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return patients
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.mobileNumber && p.mobileNumber.includes(q)) ||
          (p.clinicId && p.clinicId.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [searchQuery, patients]);

  // Handle Form Change
  const updateField = (field: keyof OrthoRecord, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Visits helpers
  const handleAddVisit = () => {
    const newRow: OrthoVisitRow = {
      id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      date: new Date().toISOString().split('T')[0],
      procedure: '',
      payment: '0',
    };
    setFormData((prev) => ({
      ...prev,
      visits: [...(prev.visits || []), newRow],
    }));
  };

  const handleUpdateVisit = (id: string, key: keyof OrthoVisitRow, val: string) => {
    setFormData((prev) => ({
      ...prev,
      visits: (prev.visits || []).map((row) =>
        row.id === id ? { ...row, [key]: val } : row
      ),
    }));
  };

  const handleDeleteVisit = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      visits: (prev.visits || []).filter((row) => row.id !== id),
    }));
  };

  // Total Ortho Payments
  const totalPaid = useMemo(() => {
    return (formData.visits || []).reduce((acc, v) => {
      const val = typeof v.payment === 'number' ? v.payment : parseFloat(v.payment) || 0;
      return acc + val;
    }, 0);
  }, [formData.visits]);

  // Save handler
  const handleSave = async () => {
    if (!selectedPatient) {
      setErrorMessage('Please select a patient first.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      await savePatientOrthoRecord(selectedPatient.id, formData);
      setSuccessBanner(`Orthodontic sheet for "${selectedPatient.name}" saved successfully!`);
    } catch (err) {
      console.error('Failed to save ortho record:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save orthodontic record.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* ── TOP HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#008294]/10 text-[#008294] dark:text-teal-400 border border-[#008294]/20 flex items-center justify-center">
              <OrthoIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Orthodontic Prescription Sheet
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Clinical assessment, bracket prescription, progress visits log & consent form
              </p>
            </div>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2.5">
          {selectedPatient && (
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Sheet</span>
            </button>
          )}

          {selectedPatient && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#008294] hover:bg-[#006e7d] shadow-md shadow-teal-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Ortho Record'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── ALERTS / NOTIFICATIONS ── */}
      <AnimatePresence>
        {successBanner && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs font-semibold flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#008294] dark:text-teal-400 shrink-0" />
              <span>{successBanner}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/dashboard/patients?id=${selectedPatient?.id}`)}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-[#008294] text-white hover:bg-[#006e7d] transition cursor-pointer"
              >
                View Patient Profile
              </button>
              <button
                type="button"
                onClick={() => setSuccessBanner(null)}
                className="p-1 rounded-md text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-200"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── STEP 0: PATIENT SELECTION SEARCH (IF NOT SELECTED) ── */}
      {!selectedPatient ? (
        <div className="rounded-[28px] border border-slate-200/80 bg-white dark:bg-slate-900 dark:border-slate-800 p-8 sm:p-12 shadow-sm text-center max-w-2xl mx-auto space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-[#008294] dark:text-teal-400 border border-teal-500/20 flex items-center justify-center mx-auto shadow-xs">
            <OrthoIcon className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Select Patient for Orthodontic Sheet
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
              Search by patient name, phone number, or clinic ID to load their clinical file and start or manage their orthodontic record.
            </p>
          </div>

          <div className="relative text-left">
            <Search className="absolute inset-y-0 left-4 my-auto w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search existing patients by name, mobile, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#008294] shadow-xs"
            />
          </div>

          {searchQuery && searchResults.length > 0 && (
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 overflow-hidden shadow-xl divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto text-left">
              {searchResults.map((p) => {
                const hasOrtho = Boolean(extractOrthoRecord(p.tableData));
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPatient(p)}
                    className="w-full p-3.5 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-[#008294] font-bold text-sm flex items-center justify-center">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {p.clinicId ? `ID: ${p.clinicId}` : ''}
                          {p.mobileNumber ? ` • ${p.mobileNumber}` : ''}
                          {p.dob ? ` • Age: ${p.dob}` : ''}
                        </div>
                      </div>
                    </div>
                    {hasOrtho ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                        Has Ortho Sheet
                      </span>
                    ) : (
                      <span className="text-xs text-[#008294] font-bold flex items-center gap-1">
                        Select <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {searchQuery && searchResults.length === 0 && (
            <div className="text-xs text-slate-400 py-3">
              No matching patient found for &quot;{searchQuery}&quot;. Please verify the name or register them first in the registration form.
            </div>
          )}
        </div>
      ) : (
        /* ── MAIN WORKSPACE: SELECTED PATIENT ── */
        <div className="space-y-6">
          {/* Selected Patient Banner with Change Patient button */}
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#008294] to-[#0d9488] text-white font-black text-lg flex items-center justify-center shadow-md shadow-teal-500/20">
                {selectedPatient.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedPatient.name}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {selectedPatient.clinicId || 'NO ID'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap">
                  {selectedPatient.sex && <span>{selectedPatient.sex}</span>}
                  {selectedPatient.dob && <span>• Age: {selectedPatient.dob}</span>}
                  {selectedPatient.mobileNumber && <span>• {selectedPatient.mobileNumber}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setSelectedPatient(null)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Switch Patient</span>
              </button>
            </div>
          </div>

          {/* Stepper Tabs Bar */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-2xl overflow-x-auto">
            {[
              { step: 1, label: '1. Demographics & Clinical Plan', icon: FileText },
              { step: 2, label: '2. Ortho Assessment & Brackets', icon: Layers },
              { step: 3, label: '3. Progress Visits Log & Consent', icon: Calendar },
            ].map((s) => {
              const isActive = currentStep === s.step;
              const Icon = s.icon;
              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setCurrentStep(s.step)}
                  className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-[#008294] dark:text-teal-400 shadow-sm border border-slate-200/80 dark:border-slate-800'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 hover:bg-white/50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Stepped Form Card Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_0.7fr] gap-6">
            {/* LEFT: STEP CONTENT */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
              {/* ═══════════════════════════════════════════════════════════════
                  STEP 1: PATIENT PROFILE & CLINICAL BACKGROUND
                 ═══════════════════════════════════════════════════════════════ */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#008294]" />
                      Demographics & Medical/Dental Background
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Information captured from Sheet 1 of the clinical record
                    </p>
                  </div>

                  {/* Demographics row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Starting Date
                      </label>
                      <input
                        type="date"
                        value={formData.startingDate || ''}
                        onChange={(e) => updateField('startingDate', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#008294]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Occupation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Student, Engineer"
                        value={formData.occupation || ''}
                        onChange={(e) => updateField('occupation', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#008294]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Address
                      </label>
                      <input
                        type="text"
                        placeholder="City, District"
                        value={formData.address || ''}
                        onChange={(e) => updateField('address', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#008294]"
                      />
                    </div>
                  </div>

                  {/* Chief Complaint & Diagnosis */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Chief Complaint
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Patient complains of upper anterior crowding and spacing..."
                        value={formData.chiefComplaint || ''}
                        onChange={(e) => updateField('chiefComplaint', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#008294]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Orthodontic Diagnosis
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Class II div 1 malocclusion on Class II skeletal base with increased overjet..."
                        value={formData.diagnosis || ''}
                        onChange={(e) => updateField('diagnosis', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#008294]"
                      />
                    </div>
                  </div>

                  {/* Dental History & Medical History */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Dental History
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Past extractions, trauma, previous orthodontic treatment..."
                        value={formData.dentalHistory || ''}
                        onChange={(e) => updateField('dentalHistory', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#008294]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Medical History
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Allergies (nickel, latex), systemic conditions, medications..."
                        value={formData.medicalHistory || ''}
                        onChange={(e) => updateField('medicalHistory', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#008294]"
                      />
                    </div>
                  </div>

                  {/* Treatment Plan 1 to 4 */}
                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Treatment Plan Sequence (Options / Phases)
                    </label>
                    {[
                      { key: 'treatmentPlan1' as const, num: '1' },
                      { key: 'treatmentPlan2' as const, num: '2' },
                      { key: 'treatmentPlan3' as const, num: '3' },
                      { key: 'treatmentPlan4' as const, num: '4' },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-[#008294] text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {item.num}
                        </span>
                        <input
                          type="text"
                          placeholder={`Treatment Plan ${item.num} description...`}
                          value={formData[item.key] || ''}
                          onChange={(e) => updateField(item.key, e.target.value)}
                          className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#008294]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  STEP 2: ORTHODONTIC ASSESSMENT & BRACKETS
                 ═══════════════════════════════════════════════════════════════ */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#008294]" />
                      Clinical Assessment & Appliance Setup
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Classifications, arch widths, bracket specifications, and oral habits
                    </p>
                  </div>

                  {/* Row 1: Skeletal Class & Dental Class */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Skeletal Class
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['Class I', 'Class II', 'Class III'] as const).map((cls) => (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => updateField('skeletalClass', cls)}
                            className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                              formData.skeletalClass === cls
                                ? 'bg-[#008294] text-white border-[#008294] shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {cls}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Dental Class (Angle)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['Class I', 'Class II', 'Class III'] as const).map((cls) => (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => updateField('dentalClass', cls)}
                            className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                              formData.dentalClass === cls
                                ? 'bg-[#008294] text-white border-[#008294] shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {cls}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Overbite & Overjet & Arch Width */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Overbite (OB)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 2 mm, 50% deep"
                        value={formData.overbite || ''}
                        onChange={(e) => updateField('overbite', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#008294]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Overjet (OJ)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 3 mm, +6 mm"
                        value={formData.overjet || ''}
                        onChange={(e) => updateField('overjet', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#008294]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Oral Hygiene
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['Good', 'Fair', 'Poor'] as const).map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => updateField('oralHygiene', h)}
                            className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                              formData.oralHygiene === h
                                ? 'bg-teal-600 text-white border-teal-600'
                                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Treated Arch & Appliance Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Treated Arch
                      </label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(formData.treatedArchMax)}
                              onChange={(e) => updateField('treatedArchMax', e.target.checked)}
                              className="w-4 h-4 rounded text-[#008294] focus:ring-[#008294]"
                            />
                            <span>MAX (Upper)</span>
                          </label>
                          {formData.treatedArchMax && (
                            <input
                              type="text"
                              placeholder="Status e.g. Bonded / Banded"
                              value={formData.treatedArchMaxStatus || ''}
                              onChange={(e) => updateField('treatedArchMaxStatus', e.target.value)}
                              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(formData.treatedArchMan)}
                              onChange={(e) => updateField('treatedArchMan', e.target.checked)}
                              className="w-4 h-4 rounded text-[#008294] focus:ring-[#008294]"
                            />
                            <span>MAN (Lower)</span>
                          </label>
                          {formData.treatedArchMan && (
                            <input
                              type="text"
                              placeholder="Status e.g. Bonded / Banded"
                              value={formData.treatedArchManStatus || ''}
                              onChange={(e) => updateField('treatedArchManStatus', e.target.value)}
                              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Appliance Placement
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: 'applianceLabial' as const, label: 'Labial (Buccal)' },
                          { key: 'applianceLingual' as const, label: 'Lingual' },
                          { key: 'applianceNoTreatment' as const, label: 'No Treatment' },
                        ].map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => updateField(item.key, !formData[item.key])}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                              formData[item.key]
                                ? 'bg-[#008294]/15 border-[#008294] text-[#008294] font-bold'
                                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Row 4: Bracket System & Slot */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Bracket System
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. MBT, Roth, Damon, Edgewise"
                        value={formData.bracketSystem || ''}
                        onChange={(e) => updateField('bracketSystem', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#008294]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Slot Size
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {['0.018"', '0.022"'].map((slotVal) => (
                          <button
                            key={slotVal}
                            type="button"
                            onClick={() => updateField('slot', slotVal)}
                            className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer border ${
                              formData.slot === slotVal
                                ? 'bg-[#008294] text-white border-[#008294]'
                                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {slotVal}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Row 5: Arch Width & Midline */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                        Arch Width
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: 'archWidthNormal' as const, label: 'Normal' },
                          { key: 'archWidthCrossbite' as const, label: 'Cross bite' },
                          { key: 'archWidthScissorbite' as const, label: 'Scissor bite' },
                        ].map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            onClick={() => {
                              // radio-like toggle
                              setFormData((prev) => ({
                                ...prev,
                                archWidthNormal: item.key === 'archWidthNormal',
                                archWidthCrossbite: item.key === 'archWidthCrossbite',
                                archWidthScissorbite: item.key === 'archWidthScissorbite',
                              }));
                            }}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                              formData[item.key]
                                ? 'bg-[#008294]/15 border-[#008294] text-[#008294] font-bold'
                                : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Midline Deviation
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="MAX (e.g. Center, 1mm R)"
                          value={formData.midlineMax || ''}
                          onChange={(e) => updateField('midlineMax', e.target.value)}
                          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs"
                        />
                        <input
                          type="text"
                          placeholder="MAN (e.g. Center, 2mm L)"
                          value={formData.midlineMan || ''}
                          onChange={(e) => updateField('midlineMan', e.target.value)}
                          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 6: Stripping & Impacted Tooth */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Stripping (IPR)
                      </label>
                      <div className="flex items-center gap-3">
                        <select
                          value={formData.strippingOption || 'No'}
                          onChange={(e) => updateField('strippingOption', e.target.value)}
                          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold"
                        >
                          <option value="No">No</option>
                          <option value="If necessary">If necessary</option>
                          <option value="Yes">Yes</option>
                        </select>
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(formData.strippingMax)}
                            onChange={(e) => updateField('strippingMax', e.target.checked)}
                            className="rounded text-[#008294]"
                          />
                          <span>MAX</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(formData.strippingMan)}
                            onChange={(e) => updateField('strippingMan', e.target.checked)}
                            className="rounded text-[#008294]"
                          />
                          <span>MAN</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Impacted Tooth
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Upper right canine (#13), Lower premolar"
                        value={formData.impactedTooth || ''}
                        onChange={(e) => updateField('impactedTooth', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#008294]"
                      />
                    </div>
                  </div>

                  {/* Row 7: Habits & Other notes */}
                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Oral Habits
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { key: 'habitTongueThrust' as const, label: 'Tongue Thrust' },
                        { key: 'habitThumbSucking' as const, label: 'Thumb Sucking' },
                        { key: 'habitMouthBreather' as const, label: 'Mouth Breather' },
                      ].map((h) => (
                        <label
                          key={h.key}
                          className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800"
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(formData[h.key])}
                            onChange={(e) => updateField(h.key, e.target.checked)}
                            className="rounded text-[#008294] focus:ring-[#008294]"
                          />
                          <span>{h.label}</span>
                        </label>
                      ))}
                      <input
                        type="text"
                        placeholder="Other habits (e.g. Bruxism)..."
                        value={formData.habitOther || ''}
                        onChange={(e) => updateField('habitOther', e.target.value)}
                        className="flex-1 min-w-[180px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs"
                      />
                    </div>

                    <div className="pt-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Other Clinical Notes & Cephalometric Observations
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Asymmetry, gummy smile, lip incompetence, profile notes..."
                        value={formData.otherNotes || ''}
                        onChange={(e) => updateField('otherNotes', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#008294]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════
                  STEP 3: PROGRESS VISITS LOG & LEGAL CONSENT
                 ═══════════════════════════════════════════════════════════════ */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#008294]" />
                        Progress Visits & Ledger Tracking (Sheet 2)
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Log date, procedures performed (archwire, ties, elastics), and fee payments
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddVisit}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#008294] hover:bg-[#006e7d] transition cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Visit</span>
                    </button>
                  </div>

                  {/* Visits Table */}
                  <div className="space-y-2">
                    {formData.visits && formData.visits.length > 0 ? (
                      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                        {formData.visits.map((row, idx) => (
                          <div
                            key={row.id || idx}
                            className="p-3 bg-white dark:bg-slate-900 flex flex-col sm:flex-row items-start sm:items-center gap-3"
                          >
                            <span className="w-6 text-center text-xs font-mono font-bold text-slate-400 shrink-0">
                              #{idx + 1}
                            </span>
                            <input
                              type="date"
                              value={row.date || ''}
                              onChange={(e) => handleUpdateVisit(row.id, 'date', e.target.value)}
                              className="w-32 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                            />
                            <input
                              type="text"
                              placeholder="Procedure details (e.g. Upper 0.014 NiTi wire placed, canine retraction elastics)"
                              value={row.procedure || ''}
                              onChange={(e) =>
                                handleUpdateVisit(row.id, 'procedure', e.target.value)
                              }
                              className="flex-1 min-w-[200px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                            />
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs text-slate-400 font-mono">$</span>
                              <input
                                type="number"
                                placeholder="0"
                                value={row.payment || ''}
                                onChange={(e) =>
                                  handleUpdateVisit(row.id, 'payment', e.target.value)
                                }
                                className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-right"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteVisit(row.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="Delete visit row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        No progress visits added yet. Click &quot;Add Visit&quot; to log the first orthodontic visit.
                      </div>
                    )}
                  </div>

                  {/* Ledger Summary */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Total Orthodontic Installments Collected:
                    </span>
                    <span className="text-base font-mono font-black text-emerald-600 dark:text-emerald-400">
                      ${totalPaid.toLocaleString()}
                    </span>
                  </div>

                  {/* 4 Consent Clauses from Sheet 2 */}
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#008294]" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Patient / Parent Declaration & Treatment Consent
                      </h4>
                    </div>

                    <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <div className="flex items-start gap-2.5">
                        <span className="font-bold text-[#008294] dark:text-teal-400 mt-0.5">•</span>
                        <p>
                          I hereby accept to treat orthodontically by Dr. Abdulbasit Ghareb Khoshnaw ( Bachelor of dental surgery )
                        </p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="font-bold text-[#008294] dark:text-teal-400 mt-0.5">•</span>
                        <p>
                          I give permission to the Dentist to use my Orofacial photograph in scientific lectures ,presentations ,or publication.
                        </p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="font-bold text-[#008294] dark:text-teal-400 mt-0.5">•</span>
                        <p>
                          I&apos;m further aware that my treatment can be terminated before the end treatment time in case of not following doctor&apos;s instructions or neglecting the treatment
                        </p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="font-bold text-[#008294] dark:text-teal-400 mt-0.5">•</span>
                        <p>
                          I accepted all the treatments that the doctor planned for me.
                        </p>
                      </div>
                    </div>

                    <label className="flex items-center gap-2.5 pt-2 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.consentSigned)}
                        onChange={(e) => updateField('consentSigned', e.target.checked)}
                        className="w-4 h-4 rounded text-[#008294] focus:ring-[#008294]"
                      />
                      <span>
                        Patient / Legal Guardian has read, acknowledged, and signed the orthodontic consent clauses
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* ── FOOTER STEP BUTTONS ── */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous Step</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  {currentStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep((prev) => Math.min(3, prev + 1))}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#008294] hover:bg-[#006e7d] shadow-sm shadow-teal-500/20 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Continue to Step {currentStep + 1}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="px-7 py-2.5 rounded-xl text-xs font-bold text-white bg-[#008294] hover:bg-[#006e7d] shadow-md shadow-teal-500/25 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Saving Sheet...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Save & Finalize Ortho Record</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: LIVE CLINICAL PREVIEW CARD */}
            <div className="space-y-4">
              <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-teal-500/10 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 border border-[#008294]/20 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#008294]" />
                    Live Prescription Card
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-800 dark:text-teal-300">
                    {selectedPatient.clinicId || 'ACTIVE'}
                  </span>
                </div>

                {/* Patient Summary Header */}
                <div className="text-center pt-2">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#008294] to-[#0d9488] text-white font-black text-xl flex items-center justify-center mx-auto shadow-md shadow-teal-500/25">
                    {selectedPatient.name.charAt(0).toUpperCase()}
                  </div>
                  <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                    {selectedPatient.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {selectedPatient.sex || 'Gender —'} • Age: {selectedPatient.dob || '—'}
                  </p>
                </div>

                {/* Ortho Snapshot Parameters */}
                <div className="space-y-2 pt-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Skeletal / Dental
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formData.skeletalClass || '—'} / {formData.dentalClass || '—'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Bracket & Slot
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {formData.bracketSystem || 'Standard'} ({formData.slot || '0.022"'})
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Overjet / Overbite
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      OJ: {formData.overjet || '—'} • OB: {formData.overbite || '—'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Treated Arch
                    </span>
                    <span className="font-bold text-[#008294] dark:text-teal-400">
                      {formData.treatedArchMax ? 'MAX' : ''}
                      {formData.treatedArchMax && formData.treatedArchMan ? ' + ' : ''}
                      {formData.treatedArchMan ? 'MAN' : ''}
                      {!formData.treatedArchMax && !formData.treatedArchMan ? 'None' : ''}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Total Ledger Paid
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ${totalPaid.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Consent Status
                    </span>
                    <span
                      className={`font-bold ${
                        formData.consentSigned
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-500'
                      }`}
                    >
                      {formData.consentSigned ? 'Signed & Verified' : 'Unsigned'}
                    </span>
                  </div>
                </div>

                {/* Quick Diagnosis / Complaint note preview */}
                {formData.diagnosis && (
                  <div className="p-3 rounded-xl bg-teal-500/10 border border-[#008294]/20 text-[11px] text-slate-700 dark:text-slate-300">
                    <strong className="text-[#008294] dark:text-teal-400 block mb-0.5">
                      Diagnosis:
                    </strong>
                    {formData.diagnosis}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrthoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="w-8 h-8 border-3 border-[#008294] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OrthoContent />
    </Suspense>
  );
}
