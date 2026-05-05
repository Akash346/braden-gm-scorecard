"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from "recharts";
import type { DashboardData, VehicleTypeData } from "@/lib/types";
import { formatCurrency } from "@/lib/formatters";

interface Props {
  data: DashboardData;
}

// ─── Tooltip formatters ───────────────────────────────────────────────────────

type ValueType = string | number | readonly (string | number)[] | undefined;
const currencyFormatter = (value: ValueType): string => {
  if (typeof value === "number") return formatCurrency(value, true);
  return String(value ?? "");
};
const percentFormatter = (value: ValueType): string => {
  if (typeof value === "number") return `${value.toFixed(1)}%`;
  return String(value ?? "");
};

// ─── Chart Section Wrapper ────────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── New vs Used Comparison Cards ────────────────────────────────────────────

function NewUsedComparison({ vehicleTypeData }: { vehicleTypeData: VehicleTypeData[] }) {
  const newData = vehicleTypeData.find((v) => v.type === "New");
  const usedData = vehicleTypeData.find((v) => v.type === "Used");

  const items = [newData, usedData].filter(Boolean) as VehicleTypeData[];

  return (
    <ChartCard
      title="New vs. Used Performance"
      subtitle="Gross PVR and volume comparison"
    >
      <div className="space-y-4">
        {items.map((v) => (
          <div key={v.type} className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${
                v.type === "New"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-violet-100 text-violet-700"
              }`}
            >
              <div className="text-center">
                <p className="text-xs font-bold leading-tight">{v.type}</p>
                <p className="text-xs leading-tight">{v.units}u</p>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-end justify-between mb-1">
                <span className="text-xs text-slate-500">Gross PVR</span>
                <span className="text-sm font-bold text-slate-900">
                  {formatCurrency(v.grossPvr)}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    v.type === "New" ? "bg-blue-500" : "bg-violet-500"
                  }`}
                  style={{
                    width: `${Math.min(100, (v.grossPvr / 6000) * 100)}%`,
                  }}
                />
              </div>
              <div className="flex gap-3 mt-1 text-xs text-slate-500">
                <span>Front: {formatCurrency(v.units > 0 ? v.frontGross / v.units : 0)}</span>
                <span>Back: {formatCurrency(v.units > 0 ? v.backGross / v.units : 0)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

// ─── Main Charts Grid ─────────────────────────────────────────────────────────

export default function ChartsGrid({ data }: Props) {
  const {
    grossByStore,
    unitsByStore,
    salesTrend,
    leadSourceChart,
    agedInventoryChart,
    vehicleTypeData,
  } = data;

  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Performance Charts
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 1. Gross by Store (stacked bar) */}
        <ChartCard
          title="Gross by Store"
          subtitle="Front gross and back gross per store"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={grossByStore}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="store"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(v) => v.replace("Store ", "S")}
              />
              <YAxis
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                width={48}
              />
              <Tooltip
                formatter={currencyFormatter}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="frontGross" name="Front Gross" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="backGross" name="Back Gross" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 2. Units Sold by Store */}
        <ChartCard
          title="Units Sold by Store"
          subtitle="Total retailed units per location"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={unitsByStore}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="store"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(v) => v.replace("Store ", "S")}
              />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
              />
              <Bar dataKey="unitsSold" name="Units Sold" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 3. Sales Trend Over Time */}
        <ChartCard
          title="Sales Trend"
          subtitle="Daily units sold and total gross over the period"
        >
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart
              data={salesTrend}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                width={32}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                width={48}
              />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                formatter={(value: ValueType, name) =>
                  name === "Total Gross"
                    ? [currencyFormatter(value), name]
                    : [value, name]
                }
              />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="left" dataKey="units" name="Units Sold" fill="#e0f2fe" stroke="#0ea5e9" strokeWidth={1} radius={[2, 2, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalGross"
                name="Total Gross"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 4. Lead Source Closing Ratio */}
        <ChartCard
          title="Lead Source Closing Ratio"
          subtitle="Closing percentage by lead origin"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={leadSourceChart}
              layout="vertical"
              margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={percentFormatter}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                domain={[0, 100]}
              />
              <YAxis
                type="category"
                dataKey="leadSource"
                tick={{ fontSize: 10, fill: "#64748b" }}
                width={90}
              />
              <Tooltip
                formatter={percentFormatter}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
              />
              <Bar dataKey="closingRatio" name="Closing Ratio" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5. Aged Inventory by Store */}
        {agedInventoryChart.length > 0 && (
          <ChartCard
            title={data.useActiveInventoryOnly ? "60+ Day Open Records by Store" : "60+ Day Records by Store"}
            subtitle={data.useActiveInventoryOnly ? "Pending/open records aged 60+ days by store" : "All records aged 60+ days by store"}
          >
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={agedInventoryChart}
                margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="store"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickFormatter={(v) => v.replace("Store ", "S")}
                />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={32} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                />
                <Bar dataKey="agedUnits" name="Aged Units" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* 6. New vs Used */}
        <NewUsedComparison vehicleTypeData={vehicleTypeData} />
      </div>
    </div>
  );
}
