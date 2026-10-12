'use client';

import React from 'react';
import { Patient, Visit, ToothSchedule } from '@/app/context/PatientContext';
import {
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
} from 'lucide-react';

interface PatientAppointmentsTabProps {
  patient: Patient;
  visits: Visit[];
  schedules: ToothSchedule[];
  onOpenScheduler: (toothId?: string) => void;
  onLogVisit: () => void;
  onGenerateVisitReport: (visit: Visit) => void;
}

export default function PatientAppointmentsTab({
  patient,
  visits,
  schedules,
  onOpenScheduler,
  onLogVisit,
  onGenerateVisitReport,
}: PatientAppointmentsTabProps) {
  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Scheduled Tooth Procedures Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="size-4 text-[#008294]" />
              <span>Scheduled Tooth Procedures ({schedules.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Specific dental treatments planned for teeth with target dates and times.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenScheduler()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#008294] hover:bg-[#007080] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="size-4" />
            <span>Schedule Tooth Procedure</span>
          </button>
        </div>

        {schedules.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {schedules.map((sch) => (
              <div
                key={sch.id}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="size-9 rounded-xl bg-[#008294]/15 text-[#008294] font-bold text-xs flex items-center justify-center font-mono">
                      #{sch.toothId}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                        {sch.procedure || 'Tooth Procedure'}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {sch.palmer ? `Palmer ${sch.palmer}` : `Tooth #${sch.toothId}`}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      sch.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {sch.status}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Clock className="size-3.5 text-[#008294]" />
                    <span>{sch.targetDate} {sch.targetTime ? `@ ${sch.targetTime}` : ''}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            No tooth procedures currently scheduled. Click &quot;Schedule Tooth Procedure&quot; to plan next visit.
          </div>
        )}
      </div>

      {/* Visits History Timeline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="size-4 text-[#008294]" />
              <span>Visits & Appointments History ({visits.length})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Complete chronological clinical log of patient consultations and procedures.
            </p>
          </div>

          <button
            type="button"
            onClick={onLogVisit}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            <Plus className="size-4" />
            <span>Record Return Visit</span>
          </button>
        </div>

        {visits.length > 0 ? (
          <div className="space-y-4">
            {visits.map((v, index) => (
              <div
                key={v.id}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="size-6 rounded-full bg-[#008294] text-white text-[11px] font-bold flex items-center justify-center">
                      {visits.length - index}
                    </span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      Visit on {formatDate(v.visited_at)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onGenerateVisitReport(v)}
                    className="text-xs font-semibold text-[#008294] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                  >
                    <FileText className="size-3.5" />
                    <span>Download Visit Report</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  {v.diagnosis && (
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Diagnosis</span>
                      <span className="text-slate-700 dark:text-slate-200 font-medium">{v.diagnosis}</span>
                    </div>
                  )}

                  {v.treatment && (
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Treatment Rendered</span>
                      <span className="text-slate-700 dark:text-slate-200 font-medium">{v.treatment}</span>
                    </div>
                  )}

                  {v.total_cost !== undefined && v.total_cost !== null && (
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Visit Billed</span>
                      <span className="text-slate-900 dark:text-white font-mono font-bold">
                        ${Number(v.total_cost).toLocaleString()} (Paid: ${Number(v.amount_paid || 0).toLocaleString()})
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            No visits recorded yet for this patient. Click &quot;Record Return Visit&quot; when the patient arrives.
          </div>
        )}
      </div>
    </div>
  );
}
