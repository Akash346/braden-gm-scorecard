"use client";

import React, { useState } from "react";
import type { StorePerformance } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/formatters";

interface Props {
  data: StorePerformance[];
  useActiveInventoryOnly?: boolean;
}

type SortKey = keyof StorePerformance;
type SortDir = "asc" | "desc";

export default function StorePerformanceTable({ data, useActiveInventoryOnly = false }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("totalGross");
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
    if (sortKey !== col) {
      return <span className="ml-1 text-slate-300">↕</span>;
    }
    return (
      <span className="ml-1 text-blue-600">
        {sortDir === "desc" ? "↓" : "↑"}
      </span>
    );
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

  // Average for group comparison
  const soldStores = data.filter((s) => s.unitsSold > 0);
  const avgTotalPvr =
    soldStores.length > 0
      ? soldStores.reduce((s, st) => s + st.totalPvr, 0) / soldStores.length
      : 0;

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Store Performance
      </h2>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {th("Store", "store")}
                {th("Units", "unitsSold")}
                {th("Revenue", "revenue")}
                {th("Front Gross", "frontGross")}
                {th("Back Gross", "backGross")}
                {th("Total Gross", "totalGross")}
                {th("Front PVR", "frontPvr")}
                {th("Back PVR", "backPvr")}
                {th("Total PVR", "totalPvr")}
                {th(useActiveInventoryOnly ? "60+ Day Open" : "60+ Day Records", "agedUnits")}
                {th("Close %", "closingRatio")}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((s) => {
                const isBelowAvg =
                  s.unitsSold > 0 && s.totalPvr < avgTotalPvr * 0.8;
                return (
                  <tr
                    key={s.store}
                    className={`hover:bg-slate-50 transition-colors ${
                      isBelowAvg ? "bg-amber-50/60" : ""
                    }`}
                  >
                    <td className="px-3 py-3 font-semibold text-slate-800 whitespace-nowrap">
                      {s.store}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{formatNumber(s.unitsSold)}</td>
                    <td className="px-3 py-3 text-slate-700">{formatCurrency(s.revenue, true)}</td>
                    <td className="px-3 py-3 text-slate-700">{formatCurrency(s.frontGross, true)}</td>
                    <td className="px-3 py-3 text-slate-700">{formatCurrency(s.backGross, true)}</td>
                    <td className="px-3 py-3 font-semibold text-slate-800">{formatCurrency(s.totalGross, true)}</td>
                    <td
                      className={`px-3 py-3 font-medium ${
                        s.unitsSold > 0 && s.frontPvr < avgTotalPvr * 0.5
                          ? "text-red-600"
                          : "text-slate-700"
                      }`}
                    >
                      {formatCurrency(s.frontPvr)}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{formatCurrency(s.backPvr)}</td>
                    <td
                      className={`px-3 py-3 font-semibold ${
                        isBelowAvg ? "text-amber-700" : "text-slate-800"
                      }`}
                    >
                      {formatCurrency(s.totalPvr)}
                    </td>
                    <td
                      className={`px-3 py-3 font-medium ${
                        s.agedUnits >= 5 ? "text-red-600" : s.agedUnits >= 3 ? "text-amber-600" : "text-slate-700"
                      }`}
                    >
                      {s.agedUnits > 0 ? s.agedUnits : "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{formatPercent(s.closingRatio)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-400">
          Click column headers to sort · Amber rows are below 80% of group avg PVR
        </div>
      </div>
    </div>
  );
}
