"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Tilt from 'react-parallax-tilt';

// ==========================================
// DENTAL DEFINITIONS & PALMER NOTATION
// ==========================================

export type ToothCondition =
  | 'sound'
  | 'caries'
  | 'filled'
  | 'crown'
  | 'missing'
  | 'rct'
  | 'implant'
  | 'fracture';

export type ToothSurface = 'O' | 'M' | 'D' | 'B' | 'L'; // Occlusal/Incisal, Mesial, Distal, Buccal, Lingual

export interface ToothCoord {
  id: string; // FDI id (e.g. "16", "21")
  palmer: string; // Palmer notation display (e.g. "6┘", "└1")
  palmerQuadrant: 'UR' | 'UL' | 'LR' | 'LL';
  palmerNumber: string; // "1" - "8" or "A" - "E"
  name: string;
  x: number; // Percentage from left (0 - 100)
  y: number; // Percentage from top (0 - 100)
  width: number; // Hotspot width
  height: number; // Hotspot height
  arch: 'maxillary' | 'mandibular';
  dentition: 'permanent' | 'deciduous';
}

export interface ToothRecord extends ToothCoord {
  condition: ToothCondition;
  surfaces: ToothSurface[];
  notes?: string;
}

export interface DentitionChartData {
  type: 'dentition_chart';
  version: 5;
  lastUpdated: string;
  patientAge?: number | null;
  teeth: Record<string, {
    condition: ToothCondition;
    surfaces: ToothSurface[];
    notes?: string;
  }>;
}

