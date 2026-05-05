// ─── Raw CSV Row (as strings from Papa Parse) ────────────────────────────────
export interface RawRow {
  [key: string]: string;
}

// ─── Normalized Row (after type conversion) ───────────────────────────────────
export interface NormalizedRow {
  date: Date;
  store: string;
  salesperson: string;
  vehicle_type: "New" | "Used" | string;
  sale_price: number;
  front_gross: number;
  back_gross: number;
  lead_source: string;
  status: string;
  days_in_inventory: number;
  // optional
  stock_number?: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  fi_products_sold?: number;
  appointment_set?: boolean;
  appointment_shown?: boolean;
  sold?: boolean;
  csi_score?: number;
}

// ─── KPI Summary ──────────────────────────────────────────────────────────────
export interface KpiSummary {
  totalUnitsSold: number;
  totalRevenue: number;
  totalFrontGross: number;
  totalBackGross: number;
  totalGross: number;
  frontPvr: number;
  backPvr: number;
  totalPvr: number;
  newUnitsSold: number;
  usedUnitsSold: number;
  agedUnitCount: number; // > 60 days
  bestStoreByGross: string;
  watchlistStore: string;
  bestLeadSourceByClosingRatio: string;
  totalLeads: number;
  closingRatio: number;
  newGrossPvr: number;
  usedGrossPvr: number;
}

// ─── Store Performance ────────────────────────────────────────────────────────
export interface StorePerformance {
  store: string;
  unitsSold: number;
  revenue: number;
  frontGross: number;
  backGross: number;
  totalGross: number;
  frontPvr: number;
  backPvr: number;
  totalPvr: number;
  agedUnits: number;
  leads: number;
  closingRatio: number;
  negativeGrossDeals: number;
}

// ─── Lead Source Performance ──────────────────────────────────────────────────
export interface LeadSourcePerformance {
  leadSource: string;
  leads: number;
  sold: number;
  closingRatio: number;
  totalGross: number;
  grossPerSoldUnit: number;
}

// ─── Chart Data ───────────────────────────────────────────────────────────────
export interface GrossByStoreData {
  store: string;
  frontGross: number;
  backGross: number;
  totalGross: number;
}

export interface UnitsByStoreData {
  store: string;
  unitsSold: number;
}

export interface SalesTrendData {
  date: string;
  units: number;
  totalGross: number;
}

export interface LeadSourceChartData {
  leadSource: string;
  closingRatio: number;
  leads: number;
}

export interface AgedInventoryChartData {
  store: string;
  agedUnits: number;
}

export interface VehicleTypeData {
  type: string;
  units: number;
  frontGross: number;
  backGross: number;
  totalGross: number;
  grossPvr: number;
}

// ─── Rule-Based Alert ─────────────────────────────────────────────────────────
export type AlertSeverity = "high" | "medium" | "low";

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  metric: string;
  storeOrSegment: string;
  finding: string;
  recommendedAction: string;
  supportingValue: string | number;
}

// ─── AI Payload (sent to server) ─────────────────────────────────────────────
export interface AiPayload {
  period: { start: string; end: string; days: number };
  overallKpis: {
    totalUnitsSold: number;
    totalRevenue: number;
    totalFrontGross: number;
    totalBackGross: number;
    totalGross: number;
    frontPvr: number;
    backPvr: number;
    totalPvr: number;
    closingRatio: number;
    totalRecords60PlusDays: number;
  };
  storeSummaries: Array<{
    store: string;
    unitsSold: number;
    totalGross: number;
    frontPvr: number;
    backPvr: number;
    closingRatio: number;
    records60PlusDays: number;
    records60PlusDaysPct: number;
    negativeGrossDeals: number;
  }>;
  leadSourceSummaries: Array<{
    leadSource: string;
    leads: number;
    sold: number;
    closingRatio: number;
    grossPerSoldUnit: number;
  }>;
  vehicleTypeSummaries: Array<{
    type: string;
    units: number;
    grossPvr: number;
    totalGross: number;
  }>;
  topAlerts: Array<{
    severity: string;
    metric: string;
    storeOrSegment: string;
    finding: string;
    supportingValue: string | number;
  }>;
  /** Aged inventory context — helps Claude distinguish group pattern vs. store outlier */
  agedInventoryDistribution: {
    note: string;                  // e.g. "includes sold, pending, and lost records"
    groupAgedPercent: number;      // % of ALL rows aged 60+
    minStoreAgedPercent: number;
    maxStoreAgedPercent: number;
    storesAboveGroupAvg: number;
    trueOutlierStores: string[];   // only stores meaningfully above group avg
    pattern: "group-wide" | "store-outlier" | "mixed" | "none";
    statusBreakdown: {             // breakdown of 60+ day records by status
      sold: number;
      pending: number;
      lost: number;
      other: number;
    };
  };
}

// ─── AI Insight (returned from Claude) ───────────────────────────────────────
export interface AiFinding {
  severity: "high" | "medium" | "low";
  metric: string;
  store_or_segment: string;
  finding: string;
  recommended_action: string;
}

export interface AiInsight {
  headline: string;
  overall_assessment: string;
  findings: AiFinding[];
  watch_items: string[];
  tomorrow_actions: string[];
}

// ─── CSV Validation Result ────────────────────────────────────────────────────
export interface CsvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  rowCount: number;
  parsedRows: NormalizedRow[];
  dateRange: { start: Date; end: Date } | null;
  fileName: string;
}

// ─── Dashboard State ──────────────────────────────────────────────────────────
export interface DashboardData {
  fileName: string;
  rowCount: number;
  dateRange: { start: Date; end: Date } | null;
  rows: NormalizedRow[];
  kpis: KpiSummary;
  storePerformance: StorePerformance[];
  leadSourcePerformance: LeadSourcePerformance[];
  vehicleTypeData: VehicleTypeData[];
  grossByStore: GrossByStoreData[];
  unitsByStore: UnitsByStoreData[];
  salesTrend: SalesTrendData[];
  leadSourceChart: LeadSourceChartData[];
  agedInventoryChart: AgedInventoryChartData[];
  alerts: AlertItem[];
  useActiveInventoryOnly: boolean;
}
