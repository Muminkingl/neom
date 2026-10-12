'use client';

import React, { useState } from 'react';
import { Patient } from '@/app/context/PatientContext';
import { FileText, Save, Check, Pill, Stethoscope } from 'lucide-react';

interface PatientNotesTabProps {
  patient: Patient;
  onSaveNotes: (updates: Partial<Patient>) => Promise<void>;
}

export default function PatientNotesTab({ patient, onSaveNotes }: PatientNotesTabProps) {
  const [note, setNote] = useState(patient.note || '');
  const [examination, setExamination] = useState(patient.examination || '');
  const [prescription, setPrescription] = useState(patient.prescription || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveNotes({
        note,
        examination,
        prescription,
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
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
              <FileText className="size-4 text-[#008294]" />
              <span>Clinical Examination, Notes & Prescriptions</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Doctor observations, intraoral findings, and pharmaceutical prescriptions.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#008294] hover:bg-[#007080] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            {isSaved ? <Check className="size-4" /> : <Save className="size-4" />}
            <span>{isSaving ? 'Saving...' : isSaved ? 'Saved!' : 'Save Notes'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm">
          {/* Clinical Examination */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Stethoscope className="size-3.5 text-[#008294]" />
              <span>Intraoral & Extraoral Examination</span>
            </label>
            <textarea
              rows={4}
              value={examination}
              onChange={(e) => setExamination(e.target.value)}
              placeholder="Soft tissue findings, occlusion, periodontium, hygiene..."
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-[#008294] focus:outline-hidden resize-none"
            />
          </div>

          {/* Doctor Clinical Notes */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileText className="size-3.5 text-[#008294]" />
              <span>Clinical Progress Notes</span>
            </label>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Case considerations, doctor notes, patient instructions..."
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-[#008294] focus:outline-hidden resize-none"
            />
          </div>

          {/* Prescriptions */}
          <div className="md:col-span-2 space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Pill className="size-3.5 text-[#008294]" />
              <span>Prescription & Medication Order</span>
            </label>
            <textarea
              rows={3}
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              placeholder="e.g. Amoxicillin 500mg (1 cap TID x 5 days), Ibuprofen 400mg PRN..."
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-mono focus:ring-2 focus:ring-[#008294] focus:outline-hidden resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
