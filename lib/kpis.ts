import type {
  NormalizedRow,
  KpiSummary,
  StorePerformance,
  LeadSourcePerformance,
  VehicleTypeData,
  GrossByStoreData,
  UnitsByStoreData,
  SalesTrendData,
  LeadSourceChartData,
  AgedInventoryChartData,
  DashboardData,
} from "./types";
import { isSold } from "./normalize";

const AGED_THRESHOLD_DAYS = 60;

// ─── Core Aggregation ─────────────────────────────────────────────────────────

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return map;
}

// ─── Store Performance ────────────────────────────────────────────────────────

export function calcStorePerformance(rows: NormalizedRow[], useActiveInventoryOnly: boolean = false): StorePerformance[] {
  const byStore = groupBy(rows, (r) => r.store);
  const stores: StorePerformance[] = [];

  for (const [store, storeRows] of byStore) {
    const soldRows = storeRows.filter(isSold);
    const unitsSold = soldRows.length;
    const revenue = soldRows.reduce((s, r) => s + r.sale_price, 0);
    const frontGross = soldRows.reduce((s, r) => s + r.front_gross, 0);
    const backGross = soldRows.reduce((s, r) => s + r.back_gross, 0);
    const totalGross = frontGross + backGross;
    const frontPvr = unitsSold > 0 ? frontGross / unitsSold : 0;
    const backPvr = unitsSold > 0 ? backGross / unitsSold : 0;
    const totalPvr = unitsSold > 0 ? totalGross / unitsSold : 0;
    const agedUnits = storeRows.filter((r) => {
      const isAged = r.days_in_inventory > AGED_THRESHOLD_DAYS;
      if (!isAged) return false;
      if (useActiveInventoryOnly) {
        const s = r.status.toLowerCase();
        return s.includes("pending") || s.includes("active");
      }
      return true;
    }).length;
    const leads = storeRows.length;
    const closingRatio = leads > 0 ? (unitsSold / leads) * 100 : 0;
    const negativeGrossDeals = soldRows.filter((r) => r.front_gross < 0).length;

    stores.push({
      store,
      unitsSold,
      revenue,
      frontGross,
      backGross,
      totalGross,
      frontPvr,
      backPvr,
      totalPvr,
      agedUnits,
      leads,
      closingRatio,
      negativeGrossDeals,
    });
  }

  return stores.sort((a, b) => a.store.localeCompare(b.store));
}

// ─── Lead Source Performance ──────────────────────────────────────────────────

export function calcLeadSourcePerformance(
  rows: NormalizedRow[]
): LeadSourcePerformance[] {
  const bySource = groupBy(rows, (r) => r.lead_source);
  const sources: LeadSourcePerformance[] = [];

  for (const [leadSource, sourceRows] of bySource) {
    const soldRows = sourceRows.filter(isSold);
    const sold = soldRows.length;
    const leads = sourceRows.length;
    const closingRatio = leads > 0 ? (sold / leads) * 100 : 0;
    const totalGross = soldRows.reduce(
      (s, r) => s + r.front_gross + r.back_gross,
      0
    );
    const grossPerSoldUnit = sold > 0 ? totalGross / sold : 0;

    sources.push({
      leadSource,
      leads,
      sold,
      closingRatio,
      totalGross,
      grossPerSoldUnit,
    });
  }

  return sources.sort((a, b) => b.leads - a.leads);
}

// ─── Vehicle Type Performance ─────────────────────────────────────────────────

export function calcVehicleTypeData(rows: NormalizedRow[]): VehicleTypeData[] {
  const byType = groupBy(rows, (r) => r.vehicle_type);
  const types: VehicleTypeData[] = [];

  for (const [type, typeRows] of byType) {
    const soldRows = typeRows.filter(isSold);
    const units = soldRows.length;
    const frontGross = soldRows.reduce((s, r) => s + r.front_gross, 0);
    const backGross = soldRows.reduce((s, r) => s + r.back_gross, 0);
    const totalGross = frontGross + backGross;
    const grossPvr = units > 0 ? totalGross / units : 0;

    types.push({ type, units, frontGross, backGross, totalGross, grossPvr });
  }

  return types;
}

// ─── KPI Summary ──────────────────────────────────────────────────────────────

