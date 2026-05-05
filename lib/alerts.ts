import type {
  AlertItem,
  AlertSeverity,
  StorePerformance,
  LeadSourcePerformance,
  VehicleTypeData,
  KpiSummary,
} from "./types";

let alertIdCounter = 0;
function makeId(prefix: string): string {
  return `${prefix}-${++alertIdCounter}`;
}

function mkAlert(
  severity: AlertSeverity,
  metric: string,
  storeOrSegment: string,
  finding: string,
  recommendedAction: string,
  supportingValue: string | number,
  id: string
): AlertItem {
  return { id, severity, metric, storeOrSegment, finding, recommendedAction, supportingValue };
}

// ─── Thresholds ───────────────────────────────────────────────────────────────

const FRONT_PVR_THRESHOLD = 0.8;        // 20% below group avg → High
const BACK_PVR_THRESHOLD = 0.8;
const CLOSING_RATIO_THRESHOLD = 0.75;   // 25% below group avg
const HIGH_VOLUME_MIN_LEADS = 20;
const NEGATIVE_GROSS_WARNING = 2;
const TOTAL_GROSS_THRESHOLD = 0.75;

// Aged inventory — deviation-based (no more raw count triggers)
const AGED_DEVIATION_HIGH_PP = 15;      // 15+ pp above group avg → High
const AGED_DEVIATION_MEDIUM_PP = 8;     // 8–15 pp → Medium
const AGED_ABSOLUTE_CRITICAL = 70;      // >70% of store's records aged → High always
const AGED_CLUSTER_BAND_PP = 10;        // if all stores within this band → group-wide only
const MAX_AGED_STORE_ALERTS = 2;
const MAX_TOTAL_ALERTS = 8;

// Business-priority sort order (lower = more important)
const PRIORITY: Record<string, number> = {
  "Front Gross PVR":        0,
  "Back Gross (F&I) PVR":  1,
  "Lead Closing Ratio":     2,
  "Negative Gross Deals":   3,
  "New vs. Used Gross PVR": 4,
  "Total Gross PVR":        5,
  "60+ Day Units":          6, // group-wide aged (store-level outliers handled above)
};

function priorityOf(a: AlertItem): number {
  const base = PRIORITY[a.metric] ?? 99;
  const sevOffset = a.severity === "high" ? 0 : a.severity === "medium" ? 0.5 : 1;
  return base + sevOffset;
}

// ─── Main Alert Engine ────────────────────────────────────────────────────────

/**
 * Rule-based alert engine with smart aged-inventory detection.
 * Returns at most MAX_TOTAL_ALERTS alerts, sorted by business importance.
 */
