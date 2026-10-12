'use client';

import React, { useState, useMemo } from 'react';
import {
  ToothCondition,
  ToothSurface,
  ToothRecord,
  CONDITION_CONFIG,
  UPPER_FDI,
  LOWER_FDI,
  UPPER_UNIV,
  LOWER_UNIV,
  UPPER_PALMER,
  LOWER_PALMER,
  DECIDUOUS_TEETH_COORDS,
  findToothCoord,
} from '@/app/components/DentitionChart';
import { XCircle, RotateCcw } from 'lucide-react';

interface DentalChartCardProps {
  teethData: Record<string, { condition: ToothCondition; surfaces: ToothSurface[]; notes?: string; treatment?: string; price?: number | string }>;
  onSelectTooth: (tooth: ToothRecord) => void;
  onClearChart?: () => void;
  readOnly?: boolean;
}

// Tooth types: 0=wisdom, 1=2ndMolar, 2=1stMolar, 3=2ndPremolar, 4=1stPremolar, 5=canine, 6=lateralIncisor, 7=centralIncisor
type ToothType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

function getToothType(posIdx: number): ToothType {
  const p = posIdx <= 7 ? 7 - posIdx : posIdx - 8;
  return (7 - p) as ToothType;
}

function getCrownPath(type: ToothType, arch: 'upper' | 'lower'): { crown: string; root: string } {
  switch (type) {
    case 7: // Central incisor
      return {
        crown: 'M8,68 Q8,62 12,58 L48,58 Q52,62 52,68 L54,90 Q54,96 48,100 L12,100 Q6,96 6,90 Z',
        root: 'M22,58 Q22,40 24,28 Q27,14 30,8 Q33,14 36,28 Q38,40 38,58 Z',
      };
    case 6: // Lateral incisor
      return {
        crown: 'M10,68 Q10,62 14,58 L46,58 Q50,62 50,68 L51,90 Q51,96 45,100 L15,100 Q9,96 9,90 Z',
        root: 'M22,58 Q22,40 24,26 Q27,12 30,6 Q33,12 36,26 Q38,40 38,58 Z',
      };
    case 5: // Canine
      return {
        crown: 'M12,72 Q11,64 15,58 L28,50 L45,58 Q49,64 48,72 L46,90 Q46,98 40,102 L20,102 Q14,98 14,90 Z',
        root: 'M22,58 Q21,38 24,22 Q27,8 30,4 Q33,8 36,22 Q39,38 38,58 Z',
      };
    case 4: // 1st Premolar
      return {
        crown: 'M9,72 Q9,62 14,56 L24,50 L36,50 L46,56 Q51,62 51,72 L50,90 Q50,98 44,103 L16,103 Q10,98 10,90 Z',
        root: arch === 'upper'
          ? 'M16,56 Q14,38 14,20 Q14,10 16,6 Q18,3 20,6 Q22,10 22,20 L22,56 M38,56 Q38,38 38,20 Q38,10 40,6 Q42,3 44,6 Q46,10 46,20 L46,56 Z'
          : 'M22,56 Q22,38 24,22 Q27,10 30,5 Q33,10 36,22 Q38,38 38,56 Z',
      };
    case 3: // 2nd Premolar
      return {
        crown: 'M10,72 Q10,63 15,57 L24,51 L36,51 L45,57 Q50,63 50,72 L49,90 Q49,98 43,103 L17,103 Q11,98 11,90 Z',
        root: 'M22,57 Q21,40 23,25 Q26,12 30,6 Q34,12 37,25 Q39,40 38,57 Z',
      };
    case 2: // 1st Molar
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
    case 0: // 3rd Molar
    default:
      return {
        crown: 'M9,74 Q8,64 13,58 L22,52 L38,52 L47,58 Q52,64 51,74 L50,90 Q50,100 43,105 L17,105 Q10,100 10,90 Z',
        root: 'M18,58 Q16,42 17,26 Q17,14 20,8 Q22,5 24,8 Q26,14 26,26 L26,58 M34,58 Q34,42 35,26 Q35,14 38,8 Q40,5 42,8 Q44,14 44,26 L44,58 Z',
      };
  }
}

