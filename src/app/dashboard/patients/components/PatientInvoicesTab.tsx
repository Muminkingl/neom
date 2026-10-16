'use client';

import React from 'react';
import { Patient, Visit } from '@/app/context/PatientContext';
import { Receipt, DollarSign, CreditCard, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';

interface PatientInvoicesTabProps {
  patient: Patient;
  visits: Visit[];
}

export default function PatientInvoicesTab({ patient, visits }: PatientInvoicesTabProps) {
  // Aggregate financial metrics across visits + patient record
  const totalInvoiced = visits.reduce((acc, v) => acc + (Number(v.total_cost || v.totalCost) || 0), Number(patient.totalCost) || 0);
  const totalPaid = visits.reduce((acc, v) => acc + (Number(v.amount_paid || v.amountPaid) || 0), Number(patient.amountPaid) || 0);
  const totalDue = Math.max(0, totalInvoiced - totalPaid);

  // Format clean service description without dumping raw tooth pathology notes
  const getInvoiceDescription = (rawTreatment?: string, visitIndex?: number) => {
    if (!rawTreatment || rawTreatment.trim() === '' || rawTreatment.startsWith('Tooth #')) {
      return `Visit #${visitIndex} — Dental Consultation & Clinical Services`;
    }
    return `Visit #${visitIndex} — ${rawTreatment}`;
  };

  return (
    <div className="space-y-6">
      {/* 3 Metric Cards with Neom Medical Aesthetics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-[22px] bg-white dark:bg-[#111719] border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Invoiced</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
            ${totalInvoiced.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Cumulative clinic billings</span>
        </div>

        <div className="p-5 rounded-[22px] bg-white dark:bg-[#111719] border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Total Paid</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
            ${totalPaid.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Received payments</span>
        </div>

        <div className={`p-5 rounded-[22px] border shadow-xs ${
          totalDue > 0
            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
            : 'bg-white dark:bg-[#111719] border-slate-200/80 dark:border-slate-800'
        }`}>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Balance Due</span>
          <div className={`text-2xl sm:text-3xl font-extrabold font-mono ${totalDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
            ${totalDue.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {totalDue > 0 ? 'Outstanding patient liability' : 'All accounts settled'}
          </span>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white dark:bg-[#111719] border border-slate-200/80 dark:border-slate-800 rounded-[22px] p-5 sm:p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <Receipt className="w-4 h-4 text-[#008294]" />
          <span>Billing Records & Invoices</span>
        </h3>

        {visits.length > 0 || totalInvoiced > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {visits.map((v, i) => {
              const cost = Number(v.total_cost || 0);
              const paid = Number(v.amount_paid || 0);
              const due = Math.max(0, cost - paid);
              const visitNum = visits.length - i;

              return (
                <div key={v.id || i} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-[#008294] dark:text-teal-400 flex items-center justify-center font-bold shrink-0 mt-0.5">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {getInvoiceDescription(v.treatment, visitNum)}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(v.visited_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center font-mono">
                    <div className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base">
                      ${cost.toLocaleString()}
                    </div>
                    <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Paid: ${paid.toLocaleString()}
                      {due > 0 && (
                        <span className="text-rose-600 dark:text-rose-400 ml-1.5 font-bold">
                          (${due.toLocaleString()} Due)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">
            No invoice or payment records logged yet.
          </div>
        )}
      </div>
    </div>
  );
}