// ==========================================
// 32 PERMANENT TEETH WITH PALMER NOTATION
// Calibrated to photorealistic dental-permanent.png
// ==========================================
export const PERMANENT_TEETH_COORDS: ToothCoord[] = [
  // ── UPPER RIGHT QUADRANT (UR: 8┘ to 1┘) ──
  { id: '18', palmer: '8┘', palmerQuadrant: 'UR', palmerNumber: '8', name: 'Upper Right 3rd Molar (Wisdom)', x: 18.5, y: 46.5, width: 44, height: 42, arch: 'maxillary', dentition: 'permanent' },
  { id: '17', palmer: '7┘', palmerQuadrant: 'UR', palmerNumber: '7', name: 'Upper Right 2nd Molar', x: 21.0, y: 39.5, width: 44, height: 42, arch: 'maxillary', dentition: 'permanent' },
  { id: '16', palmer: '6┘', palmerQuadrant: 'UR', palmerNumber: '6', name: 'Upper Right 1st Molar', x: 23.5, y: 32.5, width: 44, height: 42, arch: 'maxillary', dentition: 'permanent' },
  { id: '15', palmer: '5┘', palmerQuadrant: 'UR', palmerNumber: '5', name: 'Upper Right 2nd Premolar', x: 26.5, y: 25.5, width: 38, height: 38, arch: 'maxillary', dentition: 'permanent' },
  { id: '14', palmer: '4┘', palmerQuadrant: 'UR', palmerNumber: '4', name: 'Upper Right 1st Premolar', x: 31.5, y: 20.0, width: 38, height: 38, arch: 'maxillary', dentition: 'permanent' },
  { id: '13', palmer: '3┘', palmerQuadrant: 'UR', palmerNumber: '3', name: 'Upper Right Canine', x: 37.0, y: 16.5, width: 36, height: 40, arch: 'maxillary', dentition: 'permanent' },
  { id: '12', palmer: '2┘', palmerQuadrant: 'UR', palmerNumber: '2', name: 'Upper Right Lateral Incisor', x: 42.0, y: 14.5, width: 32, height: 40, arch: 'maxillary', dentition: 'permanent' },
  { id: '11', palmer: '1┘', palmerQuadrant: 'UR', palmerNumber: '1', name: 'Upper Right Central Incisor', x: 46.5, y: 14.0, width: 34, height: 42, arch: 'maxillary', dentition: 'permanent' },

  // ── UPPER LEFT QUADRANT (UL: └1 to └8) ──
  { id: '21', palmer: '└1', palmerQuadrant: 'UL', palmerNumber: '1', name: 'Upper Left Central Incisor', x: 53.5, y: 14.0, width: 34, height: 42, arch: 'maxillary', dentition: 'permanent' },
  { id: '22', palmer: '└2', palmerQuadrant: 'UL', palmerNumber: '2', name: 'Upper Left Lateral Incisor', x: 58.0, y: 14.5, width: 32, height: 40, arch: 'maxillary', dentition: 'permanent' },
  { id: '23', palmer: '└3', palmerQuadrant: 'UL', palmerNumber: '3', name: 'Upper Left Canine', x: 63.0, y: 16.5, width: 36, height: 40, arch: 'maxillary', dentition: 'permanent' },
  { id: '24', palmer: '└4', palmerQuadrant: 'UL', palmerNumber: '4', name: 'Upper Left 1st Premolar', x: 68.5, y: 20.0, width: 38, height: 38, arch: 'maxillary', dentition: 'permanent' },
  { id: '25', palmer: '└5', palmerQuadrant: 'UL', palmerNumber: '5', name: 'Upper Left 2nd Premolar', x: 73.5, y: 25.5, width: 38, height: 38, arch: 'maxillary', dentition: 'permanent' },
  { id: '26', palmer: '└6', palmerQuadrant: 'UL', palmerNumber: '6', name: 'Upper Left 1st Molar', x: 76.5, y: 32.5, width: 44, height: 42, arch: 'maxillary', dentition: 'permanent' },
  { id: '27', palmer: '└7', palmerQuadrant: 'UL', palmerNumber: '7', name: 'Upper Left 2nd Molar', x: 79.0, y: 39.5, width: 44, height: 42, arch: 'maxillary', dentition: 'permanent' },
  { id: '28', palmer: '└8', palmerQuadrant: 'UL', palmerNumber: '8', name: 'Upper Left 3rd Molar (Wisdom)', x: 81.5, y: 46.5, width: 44, height: 42, arch: 'maxillary', dentition: 'permanent' },

  // ── LOWER RIGHT QUADRANT (LR: 8┐ to 1┐) ──
  { id: '48', palmer: '8┐', palmerQuadrant: 'LR', palmerNumber: '8', name: 'Lower Right 3rd Molar (Wisdom)', x: 21.0, y: 56.5, width: 44, height: 42, arch: 'mandibular', dentition: 'permanent' },
  { id: '47', palmer: '7┐', palmerQuadrant: 'LR', palmerNumber: '7', name: 'Lower Right 2nd Molar', x: 23.0, y: 63.5, width: 44, height: 42, arch: 'mandibular', dentition: 'permanent' },
  { id: '46', palmer: '6┐', palmerQuadrant: 'LR', palmerNumber: '6', name: 'Lower Right 1st Molar', x: 25.5, y: 70.0, width: 44, height: 42, arch: 'mandibular', dentition: 'permanent' },
  { id: '45', palmer: '5┐', palmerQuadrant: 'LR', palmerNumber: '5', name: 'Lower Right 2nd Premolar', x: 29.5, y: 75.5, width: 38, height: 38, arch: 'mandibular', dentition: 'permanent' },
  { id: '44', palmer: '4┐', palmerQuadrant: 'LR', palmerNumber: '4', name: 'Lower Right 1st Premolar', x: 34.5, y: 79.0, width: 36, height: 38, arch: 'mandibular', dentition: 'permanent' },
  { id: '43', palmer: '3┐', palmerQuadrant: 'LR', palmerNumber: '3', name: 'Lower Right Canine', x: 40.0, y: 81.5, width: 34, height: 38, arch: 'mandibular', dentition: 'permanent' },
  { id: '42', palmer: '2┐', palmerQuadrant: 'LR', palmerNumber: '2', name: 'Lower Right Lateral Incisor', x: 45.0, y: 82.5, width: 30, height: 38, arch: 'mandibular', dentition: 'permanent' },
  { id: '41', palmer: '1┐', palmerQuadrant: 'LR', palmerNumber: '1', name: 'Lower Right Central Incisor', x: 48.5, y: 83.0, width: 30, height: 38, arch: 'mandibular', dentition: 'permanent' },

  // ── LOWER LEFT QUADRANT (LL: ┌1 to ┌8) ──
  { id: '31', palmer: '┌1', palmerQuadrant: 'LL', palmerNumber: '1', name: 'Lower Left Central Incisor', x: 51.5, y: 83.0, width: 30, height: 38, arch: 'mandibular', dentition: 'permanent' },
  { id: '32', palmer: '┌2', palmerQuadrant: 'LL', palmerNumber: '2', name: 'Lower Left Lateral Incisor', x: 55.0, y: 82.5, width: 30, height: 38, arch: 'mandibular', dentition: 'permanent' },
  { id: '33', palmer: '┌3', palmerQuadrant: 'LL', palmerNumber: '3', name: 'Lower Left Canine', x: 60.0, y: 81.5, width: 34, height: 38, arch: 'mandibular', dentition: 'permanent' },
  { id: '34', palmer: '┌4', palmerQuadrant: 'LL', palmerNumber: '4', name: 'Lower Left 1st Premolar', x: 65.5, y: 79.0, width: 36, height: 38, arch: 'mandibular', dentition: 'permanent' },
  { id: '35', palmer: '┌5', palmerQuadrant: 'LL', palmerNumber: '5', name: 'Lower Left 2nd Premolar', x: 70.5, y: 75.5, width: 38, height: 38, arch: 'mandibular', dentition: 'permanent' },
  { id: '36', palmer: '┌6', palmerQuadrant: 'LL', palmerNumber: '6', name: 'Lower Left 1st Molar', x: 74.5, y: 70.0, width: 44, height: 42, arch: 'mandibular', dentition: 'permanent' },
  { id: '37', palmer: '┌7', palmerQuadrant: 'LL', palmerNumber: '7', name: 'Lower Left 2nd Molar', x: 77.0, y: 63.5, width: 44, height: 42, arch: 'mandibular', dentition: 'permanent' },
  { id: '38', palmer: '┌8', palmerQuadrant: 'LL', palmerNumber: '8', name: 'Lower Left 3rd Molar (Wisdom)', x: 79.0, y: 56.5, width: 44, height: 42, arch: 'mandibular', dentition: 'permanent' },
];

