"use client";

import React from "react";
import type { DashboardData } from "@/lib/types";
import { formatDate } from "@/lib/formatters";

interface Props {
  data: DashboardData;
  onToggleActiveInventory?: (val: boolean) => void;
}

export default function DataStatusPanel({ data, onToggleActiveInventory }: Props) {
  const { fileName, rowCount, dateRange, useActiveInventoryOnly } = data;

  const dateStr = dateRange
    ? `${formatDate(dateRange.start)} – ${formatDate(dateRange.end)}`
    : "—";

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 leading-tight">
              {fileName}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Data loaded successfully</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-800">{rowCount.toLocaleString()}</span>
            <span>rows</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-800">{dateStr}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Processed locally · Only aggregates sent for AI</span>
          </div>
        </div>
      </div>
      
      {onToggleActiveInventory && (
        <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center gap-2">
          <input
            type="checkbox"
            id="active-inventory-toggle"
            checked={useActiveInventoryOnly}
            onChange={(e) => onToggleActiveInventory(e.target.checked)}
            className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 cursor-pointer"
          />
          <label htmlFor="active-inventory-toggle" className="text-xs font-medium text-emerald-800 cursor-pointer select-none">
            Filter 60+ Day Units to Pending/Open only
          </label>
          <span className="text-xs text-emerald-600 ml-1">
            (Excludes sold and lost vehicles from aged unit calculations)
          </span>
        </div>
      )}
    </div>
  );
}
