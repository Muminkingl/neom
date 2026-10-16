'use client';

import React, { useState } from 'react';
import { Patient } from '@/app/context/PatientContext';
import { ShieldAlert, Pill, Scissors, History, Save, Check } from 'lucide-react';

interface PatientMedicalTabProps {
  patient: Patient;
  onSaveMedical: (updates: Partial<Patient>) => Promise<void>;
}

export default function PatientMedicalTab({ patient, onSaveMedical }: PatientMedicalTabProps) {
  const [history, setHistory] = useState(patient.history || '');
  const [pastMedicalHistory, setPastMedicalHistory] = useState(patient.pastMedicalHistory || '');
  const [drugHistory, setDrugHistory] = useState(patient.drugHistory || '');
  const [pastSurgicalHistory, setPastSurgicalHistory] = useState(patient.pastSurgicalHistory || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  React.useEffect(() => {
    setHistory(patient.history || '');
    setPastMedicalHistory(patient.pastMedicalHistory || '');
    setDrugHistory(patient.drugHistory || '');
    setPastSurgicalHistory(patient.pastSurgicalHistory || '');
  }, [patient.id, patient.history, patient.pastMedicalHistory, patient.drugHistory, patient.pastSurgicalHistory]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveMedical({
        history,
        pastMedicalHistory,
        drugHistory,
        pastSurgicalHistory,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
    } catch (err: any) {
      console.error('Save medical history error:', err);
      alert(`Failed to save medical history: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldAlert className="size-4 text-[#008294]" />
              <span>Medical & Health History</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Review and record systemic health conditions, ongoing medications, and surgical history.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#008294] hover:bg-[#007080] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            {isSaved ? <Check className="size-4" /> : <Save className="size-4" />}
            <span>{isSaving ? 'Saving...' : isSaved ? 'Saved!' : 'Save Updates'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
          {/* General Dental & Medical History */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <History className="size-3.5 text-[#008294]" />
              <span>Present Dental Complaint & History</span>
            </label>
            <textarea
              rows={4}
              value={history}
              onChange={(e) => setHistory(e.target.value)}
              placeholder="Chief dental complaint, pain severity, duration..."
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-[#008294] focus:outline-hidden resize-none"
            />
          </div>

          {/* Past Medical History */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ShieldAlert className="size-3.5 text-[#008294]" />
              <span>Past Medical History & Systemic Conditions</span>
            </label>
            <textarea
              rows={4}
              value={pastMedicalHistory}
              onChange={(e) => setPastMedicalHistory(e.target.value)}
              placeholder="Diabetes, hypertension, heart conditions, allergies, bleeding disorders..."
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-[#008294] focus:outline-hidden resize-none"
            />
          </div>

          {/* Drug & Medication History */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Pill className="size-3.5 text-[#008294]" />
              <span>Current Medications & Drug History</span>
            </label>
            <textarea
              rows={4}
              value={drugHistory}
              onChange={(e) => setDrugHistory(e.target.value)}
              placeholder="Anticoagulants, bisphosphonates, antibiotics, daily medications..."
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-[#008294] focus:outline-hidden resize-none"
            />
          </div>

          {/* Past Surgical History */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Scissors className="size-3.5 text-[#008294]" />
              <span>Past Surgical & Anesthetic History</span>
            </label>
            <textarea
              rows={4}
              value={pastSurgicalHistory}
              onChange={(e) => setPastSurgicalHistory(e.target.value)}
              placeholder="Prior oral or systemic surgeries, complications with local anesthesia..."
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-[#008294] focus:outline-hidden resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