// ==========================================
// 20 DECIDUOUS TEETH WITH PALMER NOTATION
// Calibrated to photorealistic dental-deciduous.jpg
// ==========================================
export const DECIDUOUS_TEETH_COORDS: ToothCoord[] = [
  // Upper Right (E┘ to A┘)
  { id: '55', palmer: 'E┘', palmerQuadrant: 'UR', palmerNumber: 'E', name: 'Primary Upper Right 2nd Molar', x: 23.0, y: 35.0, width: 42, height: 40, arch: 'maxillary', dentition: 'deciduous' },
  { id: '54', palmer: 'D┘', palmerQuadrant: 'UR', palmerNumber: 'D', name: 'Primary Upper Right 1st Molar', x: 28.0, y: 25.0, width: 38, height: 38, arch: 'maxillary', dentition: 'deciduous' },
  { id: '53', palmer: 'C┘', palmerQuadrant: 'UR', palmerNumber: 'C', name: 'Primary Upper Right Canine', x: 35.0, y: 17.0, width: 34, height: 38, arch: 'maxillary', dentition: 'deciduous' },
  { id: '52', palmer: 'B┘', palmerQuadrant: 'UR', palmerNumber: 'B', name: 'Primary Upper Right Lateral Incisor', x: 42.0, y: 14.0, width: 32, height: 38, arch: 'maxillary', dentition: 'deciduous' },
  { id: '51', palmer: 'A┘', palmerQuadrant: 'UR', palmerNumber: 'A', name: 'Primary Upper Right Central Incisor', x: 47.0, y: 13.5, width: 32, height: 40, arch: 'maxillary', dentition: 'deciduous' },

  // Upper Left (└A to └E)
  { id: '61', palmer: '└A', palmerQuadrant: 'UL', palmerNumber: 'A', name: 'Primary Upper Left Central Incisor', x: 53.0, y: 13.5, width: 32, height: 40, arch: 'maxillary', dentition: 'deciduous' },
  { id: '62', palmer: '└B', palmerQuadrant: 'UL', palmerNumber: 'B', name: 'Primary Upper Left Lateral Incisor', x: 58.0, y: 14.0, width: 32, height: 38, arch: 'maxillary', dentition: 'deciduous' },
  { id: '63', palmer: '└C', palmerQuadrant: 'UL', palmerNumber: 'C', name: 'Primary Upper Left Canine', x: 65.0, y: 17.0, width: 34, height: 38, arch: 'maxillary', dentition: 'deciduous' },
  { id: '64', palmer: '└D', palmerQuadrant: 'UL', palmerNumber: 'D', name: 'Primary Upper Left 1st Molar', x: 72.0, y: 25.0, width: 38, height: 38, arch: 'maxillary', dentition: 'deciduous' },
  { id: '65', palmer: '└E', palmerQuadrant: 'UL', palmerNumber: 'E', name: 'Primary Upper Left 2nd Molar', x: 77.0, y: 35.0, width: 42, height: 40, arch: 'maxillary', dentition: 'deciduous' },

  // Lower Right (E┐ to A┐)
  { id: '85', palmer: 'E┐', palmerQuadrant: 'LR', palmerNumber: 'E', name: 'Primary Lower Right 2nd Molar', x: 25.0, y: 64.0, width: 42, height: 40, arch: 'mandibular', dentition: 'deciduous' },
  { id: '84', palmer: 'D┐', palmerQuadrant: 'LR', palmerNumber: 'D', name: 'Primary Lower Right 1st Molar', x: 30.0, y: 73.0, width: 38, height: 38, arch: 'mandibular', dentition: 'deciduous' },
  { id: '83', palmer: 'C┐', palmerQuadrant: 'LR', palmerNumber: 'C', name: 'Primary Lower Right Canine', x: 38.0, y: 79.0, width: 34, height: 38, arch: 'mandibular', dentition: 'deciduous' },
  { id: '82', palmer: 'B┐', palmerQuadrant: 'LR', palmerNumber: 'B', name: 'Primary Lower Right Lateral Incisor', x: 44.0, y: 81.5, width: 30, height: 36, arch: 'mandibular', dentition: 'deciduous' },
  { id: '81', palmer: 'A┐', palmerQuadrant: 'LR', palmerNumber: 'A', name: 'Primary Lower Right Central Incisor', x: 48.0, y: 82.5, width: 30, height: 36, arch: 'mandibular', dentition: 'deciduous' },

  // Lower Left (┌A to ┌E)
  { id: '71', palmer: '┌A', palmerQuadrant: 'LL', palmerNumber: 'A', name: 'Primary Lower Left Central Incisor', x: 52.0, y: 82.5, width: 30, height: 36, arch: 'mandibular', dentition: 'deciduous' },
  { id: '72', palmer: '┌B', palmerQuadrant: 'LL', palmerNumber: 'B', name: 'Primary Lower Left Lateral Incisor', x: 56.0, y: 81.5, width: 30, height: 36, arch: 'mandibular', dentition: 'deciduous' },
  { id: '73', palmer: '┌C', palmerQuadrant: 'LL', palmerNumber: 'C', name: 'Primary Lower Left Canine', x: 62.0, y: 79.0, width: 34, height: 38, arch: 'mandibular', dentition: 'deciduous' },
  { id: '74', palmer: '┌D', palmerQuadrant: 'LL', palmerNumber: 'D', name: 'Primary Lower Left 1st Molar', x: 70.0, y: 73.0, width: 38, height: 38, arch: 'mandibular', dentition: 'deciduous' },
  { id: '75', palmer: '┌E', palmerQuadrant: 'LL', palmerNumber: 'E', name: 'Primary Lower Left 2nd Molar', x: 75.0, y: 64.0, width: 42, height: 40, arch: 'mandibular', dentition: 'deciduous' },
];