interface AnatomicalToothProps {
  type: ToothType;
  arch: 'upper' | 'lower';
  condition: ToothCondition;
  isHovered: boolean;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  label: string;
}

function AnatomicalTooth({
  type,
  arch,
  condition,
  isHovered,
  isSelected,
  onClick,
  onMouseEnter,
  onMouseLeave,
  label,
}: AnatomicalToothProps) {
  const { crown, root } = getCrownPath(type, arch);
  const isMissing = condition === 'missing';
  const isCrown = condition === 'crown';
  const isCaries = condition === 'caries';
  const isFilled = condition === 'filled';
  const isRct = condition === 'rct';
  const isImplant = condition === 'implant';

  const transform = arch === 'lower' ? 'scale(1,-1) translate(0,-120)' : undefined;
  const gradId = `an-tooth-grad-${label}-${arch}`;
  const rootGradId = `an-root-grad-${label}-${arch}`;

  // Glow color
  const glowColor = isSelected ? '#008294' : isHovered ? '#008294' : 'transparent';

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`relative w-full cursor-pointer select-none transition-all duration-150 ${
        isHovered ? 'scale-110 z-20 -translate-y-1' : isSelected ? 'scale-105 z-10' : ''
      }`}
      style={{ aspectRatio: '60/120', minWidth: '18px', maxWidth: '54px' }}
      title={`Tooth #${label} - ${condition !== 'sound' ? condition.toUpperCase() : 'Sound'}`}
    >
      <svg
        viewBox="0 0 60 120"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xs"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Natural Enamel Crown Gradient */}
          <radialGradient id={gradId} cx="42%" cy="38%" r="72%">
            {isCrown ? (
              <>
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="60%" stopColor="#F1F5F9" />
                <stop offset="100%" stopColor="#CBD5E1" />
              </>
            ) : isMissing ? (
              <>
                <stop offset="0%" stopColor="#64748B" />
                <stop offset="100%" stopColor="#334155" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#FFFEFC" />
                <stop offset="35%" stopColor="#FBF7EC" />
                <stop offset="75%" stopColor="#F3E8C9" />
                <stop offset="100%" stopColor="#DECA9A" />
              </>
            )}
          </radialGradient>

          {/* Anatomical Root Gradient */}
          <linearGradient id={rootGradId} x1="0" y1="0" x2="1" y2="0">
            {isMissing ? (
              <>
                <stop offset="0%" stopColor="#475569" />
                <stop offset="100%" stopColor="#334155" />
              </>
            ) : isImplant ? (
              <>
                <stop offset="0%" stopColor="#94A3B8" />
                <stop offset="50%" stopColor="#CBD5E1" />
                <stop offset="100%" stopColor="#64748B" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#C49B55" />
                <stop offset="50%" stopColor="#E9CCA0" />
                <stop offset="100%" stopColor="#BA8E47" />
              </>
            )}
          </linearGradient>

          <filter id={`soft-shadow-${label}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#00000025" />
          </filter>
        </defs>

        <g transform={transform}>
          {/* Active selection/hover ring */}
          {(isHovered || isSelected) && (
            <ellipse
              cx="30"
              cy="80"
              rx="27"
              ry="25"
              fill="none"
              stroke={glowColor}
              strokeWidth="2.5"
              strokeDasharray={isSelected ? 'none' : '4 2'}
              opacity="0.85"
            />
          )}

          {/* Root */}
          <path
            d={root}
            fill={`url(#${rootGradId})`}
            stroke={isMissing ? '#475569' : '#B8862A'}
            strokeWidth="0.7"
            strokeLinejoin="round"
            filter={`url(#soft-shadow-${label})`}
            opacity={isMissing ? 0.3 : 1}
          />

          {/* Crown */}
          <path
            d={crown}
            fill={`url(#${gradId})`}
            stroke={isMissing ? '#475569' : isCrown ? '#94A3B8' : '#A87828'}
            strokeWidth="0.8"
            strokeLinejoin="round"
            filter={`url(#soft-shadow-${label})`}
            opacity={isMissing ? 0.25 : 1}
          />

          {/* Enamel highlight sheen */}
          {!isMissing && (
            <path
              d={crown}
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinejoin="round"
              opacity={isCrown ? 0.7 : 0.4}
              strokeDasharray="45 160"
            />
          )}

          {/* Caries indicator */}
          {isCaries && (
            <circle cx="30" cy="80" r="7" fill="#EF4444" opacity="0.85" />
          )}

          {/* Filled indicator */}
          {isFilled && (
            <path d="M22,74 L38,74 L35,88 L25,88 Z" fill="#0EA5E9" opacity="0.8" />
          )}

          {/* RCT indicator */}
          {isRct && (
            <path d="M28,20 L32,20 L31,65 L29,65 Z" fill="#A855F7" opacity="0.9" />
          )}

          {/* Missing X */}
          {isMissing && (
            <g opacity="0.7">
              <line x1="18" y1="65" x2="42" y2="95" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="42" y1="65" x2="18" y2="95" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

export default function DentalChartCard({
  teethData,
  onSelectTooth,
  onClearChart,
  readOnly = false,
}: DentalChartCardProps) {
  const [dentition, setDentition] = useState<'permanent' | 'primary'>('permanent');
  const [hoveredTooth, setHoveredTooth] = useState<string | null>(null);
  const [selectedToothId, setSelectedToothId] = useState<string | null>(null);

  const handleToothClick = (fdiId: string) => {
    if (readOnly) return;
    setSelectedToothId(fdiId);
    const coord = findToothCoord(fdiId);
    const data = teethData[fdiId];
    onSelectTooth({
      ...coord,
      condition: data?.condition || 'sound',
      surfaces: data?.surfaces || [],
      notes: data?.notes || '',
    });
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-all">
      {/* Header matching screenshot */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
          Dental chart
        </h3>

        <div className="flex items-center gap-3">
          {/* Reset / Clear Icon Button */}
          {onClearChart && !readOnly && (
            <button
              type="button"
              onClick={onClearChart}
              title="Reset chart selection"
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <XCircle className="size-5" />
            </button>
          )}

          {/* Segmented Toggle: [ Permanent | Primary ] */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-medium">
            <button
              type="button"
              onClick={() => setDentition('permanent')}
              className={`px-3.5 py-1 rounded-lg transition-all cursor-pointer font-semibold ${
                dentition === 'permanent'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Permanent
            </button>
            <button
              type="button"
              onClick={() => setDentition('primary')}
              className={`px-3.5 py-1 rounded-lg transition-all cursor-pointer font-semibold ${
                dentition === 'primary'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Primary
            </button>
          </div>
        </div>
      </div>

      {/* Main Odontogram Canvas - Pure Clean Layout matching screenshot */}
      <div className="px-4 sm:px-8 py-6 bg-white dark:bg-slate-900">
        {dentition === 'permanent' ? (
          <div className="space-y-4">
            {/* Upper Jaw (Universal 01 to 16) */}
            <div>
              {/* Upper Number Labels */}
              <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1 sm:gap-2 mb-2 text-center">
                {UPPER_UNIV.map((num: string) => (
                  <span
                    key={num}
                    className="text-[10px] sm:text-xs font-mono font-medium text-slate-400 dark:text-slate-500 select-none"
                  >
                    {num}
                  </span>
                ))}
              </div>

              {/* Upper Teeth Row */}
              <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1 sm:gap-2 items-end">
                {UPPER_FDI.map((fdiId: string, i: number) => {
                  const data = teethData[fdiId];
                  const condition = data?.condition || 'sound';
                  const type = getToothType(i);
                  const label = UPPER_UNIV[i];

                  return (
                    <AnatomicalTooth
                      key={fdiId}
                      type={type}
                      arch="upper"
                      condition={condition}
                      isHovered={hoveredTooth === fdiId}
                      isSelected={selectedToothId === fdiId}
                      onClick={() => handleToothClick(fdiId)}
                      onMouseEnter={() => setHoveredTooth(fdiId)}
                      onMouseLeave={() => setHoveredTooth(null)}
                      label={label}
                    />
                  );
                })}
              </div>
            </div>

            {/* Subtle Divider Line */}
            <div className="my-5 border-t border-slate-100 dark:border-slate-800" />

            {/* Lower Jaw (Universal 32 to 17) */}
            <div>
              {/* Lower Teeth Row */}
              <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1 sm:gap-2 items-start">
                {LOWER_FDI.map((fdiId: string, i: number) => {
                  const data = teethData[fdiId];
                  const condition = data?.condition || 'sound';
                  const type = getToothType(i);
                  const label = LOWER_UNIV[i];

                  return (
                    <AnatomicalTooth
                      key={fdiId}
                      type={type}
                      arch="lower"
                      condition={condition}
                      isHovered={hoveredTooth === fdiId}
                      isSelected={selectedToothId === fdiId}
                      onClick={() => handleToothClick(fdiId)}
                      onMouseEnter={() => setHoveredTooth(fdiId)}
                      onMouseLeave={() => setHoveredTooth(null)}
                      label={label}
                    />
                  );
                })}
              </div>

              {/* Lower Number Labels */}
              <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1 sm:gap-2 mt-2 text-center">
                {LOWER_UNIV.map((num: string) => (
                  <span
                    key={num}
                    className="text-[10px] sm:text-xs font-mono font-medium text-slate-400 dark:text-slate-500 select-none"
                  >
                    {num}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Pediatric / Deciduous Chart */
          <div className="space-y-4">
            <div className="grid grid-cols-10 gap-2 items-end max-w-2xl mx-auto">
              {['55', '54', '53', '52', '51', '61', '62', '63', '64', '65'].map((fdiId, i) => {
                const data = teethData[fdiId];
                const condition = data?.condition || 'sound';
                const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
                return (
                  <div key={fdiId} className="flex flex-col items-center gap-1">
                    <span className="text-xs font-mono text-slate-400">{labels[i]}</span>
                    <AnatomicalTooth
                      type={i <= 1 || i >= 8 ? 2 : i === 2 || i === 7 ? 5 : 7}
                      arch="upper"
                      condition={condition}
                      isHovered={hoveredTooth === fdiId}
                      isSelected={selectedToothId === fdiId}
                      onClick={() => handleToothClick(fdiId)}
                      onMouseEnter={() => setHoveredTooth(fdiId)}
                      onMouseLeave={() => setHoveredTooth(null)}
                      label={labels[i]}
                    />
                  </div>
                );
              })}
            </div>

            <div className="my-5 border-t border-slate-100 dark:border-slate-800" />

            <div className="grid grid-cols-10 gap-2 items-start max-w-2xl mx-auto">
              {['85', '84', '83', '82', '81', '71', '72', '73', '74', '75'].map((fdiId, i) => {
                const data = teethData[fdiId];
                const condition = data?.condition || 'sound';
                const labels = ['T', 'S', 'R', 'Q', 'P', 'O', 'N', 'M', 'L', 'K'];
                return (
                  <div key={fdiId} className="flex flex-col items-center gap-1">
                    <AnatomicalTooth
                      type={i <= 1 || i >= 8 ? 2 : i === 2 || i === 7 ? 5 : 7}
                      arch="lower"
                      condition={condition}
                      isHovered={hoveredTooth === fdiId}
                      isSelected={selectedToothId === fdiId}
                      onClick={() => handleToothClick(fdiId)}
                      onMouseEnter={() => setHoveredTooth(fdiId)}
                      onMouseLeave={() => setHoveredTooth(null)}
                      label={labels[i]}
                    />
                    <span className="text-xs font-mono text-slate-400">{labels[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