export function generateAlerts(
  storePerf: StorePerformance[],
  leadSourcePerf: LeadSourcePerformance[],
  vehicleTypeData: VehicleTypeData[],
  kpis: KpiSummary
): AlertItem[] {
  alertIdCounter = 0;
  const alerts: AlertItem[] = [];
  const soldStores = storePerf.filter((s) => s.unitsSold > 0);

  // ── 1. Front PVR below group average ─────────────────────────────────────
  const avgFrontPvr = kpis.frontPvr;
  for (const store of soldStores) {
    if (store.frontPvr < avgFrontPvr * FRONT_PVR_THRESHOLD) {
      const pctBelow = (((avgFrontPvr - store.frontPvr) / avgFrontPvr) * 100).toFixed(0);
      alerts.push(mkAlert(
        "high",
        "Front Gross PVR",
        store.store,
        `${store.store} Front PVR is $${store.frontPvr.toFixed(0)} vs. group avg $${avgFrontPvr.toFixed(0)} — ${pctBelow}% below average.`,
        "Pull deal jackets for last 30 days and review front-end gross negotiation. Set a minimum gross floor with the desk manager.",
        `$${store.frontPvr.toFixed(0)} vs avg $${avgFrontPvr.toFixed(0)}`,
        makeId("front-pvr")
      ));
    }
  }

  // ── 2. Back PVR (F&I) below group average ─────────────────────────────────
  const avgBackPvr = kpis.backPvr;
  for (const store of soldStores) {
    if (avgBackPvr > 0 && store.backPvr < avgBackPvr * BACK_PVR_THRESHOLD) {
      const pctBelow = (((avgBackPvr - store.backPvr) / avgBackPvr) * 100).toFixed(0);
      alerts.push(mkAlert(
        "high",
        "Back Gross (F&I) PVR",
        store.store,
        `${store.store} F&I PVR is $${store.backPvr.toFixed(0)} vs. group avg $${avgBackPvr.toFixed(0)} — ${pctBelow}% below average.`,
        "Review F&I product penetration rates. Schedule F&I menu presentation audit and one-on-one coaching.",
        `$${store.backPvr.toFixed(0)} vs avg $${avgBackPvr.toFixed(0)}`,
        makeId("back-pvr")
      ));
    }
  }

  // ── 3. High lead volume + low closing ratio ────────────────────────────────
  const avgClosingRatio = kpis.closingRatio;
  for (const source of leadSourcePerf) {
    if (
      source.leads >= HIGH_VOLUME_MIN_LEADS &&
      source.closingRatio < avgClosingRatio * CLOSING_RATIO_THRESHOLD
    ) {
      alerts.push(mkAlert(
        "high",
        "Lead Closing Ratio",
        source.leadSource,
        `${source.leadSource} has ${source.leads} leads but only ${source.closingRatio.toFixed(1)}% closing ratio vs. ${avgClosingRatio.toFixed(1)}% group avg.`,
        "Audit lead response time and follow-up cadence for this source. Set appointment-set targets and review with BDC manager.",
        `${source.closingRatio.toFixed(1)}% on ${source.leads} leads`,
        makeId("closing-ratio")
      ));
    }
  }

  // ── 4. Negative gross deals ────────────────────────────────────────────────
  for (const store of soldStores) {
    if (store.negativeGrossDeals >= NEGATIVE_GROSS_WARNING) {
      alerts.push(mkAlert(
        "medium",
        "Negative Gross Deals",
        store.store,
        `${store.store} has ${store.negativeGrossDeals} deals with negative front gross this period.`,
        "Pull all negative gross deals for manager review. Determine if this is one salesperson or a store-wide pattern.",
        `${store.negativeGrossDeals} deals`,
        makeId("negative-gross")
      ));
    }
  }

  // ── 5. Used vehicles outperforming new by gross PVR ───────────────────────
  const newData = vehicleTypeData.find((v) => v.type === "New");
  const usedData = vehicleTypeData.find((v) => v.type === "Used");
  if (newData && usedData && usedData.grossPvr > newData.grossPvr * 1.15) {
    const pctAbove = (((usedData.grossPvr - newData.grossPvr) / newData.grossPvr) * 100).toFixed(0);
    alerts.push(mkAlert(
      "medium",
      "New vs. Used Gross PVR",
      "Vehicle Type",
      `Used vehicles are generating $${usedData.grossPvr.toFixed(0)} PVR vs. $${newData.grossPvr.toFixed(0)} for new — ${pctAbove}% higher. New vehicle gross needs attention.`,
      "Review new vehicle pricing strategy and OEM incentive programs. Ensure desk managers are protecting front gross on new deals.",
      `Used $${usedData.grossPvr.toFixed(0)} vs New $${newData.grossPvr.toFixed(0)} PVR`,
      makeId("new-vs-used")
    ));
  }

  // ── 6. Store materially below group total PVR ─────────────────────────────
  const avgTotalPvr =
    soldStores.length > 0
      ? soldStores.reduce((s, st) => s + st.totalPvr, 0) / soldStores.length
      : 0;
  for (const store of soldStores) {
    if (
      store.unitsSold >= 5 &&
      store.totalPvr < avgTotalPvr * TOTAL_GROSS_THRESHOLD
    ) {
      const alreadyFlagged = alerts.some(
        (a) => a.storeOrSegment === store.store && a.severity === "high"
      );
      if (!alreadyFlagged) {
        const pctBelow = (((avgTotalPvr - store.totalPvr) / avgTotalPvr) * 100).toFixed(0);
        alerts.push(mkAlert(
          "medium",
          "Total Gross PVR",
          store.store,
          `${store.store} total PVR of $${store.totalPvr.toFixed(0)} is ${pctBelow}% below the group average of $${avgTotalPvr.toFixed(0)}.`,
          "Schedule a deal review with the store GM. Identify root causes across front gross, F&I, or both.",
          `$${store.totalPvr.toFixed(0)} vs avg $${avgTotalPvr.toFixed(0)}`,
          makeId("total-pvr")
        ));
      }
    }
  }

  // ── 7. Aged inventory — deviation-based detection ─────────────────────────
  //
  // Rather than alerting every store with >3 aged units, we:
  //   (a) Calculate aged % per store (agedUnits / total rows for store)
  //   (b) Calculate group average aged %
  //   (c) Measure deviation per store
  //   (d) If all stores are clustered within AGED_CLUSTER_BAND_PP → one group-wide alert
  //   (e) Otherwise flag only true outliers (deviation ≥ AGED_DEVIATION_MEDIUM_PP OR absolute ≥ 70%)
  //   (f) Max: 1 group alert + 2 store alerts
  // ─────────────────────────────────────────────────────────────────────────

  const totalRows = storePerf.reduce((s, st) => s + st.leads, 0);
  const groupAgedPct = totalRows > 0 ? (kpis.agedUnitCount / totalRows) * 100 : 0;

  // Per-store aged % (use leads = total rows for that store as denominator)
  const storeAgedPcts = storePerf
    .filter((s) => s.leads > 0)
    .map((s) => ({
      store: s.store,
      agedUnits: s.agedUnits,
      leads: s.leads,
      agedPct: (s.agedUnits / s.leads) * 100,
      deviation: (s.agedUnits / s.leads) * 100 - groupAgedPct,
    }));

  const agedPctValues = storeAgedPcts.map((s) => s.agedPct);
  const maxAgedPct = agedPctValues.length > 0 ? Math.max(...agedPctValues) : 0;
  const minAgedPct = agedPctValues.length > 0 ? Math.min(...agedPctValues) : 0;
  const agedRange = maxAgedPct - minAgedPct;

  // Determine if stores are tightly clustered (no true outliers)
  const isClustered = agedRange < AGED_CLUSTER_BAND_PP;

  // True outliers: deviation ≥ MEDIUM_PP or absolute ≥ CRITICAL
  const outliers = storeAgedPcts
    .filter((s) => s.agedUnits > 0)
    .filter(
      (s) =>
        s.deviation >= AGED_DEVIATION_MEDIUM_PP ||
        s.agedPct >= AGED_ABSOLUTE_CRITICAL
    )
    .sort((a, b) => b.deviation - a.deviation);

  if (isClustered || outliers.length === 0) {
    // ── Group-wide aged pattern (stores are clustered, no single outlier) ──
    if (groupAgedPct >= 5) {
      // Unless critical (>= 50%), mark it medium (or low). High should be reserved for extreme backlog.
      const severity: AlertSeverity = groupAgedPct >= 50 ? "high" : groupAgedPct >= 15 ? "medium" : "low";
      const minPct = minAgedPct.toFixed(1);
      const maxPct = maxAgedPct.toFixed(1);
      
      const recommendation = severity === "high"
        ? "Run an immediate triage and group-wide aged inventory review. Prioritize the oldest units and highest holding-cost units. Consider a weekend clearance push or cross-store wholesale."
        : "Run a structured follow-up and group-wide aged inventory review. Prioritize oldest units and consider cross-store wholesale options.";

      alerts.push(mkAlert(
        severity,
        "60+ Day Open Records",
        "Group-Wide Pattern",
        `60+ day open records are broadly distributed across the group (${minPct}%–${maxPct}% per store, group avg ${groupAgedPct.toFixed(1)}%). This appears to be a group-wide backlog pattern, not a single-store outlier. Total: ${kpis.agedUnitCount} records across all stores.`,
        recommendation,
        `${groupAgedPct.toFixed(1)}% avg (${kpis.agedUnitCount} records)`,
        makeId("aged-group")
      ));
    }
  } else {
    // ── Store-level outliers (true anomalies above group average) ──────────
    let storeAgedCount = 0;
    for (const s of outliers) {
      if (storeAgedCount >= MAX_AGED_STORE_ALERTS) break;

      const severity: AlertSeverity =
        s.deviation >= AGED_DEVIATION_HIGH_PP || s.agedPct >= AGED_ABSOLUTE_CRITICAL
          ? "high"
          : "medium";

      alerts.push(mkAlert(
        severity,
        "60+ Day Units",
        s.store,
        `${s.store} has ${s.agedPct.toFixed(0)}% of its records aged 60+ days — ${s.deviation.toFixed(0)} percentage points above the group average of ${groupAgedPct.toFixed(0)}%.`,
        "Run an aged inventory report for this store. Prioritize price reductions, pack adjustments, or wholesale for units over 75 days.",
        `${s.agedPct.toFixed(0)}% vs group avg ${groupAgedPct.toFixed(0)}%`,
        makeId("aged-store")
      ));
      storeAgedCount++;
    }

    // Also add one group-wide summary if groupAgedPct is elevated
    if (groupAgedPct >= 20) {
      alerts.push(mkAlert(
        "medium",
        "60+ Day Units",
        "All Stores",
        `Group has ${kpis.agedUnitCount} total 60+ day records across all locations (${groupAgedPct.toFixed(0)}% of all rows). Some stores are true outliers; others are near average.`,
        "Initiate a group-wide aged inventory push alongside store-level corrections. Consider a regional clearance event.",
        `${kpis.agedUnitCount} records, ${groupAgedPct.toFixed(0)}% group avg`,
        makeId("aged-group-summary")
      ));
    }
  }

  // ── Sort by business priority then severity ────────────────────────────────
  alerts.sort((a, b) => priorityOf(a) - priorityOf(b));

  // ── Cap total output ───────────────────────────────────────────────────────
  return alerts.slice(0, MAX_TOTAL_ALERTS);
}