export const CONDITION_CONFIG: Record<ToothCondition, {
  label: string;
  badgeBg: string;
  textColor: string;
  dotColor: string;
}> = {
  sound: {
    label: 'Sound / Healthy',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    textColor: 'text-emerald-400',
    dotColor: '#10b981',
  },
  caries: {
    label: 'Caries / Cavity',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    textColor: 'text-rose-400',
    dotColor: '#ef4444',
  },
  filled: {
    label: 'Filled / Restored',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    textColor: 'text-sky-400',
    dotColor: '#0ea5e9',
  },
  crown: {
    label: 'Crown / Cap',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    textColor: 'text-amber-400',
    dotColor: '#f59e0b',
  },
  missing: {
    label: 'Missing / Extracted',
    badgeBg: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
    textColor: 'text-gray-400',
    dotColor: '#9ca3af',
  },
  rct: {
    label: 'Root Canal (RCT)',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    textColor: 'text-purple-400',
    dotColor: '#a855f7',
  },
  implant: {
    label: 'Dental Implant',
    badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    textColor: 'text-teal-400',
    dotColor: '#14b8a6',
  },
  fracture: {
    label: 'Fracture / Trauma',
    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    textColor: 'text-orange-400',
    dotColor: '#f97316',
  },
};

// ==========================================
// CLIENT-SIDE REACTIVE AGE PARSER
// ==========================================
export function parseEffectiveAge(input: string | number | undefined | null): number | null {
  if (input === undefined || input === null) return null;
  if (typeof input === 'number') {
    return isNaN(input) || input < 0 ? null : Math.floor(input);
  }

  const str = input.toString().trim();
  if (!str) return null;

  const numMatch = str.match(/^(\d{1,3})\s*(?:yo|yrs|years|y)?$/i);
  if (numMatch) {
    const val = parseInt(numMatch[1], 10);
    return val <= 130 ? val : null;
  }

  const birthDate = new Date(str);
  if (!isNaN(birthDate.getTime()) && birthDate.getFullYear() > 1900 && birthDate.getFullYear() <= new Date().getFullYear()) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : 0;
  }

  return null;
}

