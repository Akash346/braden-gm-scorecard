"use client";

import React, { useState } from "react";
import type { LeadSourcePerformance } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/formatters";

interface Props {
  data: LeadSourcePerformance[];
}

type SortKey = keyof LeadSourcePerformance;
type SortDir = "asc" | "desc";

export default function LeadSourceTable({ data }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("leads");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = [...data].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    }
    return sortDir === "desc"
      ? String(bVal).localeCompare(String(aVal))
      : String(aVal).localeCompare(String(bVal));
  });

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="ml-1 text-slate-300">↕</span>;
    return <span className="ml-1 text-blue-600">{sortDir === "desc" ? "↓" : "↑"}</span>;
  };

  const th = (label: string, col: SortKey) => (
    <th
      key={col}
      onClick={() => handleSort(col)}
      className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-800 whitespace-nowrap select-none"
    >
      {label}
      <SortIcon col={col} />
    </th>
  );

  // Average closing ratio for comparison
  const avgCR =
    data.length > 0
      ? data.reduce((s, l) => s + l.closingRatio, 0) / data.length
      : 0;

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Lead Source Performance
      </h2>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {th("Lead Source", "leadSource")}
                {th("Leads", "leads")}
                {th("Sold", "sold")}
                {th("Close %", "closingRatio")}
                {th("Total Gross", "totalGross")}
                {th("Gross / Unit", "grossPerSoldUnit")}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((l) => {
                const isLowCR = l.leads >= 10 && l.closingRatio < avgCR * 0.75;
                const isTopCR = l.closingRatio > avgCR * 1.2 && l.leads >= 5;
                return (
                  <tr
                    key={l.leadSource}
                    className={`hover:bg-slate-50 transition-colors ${
                      isLowCR ? "bg-amber-50/60" : ""
                    }`}
                  >
                    <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      {l.leadSource}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{formatNumber(l.leads)}</td>
                    <td className="px-3 py-3 text-slate-700">{formatNumber(l.sold)}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`font-semibold ${
                          isTopCR
                            ? "text-emerald-600"
                            : isLowCR
                            ? "text-red-600"
                            : "text-slate-800"
                        }`}
                      >
                        {formatPercent(l.closingRatio)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {formatCurrency(l.totalGross, true)}
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-800">
                      {l.sold > 0 ? formatCurrency(l.grossPerSoldUnit) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-400">
          Amber rows have high lead volume but low closing ratio · Green indicates top performer
        </div>
      </div>
    </div>
  );
}
