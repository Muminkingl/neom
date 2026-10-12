'use client';

import React from 'react';
import {
  User,
  ShieldAlert,
  Calendar,
  Receipt,
  Paperclip,
  FileText,
} from 'lucide-react';
import ToothIcon from '@/app/components/ToothIcon';

export type PatientTab =
  | 'profile'
  | 'dental'
  | 'medical'
  | 'appointments'
  | 'invoices'
  | 'documents'
  | 'notes';

interface PatientNavTabsProps {
  activeTab: PatientTab;
  onChangeTab: (tab: PatientTab) => void;
  badgeCounts?: Partial<Record<PatientTab, number>>;
}

const TABS: Array<{ id: PatientTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'dental', label: 'Dental', icon: ToothIcon },
  { id: 'medical', label: 'Medical', icon: ShieldAlert },
  { id: 'appointments', label: 'Appointments', icon: Calendar },
  { id: 'invoices', label: 'Invoices', icon: Receipt },
  { id: 'documents', label: 'Documents', icon: Paperclip },
  { id: 'notes', label: 'Notes', icon: FileText },
];

export default function PatientNavTabs({
  activeTab,
  onChangeTab,
  badgeCounts = {},
}: PatientNavTabsProps) {
  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-1.5 shadow-xs overflow-x-auto">
      <div className="flex items-center gap-1.5 min-w-max">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          const count = badgeCounts[tab.id];

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <Icon className={`size-4 ${isActive ? 'text-[#008294]' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {typeof count === 'number' && count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isActive
                      ? 'bg-[#008294]/15 text-[#008294]'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
