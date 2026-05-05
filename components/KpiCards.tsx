"use client";

import React from "react";
import type { KpiSummary } from "@/lib/types";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/formatters";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  warning?: boolean;
  icon: React.ReactNode;
}

function KpiCard({ label, value, sub, highlight, warning, icon }: KpiCardProps) {
  return (
    <div
      className={`bg-white rounded-xl border p-4 flex flex-col gap-2 shadow-sm transition-all ${
        highlight
          ? "border-blue-200 bg-blue-50/40"
          : warning
          ? "border-amber-200 bg-amber-50/40"
          : "border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide leading-tight">
          {label}
        </span>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            highlight
              ? "bg-blue-100 text-blue-700"
              : warning
              ? "bg-amber-100 text-amber-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {icon}
        </div>
      </div>
      <div className="mt-1">
        <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconCar = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 17H5m0 0a2 2 0 01-2-2V9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v6a2 2 0 01-2 2zM7 17v2a2 2 0 002 2h6a2 2 0 002-2v-2" />
  </svg>
);

const IconDollar = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconTrend = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const IconStore = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const IconWarning = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const IconTarget = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
  </svg>
);

interface KpiCardsProps {
  kpis: KpiSummary;
  useActiveInventoryOnly?: boolean;
}

export default function KpiCards({ kpis, useActiveInventoryOnly = false }: KpiCardsProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Key Performance Indicators
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <KpiCard
          label="Total Units Sold"
          value={formatNumber(kpis.totalUnitsSold)}
          sub={`${formatNumber(kpis.newUnitsSold)} New · ${formatNumber(kpis.usedUnitsSold)} Used`}
          highlight
          icon={<IconCar />}
        />
        <KpiCard
          label="Total Revenue"
          value={formatCurrency(kpis.totalRevenue, true)}
          sub="Gross sale proceeds"
          icon={<IconDollar />}
        />
        <KpiCard
          label="Total Gross"
          value={formatCurrency(kpis.totalGross, true)}
          sub={`Front ${formatCurrency(kpis.totalFrontGross, true)} · Back ${formatCurrency(kpis.totalBackGross, true)}`}
          highlight
          icon={<IconTrend />}
        />
        <KpiCard
          label="Front PVR"
          value={formatCurrency(kpis.frontPvr)}
          sub="Per vehicle retailed"
          icon={<IconDollar />}
        />
        <KpiCard
          label="Back PVR (F&I)"
          value={formatCurrency(kpis.backPvr)}
          sub="Per vehicle retailed"
          icon={<IconDollar />}
        />
        <KpiCard
          label="Total PVR"
          value={formatCurrency(kpis.totalPvr)}
          sub="Combined front + back"
          highlight
          icon={<IconDollar />}
        />
        <KpiCard
          label="Closing Ratio"
          value={formatPercent(kpis.closingRatio)}
          sub={`${formatNumber(kpis.totalLeads)} total leads`}
          icon={<IconTarget />}
        />
        <KpiCard
          label="New PVR"
          value={formatCurrency(kpis.newGrossPvr)}
          sub={`${formatNumber(kpis.newUnitsSold)} units`}
          icon={<IconCar />}
        />
        <KpiCard
          label="Used PVR"
          value={formatCurrency(kpis.usedGrossPvr)}
          sub={`${formatNumber(kpis.usedUnitsSold)} units`}
          icon={<IconCar />}
        />
        <KpiCard
          label={useActiveInventoryOnly ? "60+ Day Open Records" : "60+ Day Records"}
          value={formatNumber(kpis.agedUnitCount)}
          sub={useActiveInventoryOnly ? "Pending/open records aged 60+ days" : "All statuses: sold, pending, lost"}
          warning={kpis.agedUnitCount > 5}
          icon={<IconWarning />}
        />
        <KpiCard
          label="Best Store"
          value={kpis.bestStoreByGross}
          sub="By total gross"
          highlight
          icon={<IconStore />}
        />
        <KpiCard
          label="Watchlist Store"
          value={kpis.watchlistStore}
          sub="Lowest total PVR"
          warning
          icon={<IconWarning />}
        />
        <KpiCard
          label="Top Lead Source"
          value={kpis.bestLeadSourceByClosingRatio}
          sub="Best closing ratio"
          icon={<IconTarget />}
        />
        <KpiCard
          label="Front Gross Total"
          value={formatCurrency(kpis.totalFrontGross, true)}
          sub={`${formatCurrency(kpis.frontPvr)} PVR`}
          icon={<IconDollar />}
        />
      </div>
    </div>
  );
}
