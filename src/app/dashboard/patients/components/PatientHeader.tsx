'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Patient } from '@/app/context/PatientContext';
import {
  ChevronRight,
  ChevronDown,
  UserCheck,
  User,
  Users,
  Printer,
  Edit2,
  Calendar,
  Search,
  Trash2,
} from 'lucide-react';

interface PatientHeaderProps {
  patient: Patient;
  allPatients: Patient[];
  onSelectPatient: (patient: Patient) => void;
  onOpenDirectory: () => void;
  onEditPatient: () => void;
  onPrintPatient: () => void;
  onDeletePatient?: () => void;
  currentSectionTitle?: string;
}

export default function PatientHeader({
  patient,
  allPatients,
  onSelectPatient,
  onOpenDirectory,
  onEditPatient,
  onPrintPatient,
  onDeletePatient,
  currentSectionTitle = 'Dental history',
}: PatientHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const filtered = allPatients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (p.mobileNumber && p.mobileNumber.includes(searchFilter)) ||
      (p.clinicId && p.clinicId.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Breadcrumb matching screenshot: Clinic > Patients > Patient Name > Section */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 font-medium">
        <Link
          href="/dashboard"
          className="hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          Neom Clinic
        </Link>
        <ChevronRight className="size-3.5 text-slate-300 dark:text-slate-600" />
        <button
          type="button"
          onClick={onOpenDirectory}
          className="hover:text-[#008294] transition-colors cursor-pointer"
        >
          Patients
        </button>
        <ChevronRight className="size-3.5 text-slate-300 dark:text-slate-600" />
        <span className="text-slate-700 dark:text-slate-300 font-semibold truncate max-w-48 sm:max-w-none">
          {patient.name}
        </span>
        <ChevronRight className="size-3.5 text-slate-300 dark:text-slate-600" />
        <span className="text-slate-900 dark:text-white font-bold">{currentSectionTitle}</span>
      </div>

      {/* Main Patient Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Patient Name & Subtitle */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {patient.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            Manage patient details and records.
          </p>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onEditPatient}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Edit Patient Details"
          >
            <Edit2 className="size-4 text-slate-500" />
            <span className="hidden sm:inline">Edit Patient</span>
          </button>

          <button
            type="button"
            onClick={onPrintPatient}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Print Patient Card / PDF"
          >
            <Printer className="size-4 text-slate-500" />
            <span className="hidden sm:inline">Print Record</span>
          </button>

          {onDeletePatient && (
            <button
              type="button"
              onClick={onDeletePatient}
              className="p-2 sm:px-3 sm:py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Delete Patient Record"
            >
              <Trash2 className="size-4 text-rose-500" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenDirectory}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Back to All Patients"
          >
            <Users className="size-4" />
            <span className="hidden sm:inline">Directory</span>
          </button>
        </div>
      </div>
    </div>
  );
}
