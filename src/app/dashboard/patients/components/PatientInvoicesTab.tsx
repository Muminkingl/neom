'use client';

import React from 'react';
import { Patient, Visit } from '@/app/context/PatientContext';
import { Receipt, DollarSign, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PatientInvoicesTabProps {
  patient: Patient;
  visits: Visit[];
}

export default function PatientInvoicesTab({ patient, visits }: PatientInvoicesTabProps) {
  // Aggregate financial metrics across visits + patient record
  const totalInvoiced = visits.reduce((acc, v) => acc + (Number(v.total_cost || v.totalCost) || 0), Number(patient.totalCost) || 0);
  const totalPaid = visits.reduce((acc, v) => acc + (Number(v.amount_paid || v.amountPaid) || 0), Number(patient.amountPaid) || 0);
  const totalDue = Math.max(0, totalInvoiced - totalPaid);

  return (
    <div className="space-y-6">
      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Total Invoiced</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            ${totalInvoiced.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Cumulative clinic billings</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 block mb-1">Total Paid</span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            ${totalPaid.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Received payments</span>
        </div>

        <div className={`p-5 rounded-2xl border shadow-xs ${
          totalDue > 0
            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
        }`}>
          <span className="text-xs font-semibold text-slate-400 block mb-1">Balance Due</span>
          <div className={`text-2xl font-black font-mono ${totalDue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
            ${totalDue.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {totalDue > 0 ? 'Outstanding patient liability' : 'All accounts settled'}
          </span>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <Receipt className="size-4 text-[#008294]" />
          <span>Billing Records & Payments</span>
        </h3>

        {visits.length > 0 || totalInvoiced > 0 ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {visits.map((v, i) => (
              <div key={v.id || i} className="py-3.5 flex items-center justify-between text-xs sm:text-sm">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                    Visit #{visits.length - i} — {v.treatment || 'Consultation & Dental Services'}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {new Date(v.visited_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="font-bold text-slate-900 dark:text-white">
                    ${Number(v.total_cost || 0).toLocaleString()}
                  </div>
                  <div className="text-[11px] text-emerald-600">
                    Paid: ${Number(v.amount_paid || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
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
