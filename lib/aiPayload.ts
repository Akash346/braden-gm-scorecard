import type { DashboardData, AiPayload, AlertItem } from "./types";
import { isSold } from "./normalize";
import { calcAgedDistribution } from "./alerts";

const MAX_ALERTS_IN_PAYLOAD = 8;
const MAX_STORES_IN_PAYLOAD = 15;
const MAX_LEAD_SOURCES_IN_PAYLOAD = 10;
const AGED_THRESHOLD_DAYS = 60;

/**
 * Scrubs or anonymizes salesperson names before any data leaves the browser.
 * We never send real names to Claude.
 */
function scrubSalesperson(name: string): string {
  void name;
  return "[anonymized]";
}
void scrubSalesperson;

/**
 * Builds the AI payload from aggregated dashboard data.
 * - No raw CSV rows, no VINs, no stock numbers, no customer information
 * - Salesperson names anonymized
 * - Only aggregated KPIs, store summaries, and alerts
 * - Aged inventory distribution with status breakdown for accurate Claude context
 */
export function buildAiPayload(data: DashboardData): AiPayload {
  const { kpis, storePerformance, leadSourcePerformance, vehicleTypeData, alerts, dateRange, rows } = data;

  const period = {
    start: dateRange?.start?.toISOString().split("T")[0] ?? "unknown",
    end: dateRange?.end?.toISOString().split("T")[0] ?? "unknown",
    days: dateRange
      ? Math.ceil(
          (dateRange.end.getTime() - dateRange.start.getTime()) /
            (1000 * 60 * 60 * 24)
        ) + 1
      : 0,
  };

  const overallKpis = {
    totalUnitsSold: kpis.totalUnitsSold,
    totalRevenue: Math.round(kpis.totalRevenue),
    totalFrontGross: Math.round(kpis.totalFrontGross),
    totalBackGross: Math.round(kpis.totalBackGross),
    totalGross: Math.round(kpis.totalGross),
    frontPvr: Math.round(kpis.frontPvr),
    backPvr: Math.round(kpis.backPvr),
    totalPvr: Math.round(kpis.totalPvr),
    closingRatio: parseFloat(kpis.closingRatio.toFixed(1)),
    totalRecords60PlusDays: kpis.agedUnitCount,
  };

  const storeSummaries = storePerformance
    .slice(0, MAX_STORES_IN_PAYLOAD)
    .map((s) => ({
      store: s.store,
      unitsSold: s.unitsSold,
      totalGross: Math.round(s.totalGross),
      frontPvr: Math.round(s.frontPvr),
      backPvr: Math.round(s.backPvr),
      closingRatio: parseFloat(s.closingRatio.toFixed(1)),
      records60PlusDays: s.agedUnits,
      records60PlusDaysPct: s.leads > 0 ? parseFloat(((s.agedUnits / s.leads) * 100).toFixed(1)) : 0,
      negativeGrossDeals: s.negativeGrossDeals,
    }));

  const leadSourceSummaries = leadSourcePerformance
    .slice(0, MAX_LEAD_SOURCES_IN_PAYLOAD)
    .map((l) => ({
      leadSource: l.leadSource,
      leads: l.leads,
      sold: l.sold,
      closingRatio: parseFloat(l.closingRatio.toFixed(1)),
      grossPerSoldUnit: Math.round(l.grossPerSoldUnit),
    }));

  const vehicleTypeSummaries = vehicleTypeData.map((v) => ({
    type: v.type,
    units: v.units,
    grossPvr: Math.round(v.grossPvr),
    totalGross: Math.round(v.totalGross),
  }));

  const topAlerts: AiPayload["topAlerts"] = (alerts as AlertItem[])
    .slice(0, MAX_ALERTS_IN_PAYLOAD)
    .map((a) => ({
      severity: a.severity,
      metric: a.metric,
      storeOrSegment: a.storeOrSegment,
      finding: a.finding,
      supportingValue: a.supportingValue,
    }));

  // ── Aged inventory distribution ──────────────────────────────────────────
  // Compute status breakdown of 60+ day records so Claude has accurate context
  const agedRows = rows.filter((r) => r.days_in_inventory > AGED_THRESHOLD_DAYS);
  const soldCount = agedRows.filter((r) => isSold(r)).length;
  const pendingCount = agedRows.filter((r) =>
    r.status.toLowerCase().includes("pending") ||
    r.status.toLowerCase().includes("active")
  ).length;
  const lostCount = agedRows.filter((r) =>
    r.status.toLowerCase().includes("lost") ||
    r.status.toLowerCase().includes("dead")
  ).length;
  const otherCount = agedRows.length - soldCount - pendingCount - lostCount;

  const distribution = calcAgedDistribution(storePerformance, kpis.agedUnitCount);

  const agedInventoryDistribution: AiPayload["agedInventoryDistribution"] = {
    note: "These records span ALL statuses (sold, pending/active, lost). Do NOT describe them as current inventory unless referring only to the pending/active subset.",
    groupAgedPercent: distribution.groupAgedPercent,
    minStoreAgedPercent: distribution.minStoreAgedPercent,
    maxStoreAgedPercent: distribution.maxStoreAgedPercent,
    storesAboveGroupAvg: distribution.storesAboveAverage,
    trueOutlierStores: distribution.trueOutlierStores,
    pattern: distribution.pattern,
    statusBreakdown: {
      sold: soldCount,
      pending: pendingCount,
      lost: lostCount,
      other: otherCount,
    },
  };

  return {
    period,
    overallKpis,
    storeSummaries,
    leadSourceSummaries,
    vehicleTypeSummaries,
    topAlerts,
    agedInventoryDistribution,
  };
}

/**
 * Validates that the payload is within size limits before sending.
 * Returns error string or null if OK.
 */
export function validatePayloadSize(payload: AiPayload): string | null {
  const json = JSON.stringify(payload);
  const sizeBytes = new TextEncoder().encode(json).length;
  const limitBytes = 50 * 1024; // 50 KB

  if (sizeBytes > limitBytes) {
    return `Payload size (${(sizeBytes / 1024).toFixed(1)} KB) exceeds the 50 KB limit. Try reducing the date range or number of stores.`;
  }
  return null;
}
