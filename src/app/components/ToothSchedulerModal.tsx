"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { usePatients, Patient, ToothSchedule, extractToothSchedulesFromTableData } from '../context/PatientContext';
import {
  PERMANENT_TEETH_COORDS,
  DECIDUOUS_TEETH_COORDS,
  ToothCoord,
  ToothRecord,
  ToothSurface,
  ToothInspectorModal,
  CONDITION_CONFIG,
  ToothCondition,
  parseEffectiveAge,
  findToothCoord,
  ClinicalOdontogram,
} from './DentitionChart';
import ToothIcon from './ToothIcon';
import {
  Calendar,
  Pencil,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface ToothSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  initialToothId?: string;
  onScheduled?: (schedule: ToothSchedule) => void;
}

const COMMON_PROCEDURES = [
  { label: "Drill & Composite Fill", category: "Restorative" },
  { label: "RCT - Cleaning & Shaping", category: "Endodontics" },
  { label: "RCT - Final Obturation", category: "Endodontics" },
  { label: "Crown Preparation & Impression", category: "Prosthodontics" },
  { label: "Crown / Bridge Cementation", category: "Prosthodontics" },
  { label: "Tooth Extraction", category: "Surgery" },
  { label: "Deep Scaling & Root Planing", category: "Periodontics" },
  { label: "Post & Core Build-up", category: "Restorative" },
  { label: "Follow-up & Polish", category: "Review" },
];

