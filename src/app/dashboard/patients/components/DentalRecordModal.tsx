'use client';

import React, { useState, useEffect } from 'react';
import {
  ToothCondition,
  ToothSurface,
  CONDITION_CONFIG,
  PERMANENT_TEETH_COORDS,
  UPPER_UNIV,
  LOWER_UNIV,
  UPPER_FDI,
  LOWER_FDI,
  findToothCoord,
} from '@/app/components/DentitionChart';
import { DentalRecordItem } from './DentalRecordsCard';
import { X, Check, Trash2 } from 'lucide-react';

interface DentalRecordModalProps {
  isOpen: boolean;
  initialRecord?: DentalRecordItem | null;
  onClose: () => void;
  onSave: (record: DentalRecordItem) => void;
  onDelete?: (toothId: string) => void;
}

const ALL_TEETH_OPTIONS = [
  ...UPPER_FDI.map((fdi: string, i: number) => ({
    fdi,
    univ: UPPER_UNIV[i],
    name: findToothCoord(fdi).name,
    arch: 'Upper Maxillary',
  })),
  ...LOWER_FDI.map((fdi: string, i: number) => ({
    fdi,
    univ: LOWER_UNIV[i],
    name: findToothCoord(fdi).name,
    arch: 'Lower Mandibular',
  })),
];

const SURFACES: Array<{ id: ToothSurface; label: string; desc: string }> = [
  { id: 'O', label: 'Occlusal (O)', desc: 'Chewing surface' },
  { id: 'M', label: 'Mesial (M)', desc: 'Toward front midline' },
  { id: 'D', label: 'Distal (D)', desc: 'Toward back of arch' },
  { id: 'B', label: 'Buccal (B)', desc: 'Cheek/lip side' },
  { id: 'L', label: 'Lingual (L)', desc: 'Tongue/palate side' },
];

export default function DentalRecordModal({
  isOpen,
  initialRecord,
  onClose,
  onSave,
  onDelete,
}: DentalRecordModalProps) {
  const [toothId, setToothId] = useState('11');
  const [condition, setCondition] = useState<ToothCondition>('caries');
  const [surfaces, setSurfaces] = useState<ToothSurface[]>(['O']);
  const [treatment, setTreatment] = useState('');
  const [price, setPrice] = useState<string>('');
  const [status, setStatus] = useState<'In Progress' | 'Scheduled' | 'Completed'>('In Progress');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialRecord) {
      setToothId(initialRecord.toothId || '11');
      setCondition(initialRecord.condition || 'sound');
      setSurfaces(initialRecord.surfaces || []);
      setTreatment(initialRecord.treatment || '');
      setPrice(initialRecord.price ? String(initialRecord.price) : '');
      setStatus(initialRecord.status || 'In Progress');
      setNotes(initialRecord.notes || '');
    } else {
      setToothId('11');
      setCondition('caries');
      setSurfaces(['O']);
      setTreatment('');
      setPrice('');
      setStatus('In Progress');
      setNotes('');
    }
  }, [initialRecord, isOpen]);

  if (!isOpen) return null;

  const toggleSurface = (s: ToothSurface) => {
    setSurfaces((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      toothId,
      condition,
      surfaces,
      treatment: treatment.trim() || undefined,
      price: price ? Number(price) : undefined,
      status,
      notes: notes.trim() || undefined,
      date: new Date().toISOString(),
    });
    onClose();
  };

  const currentToothInfo = ALL_TEETH_OPTIONS.find((t) => t.fdi === toothId);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {initialRecord ? 'Edit Dental Record' : 'Add Dental Record'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Specify anatomical tooth finding, proposed treatment, and billing.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
          {/* Tooth Selection */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Select Tooth
            </label>
            <select
              value={toothId}
              onChange={(e) => setToothId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-[#008294] focus:outline-hidden"
            >
              {ALL_TEETH_OPTIONS.map((opt) => (
                <option key={opt.fdi} value={opt.fdi}>
                  #{opt.univ} (FDI {opt.fdi}) — {opt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Condition / Finding */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Finding / Condition
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(CONDITION_CONFIG) as ToothCondition[]).map((cond) => {
                const conf = CONDITION_CONFIG[cond];
                const isSelected = condition === cond;
                return (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => setCondition(cond)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#008294] bg-[#008294]/10 text-[#008294] shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span
                      className="size-2 rounded-full shrink-0"
                      style={{ backgroundColor: conf.dotColor }}
                    />
                    <span className="truncate">{conf.label.split('/')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Affected Surfaces */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Surfaces (if applicable)
            </label>
            <div className="flex flex-wrap gap-2">
              {SURFACES.map((s) => {
                const isChecked = surfaces.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSurface(s.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-[#008294] text-white border-[#008294] shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Treatment & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Treatment / Procedure
              </label>
              <input
                type="text"
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
                placeholder="e.g. Composite Restoration, Crown..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008294] focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Estimated Price (USD $)
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 150"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-[#008294] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Status
            </label>
            <div className="flex gap-2">
              {(['In Progress', 'Scheduled', 'Completed'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    status === st
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Clinical Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter specific diagnosis or procedure details..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-[#008294] focus:outline-hidden resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
            {initialRecord && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(initialRecord.toothId);
                  onClose();
                }}
                className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="size-4" />
                <span>Remove</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#008294] hover:bg-[#007080] text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Save Record
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
