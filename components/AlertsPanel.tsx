"use client";

import React from "react";
import type { AlertItem } from "@/lib/types";

interface Props {
  alerts: AlertItem[];
}

const SEVERITY_STYLES = {
  high: {
    badge: "bg-red-100 text-red-700 border-red-200",
    border: "border-l-red-500",
    dot: "bg-red-500",
    label: "High",
  },
  medium: {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    border: "border-l-amber-400",
    dot: "bg-amber-400",
    label: "Medium",
  },
  low: {
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    border: "border-l-blue-400",
    dot: "bg-blue-400",
    label: "Low",
  },
};

interface AlertCardProps {
  alert: AlertItem;
}

function AlertCard({ alert }: AlertCardProps) {
  const styles = SEVERITY_STYLES[alert.severity];

  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-4 border-l-4 ${styles.border} shadow-sm`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${styles.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
              {styles.label}
            </span>
            <span className="text-xs font-medium text-slate-600">
              {alert.metric}
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">{alert.storeOrSegment}</span>
          </div>

          <p className="text-sm text-slate-800 leading-snug mb-2">
            {alert.finding}
          </p>

          <div className="flex items-start gap-1.5">
            <svg
              className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <p className="text-xs text-slate-600 leading-snug">
              {alert.recommendedAction}
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <span className="text-xs font-mono text-slate-500 bg-slate-100 rounded px-2 py-1 whitespace-nowrap">
            {alert.supportingValue}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AlertsPanel({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400 text-sm">
        No alerts generated. All metrics within normal ranges.
      </div>
    );
  }

  const high = alerts.filter((a) => a.severity === "high");
  const medium = alerts.filter((a) => a.severity === "medium");
  const low = alerts.filter((a) => a.severity === "low");

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Operational Alerts
        </h2>
        <div className="flex items-center gap-2 text-xs">
          {high.length > 0 && (
            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              {high.length} High
            </span>
          )}
          {medium.length > 0 && (
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {medium.length} Medium
            </span>
          )}
          {low.length > 0 && (
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {low.length} Low
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        Showing top {alerts.length} operational alert{alerts.length !== 1 ? "s" : ""} — ranked by severity and business importance
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {alerts.map((alert) => (
          <AlertCard key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  );
}
