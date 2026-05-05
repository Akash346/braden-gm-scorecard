"use client";

import React, { useRef, useState, useCallback } from "react";
import Header from "@/components/Header";
import CsvUploader from "@/components/CsvUploader";
import DataStatusPanel from "@/components/DataStatusPanel";
import KpiCards from "@/components/KpiCards";
import ChartsGrid from "@/components/ChartsGrid";
import AlertsPanel from "@/components/AlertsPanel";
import StorePerformanceTable from "@/components/StorePerformanceTable";
import LeadSourceTable from "@/components/LeadSourceTable";
import AiBriefingPanel from "@/components/AiBriefingPanel";
import type { DashboardData, CsvValidationResult } from "@/lib/types";
import { buildDashboardData } from "@/lib/kpis";
import { generateAlerts } from "@/lib/alerts";
import { parseCsvString } from "@/lib/csv";

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParsed = useCallback((result: CsvValidationResult, useActive: boolean = false) => {
    setError(null);
    if (!result.valid || result.parsedRows.length === 0) {
      setError(result.errors[0] ?? "Invalid CSV file.");
      setIsLoading(false);
      return;
    }

    const base = buildDashboardData(
      result.parsedRows,
      result.fileName,
      result.dateRange,
      useActive
    );

    const alerts = generateAlerts(
      base.storePerformance,
      base.leadSourcePerformance,
      base.vehicleTypeData,
      base.kpis
    );

    setDashboardData({ ...base, alerts });
    setIsLoading(false);
  }, []);

  const handleError = useCallback((msg: string) => {
    setError(msg);
    setIsLoading(false);
  }, []);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSampleData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/sample-dealership-sales.csv");
      if (!res.ok) throw new Error("Could not load sample data.");
      const csvText = await res.text();
      const result = parseCsvString(csvText, "sample-dealership-sales.csv");
      handleParsed(result);
    } catch {
      handleError("Failed to load sample data. Please try uploading a CSV instead.");
    }
  };

  const handleToggleActiveInventory = useCallback((val: boolean) => {
    if (!dashboardData) return;
    
    // We can just reconstruct the result object to feed back into handleParsed
    const mockResult: CsvValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      rowCount: dashboardData.rows.length,
      parsedRows: dashboardData.rows,
      fileName: dashboardData.fileName,
      dateRange: dashboardData.dateRange,
    };
    
    handleParsed(mockResult, val);
  }, [dashboardData, handleParsed]);

  const handleReset = () => {
    setDashboardData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <Header
        onUploadClick={handleUploadClick}
        onSampleData={handleSampleData}
        hasData={!!dashboardData}
        onReset={handleReset}
        isLoading={isLoading}
      />

      {/* Hidden CSV uploader */}
      <CsvUploader
        onParsed={handleParsed}
        onError={handleError}
        isLoading={isLoading}
        inputRef={fileInputRef}
      />

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Error Banner */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <svg
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold mb-0.5">Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-10 h-10 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-600">Parsing and analyzing your data...</p>
          </div>
        )}

        {/* Empty / Landing State */}
        {!dashboardData && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
              <svg
                className="w-8 h-8 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="max-w-md">
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Good morning, GM.
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Upload your dealership sales CSV to instantly view KPIs, identify weak stores,
                flag aged inventory, and generate an AI-powered executive briefing — all before
                your first meeting of the day.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <button
                onClick={handleSampleData}
                className="px-5 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
              >
                View Sample Dealership Data
              </button>
              <button
                onClick={handleUploadClick}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload CSV
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-slate-400 mt-2">
              <span>✓ 12 stores · 30 days of activity</span>
              <span>✓ Seeded business problems</span>
              <span>✓ AI-ready analysis</span>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {dashboardData && !isLoading && (
          <>
            {/* Data Status */}
            <DataStatusPanel 
              data={dashboardData} 
              onToggleActiveInventory={handleToggleActiveInventory}
            />

            {/* KPI Cards */}
            <KpiCards 
              kpis={dashboardData.kpis} 
              useActiveInventoryOnly={dashboardData.useActiveInventoryOnly} 
            />

            {/* Charts */}
            <ChartsGrid data={dashboardData} />

            {/* Operational Alerts */}
            <AlertsPanel alerts={dashboardData.alerts} />

            {/* Store Table */}
            <StorePerformanceTable 
              data={dashboardData.storePerformance} 
              useActiveInventoryOnly={dashboardData.useActiveInventoryOnly}
            />

            {/* Lead Source Table */}
            <LeadSourceTable data={dashboardData.leadSourcePerformance} />

            {/* AI Briefing Panel */}
            <AiBriefingPanel data={dashboardData} />
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12 py-6">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
            <span>Braden GM Morning Scorecard · Built for Braden Auto Group</span>
            <span>Raw CSV is processed locally. Only aggregated metrics are sent for AI analysis. Customer-level rows are not sent.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
