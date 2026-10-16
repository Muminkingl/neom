'use client';

import React from 'react';
import { Patient } from '@/app/context/PatientContext';
import {
  User,
  Phone,
  Calendar,
  FileText,
  BadgeCheck,
  Building,
  HeartPulse,
  Edit2,
  Clock,
  Trash2,
} from 'lucide-react';

interface PatientProfileTabProps {
  patient: Patient;
  onEdit: () => void;
  onDelete?: () => void;
}

export default function PatientProfileTab({ patient, onEdit, onDelete }: PatientProfileTabProps) {
  const calculateAge = (dob: string): number | string => {
    if (!dob) return 'N/A';
    if (/^\d{1,3}$/.test(dob.trim())) return parseInt(dob.trim(), 10);
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return dob;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 0 ? age : 0;
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleDateString('en-US', {
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
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Personal Details */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <User className="size-4 text-[#008294]" />
              <span>Personal Information</span>
            </h3>
            <button
              type="button"
              onClick={onEdit}
              className="text-xs font-semibold text-[#008294] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Edit2 className="size-3.5" />
              <span>Edit Details</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div>
              <span className="text-xs text-slate-400 font-medium block">Full Name</span>
              <span className="text-slate-800 dark:text-slate-100 font-semibold">
                {patient.name}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-medium block">Phone Number</span>
              <span className="text-slate-800 dark:text-slate-100 font-semibold font-mono">
                {patient.mobileNumber || 'None provided'}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-medium block">Gender</span>
              <span className="text-slate-800 dark:text-slate-100 font-semibold capitalize">
                {patient.sex || 'Not specified'}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-medium block">Age & Birth Date</span>
              <span className="text-slate-800 dark:text-slate-100 font-semibold">
                {calculateAge(patient.dob)} yrs old {patient.dob ? `(${patient.dob})` : ''}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-medium block">Clinic ID</span>
              <span className="text-[#008294] font-bold font-mono">
                {patient.clinicId || 'Auto-generated'}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-medium block">Hospital File #</span>
              <span className="text-slate-800 dark:text-slate-100 font-semibold font-mono">
                {patient.hospitalFileNumber || '—'}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-medium block">Admission Date</span>
              <span className="text-slate-800 dark:text-slate-100 font-semibold">
                {formatDate(patient.createdAt)}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-400 font-medium block">Next Follow-up</span>
              <span className="text-slate-800 dark:text-slate-100 font-semibold">
                {patient.followUpDate || 'None scheduled'}
              </span>
            </div>
          </div>
        </div>

        {/* Diagnosis & Active Case */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <HeartPulse className="size-4 text-[#008294]" />
              <span>Clinical Diagnosis</span>
            </h3>

            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-400 font-medium block">Primary Diagnosis</span>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 mt-1 font-medium bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  {patient.diagnosis || 'No primary diagnosis recorded.'}
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-400 font-medium block">Current Treatment</span>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 mt-1 font-medium bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  {patient.currentTreatment || patient.treatment || 'No ongoing treatment recorded.'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Clock className="size-3.5" />
              <span>Record created {formatDate(patient.createdAt)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Danger Zone: Delete Patient */}
      {onDelete && (
        <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/50 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
              <Trash2 className="size-4 text-rose-600" />
              <span>Delete Patient Record</span>
            </h4>
            <p className="text-xs text-rose-700/80 dark:text-rose-300/70 mt-1">
              Permanently removes {patient.name} and all associated dental charts, clinical visits, appointments, and billing invoices.
            </p>
          </div>
          <button
            type="button"
            onClick={onDelete}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            Delete Patient
          </button>
        </div>
      )}
    </div>
  );
}
