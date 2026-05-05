import type { RawRow, NormalizedRow } from "./types";

// ─── Required column names (canonical, lowercase) ─────────────────────────────
export const REQUIRED_COLUMNS = [
  "date",
  "store",
  "salesperson",
  "vehicle_type",
  "sale_price",
  "front_gross",
  "back_gross",
  "lead_source",
  "status",
  "days_in_inventory",
] as const;

// ─── Column name normalization map ────────────────────────────────────────────
// Accepts common variant spellings and maps to canonical names
const COLUMN_ALIASES: Record<string, string> = {
  date: "date",
  "sale date": "date",
  "sold date": "date",
  store: "store",
  "store name": "store",
  location: "store",
  salesperson: "salesperson",
  "sales person": "salesperson",
  "sales rep": "salesperson",
  rep: "salesperson",
  vehicle_type: "vehicle_type",
  "vehicle type": "vehicle_type",
  type: "vehicle_type",
  new_used: "vehicle_type",
  sale_price: "sale_price",
  "sale price": "sale_price",
  price: "sale_price",
  "selling price": "sale_price",
  front_gross: "front_gross",
  "front gross": "front_gross",
  "front end gross": "front_gross",
  back_gross: "back_gross",
  "back gross": "back_gross",
  "back end gross": "back_gross",
  fi_gross: "back_gross",
  lead_source: "lead_source",
  "lead source": "lead_source",
  source: "lead_source",
  status: "status",
  days_in_inventory: "days_in_inventory",
  "days in inventory": "days_in_inventory",
  age: "days_in_inventory",
  "days old": "days_in_inventory",
  stock_number: "stock_number",
  "stock number": "stock_number",
  stock: "stock_number",
  vin: "vin",
  make: "make",
  model: "model",
  year: "year",
  fi_products_sold: "fi_products_sold",
  "fi products sold": "fi_products_sold",
  "products sold": "fi_products_sold",
  appointment_set: "appointment_set",
  "appointment set": "appointment_set",
  appointment_shown: "appointment_shown",
  "appointment shown": "appointment_shown",
  sold: "sold",
  csi_score: "csi_score",
  "csi score": "csi_score",
  csi: "csi_score",
};

/**
 * Normalizes a raw column header to its canonical name.
 * Returns null if unknown.
 */
export function normalizeColumnName(raw: string): string | null {
  const cleaned = raw.trim().toLowerCase().replace(/_/g, " ");
  // Try direct alias lookup first
  if (COLUMN_ALIASES[cleaned]) return COLUMN_ALIASES[cleaned];
  // Try underscore variant
  const underscored = cleaned.replace(/ /g, "_");
  if (COLUMN_ALIASES[underscored]) return COLUMN_ALIASES[underscored];
  return null;
}

/**
 * Builds a column mapping from raw header row to canonical names.
 * Returns found columns and list of missing required columns.
 */
export function buildColumnMap(rawHeaders: string[]): {
  columnMap: Record<string, string>; // canonical -> raw header
  missingRequired: string[];
  foundColumns: Set<string>;
} {
  const columnMap: Record<string, string> = {};
  const foundColumns = new Set<string>();

  for (const raw of rawHeaders) {
    const canonical = normalizeColumnName(raw);
    if (canonical && !columnMap[canonical]) {
      columnMap[canonical] = raw;
      foundColumns.add(canonical);
    }
  }

  const missingRequired = REQUIRED_COLUMNS.filter((c) => !foundColumns.has(c));
  return { columnMap, missingRequired, foundColumns };
}

// ─── Value parsers ────────────────────────────────────────────────────────────

/**
 * Parse currency strings like "$25,000" or "25000.50" → number
 */
export function parseCurrency(value: string | undefined | null): number {
  if (!value || value.trim() === "" || value.trim() === "-") return 0;
  const cleaned = value.replace(/[$,\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse a percentage string like "45%" → 45 (as a number, not fraction)
 */
export function parsePercent(value: string | undefined | null): number {
  if (!value || value.trim() === "") return 0;
  const cleaned = value.replace(/[%\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse integer values safely.
 */
export function parseIntSafe(value: string | undefined | null): number {
  if (!value || value.trim() === "") return 0;
  const num = parseInt(value.replace(/[^0-9.-]/g, ""), 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse boolean from common string representations.
 */
export function parseBool(value: string | undefined | null): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return ["yes", "true", "1", "y", "x"].includes(v);
}

/**
 * Parse date from various formats. Returns null if invalid.
 */
export function parseDate(value: string | undefined | null): Date | null {
  if (!value || value.trim() === "") return null;
  const d = new Date(value.trim());
  if (isNaN(d.getTime())) return null;
  return d;
}

// ─── Row normalizer ───────────────────────────────────────────────────────────

/**
 * Converts a raw CSV row (string values) into a NormalizedRow.
 * Returns null if the row is empty or required fields are missing/invalid.
 */
export function normalizeRow(
  raw: RawRow,
  columnMap: Record<string, string> // canonical → raw header
): NormalizedRow | null {
  // Helper to get raw value by canonical name
  const get = (canonical: string): string | undefined => {
    const header = columnMap[canonical];
    return header ? raw[header]?.trim() : undefined;
  };

  // Skip empty rows
  const values = Object.values(raw);
  if (values.every((v) => !v || v.trim() === "")) return null;

  // Required: date
  const parsedDate = parseDate(get("date"));
  if (!parsedDate) return null;

  // Required: store
  const store = get("store");
  if (!store) return null;

  // Required: status
  const status = get("status") ?? "";

  // Build normalized row
  const row: NormalizedRow = {
    date: parsedDate,
    store: store,
    salesperson: get("salesperson") ?? "Unknown",
    vehicle_type: normalizeVehicleType(get("vehicle_type") ?? ""),
    sale_price: parseCurrency(get("sale_price")),
    front_gross: parseCurrency(get("front_gross")),
    back_gross: parseCurrency(get("back_gross")),
    lead_source: get("lead_source") ?? "Unknown",
    status: status,
    days_in_inventory: parseIntSafe(get("days_in_inventory")),
  };

  // Optional fields
  if (columnMap["stock_number"]) row.stock_number = get("stock_number");
  if (columnMap["vin"]) row.vin = get("vin");
  if (columnMap["make"]) row.make = get("make");
  if (columnMap["model"]) row.model = get("model");
  if (columnMap["year"]) row.year = parseIntSafe(get("year")) || undefined;
  if (columnMap["fi_products_sold"])
    row.fi_products_sold = parseIntSafe(get("fi_products_sold"));
  if (columnMap["appointment_set"])
    row.appointment_set = parseBool(get("appointment_set"));
  if (columnMap["appointment_shown"])
    row.appointment_shown = parseBool(get("appointment_shown"));
  if (columnMap["sold"]) row.sold = parseBool(get("sold"));
  if (columnMap["csi_score"])
    row.csi_score =
      parseFloat(get("csi_score") ?? "") || undefined;

  return row;
}

function normalizeVehicleType(value: string): "New" | "Used" | string {
  const v = value.trim().toLowerCase();
  if (v === "new" || v === "n") return "New";
  if (v === "used" || v === "u" || v === "pre-owned" || v === "cpo")
    return "Used";
  return value || "Unknown";
}

/**
 * Determines if a row represents a "sold" unit.
 * Uses the status field and/or optional sold column.
 */
export function isSold(row: NormalizedRow): boolean {
  if (row.sold !== undefined) return row.sold;
  const s = row.status.toLowerCase();
  return (
    s === "sold" ||
    s === "delivered" ||
    s === "closed" ||
    s === "funded" ||
    s === "retailed"
  );
}
