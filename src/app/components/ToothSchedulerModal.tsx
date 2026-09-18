"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Tilt from 'react-parallax-tilt';
import { usePatients, Patient, ToothSchedule, extractToothSchedulesFromTableData } from '../context/PatientContext';
import {
  PERMANENT_TEETH_COORDS,
  DECIDUOUS_TEETH_COORDS,
  ToothCoord,
  CONDITION_CONFIG,
  ToothCondition,
  parseEffectiveAge,
} from './DentitionChart';
import { Badge } from './ui/badge';

interface ToothSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  initialToothId?: string;
  onScheduled?: (schedule: ToothSchedule) => void;
}

const COMMON_PROCEDURES = [
  { label: "Drill & Composite Fill", icon: "🦷", category: "Restorative" },
  { label: "RCT - Cleaning & Shaping", icon: "⚡", category: "Endodontics" },
  { label: "RCT - Final Obturation", icon: "⚡", category: "Endodontics" },
  { label: "Crown Preparation & Impression", icon: "👑", category: "Prosthodontics" },
  { label: "Crown / Bridge Cementation", icon: "💎", category: "Prosthodontics" },
  { label: "Tooth Extraction", icon: "🛠️", category: "Surgery" },
  { label: "Deep Scaling & Root Planing", icon: "🪥", category: "Periodontics" },
  { label: "Post & Core Build-up", icon: "🔩", category: "Restorative" },
  { label: "Follow-up & Polish", icon: "🔍", category: "Review" },
];

