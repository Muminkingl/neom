"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { BiSolidPencil } from 'react-icons/bi';
import { FaCircleCheck } from 'react-icons/fa6';
import { BsDashCircleFill } from 'react-icons/bs';
import { MdTimelapse } from 'react-icons/md';
import { LuTimer } from 'react-icons/lu';
import { Appointment } from '../app/context/PatientContext';

interface ScheduleStatusBadgeProps {
  status: Appointment['status'];
  onChange: (newStatus: Appointment['status']) => void;
  disabled?: boolean;
}

const STATUS_CONFIGS: Record<
  Appointment['status'],
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    colorId: string;
    badgeBg: string;
    badgeBorder: string;
    text: string;
    dot: string;
    description: string;
  }
> = {
  Scheduled: {
    label: 'Scheduled',
    icon: LuTimer,
    colorId: 'teal',
    badgeBg: 'bg-teal-500/10 dark:bg-teal-500/20',
    badgeBorder: 'border-teal-500/30 dark:border-teal-500/40',
    text: 'text-teal-700 dark:text-teal-300',
    dot: 'bg-teal-500',
    description: 'Upcoming appointment slot',
  },
  Arrived: {
    label: 'Arrived',
    icon: MdTimelapse,
    colorId: 'amber',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    badgeBorder: 'border-amber-500/30 dark:border-amber-500/40',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    description: 'Patient checked in at clinic',
  },
  Completed: {
    label: 'Completed',
    icon: FaCircleCheck,
    colorId: 'green',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    badgeBorder: 'border-emerald-500/30 dark:border-emerald-500/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    description: 'Visit or procedure finished',
  },
  Cancelled: {
    label: 'Cancelled',
    icon: BsDashCircleFill,
    colorId: 'rose',
    badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20',
    badgeBorder: 'border-rose-500/30 dark:border-rose-500/40',
    text: 'text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-500',
    description: 'Appointment called off',
  },
};

const ALL_STATUSES: Appointment['status'][] = [
  'Scheduled',
  'Arrived',
  'Completed',
  'Cancelled',
];

export function ScheduleStatusBadge({
  status,
  onChange,
  disabled = false,
}: ScheduleStatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const current = STATUS_CONFIGS[status] || STATUS_CONFIGS.Scheduled;
  const CurrentIcon = current.icon;

  return (
    <>
      {/* Badge Button */}
      <motion.button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        whileHover={disabled ? undefined : { scale: 1.03 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        className={`group relative inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold shadow-xs transition-all duration-200 cursor-pointer ${current.badgeBg} ${current.badgeBorder} ${current.text} ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md'}`}
        title="Click to change appointment status"
      >
        <span className={`h-2 w-2 rounded-full ${current.dot} animate-pulse`} />
        <CurrentIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="tracking-tight">{current.label}</span>
        <BiSolidPencil className="h-3 w-3 opacity-40 transition-opacity group-hover:opacity-100" />
      </motion.button>

      {/* Portal Modal Popover (Teleports to document.body, escaping all table overflow clipping) */}
      {mounted && isOpen && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              className="w-full max-w-sm rounded-[24px] border border-gray-100 bg-white p-5 shadow-2xl dark:border-gray-800 dark:bg-[#111719]"
            >
              <div className="mb-4 flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#008294]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                    Update Appointment Status
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                {ALL_STATUSES.map((st) => {
                  const cfg = STATUS_CONFIGS[st];
                  const Icon = cfg.icon;
                  const isSelected = st === status;

                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        onChange(st);
                        setIsOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-2xl p-3 text-left transition-all cursor-pointer border ${
                        isSelected
                          ? `${cfg.badgeBg} ${cfg.badgeBorder} ${cfg.text} ring-2 ring-[#008294]/30 shadow-xs font-bold`
                          : 'border-transparent text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${cfg.badgeBg} ${cfg.text} border ${cfg.badgeBorder}`}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-gray-900 dark:text-white">
                            {cfg.label}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 font-normal">
                            {cfg.description}
                          </div>
                        </div>
                      </div>
                      {isSelected ? (
                        <div className="h-6 w-6 rounded-full bg-[#008294] text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full border border-gray-200 dark:border-gray-700 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