// ─── Aged Inventory Distribution (for AI payload) ─────────────────────────────

export interface AgedDistribution {
  groupAgedPercent: number;
  minStoreAgedPercent: number;
  maxStoreAgedPercent: number;
  storesAboveAverage: number;
  trueOutlierStores: string[];
  pattern: "group-wide" | "store-outlier" | "mixed" | "none";
  totalAgedRecords: number;
}

export function calcAgedDistribution(
  storePerf: StorePerformance[],
  totalAgedUnits: number
): AgedDistribution {
  const totalRows = storePerf.reduce((s, st) => s + st.leads, 0);
  const groupAgedPercent = totalRows > 0 ? (totalAgedUnits / totalRows) * 100 : 0;

  const pcts = storePerf
    .filter((s) => s.leads > 0)
    .map((s) => ({ store: s.store, pct: (s.agedUnits / s.leads) * 100 }));

  const min = Math.min(...pcts.map((p) => p.pct), 0);
  const max = Math.max(...pcts.map((p) => p.pct), 0);
  const range = max - min;

  const storesAboveAverage = pcts.filter((p) => p.pct > groupAgedPercent).length;
  const trueOutlierStores = pcts
    .filter((p) => p.pct - groupAgedPercent >= AGED_DEVIATION_MEDIUM_PP)
    .map((p) => p.store);

  let pattern: AgedDistribution["pattern"] = "none";
  if (totalAgedUnits === 0) {
    pattern = "none";
  } else if (range < AGED_CLUSTER_BAND_PP) {
    pattern = "group-wide";
  } else if (trueOutlierStores.length > 0 && trueOutlierStores.length <= 3) {
    pattern = "store-outlier";
  } else {
    pattern = "mixed";
  }

  return {
    groupAgedPercent: parseFloat(groupAgedPercent.toFixed(1)),
    minStoreAgedPercent: parseFloat(min.toFixed(1)),
    maxStoreAgedPercent: parseFloat(max.toFixed(1)),
    storesAboveAverage,
    trueOutlierStores,
    pattern,
    totalAgedRecords: totalAgedUnits,
  };
}
