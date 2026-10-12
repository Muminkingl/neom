'use client';

import React from 'react';
import { Patient } from '@/app/context/PatientContext';
import { Paperclip, FileText, Image as ImageIcon, Printer, Plus } from 'lucide-react';

interface PatientDocumentsTabProps {
  patient: Patient;
  onOpenInvestigations: () => void;
  onPrintTreatmentCard: () => void;
  onGeneratePDF: () => void;
}

export default function PatientDocumentsTab({
  patient,
  onOpenInvestigations,
  onPrintTreatmentCard,
  onGeneratePDF,
}: PatientDocumentsTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Paperclip className="size-4 text-[#008294]" />
              <span>Clinical Documents, X-Rays & Reports</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Radiographs, dental photography, signed forms, and treatment cards.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenInvestigations}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#008294] hover:bg-[#007080] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="size-4" />
              <span>Upload X-Ray / Image</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Treatment Card Print */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <Printer className="size-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Treatment Card (A5)
                </h4>
                <p className="text-[11px] text-slate-400">Pre-formatted print layout</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onPrintTreatmentCard}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Print
            </button>
          </div>

          {/* Full PDF Medical Record */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-[#008294]/10 text-[#008294] flex items-center justify-center">
                <FileText className="size-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Full Dental Record PDF
                </h4>
                <p className="text-[11px] text-slate-400">Complete chart & history</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onGeneratePDF}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Export
            </button>
          </div>

          {/* Radiograph Vault */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <ImageIcon className="size-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Investigations Vault
                </h4>
                <p className="text-[11px] text-slate-400">Radiographs & scans</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenInvestigations}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              View
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
