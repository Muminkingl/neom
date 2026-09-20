"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ToothIcon } from './ToothIcon';
import { Calendar } from 'lucide-react';

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

export type ToothSurface = 'O' | 'M' | 'D' | 'B' | 'L';

export interface ToothCoord {
  id: string;
  palmer: string;
  palmerQuadrant: 'UR' | 'UL' | 'LR' | 'LL';
  palmerNumber: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
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
  scheduledProcedures?: any[];
}

export interface DiagnosedTooth {
  toothId: string;
  name: string;
  palmer: string;
  condition: ToothCondition;
  conditionLabel: string;
  surfaces: ToothSurface[];
  notes?: string;
}

export const CONDITION_CONFIG: Record<ToothCondition, {
  label: string;
  badgeBg: string;
  textColor: string;
  dotColor: string;
}> = {
  sound: { label: 'Sound / Healthy', badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', textColor: 'text-emerald-400', dotColor: '#10b981' },
  caries: { label: 'Caries / Cavity', badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40', textColor: 'text-rose-400', dotColor: '#ef4444' },
  filled: { label: 'Filled / Restored', badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40', textColor: 'text-sky-400', dotColor: '#0ea5e9' },
  crown: { label: 'Crown / Cap', badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40', textColor: 'text-amber-400', dotColor: '#f59e0b' },
  missing: { label: 'Missing / Extracted', badgeBg: 'bg-gray-500/20 text-gray-300 border-gray-500/40', textColor: 'text-gray-400', dotColor: '#9ca3af' },
  rct: { label: 'Root Canal (RCT)', badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40', textColor: 'text-purple-400', dotColor: '#a855f7' },
  implant: { label: 'Dental Implant', badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-500/40', textColor: 'text-teal-400', dotColor: '#14b8a6' },
  fracture: { label: 'Fracture / Trauma', badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-500/40', textColor: 'text-orange-400', dotColor: '#f97316' },
};

// Universal numbering → FDI mapping
// Upper: U1-U16 = FDI 18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28
// Lower: L32-L17 = FDI 48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38
const UPPER_FDI = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'];
const LOWER_FDI = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'];

// Universal numbers shown in UI
const UPPER_UNIV = ['01','02','03','04','05','06','07','08','09','10','11','12','13','14','15','16'];
const LOWER_UNIV = ['32','31','30','29','28','27','26','25','24','23','22','21','20','19','18','17'];

// Palmer notations for permanent teeth
const UPPER_PALMER = ['8┘','7┘','6┘','5┘','4┘','3┘','2┘','1┘','└1','└2','└3','└4','└5','└6','└7','└8'];
const LOWER_PALMER = ['8┐','7┐','6┐','5┐','4┐','3┐','2┐','1┐','┌1','┌2','┌3','┌4','┌5','┌6','┌7','┌8'];

const UPPER_NAMES = [
  'Upper Right Wisdom','Upper Right 2nd Molar','Upper Right 1st Molar','Upper Right 2nd Premolar',
  'Upper Right 1st Premolar','Upper Right Canine','Upper Right Lateral Incisor','Upper Right Central Incisor',
  'Upper Left Central Incisor','Upper Left Lateral Incisor','Upper Left Canine','Upper Left 1st Premolar',
  'Upper Left 2nd Premolar','Upper Left 1st Molar','Upper Left 2nd Molar','Upper Left Wisdom',
];
const LOWER_NAMES = [
  'Lower Right Wisdom','Lower Right 2nd Molar','Lower Right 1st Molar','Lower Right 2nd Premolar',
  'Lower Right 1st Premolar','Lower Right Canine','Lower Right Lateral Incisor','Lower Right Central Incisor',
  'Lower Left Central Incisor','Lower Left Lateral Incisor','Lower Left Canine','Lower Left 1st Premolar',
  'Lower Left 2nd Premolar','Lower Left 1st Molar','Lower Left 2nd Molar','Lower Left Wisdom',
];

export const PERMANENT_TEETH_COORDS: ToothCoord[] = [
  ...UPPER_FDI.map((id, i) => ({
    id, palmer: UPPER_PALMER[i], palmerQuadrant: i < 8 ? 'UR' : 'UL' as any,
    palmerNumber: String(i < 8 ? 8 - i : i - 7), name: UPPER_NAMES[i],
    x: 10 + i * 5, y: 20, width: 38, height: 42, arch: 'maxillary' as const, dentition: 'permanent' as const,
  })),
  ...LOWER_FDI.map((id, i) => ({
    id, palmer: LOWER_PALMER[i], palmerQuadrant: i < 8 ? 'LR' : 'LL' as any,
    palmerNumber: String(i < 8 ? 8 - i : i - 7), name: LOWER_NAMES[i],
    x: 10 + i * 5, y: 60, width: 38, height: 42, arch: 'mandibular' as const, dentition: 'permanent' as const,
  })),
];

export const DECIDUOUS_TEETH_COORDS: ToothCoord[] = [
  { id: '55', palmer: 'E┘', palmerQuadrant: 'UR', palmerNumber: 'E', name: 'Primary Upper Right 2nd Molar', x: 23, y: 35, width: 42, height: 40, arch: 'maxillary', dentition: 'deciduous' },
  { id: '54', palmer: 'D┘', palmerQuadrant: 'UR', palmerNumber: 'D', name: 'Primary Upper Right 1st Molar', x: 28, y: 25, width: 38, height: 38, arch: 'maxillary', dentition: 'deciduous' },
  { id: '53', palmer: 'C┘', palmerQuadrant: 'UR', palmerNumber: 'C', name: 'Primary Upper Right Canine', x: 35, y: 17, width: 34, height: 38, arch: 'maxillary', dentition: 'deciduous' },
  { id: '52', palmer: 'B┘', palmerQuadrant: 'UR', palmerNumber: 'B', name: 'Primary Upper Right Lateral Incisor', x: 42, y: 14, width: 32, height: 38, arch: 'maxillary', dentition: 'deciduous' },
  { id: '51', palmer: 'A┘', palmerQuadrant: 'UR', palmerNumber: 'A', name: 'Primary Upper Right Central Incisor', x: 47, y: 13.5, width: 32, height: 40, arch: 'maxillary', dentition: 'deciduous' },
  { id: '61', palmer: '└A', palmerQuadrant: 'UL', palmerNumber: 'A', name: 'Primary Upper Left Central Incisor', x: 53, y: 13.5, width: 32, height: 40, arch: 'maxillary', dentition: 'deciduous' },
  { id: '62', palmer: '└B', palmerQuadrant: 'UL', palmerNumber: 'B', name: 'Primary Upper Left Lateral Incisor', x: 58, y: 14, width: 32, height: 38, arch: 'maxillary', dentition: 'deciduous' },
  { id: '63', palmer: '└C', palmerQuadrant: 'UL', palmerNumber: 'C', name: 'Primary Upper Left Canine', x: 65, y: 17, width: 34, height: 38, arch: 'maxillary', dentition: 'deciduous' },
  { id: '64', palmer: '└D', palmerQuadrant: 'UL', palmerNumber: 'D', name: 'Primary Upper Left 1st Molar', x: 72, y: 25, width: 38, height: 38, arch: 'maxillary', dentition: 'deciduous' },
  { id: '65', palmer: '└E', palmerQuadrant: 'UL', palmerNumber: 'E', name: 'Primary Upper Left 2nd Molar', x: 77, y: 35, width: 42, height: 40, arch: 'maxillary', dentition: 'deciduous' },
  { id: '85', palmer: 'E┐', palmerQuadrant: 'LR', palmerNumber: 'E', name: 'Primary Lower Right 2nd Molar', x: 25, y: 64, width: 42, height: 40, arch: 'mandibular', dentition: 'deciduous' },
  { id: '84', palmer: 'D┐', palmerQuadrant: 'LR', palmerNumber: 'D', name: 'Primary Lower Right 1st Molar', x: 30, y: 73, width: 38, height: 38, arch: 'mandibular', dentition: 'deciduous' },
  { id: '83', palmer: 'C┐', palmerQuadrant: 'LR', palmerNumber: 'C', name: 'Primary Lower Right Canine', x: 38, y: 79, width: 34, height: 38, arch: 'mandibular', dentition: 'deciduous' },
  { id: '82', palmer: 'B┐', palmerQuadrant: 'LR', palmerNumber: 'B', name: 'Primary Lower Right Lateral Incisor', x: 44, y: 81.5, width: 30, height: 36, arch: 'mandibular', dentition: 'deciduous' },
  { id: '81', palmer: 'A┐', palmerQuadrant: 'LR', palmerNumber: 'A', name: 'Primary Lower Right Central Incisor', x: 48, y: 82.5, width: 30, height: 36, arch: 'mandibular', dentition: 'deciduous' },
  { id: '71', palmer: '┌A', palmerQuadrant: 'LL', palmerNumber: 'A', name: 'Primary Lower Left Central Incisor', x: 52, y: 82.5, width: 30, height: 36, arch: 'mandibular', dentition: 'deciduous' },
  { id: '72', palmer: '┌B', palmerQuadrant: 'LL', palmerNumber: 'B', name: 'Primary Lower Left Lateral Incisor', x: 56, y: 81.5, width: 30, height: 36, arch: 'mandibular', dentition: 'deciduous' },
  { id: '73', palmer: '┌C', palmerQuadrant: 'LL', palmerNumber: 'C', name: 'Primary Lower Left Canine', x: 62, y: 79, width: 34, height: 38, arch: 'mandibular', dentition: 'deciduous' },
  { id: '74', palmer: '┌D', palmerQuadrant: 'LL', palmerNumber: 'D', name: 'Primary Lower Left 1st Molar', x: 70, y: 73, width: 38, height: 38, arch: 'mandibular', dentition: 'deciduous' },
  { id: '75', palmer: '┌E', palmerQuadrant: 'LL', palmerNumber: 'E', name: 'Primary Lower Left 2nd Molar', x: 75, y: 64, width: 42, height: 40, arch: 'mandibular', dentition: 'deciduous' },
];

export function findToothCoord(id: string): ToothCoord {
  const all = [...PERMANENT_TEETH_COORDS, ...DECIDUOUS_TEETH_COORDS];
  return all.find(c => c.id === id) || {
    id, palmer: `#${id}`, palmerQuadrant: 'UR', palmerNumber: id, name: `Tooth #${id}`,
    x: 50, y: 50, width: 36, height: 38, arch: 'maxillary', dentition: 'permanent',
  };
}

export function extractDiagnosedTeeth(tableDataStr?: string | null): DiagnosedTooth[] {
  if (!tableDataStr) return [];
  try {
    const data: DentitionChartData = typeof tableDataStr === 'string' ? JSON.parse(tableDataStr) : tableDataStr;
    if (!data || !data.teeth) return [];
    const allCoords = [...PERMANENT_TEETH_COORDS, ...DECIDUOUS_TEETH_COORDS];
    return Object.entries(data.teeth)
      .filter(([, t]) => t && t.condition && t.condition !== 'sound')
      .map(([id, t]) => {
        const coord = allCoords.find(c => c.id === id);
        return {
          toothId: id, name: coord ? coord.name : `Tooth #${id}`,
          palmer: coord ? coord.palmer : `#${id}`, condition: t.condition,
          conditionLabel: CONDITION_CONFIG[t.condition]?.label || t.condition,
          surfaces: t.surfaces || [], notes: t.notes || '',
        };
      });
  } catch { return []; }
}

export function parseEffectiveAge(input: string | number | undefined | null): number | null {
  if (input === undefined || input === null) return null;
  if (typeof input === 'number') return isNaN(input) || input < 0 ? null : Math.floor(input);
  const str = input.toString().trim();
  if (!str) return null;
  const numMatch = str.match(/^(\d{1,3})\s*(?:yo|yrs|years|y)?$/i);
  if (numMatch) { const val = parseInt(numMatch[1], 10); return val <= 130 ? val : null; }
  const birthDate = new Date(str);
  if (!isNaN(birthDate.getTime()) && birthDate.getFullYear() > 1900) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 0 ? age : 0;
  }
  return null;
}

// ==========================================
// SVG TOOTH SHAPES (anatomically shaped)
// Each tooth type: 0=wisdom/3rdMolar, 1=2ndMolar, 2=1stMolar, 3=2ndPremolar
//                  4=1stPremolar, 5=canine, 6=lateralIncisor, 7=centralIncisor
// Upper teeth: roots point UP, crown DOWN (arch visible from below)
// Lower teeth: roots point DOWN, crown UP (arch visible from above)
// viewBox per tooth: 0 0 60 120
// ==========================================

type ToothType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

// Returns the tooth type index (0-7) from position index (0-15)
function getToothType(posIdx: number): ToothType {
  // posIdx 0-15, symmetrical: 0=wisdom(8), 1=2ndMolar(7), 2=1stMolar(6), 3=2ndPremolar(5),
  //                            4=1stPremolar(4), 5=canine(3), 6=lateral(2), 7=central(1)
  // then mirror for 8-15
  const p = posIdx <= 7 ? 7 - posIdx : posIdx - 8;
  return (7 - p) as ToothType;
}

interface ToothSvgProps {
  type: ToothType;
  arch: 'upper' | 'lower';
  condition: ToothCondition;
  isHovered: boolean;
  isSelected: boolean;
  isScheduled: boolean;
  isMissing: boolean;
  readOnly: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  label: string; // universal number
}

// Crown shapes per type (upper orientation — crown faces down, root up)
// Returns SVG path data within a 60×120 viewBox
function getCrownPath(type: ToothType, arch: 'upper' | 'lower'): { crown: string; root: string } {
  // All paths are for UPPER orientation (crown at bottom, root at top)
  // For lower teeth we'll flip with transform
  switch (type) {
    case 7: // Central incisor — wide flat crown
      return {
        crown: 'M8,68 Q8,62 12,58 L48,58 Q52,62 52,68 L54,90 Q54,96 48,100 L12,100 Q6,96 6,90 Z',
        root: 'M22,58 Q22,40 24,28 Q27,14 30,8 Q33,14 36,28 Q38,40 38,58 Z',
      };
    case 6: // Lateral incisor — slightly narrower
      return {
        crown: 'M10,68 Q10,62 14,58 L46,58 Q50,62 50,68 L51,90 Q51,96 45,100 L15,100 Q9,96 9,90 Z',
        root: 'M22,58 Q22,40 24,26 Q27,12 30,6 Q33,12 36,26 Q38,40 38,58 Z',
      };
    case 5: // Canine — pointed crown
      return {
        crown: 'M12,72 Q11,64 15,58 L28,50 L45,58 Q49,64 48,72 L46,90 Q46,98 40,102 L20,102 Q14,98 14,90 Z',
        root: 'M22,58 Q21,38 24,22 Q27,8 30,4 Q33,8 36,22 Q39,38 38,58 Z',
      };
    case 4: // 1st Premolar — 2 cusps, bifurcated root (upper) / single (lower)
      return {
        crown: 'M9,72 Q9,62 14,56 L24,50 L36,50 L46,56 Q51,62 51,72 L50,90 Q50,98 44,103 L16,103 Q10,98 10,90 Z',
        root: arch === 'upper'
          ? 'M16,56 Q14,38 14,20 Q14,10 16,6 Q18,3 20,6 Q22,10 22,20 L22,56 M38,56 Q38,38 38,20 Q38,10 40,6 Q42,3 44,6 Q46,10 46,20 L46,56 Z'
          : 'M22,56 Q22,38 24,22 Q27,10 30,5 Q33,10 36,22 Q38,38 38,56 Z',
      };
    case 3: // 2nd Premolar — 2 cusps, simpler root
      return {
        crown: 'M10,72 Q10,63 15,57 L24,51 L36,51 L45,57 Q50,63 50,72 L49,90 Q49,98 43,103 L17,103 Q11,98 11,90 Z',
        root: 'M22,57 Q21,40 23,25 Q26,12 30,6 Q34,12 37,25 Q39,40 38,57 Z',
      };
    case 2: // 1st Molar — 4 cusps, 3 roots (upper) / 2 roots (lower)
      return {
        crown: 'M6,72 Q5,62 10,56 L20,49 L40,49 L50,56 Q55,62 54,72 L53,90 Q53,100 46,105 L14,105 Q7,100 7,90 Z',
        root: arch === 'upper'
          ? 'M10,56 Q8,40 8,22 Q8,12 10,7 Q13,4 15,7 Q17,12 17,22 L17,56 M24,56 Q23,40 24,24 Q25,12 28,7 Q31,4 32,7 Q33,12 34,24 L34,56 M43,56 Q43,38 44,22 Q44,12 46,7 Q48,4 50,7 Q52,12 52,22 L52,56 Z'
          : 'M14,56 Q12,38 13,22 Q13,10 16,5 Q18,2 20,5 Q22,10 22,22 L22,56 M38,56 Q38,38 38,22 Q38,10 40,5 Q42,2 44,5 Q46,10 46,22 L46,56 Z',
      };
    case 1: // 2nd Molar
      return {
        crown: 'M7,73 Q6,63 11,57 L20,50 L40,50 L49,57 Q54,63 53,73 L52,90 Q52,100 45,105 L15,105 Q8,100 8,90 Z',
        root: arch === 'upper'
          ? 'M11,57 Q9,40 10,22 Q10,12 12,7 Q14,4 16,7 Q18,12 18,22 L18,57 M42,57 Q42,40 43,22 Q43,12 45,7 Q47,4 49,7 Q51,12 51,22 L51,57 Z'
          : 'M15,57 Q13,40 14,22 Q14,10 17,5 Q19,2 21,5 Q23,10 23,22 L23,57 M37,57 Q37,40 38,22 Q38,10 41,5 Q43,2 45,5 Q47,10 47,22 L47,57 Z',
      };
    case 0: // 3rd Molar (Wisdom) — more irregular, smaller
    default:
      return {
        crown: 'M9,74 Q8,64 13,58 L22,52 L38,52 L47,58 Q52,64 51,74 L50,90 Q50,100 43,105 L17,105 Q10,100 10,90 Z',
        root: 'M18,58 Q16,42 17,26 Q17,14 20,8 Q22,5 24,8 Q26,14 26,26 L26,58 M34,58 Q34,42 35,26 Q35,14 38,8 Q40,5 42,8 Q44,14 44,26 L44,58 Z',
      };
  }
}

function ToothSvg({ type, arch, condition, isHovered, isSelected, isScheduled, isMissing, readOnly, onClick, onMouseEnter, onMouseLeave, label }: ToothSvgProps) {
  const { crown, root } = getCrownPath(type, arch);
  const condColor = CONDITION_CONFIG[condition]?.dotColor || '#10b981';
  const isCharted = condition !== 'sound';

  // For lower teeth we flip vertically
  const transform = arch === 'lower' ? 'scale(1,-1) translate(0,-120)' : undefined;

  // Ivory color gradient stops
  const gradId = `tooth-grad-${label}-${arch}`;
  const rootGradId = `root-grad-${label}-${arch}`;

  // Hover/selected glow ring color
  const glowColor = isSelected ? '#6366f1' : isHovered ? '#94a3b8' : 'transparent';

  return (
    <svg
      viewBox="0 0 60 120"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-full ${readOnly ? 'cursor-default' : 'cursor-pointer'} select-none`}
      onClick={readOnly ? undefined : onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <radialGradient id={gradId} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor={isMissing ? '#374151' : '#FFF8E7'} />
          <stop offset="40%" stopColor={isMissing ? '#4B5563' : '#F5E0A8'} />
          <stop offset="100%" stopColor={isMissing ? '#374151' : '#D4A853'} />
        </radialGradient>
        <linearGradient id={rootGradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={isMissing ? '#374151' : '#C89A50'} />
          <stop offset="50%" stopColor={isMissing ? '#4B5563' : '#EDD28A'} />
          <stop offset="100%" stopColor={isMissing ? '#374151' : '#C89A50'} />
        </linearGradient>
        <filter id={`shadow-${label}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#00000040" />
        </filter>
      </defs>

      <g transform={transform}>
        {/* Glow ring for hover/selected */}
        {(isHovered || isSelected) && (
          <ellipse cx="30" cy="80" rx="28" ry="26"
            fill="none" stroke={glowColor} strokeWidth="3" opacity="0.7" />
        )}

        {/* Root */}
        <path
          d={root}
          fill={`url(#${rootGradId})`}
          stroke={isMissing ? '#4B5563' : '#B8862A'}
          strokeWidth="0.8"
          strokeLinejoin="round"
          filter={`url(#shadow-${label})`}
          opacity={isMissing ? 0.3 : 0.9}
        />

        {/* Crown */}
        <path
          d={crown}
          fill={`url(#${gradId})`}
          stroke={isMissing ? '#4B5563' : '#A87828'}
          strokeWidth="1"
          strokeLinejoin="round"
          filter={`url(#shadow-${label})`}
          opacity={isMissing ? 0.25 : 1}
        />

        {/* Crown highlight sheen */}
        {!isMissing && (
          <path
            d={crown}
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinejoin="round"
            opacity="0.15"
            strokeDasharray="60 200"
          />
        )}

        {/* Condition color overlay */}
        {isCharted && !isMissing && (
          <path
            d={crown}
            fill={condColor}
            opacity={0.35}
            strokeLinejoin="round"
          />
        )}

        {/* Scheduled indicator dot */}
        {isScheduled && (
          <circle cx="30" cy="109" r="4" fill="#6366f1" opacity="0.9" />
        )}

        {/* Missing X mark */}
        {isMissing && (
          <g opacity="0.5">
            <line x1="20" y1="65" x2="40" y2="95" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="40" y1="65" x2="20" y2="95" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}
      </g>
    </svg>
  );
}

// ==========================================
// TOOTH ROW COMPONENT
// ==========================================
interface ToothRowProps {
  arch: 'upper' | 'lower';
  fdiIds: string[];
  univLabels: string[];
  palmerLabels: string[];
  teethData: Record<string, { condition: ToothCondition; surfaces: ToothSurface[]; notes?: string }>;
  scheduledToothIds: Set<string>;
  hoveredId: string | null;
  selectedId: string | null;
  readOnly: boolean;
  notation: 'Universal' | 'Palmer' | 'FDI';
  onToothClick: (fdiId: string) => void;
  onToothHover: (fdiId: string | null) => void;
}

function ToothRow({ arch, fdiIds, univLabels, palmerLabels, teethData, scheduledToothIds, hoveredId, selectedId, readOnly, notation, onToothClick, onToothHover }: ToothRowProps) {
  const getLabel = (fdiId: string, i: number) => {
    if (notation === 'FDI') return fdiId;
    if (notation === 'Palmer') return palmerLabels[i];
    return univLabels[i];
  };

  return (
    <div className="flex items-end gap-0.5 sm:gap-1 w-full">
      {fdiIds.map((fdiId, i) => {
        const data = teethData[fdiId];
        const condition: ToothCondition = data?.condition || 'sound';
        const isMissing = condition === 'missing';
        const type = getToothType(i);
        const label = getLabel(fdiId, i);

        return (
          <div key={fdiId} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
            {/* Number label — top for upper, bottom for lower */}
            {arch === 'upper' && (
              <span className={`text-[9px] sm:text-[10px] font-bold font-mono leading-none mb-0.5 transition-colors ${
                hoveredId === fdiId ? 'text-indigo-400' :
                selectedId === fdiId ? 'text-indigo-300' : 'text-slate-400'
              }`}>
                {label}
              </span>
            )}

            {/* Tooth SVG */}
            <div
              className={`relative w-full transition-transform duration-150 ${
                (hoveredId === fdiId || selectedId === fdiId) && !readOnly ? 'scale-110 z-10' : ''
              }`}
              style={{ aspectRatio: '60/120', minWidth: '20px', maxWidth: '52px' }}
            >
              <ToothSvg
                type={type}
                arch={arch}
                condition={condition}
                isHovered={hoveredId === fdiId}
                isSelected={selectedId === fdiId}
                isScheduled={scheduledToothIds.has(fdiId)}
                isMissing={isMissing}
                readOnly={readOnly}
                label={`${fdiId}-${arch}`}
                onClick={() => onToothClick(fdiId)}
                onMouseEnter={() => onToothHover(fdiId)}
                onMouseLeave={() => onToothHover(null)}
              />
            </div>

            {/* Number label — bottom for lower */}
            {arch === 'lower' && (
              <span className={`text-[9px] sm:text-[10px] font-bold font-mono leading-none mt-0.5 transition-colors ${
                hoveredId === fdiId ? 'text-indigo-400' :
                selectedId === fdiId ? 'text-indigo-300' : 'text-slate-400'
              }`}>
                {label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// TOOTH POPUP INSPECTOR MODAL
// ==========================================
export interface ToothModalProps {
  tooth: ToothRecord | null;
  onClose: () => void;
  onSave: (updatedTooth: ToothRecord) => void;
  onScheduleTooth?: (tooth: ToothRecord) => void;
  zIndex?: string;
}

export function ToothInspectorModal({ tooth, onClose, onSave, onScheduleTooth, zIndex }: ToothModalProps) {
  if (!tooth) return null;

  const [currentCondition, setCurrentCondition] = useState<ToothCondition>(tooth.condition);
  const [currentSurfaces, setCurrentSurfaces] = useState<ToothSurface[]>(tooth.surfaces || []);
  const [currentNotes, setCurrentNotes] = useState<string>(tooth.notes || '');

  const toggleSurface = (surf: ToothSurface) => {
    setCurrentSurfaces(prev => prev.includes(surf) ? prev.filter(s => s !== surf) : [...prev, surf]);
  };

  const handleSave = () => {
    onSave({ ...tooth, condition: currentCondition, surfaces: currentSurfaces, notes: currentNotes.trim() });
    onClose();
  };

  return (
    <div className={`fixed inset-0 ${zIndex || 'z-50'} flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn`}>
      <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scaleUp" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-gray-900 via-gray-900 to-indigo-950/40 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg border border-indigo-400/40">
              <span className="font-mono text-xl font-black text-white">{tooth.palmer}</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-snug">{tooth.name}</h3>
              <p className="text-[11px] text-gray-400 font-mono flex items-center gap-1.5 mt-0.5">
                <span>FDI #{tooth.id}</span><span>•</span>
                <span className="text-indigo-300 font-semibold">Quadrant: {tooth.palmerQuadrant}</span>
                <span>•</span><span className="capitalize">{tooth.dentition}</span>
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Condition Selector */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tooth Condition</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(CONDITION_CONFIG) as ToothCondition[]).map(condKey => {
                const conf = CONDITION_CONFIG[condKey];
                const isSelected = currentCondition === condKey;
                return (
                  <button key={condKey} type="button" onClick={() => setCurrentCondition(condKey)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                      isSelected ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md ring-1 ring-indigo-400 font-bold' : 'border-gray-800 bg-gray-900/60 text-gray-300 hover:bg-gray-800/80 hover:text-white'
                    }`}>
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: conf.dotColor }} />
                    <span>{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Surface Multi-select */}
          {(currentCondition === 'caries' || currentCondition === 'filled' || currentCondition === 'fracture') && (
            <div className="bg-gray-900/50 p-3.5 rounded-xl border border-gray-800">
              <label className="block text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-2">Surfaces Involved</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'O', label: 'Occlusal/Incisal (O)' }, { id: 'M', label: 'Mesial (M)' },
                  { id: 'D', label: 'Distal (D)' }, { id: 'B', label: 'Buccal (B)' },
                  { id: 'L', label: 'Lingual/Palatal (L)' },
                ].map(surf => {
                  const active = currentSurfaces.includes(surf.id as ToothSurface);
                  return (
                    <button key={surf.id} type="button" onClick={() => toggleSurface(surf.id as ToothSurface)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${active ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-800/80 text-gray-400 border border-gray-700 hover:text-gray-200'}`}>
                      {surf.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Schedule Button */}
          {onScheduleTooth && (
            <button type="button" onClick={() => { onSave({ ...tooth, condition: currentCondition, surfaces: currentSurfaces, notes: currentNotes.trim() }); onScheduleTooth(tooth); onClose(); }}
              className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer">
              <Calendar className="w-4 h-4 text-white" />
              <span>Schedule Next Procedure for Tooth #{tooth.id} ({tooth.palmer})</span>
            </button>
          )}

          {/* Notes */}
          <div>
            <label htmlFor="modal-tooth-notes" className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Tooth Information & Treatment Notes</label>
            <textarea id="modal-tooth-notes" rows={3} value={currentNotes} onChange={e => setCurrentNotes(e.target.value)}
              placeholder={`Add findings or treatment notes for tooth ${tooth.palmer}...`}
              className="w-full px-3.5 py-2.5 bg-gray-900/80 border border-gray-700/80 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-white text-xs placeholder-gray-500" />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-900/80 border-t border-gray-800 flex items-center justify-between">
          <button type="button" onClick={() => { setCurrentCondition('sound'); setCurrentSurfaces([]); setCurrentNotes(''); }}
            className="text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors">Clear Tooth</button>
          <div className="flex gap-2.5">
            <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white bg-gray-800 rounded-xl transition-colors">Cancel</button>
            <button type="button" onClick={handleSave} className="px-6 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg transition-all">Save Tooth</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN CLINICAL ODONTOGRAM CHART
// ==========================================
export interface OdontogramChartProps {
  teethData: Record<string, { condition: ToothCondition; surfaces: ToothSurface[]; notes?: string }>;
  scheduledToothIds: Set<string>;
  dentitionMode: 'permanent' | 'deciduous';
  onDentitionModeChange?: (mode: 'permanent' | 'deciduous') => void;
  onToothClick: (tooth: ToothRecord) => void;
  selectedToothId?: string | null;
  readOnly?: boolean;
  disabled?: boolean;
}

export function ClinicalOdontogram({ teethData, scheduledToothIds, dentitionMode, onDentitionModeChange, onToothClick, selectedToothId: externalSelectedId, readOnly = false, disabled = false }: OdontogramChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(externalSelectedId ?? null);
  const [notation, setNotation] = useState<'Universal' | 'Palmer' | 'FDI'>('Universal');

  // Sync external selection (e.g. from scheduler)
  useEffect(() => {
    if (externalSelectedId !== undefined) setSelectedId(externalSelectedId);
  }, [externalSelectedId]);

  const handleToothClick = useCallback((fdiId: string) => {
    if (disabled || readOnly) return;
    setSelectedId(fdiId);
    const coord = findToothCoord(fdiId);
    setTimeout(() => {
      onToothClick({
        ...coord,
        condition: teethData[fdiId]?.condition || 'sound',
        surfaces: teethData[fdiId]?.surfaces || [],
        notes: teethData[fdiId]?.notes || '',
      });
    }, 0);
  }, [disabled, readOnly, teethData, onToothClick]);

  const hoveredCoord = hoveredId ? findToothCoord(hoveredId) : null;
  const hoveredCondition = hoveredId ? (teethData[hoveredId]?.condition || 'sound') : 'sound';

  const treatedCount = useMemo(() =>
    Object.values(teethData).filter(t => t && t.condition && t.condition !== 'sound').length, [teethData]);

  const scheduledCount = scheduledToothIds.size;

  return (
    <div className="w-full bg-[#0f1117] rounded-3xl border border-gray-800 shadow-lg overflow-hidden select-none">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 bg-[#0f1117] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <ToothIcon className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-bold text-white">Dentition Chart</span>
          {treatedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {treatedCount} charted
            </span>
          )}
          {scheduledCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" /> {scheduledCount} scheduled
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          {/* Dentition toggle */}
          {onDentitionModeChange && (
            <div className="flex items-center bg-gray-900 p-0.5 rounded-lg border border-gray-700">
              {(['permanent', 'deciduous'] as const).map(m => (
                <button key={m} type="button" onClick={() => onDentitionModeChange(m)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${dentitionMode === m ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-400 hover:text-white'}`}>
                  {m === 'permanent' ? 'Adult (32)' : 'Pediatric (20)'}
                </button>
              ))}
            </div>
          )}
          {/* Notation toggle */}
          <div className="flex items-center bg-gray-900 p-0.5 rounded-lg border border-gray-700">
            {(['Universal', 'Palmer', 'FDI'] as const).map(n => (
              <button key={n} type="button" onClick={() => setNotation(n)}
                className={`px-2 py-1 rounded-md font-mono font-bold transition-all cursor-pointer ${notation === n ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-400 hover:text-white'}`}>
                {n === 'Universal' ? 'Univ' : n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div className="px-3 sm:px-5 py-4 bg-[#090b11] space-y-2">
        {/* Quadrant labels */}
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-[9px] font-mono font-bold text-gray-600 tracking-wider">PATIENT'S RIGHT</span>
          <span className="text-[9px] font-mono font-bold text-gray-600 tracking-wider">↑ MAXILLARY (UPPER) ↑</span>
          <span className="text-[9px] font-mono font-bold text-gray-600 tracking-wider">PATIENT'S LEFT</span>
        </div>

        {/* Upper arch row */}
        <ToothRow
          arch="upper"
          fdiIds={UPPER_FDI}
          univLabels={UPPER_UNIV}
          palmerLabels={UPPER_PALMER}
          teethData={teethData}
          scheduledToothIds={scheduledToothIds}
          hoveredId={hoveredId}
          selectedId={selectedId}
          readOnly={readOnly || disabled}
          notation={notation}
          onToothClick={handleToothClick}
          onToothHover={setHoveredId}
        />

        {/* Midline divider */}
        <div className="flex items-center gap-2 py-1">
          <div className="flex-1 h-px bg-slate-300 dark:bg-gray-700" />
          <span className="text-[9px] font-mono text-slate-400 dark:text-gray-600 font-bold shrink-0">MIDLINE</span>
          <div className="flex-1 h-px bg-slate-300 dark:bg-gray-700" />
        </div>

        {/* Lower arch row */}
        <ToothRow
          arch="lower"
          fdiIds={LOWER_FDI}
          univLabels={LOWER_UNIV}
          palmerLabels={LOWER_PALMER}
          teethData={teethData}
          scheduledToothIds={scheduledToothIds}
          hoveredId={hoveredId}
          selectedId={selectedId}
          readOnly={readOnly || disabled}
          notation={notation}
          onToothClick={handleToothClick}
          onToothHover={setHoveredId}
        />

        <div className="flex items-center justify-between px-1 mt-1">
          <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-gray-600 tracking-wider">PATIENT'S RIGHT</span>
          <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-gray-600 tracking-wider">↓ MANDIBULAR (LOWER) ↓</span>
          <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-gray-600 tracking-wider">PATIENT'S LEFT</span>
        </div>
      </div>

      {/* HUD info bar */}
      <div className="px-4 py-2.5 border-t border-gray-800 bg-gray-900/80 min-h-[44px] flex items-center">
        {hoveredCoord ? (
          <div className="flex items-center justify-between w-full gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="px-2.5 py-1 rounded-lg bg-indigo-600 font-mono text-sm font-black text-white shadow-sm">{hoveredCoord.palmer}</div>
              <div className="px-2 py-1 rounded-md bg-gray-800 font-mono text-xs font-bold text-gray-300">FDI #{hoveredCoord.id}</div>
              <div>
                <div className="text-xs font-bold text-white leading-snug">{hoveredCoord.name}</div>
                <div className="text-[10px] text-gray-400">{hoveredCoord.palmerQuadrant} · <span className="capitalize">{hoveredCoord.arch}</span></div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5"
              style={{ backgroundColor: `${CONDITION_CONFIG[hoveredCondition].dotColor}20`, borderColor: `${CONDITION_CONFIG[hoveredCondition].dotColor}50`, color: CONDITION_CONFIG[hoveredCondition].dotColor }}>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CONDITION_CONFIG[hoveredCondition].dotColor }} />
              {CONDITION_CONFIG[hoveredCondition].label}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Hover over a tooth to view notation · {readOnly ? 'Read-only chart' : 'Click any tooth to record condition or schedule procedure'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// MAIN DENTITION CHART COMPONENT (public API unchanged)
// ==========================================
interface DentitionChartProps {
  value?: string;
  onChange?: (value: string) => void;
  patientAge?: string | number;
  readOnly?: boolean;
  disabled?: boolean;
  onScheduleTooth?: (tooth: ToothRecord) => void;
}

export default function DentitionChart({ value, onChange, patientAge, readOnly = false, disabled = false, onScheduleTooth }: DentitionChartProps) {
  const [selectedTooth, setSelectedTooth] = useState<ToothRecord | null>(null);

  const effectiveAge = useMemo(() => parseEffectiveAge(patientAge), [patientAge]);
  const defaultIsPediatric = effectiveAge !== null && effectiveAge <= 12;
  const [dentitionMode, setDentitionMode] = useState<'permanent' | 'deciduous'>(defaultIsPediatric ? 'deciduous' : 'permanent');

  useEffect(() => {
    setDentitionMode(defaultIsPediatric ? 'deciduous' : 'permanent');
  }, [defaultIsPediatric]);

  const [teethData, setTeethData] = useState<Record<string, { condition: ToothCondition; surfaces: ToothSurface[]; notes?: string }>>({});

  useEffect(() => {
    if (!value || typeof value !== 'string') return;
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && parsed.teeth) setTeethData(parsed.teeth);
    } catch { }
  }, [value]);

  const scheduledToothIds = useMemo(() => {
    const ids = new Set<string>();
    if (!value) return ids;
    try {
      const parsed = JSON.parse(value);
      if (parsed && Array.isArray(parsed.scheduledProcedures)) {
        parsed.scheduledProcedures.forEach((sp: any) => { if (sp.toothId && sp.status === 'Scheduled') ids.add(sp.toothId); });
      }
    } catch { }
    return ids;
  }, [value]);

  const emitChanges = (updatedTeeth: typeof teethData) => {
    setTeethData(updatedTeeth);
    if (onChange && !readOnly) {
      let existingScheduledProcedures: any[] = [];
      try {
        if (value) {
          const parsed = JSON.parse(value);
          if (parsed && Array.isArray(parsed.scheduledProcedures)) existingScheduledProcedures = parsed.scheduledProcedures;
        }
      } catch { }
      onChange(JSON.stringify({
        type: 'dentition_chart', version: 5, lastUpdated: new Date().toISOString(),
        patientAge: effectiveAge, teeth: updatedTeeth, scheduledProcedures: existingScheduledProcedures,
      } as DentitionChartData));
    }
  };

  const handleSaveTooth = (updated: ToothRecord) => {
    emitChanges({ ...teethData, [updated.id]: { condition: updated.condition, surfaces: updated.surfaces, notes: updated.notes } });
  };

  const handleToothClick = useCallback((tooth: ToothRecord) => {
    if (readOnly) return;
    setSelectedTooth(tooth);
  }, [readOnly]);

  return (
    <div className="w-full space-y-4">
      <ClinicalOdontogram
        teethData={teethData}
        scheduledToothIds={scheduledToothIds}
        dentitionMode={dentitionMode}
        onDentitionModeChange={setDentitionMode}
        onToothClick={handleToothClick}
        readOnly={readOnly}
        disabled={disabled}
      />
      {selectedTooth && (
        <ToothInspectorModal
          tooth={selectedTooth}
          onClose={() => setSelectedTooth(null)}
          onSave={handleSaveTooth}
          onScheduleTooth={onScheduleTooth}
        />
      )}
    </div>
  );
}
