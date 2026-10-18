'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Patient, extractOrthoRecord } from '@/app/context/PatientContext';
import { OrthoIcon } from '@/components/watermelon/library-dashboard/components/library/icons';
import {
  FileText,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Printer,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  ShieldCheck,
  CreditCard,
  UserCheck
} from 'lucide-react';

interface PatientOrthoTabProps {
  patient: Patient | null;
}

export default function PatientOrthoTab({ patient }: PatientOrthoTabProps) {
  const router = useRouter();

  if (!patient) return null;

  const ortho = extractOrthoRecord(patient.tableData);

  // If no ortho record exists or it is completely empty
  const hasOrthoData = Boolean(
    ortho &&
      (ortho.startingDate ||
        ortho.diagnosis ||
        ortho.chiefComplaint ||
        ortho.bracketSystem ||
        ortho.skeletalClass ||
        ortho.dentalClass ||
        ortho.treatmentPlan1 ||
        (ortho.visits && ortho.visits.length > 0))
  );

  const handleStartOrtho = () => {
    router.push(`/dashboard/ortho?patientId=${patient.id}`);
  };

  const handlePrintSheet = () => {
    window.print();
  };

  if (!hasOrthoData || !ortho) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-10 sm:p-14 text-center shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-[#008294] dark:text-teal-400 border border-teal-500/20 flex items-center justify-center mx-auto mb-4 shadow-xs">
          <OrthoIcon className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
          No Orthodontic Record Found
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          There is currently no active orthodontic prescription sheet, cephalometric
          assessment, or bracket log registered for{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {patient.name}
          </span>
          .
        </p>

        <div className="mt-7 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleStartOrtho}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold text-white bg-[#008294] hover:bg-[#006e7d] shadow-md shadow-teal-500/20 transition-all cursor-pointer"
          >
            <OrthoIcon className="w-4 h-4" />
            <span>Create Orthodontic Sheet</span>
            <ArrowUpRight className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </div>
    );
  }

  // Calculate total payments from ortho visits
  const totalOrthoPaid = (ortho.visits || []).reduce((acc, v) => {
    const val = typeof v.payment === 'number' ? v.payment : parseFloat(v.payment) || 0;
    return acc + val;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#008294]/10 text-[#008294] dark:text-teal-400 border border-[#008294]/20 flex items-center justify-center shrink-0">
            <OrthoIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Orthodontic Prescription Sheet
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                Active Record
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {ortho.startingDate ? `Treatment commenced on ${ortho.startingDate}` : 'Orthodontic therapy case'}
              {ortho.updatedAt ? ` • Last updated ${new Date(ortho.updatedAt).toLocaleDateString()}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handlePrintSheet}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Sheet</span>
          </button>
          <button
            type="button"
            onClick={handleStartOrtho}
            className="inline-flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-bold text-white bg-[#008294] hover:bg-[#006e7d] shadow-sm shadow-teal-500/20 transition cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Open in Ortho Suite</span>
          </button>
        </div>
      </div>

      {/* 4 Stat highlight cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1.5">
            <Activity className="w-3.5 h-3.5 text-[#008294]" />
            Classification
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            {ortho.skeletalClass || 'Skeletal —'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {ortho.dentalClass ? `Dental: ${ortho.dentalClass}` : 'Dental unclassified'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1.5">
            <Layers className="w-3.5 h-3.5 text-[#008294]" />
            Appliance & System
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            {ortho.bracketSystem || 'Standard System'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {ortho.slot ? `Slot: ${ortho.slot}` : ''}
            {ortho.applianceLabial ? ' • Labial' : ortho.applianceLingual ? ' • Lingual' : ''}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#008294]" />
            Bite Relationship
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            {ortho.overjet ? `OJ: ${ortho.overjet}` : 'OJ: —'}
            {ortho.overbite ? ` • OB: ${ortho.overbite}` : ' • OB: —'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {ortho.archWidthCrossbite
              ? 'Crossbite'
              : ortho.archWidthScissorbite
              ? 'Scissor bite'
              : ortho.archWidthNormal
              ? 'Normal arch width'
              : 'Arch width —'}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1.5">
            <CreditCard className="w-3.5 h-3.5 text-[#008294]" />
            Total Ortho Payments
          </div>
          <div className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">
            ${totalOrthoPaid.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {(ortho.visits || []).length} progress visit{(ortho.visits || []).length === 1 ? '' : 's'} logged
          </div>
        </div>
      </div>

      {/* Clinical Assessment & Diagnosis Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card 1: Diagnosis & Plan */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#008294]" />
              Clinical Background & Plan
            </h4>
            {ortho.startingDate && (
              <span className="text-[11px] font-mono text-slate-500">
                Start: {ortho.startingDate}
              </span>
            )}
          </div>

          <div className="space-y-3 text-xs">
            {ortho.chiefComplaint && (
              <div>
                <span className="font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                  Chief Complaint:
                </span>
                <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200">
                  {ortho.chiefComplaint}
                </p>
              </div>
            )}

            {ortho.diagnosis && (
              <div>
                <span className="font-bold text-slate-500 dark:text-slate-400 block mb-0.5">
                  Diagnosis:
                </span>
                <p className="p-2.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/20 text-slate-800 dark:text-slate-200 border border-teal-200/50 dark:border-teal-900/40">
                  {ortho.diagnosis}
                </p>
              </div>
            )}

            {(ortho.treatmentPlan1 ||
              ortho.treatmentPlan2 ||
              ortho.treatmentPlan3 ||
              ortho.treatmentPlan4) && (
              <div>
                <span className="font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Treatment Plan Sequence:
                </span>
                <div className="space-y-1.5">
                  {[
                    ortho.treatmentPlan1,
                    ortho.treatmentPlan2,
                    ortho.treatmentPlan3,
                    ortho.treatmentPlan4,
                  ].map(
                    (plan, idx) =>
                      plan && (
                        <div
                          key={idx}
                          className="flex items-start gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                        >
                          <span className="w-4 h-4 rounded-full bg-[#008294] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300">
                            {plan}
                          </span>
                        </div>
                      )
                  )}
                </div>
              </div>
            )}

            {(ortho.dentalHistory || ortho.medicalHistory) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                {ortho.dentalHistory && (
                  <div>
                    <span className="font-bold text-slate-500 dark:text-slate-400 block text-[11px]">
                      Dental History:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                      {ortho.dentalHistory}
                    </p>
                  </div>
                )}
                {ortho.medicalHistory && (
                  <div>
                    <span className="font-bold text-slate-500 dark:text-slate-400 block text-[11px]">
                      Medical History:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 mt-0.5">
                      {ortho.medicalHistory}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Cephalometric & Arch Parameters */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#008294]" />
              Arch & Appliance Details
            </h4>
            <span className="text-[11px] font-semibold text-slate-500">
              Hygiene: {ortho.oralHygiene || 'Unspecified'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                Treated Arch
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                {ortho.treatedArchMax ? `MAX (${ortho.treatedArchMaxStatus || 'Active'})` : ''}
                {ortho.treatedArchMax && ortho.treatedArchMan ? ' • ' : ''}
                {ortho.treatedArchMan ? `MAN (${ortho.treatedArchManStatus || 'Active'})` : ''}
                {!ortho.treatedArchMax && !ortho.treatedArchMan ? 'None' : ''}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                Midline Alignment
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                MAX: {ortho.midlineMax || 'Normal'}
                <br />
                MAN: {ortho.midlineMan || 'Normal'}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                Stripping (IPR)
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                {ortho.strippingOption || 'No'}
                {ortho.strippingMax ? ' (MAX)' : ''}
                {ortho.strippingMan ? ' (MAN)' : ''}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block">
                Impacted Teeth
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                {ortho.impactedTooth || 'None documented'}
              </span>
            </div>
          </div>

          {/* Habits & Notes */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs space-y-2">
            <div>
              <span className="font-bold text-slate-500 dark:text-slate-400 block text-[11px] mb-1">
                Parafunctional Habits:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {ortho.habitTongueThrust && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-semibold text-[11px] border border-amber-200/50">
                    Tongue Thrust
                  </span>
                )}
                {ortho.habitThumbSucking && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-semibold text-[11px] border border-amber-200/50">
                    Thumb Sucking
                  </span>
                )}
                {ortho.habitMouthBreather && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-semibold text-[11px] border border-amber-200/50">
                    Mouth Breather
                  </span>
                )}
                {ortho.habitOther && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                    {ortho.habitOther}
                  </span>
                )}
                {!ortho.habitTongueThrust &&
                  !ortho.habitThumbSucking &&
                  !ortho.habitMouthBreather &&
                  !ortho.habitOther && (
                    <span className="text-slate-400 text-[11px]">None recorded</span>
                  )}
              </div>
            </div>

            {ortho.otherNotes && (
              <div className="mt-2">
                <span className="font-bold text-slate-500 dark:text-slate-400 block text-[11px]">
                  Special Clinical Notes:
                </span>
                <p className="mt-0.5 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl">
                  {ortho.otherNotes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Visits Tracking Log (Sheet 2) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#008294]" />
              Orthodontic Progress Visits Log
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Record of wire changes, activations, adjustments, and installment payments
            </p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-500 block">Total Ledger</span>
            <span className="text-sm font-mono font-bold text-[#008294] dark:text-teal-400">
              ${totalOrthoPaid.toLocaleString()}
            </span>
          </div>
        </div>

        {ortho.visits && ortho.visits.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold">
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3 w-32">Date</th>
                  <th className="py-2.5 px-3">Procedure & Wire Activation</th>
                  <th className="py-2.5 px-3 w-28 text-right">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {ortho.visits.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300 font-semibold whitespace-nowrap">
                      {row.date || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-800 dark:text-slate-200">
                      {row.procedure || 'Regular archwire inspection'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {row.payment ? `$${Number(row.payment).toLocaleString()}` : '$0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            No progress visits logged yet. Use the Ortho Suite to add visit activations and payments.
          </div>
        )}

        {/* Legal Consent Acknowledgement clause status */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>
              Treatment agreement & 4 consent clauses:{' '}
              <strong className="text-slate-700 dark:text-slate-300">
                {ortho.consentSigned ? 'Signed & Acknowledged' : 'Pending Signature'}
              </strong>
            </span>
          </div>
          <button
            type="button"
            onClick={handleStartOrtho}
            className="text-[#008294] dark:text-teal-400 hover:underline font-semibold cursor-pointer"
          >
            Manage Visits & Record
          </button>
        </div>
      </div>
    </div>
  );
}