export function calcKpis(
  rows: NormalizedRow[],
  storePerf: StorePerformance[],
  leadSourcePerf: LeadSourcePerformance[],
  vehicleTypeData: VehicleTypeData[],
  useActiveInventoryOnly: boolean = false
): KpiSummary {
  const soldRows = rows.filter(isSold);
  const totalUnitsSold = soldRows.length;
  const totalRevenue = soldRows.reduce((s, r) => s + r.sale_price, 0);
  const totalFrontGross = soldRows.reduce((s, r) => s + r.front_gross, 0);
  const totalBackGross = soldRows.reduce((s, r) => s + r.back_gross, 0);
  const totalGross = totalFrontGross + totalBackGross;
  const frontPvr = totalUnitsSold > 0 ? totalFrontGross / totalUnitsSold : 0;
  const backPvr = totalUnitsSold > 0 ? totalBackGross / totalUnitsSold : 0;
  const totalPvr = totalUnitsSold > 0 ? totalGross / totalUnitsSold : 0;

  const newData = vehicleTypeData.find((v) => v.type === "New");
  const usedData = vehicleTypeData.find((v) => v.type === "Used");
  const newUnitsSold = newData?.units ?? 0;
  const usedUnitsSold = usedData?.units ?? 0;
  const newGrossPvr = newData?.grossPvr ?? 0;
  const usedGrossPvr = usedData?.grossPvr ?? 0;

  const agedUnitCount = rows.filter((r) => {
    const isAged = r.days_in_inventory > AGED_THRESHOLD_DAYS;
    if (!isAged) return false;
    if (useActiveInventoryOnly) {
      const s = r.status.toLowerCase();
      return s.includes("pending") || s.includes("active");
    }
    return true;
  }).length;

  const bestStore =
    storePerf.length > 0
      ? storePerf.reduce((best, s) =>
          s.totalGross > best.totalGross ? s : best
        )
      : null;

  const watchStore =
    storePerf.filter((s) => s.unitsSold > 0).length > 1
      ? storePerf
          .filter((s) => s.unitsSold > 0)
          .reduce((worst, s) => (s.totalPvr < worst.totalPvr ? s : worst))
      : null;

  const bestLeadSource =
    leadSourcePerf.filter((l) => l.leads >= 5).length > 0
      ? leadSourcePerf
          .filter((l) => l.leads >= 5)
          .reduce((best, l) =>
            l.closingRatio > best.closingRatio ? l : best
          )
      : leadSourcePerf[0] ?? null;

  const totalLeads = rows.length;
  const closingRatio =
    totalLeads > 0 ? (totalUnitsSold / totalLeads) * 100 : 0;

  return {
    totalUnitsSold,
    totalRevenue,
    totalFrontGross,
    totalBackGross,
    totalGross,
    frontPvr,
    backPvr,
    totalPvr,
    newUnitsSold,
    usedUnitsSold,
    agedUnitCount,
    bestStoreByGross: bestStore?.store ?? "—",
    watchlistStore: watchStore?.store ?? "—",
    bestLeadSourceByClosingRatio: bestLeadSource?.leadSource ?? "—",
    totalLeads,
    closingRatio,
    newGrossPvr,
    usedGrossPvr,
  };
}

// ─── Chart Data Builders ──────────────────────────────────────────────────────

export function buildGrossByStore(storePerf: StorePerformance[]): GrossByStoreData[] {
  return storePerf.map((s) => ({
    store: s.store,
    frontGross: Math.round(s.frontGross),
    backGross: Math.round(s.backGross),
    totalGross: Math.round(s.totalGross),
  }));
}

export function buildUnitsByStore(storePerf: StorePerformance[]): UnitsByStoreData[] {
  return storePerf.map((s) => ({
    store: s.store,
    unitsSold: s.unitsSold,
  }));
}

export function buildSalesTrend(rows: NormalizedRow[]): SalesTrendData[] {
  const soldRows = rows.filter(isSold);
  const byDate = groupBy(
    soldRows,
    (r) => r.date.toISOString().split("T")[0]
  );

  const trendMap = new Map<string, { units: number; totalGross: number }>();
  for (const [date, dateRows] of byDate) {
    const units = dateRows.length;
    const totalGross = dateRows.reduce(
      (s, r) => s + r.front_gross + r.back_gross,
      0
    );
    trendMap.set(date, { units, totalGross });
  }

  return Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date: new Date(date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      units: data.units,
      totalGross: Math.round(data.totalGross),
    }));
}

export function buildLeadSourceChart(
  leadSourcePerf: LeadSourcePerformance[]
): LeadSourceChartData[] {
  return leadSourcePerf
    .filter((l) => l.leads >= 3)
    .map((l) => ({
      leadSource: l.leadSource,
      closingRatio: parseFloat(l.closingRatio.toFixed(1)),
      leads: l.leads,
    }))
    .sort((a, b) => b.closingRatio - a.closingRatio);
}

export function buildAgedInventoryChart(
  storePerf: StorePerformance[]
): AgedInventoryChartData[] {
  return storePerf
    .filter((s) => s.agedUnits > 0)
    .map((s) => ({ store: s.store, agedUnits: s.agedUnits }))
    .sort((a, b) => b.agedUnits - a.agedUnits);
}

// ─── Full Dashboard Data Builder ──────────────────────────────────────────────

export function buildDashboardData(
  parsedRows: NormalizedRow[],
  fileName: string,
  dateRange: { start: Date; end: Date } | null,
  useActiveInventoryOnly: boolean = false
): Omit<DashboardData, "fileName" | "rowCount" | "dateRange" | "useActiveInventoryOnly"> & {
  fileName: string,
  rowCount: number,
  dateRange: { start: Date; end: Date } | null,
  useActiveInventoryOnly: boolean
} {
  const storePerformance = calcStorePerformance(parsedRows, useActiveInventoryOnly);
  const leadSourcePerformance = calcLeadSourcePerformance(parsedRows);
  const vehicleTypeData = calcVehicleTypeData(parsedRows);
  const kpis = calcKpis(
    parsedRows,
    storePerformance,
    leadSourcePerformance,
    vehicleTypeData,
    useActiveInventoryOnly
  );

  const grossByStore = buildGrossByStore(storePerformance);
  const unitsByStore = buildUnitsByStore(storePerformance);
  const salesTrend = buildSalesTrend(parsedRows);
  const leadSourceChart = buildLeadSourceChart(leadSourcePerformance);
  const agedInventoryChart = buildAgedInventoryChart(storePerformance);

  return {
    fileName,
    rowCount: parsedRows.length,
    dateRange,
    rows: parsedRows,
    kpis,
    storePerformance,
    leadSourcePerformance,
    vehicleTypeData,
    grossByStore,
    unitsByStore,
    salesTrend,
    leadSourceChart,
    agedInventoryChart,
    alerts: [], // Populated separately by alert engine
    useActiveInventoryOnly,
  };
}
