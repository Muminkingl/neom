'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Patient } from '@/app/context/PatientContext';
import {
  Search,
  UserPlus,
  ChevronRight,
  User,
  Phone,
  Calendar,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';

interface PatientDirectoryViewProps {
  patients: Patient[];
  onSelectPatient: (patient: Patient) => void;
  onDeletePatient?: (id: string) => void;
  onExportExcel?: () => void;
}

export default function PatientDirectoryView({
  patients,
  onSelectPatient,
  onDeletePatient,
  onExportExcel,
}: PatientDirectoryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');

  const filtered = patients.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.mobileNumber && p.mobileNumber.includes(searchTerm)) ||
      (p.clinicId && p.clinicId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.hospitalFileNumber && p.hospitalFileNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesGender =
      genderFilter === 'all' ||
      (p.sex && p.sex.toLowerCase() === genderFilter);

    return matchesSearch && matchesGender;
  });

  const calculateAge = (dob: string): number | string => {
    if (!dob) return '—';
    if (/^\d{1,3}$/.test(dob.trim())) return parseInt(dob.trim(), 10);
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return dob;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 0 ? age : 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Patients Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse, manage, and inspect all {patients.length} registered clinic patients.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onExportExcel && (
            <button
              type="button"
              onClick={onExportExcel}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FileSpreadsheet className="size-4 text-emerald-600" />
              <span>Export</span>
            </button>
          )}

          <Link
            href="/dashboard/patient-form"
            className="px-4 py-2 rounded-xl bg-[#008294] hover:bg-[#007080] text-white text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <UserPlus className="size-4" />
            <span>New Patient</span>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="size-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search patient by name, mobile, clinic ID, or file #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#008294]"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold shrink-0">
          {(['all', 'male', 'female'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGenderFilter(g)}
              className={`px-3 py-1.5 rounded-lg capitalize transition-colors cursor-pointer ${
                genderFilter === g
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-6">Patient</th>
                <th className="py-3.5 px-4">Clinic ID</th>
                <th className="py-3.5 px-4">Mobile</th>
                <th className="py-3.5 px-4">Age / Gender</th>
                <th className="py-3.5 px-4">Diagnosis</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.length > 0 ? (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => onSelectPatient(p)}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-xl bg-[#008294]/10 text-[#008294] font-bold text-xs flex items-center justify-center shrink-0">
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-[#008294] transition-colors">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            File: {p.hospitalFileNumber || '—'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-xs text-[#008294]">
                      {p.clinicId || '—'}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {p.mobileNumber || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 capitalize">
                      {calculateAge(p.dob)} yrs • {p.sex || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 max-w-48 truncate">
                      {p.diagnosis || p.treatment || 'Routine checkup'}
                    </td>

                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPatient(p);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 group-hover:bg-[#008294] text-slate-700 group-hover:text-white dark:bg-slate-800 dark:text-slate-300 text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Open Record</span>
                          <ChevronRight className="size-3.5" />
                        </button>
                        {onDeletePatient && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePatient(p.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Delete Patient Record"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No patients matched your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