export default function ToothSchedulerModal({
  isOpen,
  onClose,
  patient,
  initialToothId,
  onScheduled,
}: ToothSchedulerModalProps) {
  const { scheduleToothProcedure } = usePatients();

  // Determine age for initial dentition view (pediatric vs adult)
  const patientAge = useMemo(() => {
    return parseEffectiveAge(patient.dob);
  }, [patient.dob]);

  const [isDentitionDeciduous, setIsDentitionDeciduous] = useState<boolean>(
    Boolean(patientAge !== null && patientAge < 12)
  );

  const [selectedToothId, setSelectedToothId] = useState<string>(initialToothId || '16');
  const [hoveredTooth, setHoveredTooth] = useState<ToothCoord | null>(null);

  const [procedure, setProcedure] = useState<string>('Drill & Composite Fill');
  const [customProcedure, setCustomProcedure] = useState<string>('');
  const [isCustomProcedure, setIsCustomProcedure] = useState<boolean>(false);
  const [targetDate, setTargetDate] = useState<string>('');
  const [targetTime, setTargetTime] = useState<string>('10:00');
  const [notes, setNotes] = useState<string>('');
  const [activePreset, setActivePreset] = useState<string>('in_2_days');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to add days to today
  const addDaysToToday = (days: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // Set default target date to "In 2 Days" on open
  useEffect(() => {
    if (isOpen) {
      if (initialToothId) {
        setSelectedToothId(initialToothId);
      }
      setTargetDate(addDaysToToday(2));
      setActivePreset('in_2_days');
      setError(null);
      setIsSubmitting(false);
      // Auto-set deciduous if young child
      if (patientAge !== null && patientAge < 8) {
        setIsDentitionDeciduous(true);
      }
    }
  }, [isOpen, initialToothId, patientAge]);

  // Teeth coordinates based on selected jaw arch
  const currentTeethCoords = useMemo(() => {
    return isDentitionDeciduous ? DECIDUOUS_TEETH_COORDS : PERMANENT_TEETH_COORDS;
  }, [isDentitionDeciduous]);

  // Selected tooth definition
  const selectedTooth = useMemo(() => {
    return (
      currentTeethCoords.find((t) => t.id === selectedToothId) ||
      PERMANENT_TEETH_COORDS.find((t) => t.id === selectedToothId) ||
      PERMANENT_TEETH_COORDS[2] // Tooth 16 fallback
    );
  }, [selectedToothId, currentTeethCoords]);

  // Chart data already saved for this patient
  const patientTeethData: Record<string, { condition: ToothCondition; surfaces?: string[]; notes?: string }> = useMemo(() => {
    if (!patient.tableData) return {};
    try {
      const parsed = JSON.parse(patient.tableData);
      return parsed.teeth || {};
    } catch {
      return {};
    }
  }, [patient.tableData]);

  // Existing schedules for this patient
  const existingToothSchedules = useMemo(() => {
    return extractToothSchedulesFromTableData(patient.tableData);
  }, [patient.tableData]);

  const scheduledToothIds = useMemo(() => {
    return new Set(
      existingToothSchedules
        .filter((s) => s.status !== 'Completed' && s.status !== 'Cancelled')
        .map((s) => s.toothId)
    );
  }, [existingToothSchedules]);

  if (!isOpen) return null;

  const handlePresetDate = (days: number, presetKey: string) => {
    setActivePreset(presetKey);
    setTargetDate(addDaysToToday(days));
  };

  const handleCustomDateChange = (val: string) => {
    setActivePreset('custom');
    setTargetDate(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalProcedure = isCustomProcedure ? customProcedure.trim() : procedure;
    if (!finalProcedure) {
      setError('Please select or specify a dental procedure.');
      return;
    }

    if (!targetDate) {
      setError('Please choose a target procedure date.');
      return;
    }

    try {
      setIsSubmitting(true);
      const newSchedule = await scheduleToothProcedure({
        patientId: patient.id,
        patientName: patient.name,
        clinicId: patient.clinicId,
        toothId: selectedTooth.id,
        palmer: selectedTooth.palmer,
        toothName: selectedTooth.name,
        procedure: finalProcedure,
        targetDate,
        targetTime,
        status: 'Scheduled',
        notes: notes.trim(),
      });

      if (onScheduled) {
        onScheduled(newSchedule);
      }
      onClose();
    } catch (err) {
      console.error('Failed to schedule tooth procedure:', err);
      setError(err instanceof Error ? err.message : 'Failed to schedule procedure');
    } finally {
      setIsSubmitting(false);
    }
  };

  const imageSrc = isDentitionDeciduous ? '/dental-deciduous.jpg' : '/dental-permanent.png';
  const selectedToothCondition = patientTeethData[selectedTooth.id]?.condition || 'sound';
  const conditionConf = CONDITION_CONFIG[selectedToothCondition] || CONDITION_CONFIG.sound;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-amber-500/20">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Dental Tooth Procedure Scheduler
                </h2>
                <Badge variant="tooth">Interactive 3D Chart</Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Patient: <span className="font-semibold text-slate-800 dark:text-slate-200">{patient.name}</span>
                {patient.clinicId && (
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">
                    ID: {patient.clinicId}
                  </span>
                )}
                {patient.dob && (
                  <span className="ml-2 text-[11px] text-slate-400">
                    (Age/DOB: {patient.dob})
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body: Split into Left = Actual Dental Chart, Right = Scheduling Controls */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-0">
          
          {/* ── LEFT COLUMN: THE ACTUAL 3D DENTAL JAW CHART (7 cols) ── */}
          <div className="lg:col-span-7 p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-[#0a0c10] flex flex-col justify-between text-white select-none">
            
            {/* Chart Toolbar */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🦷</span>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                    {isDentitionDeciduous
                      ? "Primary Dentition (Deciduous · 20 Teeth)"
                      : "Permanent Dentition (Adult · 32 Teeth)"}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Click any tooth on the jaw graphic below to target it
                  </p>
                </div>
              </div>

              {/* Toggle Dentition */}
              <button
                type="button"
                onClick={() => setIsDentitionDeciduous(!isDentitionDeciduous)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 transition-colors cursor-pointer shrink-0"
              >
                {isDentitionDeciduous ? "Adult (32 Teeth)" : "Primary (20 Teeth)"}
              </button>
            </div>

            {/* 3D Photorealistic Dental Jaw Container */}
            <div className="flex-1 flex items-center justify-center my-2">
              <Tilt
                perspective={1200}
                tiltMaxAngleX={10}
                tiltMaxAngleY={10}
                scale={1.01}
                glareEnable={true}
                glareMaxOpacity={0.18}
                glareColor="#ffffff"
                glarePosition="all"
                glareBorderRadius="1.25rem"
                className="relative w-full max-w-[420px] aspect-square rounded-2xl overflow-hidden bg-black shadow-2xl border border-gray-800 cursor-crosshair"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Photorealistic Dental Render */}
                <Image
                  src={imageSrc}
                  alt={isDentitionDeciduous ? "Primary Teeth" : "Permanent Teeth"}
                  fill
                  className="object-cover pointer-events-none rounded-2xl"
                  priority
                  style={{ transform: 'translateZ(0px)' }}
                />

                {/* 3D Floating Quadrant Legend Labels */}
                <div
                  className="absolute top-2.5 left-3 text-[9px] font-mono font-bold text-white/40 tracking-wider pointer-events-none z-10"
                  style={{ transform: 'translateZ(14px)' }}
                >
                  RIGHT (UR ┘)
                </div>
                <div
                  className="absolute top-2.5 right-3 text-[9px] font-mono font-bold text-white/40 tracking-wider pointer-events-none z-10"
                  style={{ transform: 'translateZ(14px)' }}
                >
                  LEFT (UL └)
                </div>
                <div
                  className="absolute bottom-2.5 left-3 text-[9px] font-mono font-bold text-white/40 tracking-wider pointer-events-none z-10"
                  style={{ transform: 'translateZ(14px)' }}
                >
                  RIGHT (LR ┐)
                </div>
                <div
                  className="absolute bottom-2.5 right-3 text-[9px] font-mono font-bold text-white/40 tracking-wider pointer-events-none z-10"
                  style={{ transform: 'translateZ(14px)' }}
                >
                  LEFT (LL ┌)
                </div>

                {/* Interactive Anatomical Tooth Hotspots */}
                {currentTeethCoords.map((coord) => {
                  const saved = patientTeethData[coord.id];
                  const condition: ToothCondition = saved?.condition || 'sound';
                  const hasCondition = condition !== 'sound';
                  const conf = CONDITION_CONFIG[condition] || CONDITION_CONFIG.sound;
                  const isSelected = coord.id === selectedToothId;
                  const isHovered = hoveredTooth?.id === coord.id;
                  const isScheduled = scheduledToothIds.has(coord.id);

                  return (
                    <button
                      key={coord.id}
                      type="button"
                      onClick={() => setSelectedToothId(coord.id)}
                      onMouseEnter={() => setHoveredTooth(coord)}
                      onMouseLeave={() => setHoveredTooth(null)}
                      style={{
                        left: `${coord.x}%`,
                        top: `${coord.y}%`,
                        width: `${coord.width}px`,
                        height: `${coord.height}px`,
                        transform: isSelected
                          ? 'translate3d(-50%, -50%, 36px) scale(1.18)'
                          : isHovered
                          ? 'translate3d(-50%, -50%, 28px) scale(1.10)'
                          : hasCondition
                          ? 'translate3d(-50%, -50%, 18px)'
                          : 'translate3d(-50%, -50%, 10px)',
                        transformStyle: 'preserve-3d',
                      }}
                      className="absolute group cursor-pointer focus:outline-none flex items-center justify-center transition-all duration-150 z-20"
                      title={`${coord.name} (Palmer: ${coord.palmer}, FDI: #${coord.id})`}
                    >
                      {/* Highlight Ring */}
                      <div
                        className={`relative w-full h-full rounded-2xl flex items-center justify-center transition-all duration-150 ${
                          isSelected
                            ? 'ring-3 ring-amber-400 bg-amber-500/30 backdrop-blur-[0.5px] shadow-[0_0_20px_rgba(245,158,11,0.95)]'
                            : isHovered
                            ? 'ring-2 ring-indigo-400 bg-indigo-500/20 backdrop-blur-[0.5px] shadow-[0_0_14px_rgba(99,102,241,0.8)]'
                            : hasCondition
                            ? 'ring-1.5 backdrop-blur-[0.5px]'
                            : 'hover:bg-white/10'
                        }`}
                        style={{
                          borderColor: !isSelected && hasCondition ? conf.dotColor : undefined,
                          boxShadow: !isSelected && hasCondition ? `0 0 8px ${conf.dotColor}80` : undefined,
                          backgroundColor: !isSelected && hasCondition ? `${conf.dotColor}25` : undefined,
                        }}
                      >
                        {/* Selected Target Floating Badge */}
                        {isSelected && (
                          <span
                            className="absolute -top-6 px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black tracking-wider shadow-lg whitespace-nowrap z-40 animate-pulse"
                            style={{ transform: 'translateZ(20px)' }}
                          >
                            🎯 #{coord.id} ({coord.palmer})
                          </span>
                        )}

                        {/* Charted Pathology Dot Indicator */}
                        {hasCondition && !isSelected && (
                          <span
                            className="w-2.5 h-2.5 rounded-full shadow border border-white/70"
                            style={{ backgroundColor: conf.dotColor }}
                          />
                        )}

                        {/* Scheduled Procedure Indicator */}
                        {isScheduled && !isSelected && (
                          <span className="absolute -bottom-2 px-1 py-0.2 rounded-full bg-amber-500 text-black font-extrabold text-[8px] shadow">
                            ⚡
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </Tilt>
            </div>

            {/* Live Chart HUD / Status Bar */}
            <div className="mt-2 p-2.5 rounded-xl bg-gray-900/90 border border-gray-800 text-xs flex items-center justify-between">
              {hoveredTooth ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-indigo-600 px-2 py-0.5 rounded text-white shadow">
                    {hoveredTooth.palmer}
                  </span>
                  <span className="font-semibold text-white">#{hoveredTooth.id} · {hoveredTooth.name}</span>
                  {patientTeethData[hoveredTooth.id] && (
                    <span
                      className="text-[10px] font-bold uppercase ml-1"
                      style={{ color: (CONDITION_CONFIG[patientTeethData[hoveredTooth.id].condition] || CONDITION_CONFIG.sound).dotColor }}
                    >
                      ({patientTeethData[hoveredTooth.id].condition})
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                  <span>Target Selected:</span>
                  <span className="font-bold text-amber-400">
                    Tooth #{selectedTooth.id} ({selectedTooth.palmer}) · {selectedTooth.name}
                  </span>
                </div>
              )}

              <span className="text-[10px] text-slate-500 shrink-0">
                Palmer: {selectedTooth.palmer}
              </span>
            </div>
          </div>

          {/* ── RIGHT COLUMN: PROCEDURE & SCHEDULING CONTROLS (5 cols) ── */}
          <div className="lg:col-span-5 p-5 flex flex-col justify-between overflow-y-auto space-y-5 bg-white dark:bg-gray-900">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {error && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300">
                  ⚠️ {error}
                </div>
              )}

              {/* 1. Selected Tooth Identity Banner */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex flex-col items-center justify-center font-mono font-bold shadow-md shadow-amber-500/30">
                    <span className="text-[11px] leading-tight">#{selectedTooth.id}</span>
                    <span className="text-sm font-black leading-tight">{selectedTooth.palmer}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedTooth.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Palmer: <span className="font-bold text-amber-700 dark:text-amber-400">{selectedTooth.palmer}</span> • Arch: {selectedTooth.arch}
                    </p>
                    {selectedToothCondition !== 'sound' && (
                      <span className="inline-block text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                        Flagged: {conditionConf.label}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant="tooth">Selected Target</Badge>
              </div>

              {/* 2. Clinical Procedure Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Procedure for Tooth #{selectedTooth.id} ({selectedTooth.palmer})
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {COMMON_PROCEDURES.map((p) => {
                    const isSelected = !isCustomProcedure && procedure === p.label;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => {
                          setIsCustomProcedure(false);
                          setProcedure(p.label);
                        }}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-900 dark:text-indigo-200 font-bold shadow-xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                        }`}
                      >
                        <span className="text-sm">{p.icon}</span>
                        <span className="flex-1 truncate">{p.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Procedure Toggle */}
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setIsCustomProcedure(!isCustomProcedure)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>✏️</span>
                    <span>{isCustomProcedure ? "Pick from standard presets" : "Enter custom procedure / notes"}</span>
                  </button>

                  {isCustomProcedure && (
                    <input
                      type="text"
                      placeholder="e.g. Drill tooth 16 disto-occlusal, shade A2 composite..."
                      value={customProcedure}
                      onChange={(e) => setCustomProcedure(e.target.value)}
                      className="mt-2 w-full px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                      autoFocus
                    />
                  )}
                </div>
              </div>

              {/* 3. Target Date & Smart Presets */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Target Timing (When to perform)
                </label>

                {/* Fast Presets Chips */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {[
                    { label: '⚡ Tomorrow', days: 1, key: 'tomorrow' },
                    { label: '⚡ In 2 Days', days: 2, key: 'in_2_days' },
                    { label: '⚡ In 3 Days', days: 3, key: 'in_3_days' },
                    { label: '🗓️ In 1 Wk', days: 7, key: 'in_1_week' },
                    { label: '🗓️ In 2 Wks', days: 14, key: 'in_2_weeks' },
                  ].map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => handlePresetDate(preset.days, preset.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activePreset === preset.key
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Date & Time Picker */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Date (YYYY-MM-DD)
                    </label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => handleCustomDateChange(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                      Time (HH:MM)
                    </label>
                    <input
                      type="time"
                      value={targetTime}
                      onChange={(e) => setTargetTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Doctor Instructions */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Doctor Clinical Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Lidocaine 2%, rubber dam, prepare shade A2..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Saving Schedule…</span>
                    </>
                  ) : (
                    <>
                      <span className="text-sm">⚡</span>
                      <span>Schedule Tooth #{selectedTooth.id} ({selectedTooth.palmer})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
