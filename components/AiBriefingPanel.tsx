"use client";

import React, { useState } from "react";
import type { AiInsight, DashboardData } from "@/lib/types";
import { buildAiPayload, validatePayloadSize } from "@/lib/aiPayload";

interface Props {
  data: DashboardData;
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

export default function AiBriefingPanel({ data }: Props) {
  const [insight, setInsight] = useState<AiInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checkedActions, setCheckedActions] = useState<Set<number>>(new Set());

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = buildAiPayload(data);

      const sizeError = validatePayloadSize(payload);
      if (sizeError) {
        setError(sizeError);
        setLoading(false);
        return;
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "AI analysis failed. Please try again.");
        return;
      }

      setInsight(json.insight);
      setCheckedActions(new Set());
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleAction = (index: number) => {
    setCheckedActions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleCopy = async () => {
    if (!insight) return;

    const text = [
      `BRADEN GM MORNING BRIEFING`,
      `Generated: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
      ``,
      `HEADLINE`,
      insight.headline,
      ``,
      `ASSESSMENT`,
      insight.overall_assessment,
      ``,
      `KEY FINDINGS`,
      ...insight.findings.map(
        (f, idx) =>
          `${idx + 1}. [${f.severity.toUpperCase()}] ${f.metric} — ${f.store_or_segment}\n   ${f.finding}\n   → ${f.recommended_action}`
      ),
      ``,
      `WATCH ITEMS`,
      ...insight.watch_items.map((w, idx) => `${idx + 1}. ${w}`),
      ``,
      `TOMORROW'S ACTIONS`,
      ...insight.tomorrow_actions.map((a) => `☐ ${a}`),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: do nothing — clipboard API may not be available in all contexts
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">AI GM Briefing</h2>
            <p className="text-xs text-slate-500">Powered by Claude · Only aggregated metrics sent</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {insight && (
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Briefing
                </>
              )}
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {insight ? "Regenerate" : "Generate AI Briefing"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold mb-0.5">Analysis Failed</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && !insight && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
            <div className="w-10 h-10 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin" />
            <p className="text-sm">Analyzing dealership metrics with Claude...</p>
            <p className="text-xs text-slate-400">Only aggregated KPIs are being sent</p>
          </div>
        )}

        {/* Empty state */}
        {!insight && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Ready for AI Analysis</p>
              <p className="text-xs text-slate-500 mt-1">
                Click &ldquo;Generate AI Briefing&rdquo; to get Claude-powered executive insights.
                <br />
                Raw CSV stays in your browser &mdash; only aggregated KPIs are analyzed.
              </p>
            </div>
          </div>
        )}

        {/* Insight Content */}
        {insight && (
          <div className="space-y-6">
            {/* Headline */}
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-sm font-bold text-blue-900 leading-snug">
                {insight.headline}
              </p>
            </div>

            {/* Overall Assessment */}
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Overall Assessment
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                {insight.overall_assessment}
              </p>
            </div>

            {/* Findings */}
            {insight.findings.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Key Findings ({insight.findings.length})
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {insight.findings.map((f, i) => {
                    const sev =
                      f.severity in SEVERITY_STYLES
                        ? f.severity
                        : "low";
                    const styles = SEVERITY_STYLES[sev as keyof typeof SEVERITY_STYLES];
                    return (
                      <div
                        key={i}
                        className={`bg-white border border-slate-200 rounded-xl p-4 border-l-4 ${styles.border} shadow-sm`}
                      >
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${styles.badge}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                            {styles.label}
                          </span>
                          <span className="text-xs font-medium text-slate-600">
                            {f.metric}
                          </span>
                          {f.store_or_segment && (
                            <>
                              <span className="text-xs text-slate-400">·</span>
                              <span className="text-xs text-slate-500">
                                {f.store_or_segment}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-sm text-slate-800 leading-snug mb-2">
                          {f.finding}
                        </p>
                        <div className="flex items-start gap-1.5">
                          <svg className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <p className="text-xs text-slate-600 leading-snug">
                            {f.recommended_action}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Watch Items + Tomorrow Actions side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Watch Items */}
              {insight.watch_items.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Watch Items
                  </h3>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                    {insight.watch_items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="w-4 h-4 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-xs text-slate-700 leading-snug">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tomorrow's Actions */}
              {insight.tomorrow_actions.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Tomorrow&apos;s Actions
                  </h3>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                    {insight.tomorrow_actions.map((action, i) => (
                      <label
                        key={i}
                        className="flex items-start gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checkedActions.has(i)}
                          onChange={() => toggleAction(i)}
                          className="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                        />
                        <span
                          className={`text-xs leading-snug ${
                            checkedActions.has(i)
                              ? "line-through text-slate-400"
                              : "text-slate-700"
                          }`}
                        >
                          {action}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-200">
        <p className="text-xs text-slate-400 text-center">
          Raw CSV is processed locally. Only aggregated metrics are sent for AI analysis. Customer-level rows are not sent.
        </p>
      </div>
    </div>
  );
}