export default function ToothSchedulerModal({
  isOpen,
  onClose,
  patient,
  initialToothId,
  onScheduled,
}: ToothSchedulerModalProps) {
  const { scheduleToothProcedure, editPatient } = usePatients();

  // Determine age for initial dentition view (pediatric vs adult)
  const patientAge = useMemo(() => {
    return parseEffectiveAge(patient.dob);
  }, [patient.dob]);

  const [isDentitionDeciduous, setIsDentitionDeciduous] = useState<boolean>(
    Boolean(patientAge !== null && patientAge < 12)
  );

  const [selectedToothId, setSelectedToothId] = useState<string>(initialToothId || '16');

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
      findToothCoord(selectedToothId)
    );
  }, [selectedToothId, currentTeethCoords]);

  const [inspectorTooth, setInspectorTooth] = useState<ToothRecord | null>(null);

  // Local state for teeth data synchronized with patient.tableData
  const [localTeethData, setLocalTeethData] = useState<Record<string, { condition: ToothCondition; surfaces?: ToothSurface[]; notes?: string }>>({});

  useEffect(() => {
    if (!patient.tableData) {
      setLocalTeethData({});
      return;
    }
    try {
      const parsed = JSON.parse(patient.tableData);
      setLocalTeethData(parsed.teeth || {});
    } catch {
      setLocalTeethData({});
    }
  }, [patient.tableData, isOpen]);

  const patientTeethData = localTeethData;

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

  const handleToothSelectAndInspect = (toothId: string) => {
    setSelectedToothId(toothId);
    const coord =
      currentTeethCoords.find((t) => t.id === toothId) ||
      PERMANENT_TEETH_COORDS.find((t) => t.id === toothId) ||
      findToothCoord(toothId);
    const existing = localTeethData[toothId];
    setInspectorTooth({
      ...coord,
      condition: (existing?.condition as ToothCondition) || 'sound',
      surfaces: (existing?.surfaces as ToothSurface[]) || [],
      notes: existing?.notes || '',
    });
  };

  const handleSaveToothInspector = async (updated: ToothRecord) => {
    const next = {
      ...localTeethData,
      [updated.id]: {
        condition: updated.condition,
        surfaces: updated.surfaces,
        notes: updated.notes,
      },
    };
    setLocalTeethData(next);
    setSelectedToothId(updated.id);

    try {
      let existing: any = {};
      try {
        if (patient.tableData) existing = JSON.parse(patient.tableData);
      } catch {}
      const updatedTableData = JSON.stringify({
        ...existing,
        type: 'dentition_chart',
        version: 5,
        lastUpdated: new Date().toISOString(),
        teeth: next,
      });
      await editPatient(patient.id, { tableData: updatedTableData });
    } catch (err) {
      console.error('Failed to update tooth diagnosis:', err);
    }
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

  const selectedToothCondition = patientTeethData[selectedTooth.id]?.condition || 'sound';
  const conditionConf = CONDITION_CONFIG[selectedToothCondition] || CONDITION_CONFIG.sound;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-850/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Tooth Procedure Scheduler
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
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
          
          {/* ── LEFT COLUMN: CLINICAL ODONTOGRAM CHART (7 cols) ── */}
          <div className="lg:col-span-7 p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-gray-800 bg-[#0a0c10] flex flex-col gap-3">
            <ClinicalOdontogram
              teethData={patientTeethData as Record<string, { condition: ToothCondition; surfaces: ToothSurface[]; notes?: string }>}
              scheduledToothIds={scheduledToothIds}
              dentitionMode={isDentitionDeciduous ? 'deciduous' : 'permanent'}
              onDentitionModeChange={(m) => setIsDentitionDeciduous(m === 'deciduous')}
              selectedToothId={selectedToothId}
              onToothClick={(tooth) => handleToothSelectAndInspect(tooth.id)}
            />
          </div>

          {/* ── RIGHT COLUMN: PROCEDURE & SCHEDULING CONTROLS (5 cols) ── */}
          <div className="lg:col-span-5 p-5 flex flex-col justify-between overflow-y-auto space-y-5 bg-white dark:bg-gray-900">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {error && (
                <div className="flex items-center gap-1.5 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1. Selected Tooth Identity Banner */}
              <div
                onClick={() => handleToothSelectAndInspect(selectedTooth.id)}
                className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 hover:border-indigo-400/60 dark:hover:border-indigo-500/50 transition-colors flex items-center gap-3 cursor-pointer group"
                title="Click to inspect & edit tooth condition"
              >
                {/* Palmer badge */}
                <div className="w-10 h-10 rounded-lg bg-slate-900 dark:bg-slate-950 border border-slate-700 group-hover:border-indigo-500/50 transition-colors flex flex-col items-center justify-center font-mono shrink-0">
                  <span className="text-[9px] text-slate-500 leading-none">#{selectedTooth.id}</span>
                  <span className="text-sm font-bold leading-tight text-white">{selectedTooth.palmer}</span>
                </div>

                {/* Name + condition */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{selectedTooth.name}</span>
                    {selectedToothCondition !== 'sound' && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${conditionConf.dotColor}18`,
                          color: conditionConf.dotColor,
                          border: `1px solid ${conditionConf.dotColor}35`,
                        }}
                      >
                        {conditionConf.label}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{selectedTooth.arch} arch · click to inspect</p>
                </div>

                {/* Edit icon */}
                <Pencil className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 transition-colors shrink-0" />
              </div>

              {/* 2. Clinical Procedure Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Procedure for Tooth #{selectedTooth.id} ({selectedTooth.palmer})
                  </label>
                  {!isCustomProcedure && (
                    <button
                      type="button"
                      onClick={() => setIsCustomProcedure(true)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                      Custom
                    </button>
                  )}
                </div>

                {!isCustomProcedure ? (
                  <>
                    <select
                      value={procedure}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsCustomProcedure(true);
                        } else {
                          setProcedure(e.target.value);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors"
                    >
                      <optgroup label="Restorative Dentistry">
                        <option value="Drill & Composite Fill">Drill & Composite Fill</option>
                        <option value="Post & Core Build-up">Post & Core Build-up</option>
                      </optgroup>
                      <optgroup label="Endodontics">
                        <option value="RCT - Cleaning & Shaping">RCT - Cleaning & Shaping</option>
                        <option value="RCT - Final Obturation">RCT - Final Obturation</option>
                      </optgroup>
                      <optgroup label="Prosthodontics">
                        <option value="Crown Preparation & Impression">Crown Preparation & Impression</option>
                        <option value="Crown / Bridge Cementation">Crown / Bridge Cementation</option>
                      </optgroup>
                      <optgroup label="Oral Surgery & Periodontics">
                        <option value="Tooth Extraction">Tooth Extraction</option>
                        <option value="Deep Scaling & Root Planing">Deep Scaling & Root Planing</option>
                        <option value="Follow-up & Polish">Follow-up & Polish</option>
                      </optgroup>
                      <option value="__custom__">✏️ Custom / Other Procedure...</option>
                    </select>

                    {/* Quick 1-Click Procedure Chips (clean, neutral, professional) */}
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {[
                        "Drill & Composite Fill",
                        "RCT - Cleaning & Shaping",
                        "Crown Preparation & Impression",
                        "Tooth Extraction",
                        "Follow-up & Polish"
                      ].map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setProcedure(label)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            procedure === label
                              ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-medium">Custom procedure description:</span>
                      <button
                        type="button"
                        onClick={() => setIsCustomProcedure(false)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                      >
                        Back to preset list
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Inlay preparation, Pulpotomy, Bleaching..."
                      value={customProcedure}
                      onChange={(e) => setCustomProcedure(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-400 dark:border-indigo-600 bg-white dark:bg-slate-800 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-900 dark:text-white"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* 3. Target Date & Smart Presets */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Target Timing
                </label>

                {/* Fast Presets Chips (clean, professional) */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {[
                    { label: 'Tomorrow', days: 1, key: 'tomorrow' },
                    { label: 'In 2 Days', days: 2, key: 'in_2_days' },
                    { label: 'In 3 Days', days: 3, key: 'in_3_days' },
                    { label: 'In 1 Wk', days: 7, key: 'in_1_week' },
                    { label: 'In 2 Wks', days: 14, key: 'in_2_weeks' },
                  ].map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => handlePresetDate(preset.days, preset.key)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        activePreset === preset.key
                          ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60'
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
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
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
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
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
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4 text-white" />
                      <span>Schedule Procedure (#{selectedTooth.id} · {selectedTooth.palmer})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ── TOOTH POPUP INSPECTOR & INFO MODAL (Shown when any tooth is clicked / inspected) ── */}
      {inspectorTooth && (
        <ToothInspectorModal
          tooth={inspectorTooth}
          onClose={() => setInspectorTooth(null)}
          onSave={(updated) => {
            handleSaveToothInspector(updated);
            setInspectorTooth(null);
          }}
          onScheduleTooth={(tooth) => {
            handleSaveToothInspector(tooth);
            setSelectedToothId(tooth.id);
            setInspectorTooth(null);
          }}
          zIndex="z-[70]"
        />
      )}
    </div>
  );
}

