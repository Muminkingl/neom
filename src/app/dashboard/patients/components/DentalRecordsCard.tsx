'use client';

import React, { useState } from 'react';
import {
  ToothCondition,
  ToothSurface,
  ToothRecord,
  CONDITION_CONFIG,
  findToothCoord,
} from '@/app/components/DentitionChart';
import { Plus, Trash2, Edit3, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

export interface DentalRecordItem {
  toothId: string;
  condition: ToothCondition;
  surfaces: ToothSurface[];
  notes?: string;
  treatment?: string;
  price?: number | string;
  status?: 'Completed' | 'In Progress' | 'Scheduled';
  date?: string;
}

interface DentalRecordsCardProps {
  records: DentalRecordItem[];
  onAddRecord: () => void;
  onEditRecord: (record: DentalRecordItem) => void;
  onDeleteRecord: (toothId: string) => void;
  onScheduleTooth?: (toothId: string) => void;
  readOnly?: boolean;
}

export default function DentalRecordsCard({
  records,
  onAddRecord,
  onEditRecord,
  onDeleteRecord,
  onScheduleTooth,
  readOnly = false,
}: DentalRecordsCardProps) {
  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden transition-all">
      {/* Header exactly matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-5 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            Dental records
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track dental findings, treatment, and pricing.
          </p>
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={onAddRecord}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#008294] hover:bg-[#007080] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="size-4" />
            <span>Add record</span>
          </button>
        )}
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        {records.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-6">Tooth</th>
                <th className="py-3 px-4">Finding / Condition</th>
                <th className="py-3 px-4">Surfaces</th>
                <th className="py-3 px-4">Treatment Plan</th>
                <th className="py-3 px-4">Pricing</th>
                <th className="py-3 px-4">Status</th>
                {!readOnly && <th className="py-3 px-6 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {records.map((rec) => {
                const coord = findToothCoord(rec.toothId);
                const config = CONDITION_CONFIG[rec.condition] || {
                  label: rec.condition,
                  dotColor: '#008294',
                };

                return (
                  <tr
                    key={rec.toothId}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Tooth # & Palmer */}
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center justify-center size-8 rounded-lg bg-[#008294]/10 text-[#008294] font-bold text-xs font-mono">
                          #{rec.toothId}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-100 text-xs">
                            {coord.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {coord.palmer} • {coord.arch}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Condition badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{
                          backgroundColor: `${config.dotColor}15`,
                          color: config.dotColor,
                        }}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: config.dotColor }}
                        />
                        {config.label}
                      </span>
                    </td>

                    {/* Surfaces */}
                    <td className="py-3.5 px-4">
                      {rec.surfaces && rec.surfaces.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {rec.surfaces.map((s) => (
                            <span
                              key={s}
                              className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Treatment / Notes */}
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                          {rec.treatment || 'Observation / Monitoring'}
                        </div>
                        {rec.notes && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {rec.notes}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Pricing */}
                    <td className="py-3.5 px-4 font-mono font-semibold text-xs text-slate-900 dark:text-slate-100">
                      {rec.price ? `$${Number(rec.price).toLocaleString()}` : '—'}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          rec.status === 'Completed'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : rec.status === 'Scheduled'
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}
                      >
                        {rec.status || 'Active'}
                      </span>
                    </td>

                    {/* Actions */}
                    {!readOnly && (
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onScheduleTooth && (
                            <button
                              type="button"
                              onClick={() => onScheduleTooth(rec.toothId)}
                              title="Schedule Procedure"
                              className="p-1.5 text-slate-400 hover:text-[#008294] hover:bg-[#008294]/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Calendar className="size-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onEditRecord(rec)}
                            title="Edit Record"
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteRecord(rec.toothId)}
                            title="Remove Record"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="py-12 px-6 text-center">
            <div className="size-12 rounded-2xl bg-[#008294]/10 text-[#008294] flex items-center justify-center mx-auto mb-3">
              <Plus className="size-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No dental findings or records yet
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Click &quot;Add record&quot; or click on any tooth in the chart above to document findings, procedures, and pricing.
            </p>
            {!readOnly && (
              <button
                type="button"
                onClick={onAddRecord}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#008294] hover:bg-[#007080] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="size-4" />
                <span>Record First Finding</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
