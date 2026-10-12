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
} from 'lucide-react';

interface PatientHeaderProps {
  patient: Patient;
  allPatients: Patient[];
  onSelectPatient: (patient: Patient) => void;
  onOpenDirectory: () => void;
  onEditPatient: () => void;
  onPrintPatient: () => void;
  currentSectionTitle?: string;
}

export default function PatientHeader({
  patient,
  allPatients,
  onSelectPatient,
  onOpenDirectory,
  onEditPatient,
  onPrintPatient,
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
        {/* Patient Name & Status */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {patient.name}
            </h1>

            {/* Status Dropdown Pill matching screenshot `New ▾` */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 transition-colors cursor-pointer"
              >
                <span>New</span>
                <ChevronDown className="size-3 text-sky-500" />
              </button>

              {/* Patient Switcher Dropdown */}
              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="relative mb-2">
                      <Search className="size-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search another patient..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-[#008294]"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {filtered.slice(0, 8).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            onSelectPatient(p);
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                            p.id === patient.id
                              ? 'bg-[#008294]/10 text-[#008294] font-bold'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span className="truncate">{p.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {p.clinicId || p.hospitalFileNumber}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          onOpenDirectory();
                        }}
                        className="w-full text-center text-xs font-semibold text-[#008294] hover:underline py-1 flex items-center justify-center gap-1.5"
                      >
                        <Users className="size-3.5" />
                        <span>View All Patients Directory</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            Manage patient details and records.
          </p>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
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