// ==========================================
// TOOTH POPUP INSPECTOR & INFO MODAL
// ==========================================
interface ToothModalProps {
  tooth: ToothRecord | null;
  onClose: () => void;
  onSave: (updatedTooth: ToothRecord) => void;
}

function ToothInspectorModal({ tooth, onClose, onSave }: ToothModalProps) {
  if (!tooth) return null;

  const [currentCondition, setCurrentCondition] = useState<ToothCondition>(tooth.condition);
  const [currentSurfaces, setCurrentSurfaces] = useState<ToothSurface[]>(tooth.surfaces || []);
  const [currentNotes, setCurrentNotes] = useState<string>(tooth.notes || '');

  const toggleSurface = (surf: ToothSurface) => {
    setCurrentSurfaces(prev =>
      prev.includes(surf) ? prev.filter(s => s !== surf) : [...prev, surf]
    );
  };

  const handleSave = () => {
    onSave({
      ...tooth,
      condition: currentCondition,
      surfaces: currentSurfaces,
      notes: currentNotes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scaleUp"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-gray-900 via-gray-900 to-indigo-950/40 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Big Palmer Notation Badge */}
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg border border-indigo-400/40">
              <span className="font-mono text-xl font-black text-white">{tooth.palmer}</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-snug">{tooth.name}</h3>
              <p className="text-[11px] text-gray-400 font-mono flex items-center gap-1.5 mt-0.5">
                <span>FDI #{tooth.id}</span>
                <span>•</span>
                <span className="text-indigo-300 font-semibold">
                  Palmer Quadrant: {tooth.palmerQuadrant}
                </span>
                <span>•</span>
                <span className="capitalize">{tooth.dentition}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Condition Selector */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Tooth Condition
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CONDITION_CONFIG) as ToothCondition[]).map(condKey => {
                const conf = CONDITION_CONFIG[condKey];
                const isSelected = currentCondition === condKey;
                return (
                  <button
                    key={condKey}
                    type="button"
                    onClick={() => setCurrentCondition(condKey)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md ring-1 ring-indigo-400 font-bold'
                        : 'border-gray-800 bg-gray-900/60 text-gray-300 hover:bg-gray-800/80 hover:text-white'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: conf.dotColor }}
                    />
                    <span>{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Surface Multi-select */}
          {(currentCondition === 'caries' || currentCondition === 'filled' || currentCondition === 'fracture') && (
            <div className="bg-gray-900/50 p-3.5 rounded-xl border border-gray-800">
              <label className="block text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-2">
                Surfaces Involved
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'O', label: 'Occlusal/Incisal (O)' },
                  { id: 'M', label: 'Mesial (M)' },
                  { id: 'D', label: 'Distal (D)' },
                  { id: 'B', label: 'Buccal (B)' },
                  { id: 'L', label: 'Lingual/Palatal (L)' },
                ].map(surf => {
                  const active = currentSurfaces.includes(surf.id as ToothSurface);
                  return (
                    <button
                      key={surf.id}
                      type="button"
                      onClick={() => toggleSurface(surf.id as ToothSurface)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        active
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-gray-800/80 text-gray-400 border border-gray-700 hover:text-gray-200'
                      }`}
                    >
                      {surf.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tooth Specific Clinical Notes */}
          <div>
            <label htmlFor="modal-tooth-notes" className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Tooth Information & Treatment Notes
            </label>
            <textarea
              id="modal-tooth-notes"
              rows={3}
              value={currentNotes}
              onChange={e => setCurrentNotes(e.target.value)}
              placeholder={`Add findings or treatment notes for tooth ${tooth.palmer}...`}
              className="w-full px-3.5 py-2.5 bg-gray-900/80 border border-gray-700/80 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white text-xs placeholder-gray-500"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-gray-900/80 border-t border-gray-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setCurrentCondition('sound');
              setCurrentSurfaces([]);
              setCurrentNotes('');
            }}
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors"
          >
            Clear Tooth
          </button>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white bg-gray-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg transition-all"
            >
              Save Tooth
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 3D PARALLAX TILT DENTAL JAW CHART
// Uses react-parallax-tilt + preserve-3d
// ==========================================
interface Tilt3DJawProps {
  title: string;
  imageSrc: string;
  teethCoords: ToothCoord[];
  teethData: Record<string, { condition: ToothCondition; surfaces: ToothSurface[]; notes?: string }>;
  onToothClick: (tooth: ToothRecord) => void;
  disabled?: boolean;
}

function Tilt3DJawChart({
  title,
  imageSrc,
  teethCoords,
  teethData,
  onToothClick,
  disabled,
}: Tilt3DJawProps) {
  const [hoveredTooth, setHoveredTooth] = useState<ToothCoord | null>(null);

  // Status breakdown of treated teeth
  const treatedCount = useMemo(() => {
    return teethCoords.filter(coord => {
      const cond = teethData[coord.id]?.condition;
      return cond && cond !== 'sound';
    }).length;
  }, [teethCoords, teethData]);

  return (
    <div className="w-full bg-[#0d0f15] text-white rounded-3xl p-4 sm:p-6 shadow-2xl border border-gray-800/80">
      {/* Sleek Minimal Header with Live Palmer HUD */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3 px-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🦷</span>
          <h4 className="text-base font-bold text-white tracking-tight">{title}</h4>
          {treatedCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {treatedCount} charted
            </span>
          )}
        </div>

        {/* Live Hover HUD / Status Bar */}
        <div className="text-xs h-7 flex items-center">
          {hoveredTooth ? (
            <div className="flex items-center gap-2 animate-fadeIn bg-indigo-950/80 border border-indigo-500/40 px-3 py-1 rounded-full text-indigo-200 shadow-lg">
              <span className="font-mono font-black text-white text-sm bg-indigo-600 px-2 py-0.5 rounded shadow">
                {hoveredTooth.palmer}
              </span>
              <span>·</span>
              <span className="font-semibold text-white">{hoveredTooth.name}</span>
              <span>·</span>
              <span
                className="font-bold capitalize"
                style={{ color: CONDITION_CONFIG[teethData[hoveredTooth.id]?.condition || 'sound'].dotColor }}
              >
                {CONDITION_CONFIG[teethData[hoveredTooth.id]?.condition || 'sound'].label.split('/')[0]}
              </span>
            </div>
          ) : (
            <span className="text-gray-500 text-[11px]">
              Move mouse to tilt 3D perspective · Hover tooth to view · Click to edit
            </span>
          )}
        </div>
      </div>

      {/* 3D Parallax Tilt Container */}
      <Tilt
        perspective={1200}
        tiltMaxAngleX={14}
        tiltMaxAngleY={14}
        scale={1.02}
        glareEnable={true}
        glareMaxOpacity={0.24}
        glareColor="#ffffff"
        glarePosition="all"
        glareBorderRadius="1.25rem"
        className="relative w-full max-w-lg mx-auto aspect-square rounded-2xl overflow-hidden bg-black shadow-2xl border border-gray-900 select-none cursor-crosshair"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Photorealistic 3D Dental Render at Ground Plane */}
        <Image
          src={imageSrc}
          alt={title}
          fill
          className="object-cover pointer-events-none rounded-2xl"
          priority
          style={{ transform: 'translateZ(0px)' }}
        />

        {/* 3D Floating Quadrant Legend */}
        <div
          className="absolute top-3 left-4 text-[10px] font-mono font-bold text-white/35 tracking-wider pointer-events-none z-10"
          style={{ transform: 'translateZ(18px)' }}
        >
          RIGHT (UR ┘)
        </div>
        <div
          className="absolute top-3 right-4 text-[10px] font-mono font-bold text-white/35 tracking-wider pointer-events-none z-10"
          style={{ transform: 'translateZ(18px)' }}
        >
          LEFT (UL └)
        </div>
        <div
          className="absolute bottom-3 left-4 text-[10px] font-mono font-bold text-white/35 tracking-wider pointer-events-none z-10"
          style={{ transform: 'translateZ(18px)' }}
        >
          RIGHT (LR ┐)
        </div>
        <div
          className="absolute bottom-3 right-4 text-[10px] font-mono font-bold text-white/35 tracking-wider pointer-events-none z-10"
          style={{ transform: 'translateZ(18px)' }}
        >
          LEFT (LL ┌)
        </div>

        {/* Seamless Interactive Tooth Hotspots floating in 3D parallax */}
        {teethCoords.map(coord => {
          const saved = teethData[coord.id];
          const condition: ToothCondition = saved?.condition || 'sound';
          const hasCondition = condition !== 'sound';
          const conf = CONDITION_CONFIG[condition];
          const isHovered = hoveredTooth?.id === coord.id;

          return (
            <button
              key={coord.id}
              type="button"
              disabled={disabled}
              onClick={() => {
                onToothClick({
                  ...coord,
                  condition,
                  surfaces: saved?.surfaces || [],
                  notes: saved?.notes || '',
                });
              }}
              onMouseEnter={() => setHoveredTooth(coord)}
              onMouseLeave={() => setHoveredTooth(null)}
              style={{
                left: `${coord.x}%`,
                top: `${coord.y}%`,
                width: `${coord.width}px`,
                height: `${coord.height}px`,
                transform: isHovered
                  ? 'translate3d(-50%, -50%, 38px) scale(1.12)'
                  : hasCondition
                  ? 'translate3d(-50%, -50%, 24px)'
                  : 'translate3d(-50%, -50%, 14px)',
                transformStyle: 'preserve-3d',
              }}
              className="absolute group cursor-pointer focus:outline-none flex items-center justify-center transition-all duration-150 z-20"
              title={`${coord.name} (Palmer: ${coord.palmer}, FDI: #${coord.id})`}
            >
              {/* Tooth Interaction Boundary - Smooth contour ring, never covers tooth surface */}
              <div
                className={`relative w-full h-full rounded-2xl flex items-center justify-center transition-all duration-150 ${
                  isHovered
                    ? 'ring-2 ring-indigo-400 bg-indigo-500/15 backdrop-blur-[0.5px] shadow-[0_0_18px_rgba(99,102,241,0.85)]'
                    : hasCondition
                    ? 'ring-1.5 shadow-md backdrop-blur-[0.5px]'
                    : 'hover:bg-white/10'
                }`}
                style={{
                  borderColor: hasCondition ? conf.dotColor : undefined,
                  boxShadow: hasCondition && !isHovered ? `0 0 10px ${conf.dotColor}80` : undefined,
                  backgroundColor: hasCondition && !isHovered ? `${conf.dotColor}20` : undefined,
                }}
              >
                {/* Minimal condition indicator dot when charted */}
                {hasCondition && !isHovered && (
                  <span
                    className="w-2.5 h-2.5 rounded-full shadow border border-white/60"
                    style={{ backgroundColor: conf.dotColor }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </Tilt>

      {/* Doctor's Live Diagnostic Inspection HUD Bar */}
      <div className="mt-3.5 p-3 px-4 rounded-2xl bg-[#131620] border border-gray-800 shadow-inner flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 min-h-[58px] transition-all">
        {hoveredTooth ? (
          <div className="flex flex-wrap items-center justify-between w-full gap-2 animate-fadeIn">
            <div className="flex items-center gap-3">
              {/* Prominent Palmer Quadrant Symbol */}
              <div className="flex items-center justify-center px-3 py-1 rounded-xl bg-indigo-600 border border-indigo-400/50 shadow-md font-mono text-lg font-black text-white">
                {hoveredTooth.palmer}
              </div>
              {/* Universal / FDI Number Badge */}
              <div className="flex items-center justify-center px-2 py-1 rounded-lg bg-gray-800 border border-gray-700 font-mono text-xs font-bold text-gray-300">
                FDI #{hoveredTooth.id}
              </div>
              {/* Anatomical Name & Quadrant */}
              <div>
                <div className="text-xs font-bold text-white leading-snug">
                  {hoveredTooth.name}
                </div>
                <div className="text-[10px] text-gray-400 font-medium">
                  Quadrant: <span className="text-indigo-300 font-semibold">{hoveredTooth.palmerQuadrant}</span> · <span className="capitalize">{hoveredTooth.dentition}</span>
                </div>
              </div>
            </div>

            {/* Condition & Action Badge */}
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm flex items-center gap-1.5"
                style={{
                  backgroundColor: `${CONDITION_CONFIG[teethData[hoveredTooth.id]?.condition || 'sound'].dotColor}20`,
                  borderColor: `${CONDITION_CONFIG[teethData[hoveredTooth.id]?.condition || 'sound'].dotColor}50`,
                  color: CONDITION_CONFIG[teethData[hoveredTooth.id]?.condition || 'sound'].dotColor,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: CONDITION_CONFIG[teethData[hoveredTooth.id]?.condition || 'sound'].dotColor }}
                />
                {CONDITION_CONFIG[teethData[hoveredTooth.id]?.condition || 'sound'].label}
              </span>
              <span className="text-[11px] text-gray-400 hidden md:inline">
                · Click to edit
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full text-xs text-gray-500 px-1 py-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500/80 animate-pulse" />
              <span className="font-medium text-gray-400">Hover over any tooth to inspect notation & status</span>
            </div>
            <span className="text-[11px] text-gray-600 hidden sm:inline">
              Click tooth to record caries, fillings, crowns & clinical notes
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// MAIN DENTITION CHART COMPONENT
// ==========================================
interface DentitionChartProps {
  value?: string; // Stored in tableData
  onChange?: (value: string) => void;
  patientAge?: string | number; // Patient DOB / Age
  readOnly?: boolean;
  disabled?: boolean;
}

export default function DentitionChart({
  value,
  onChange,
  patientAge,
  readOnly = false,
  disabled = false,
}: DentitionChartProps) {
  const [selectedTooth, setSelectedTooth] = useState<ToothRecord | null>(null);

  // Client-side reactive age calculation
  const effectiveAge = useMemo(() => parseEffectiveAge(patientAge), [patientAge]);

  // Strict user rule:
  // If age <= 12 -> Deciduous AND Permanent (both charts)
  // If age > 12 (or empty) -> Permanent ONLY (one chart)
  const isPediatric = effectiveAge !== null && effectiveAge <= 12;

  // In-memory state of teeth records keyed by FDI id
  const [teethData, setTeethData] = useState<Record<string, {
    condition: ToothCondition;
    surfaces: ToothSurface[];
    notes?: string;
  }>>({});

  // Synchronize incoming value (JSON from tableData)
  useEffect(() => {
    if (!value || typeof value !== 'string') return;
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && parsed.teeth) {
        setTeethData(parsed.teeth);
      }
    } catch {
      // Gracefully ignore legacy table data
    }
  }, [value]);

  // Emit changes to parent
  const emitChanges = (updatedTeeth: typeof teethData) => {
    setTeethData(updatedTeeth);
    if (onChange && !readOnly) {
      const payload: DentitionChartData = {
        type: 'dentition_chart',
        version: 5,
        lastUpdated: new Date().toISOString(),
        patientAge: effectiveAge,
        teeth: updatedTeeth,
      };
      onChange(JSON.stringify(payload));
    }
  };

  const handleSaveTooth = (updated: ToothRecord) => {
    const next = {
      ...teethData,
      [updated.id]: {
        condition: updated.condition,
        surfaces: updated.surfaces,
        notes: updated.notes,
      },
    };
    emitChanges(next);
  };

  return (
    <div className="w-full space-y-6">
      {/* ── 1. DECIDUOUS 3D TILT CHART (Strictly rendered ONLY when age <= 12) ── */}
      {isPediatric && (
        <Tilt3DJawChart
          title="Deciduous Dentition (Primary Baby Teeth · Palmer A-E)"
          imageSrc="/dental-deciduous.jpg"
          teethCoords={DECIDUOUS_TEETH_COORDS}
          teethData={teethData}
          onToothClick={tooth => !readOnly && setSelectedTooth(tooth)}
          disabled={disabled}
        />
      )}

      {/* ── 2. PERMANENT 3D TILT CHART (Always shown; single chart when age > 12) ── */}
      <Tilt3DJawChart
        title={
          isPediatric
            ? "Permanent Dentition (Secondary Adult Teeth · Palmer 1-8)"
            : "Dentition Chart (3D Permanent Teeth · Palmer 1-8)"
        }
        imageSrc="/dental-permanent.png"
        teethCoords={PERMANENT_TEETH_COORDS}
        teethData={teethData}
        onToothClick={tooth => !readOnly && setSelectedTooth(tooth)}
        disabled={disabled}
      />

      {/* ── TOOTH POPUP INSPECTOR & INFO MODAL ── */}
      {selectedTooth && (
        <ToothInspectorModal
          tooth={selectedTooth}
          onClose={() => setSelectedTooth(null)}
          onSave={handleSaveTooth}
        />
      )}
    </div>
  );
}
