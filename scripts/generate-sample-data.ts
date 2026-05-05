/**
 * Sample dealership sales data generator.
 * Run: npx ts-node scripts/generate-sample-data.ts
 * Or:  npx tsx scripts/generate-sample-data.ts
 *
 * Outputs: public/sample-dealership-sales.csv
 */

import * as fs from "fs";
import * as path from "path";

// ─── Configuration ────────────────────────────────────────────────────────────

const STORES = [
  "Store 1", "Store 2", "Store 3", "Store 4",
  "Store 5", "Store 6", "Store 7", "Store 8",
  "Store 9", "Store 10", "Store 11", "Store 12",
];

const LEAD_SOURCES = [
  "Website", "Walk-In", "Phone", "Referral",
  "CarGurus", "AutoTrader", "Facebook", "Email Campaign",
  "Service Drive", "Repeat Customer",
];

const SALESPERSONS = [
  "SP_A", "SP_B", "SP_C", "SP_D", "SP_E",
  "SP_F", "SP_G", "SP_H", "SP_I", "SP_J",
];

const MAKES = ["Ford", "Chevrolet", "Toyota", "Honda", "GMC", "Cadillac", "Buick"];
const STATUSES = ["Sold", "Sold", "Sold", "Sold", "Sold", "Pending", "Pending", "Lost", "Lost", "Lost"];

// ─── Seeded RNG (deterministic output) ───────────────────────────────────────

function seededRng(seed: number) {
  let s = seed;
  return function (): number {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return ((s >>> 0) / 0xffffffff);
  };
}

const rng = seededRng(42);

function rand(): number { return rng(); }
function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function randChoice<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function randBool(prob = 0.5): boolean {
  return rand() < prob;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ─── Row generator ────────────────────────────────────────────────────────────

interface SalesRow {
  date: string;
  store: string;
  salesperson: string;
  vehicle_type: string;
  sale_price: string;
  front_gross: string;
  back_gross: string;
  lead_source: string;
  status: string;
  days_in_inventory: number;
  stock_number: string;
  make: string;
  model: string;
  year: number;
  fi_products_sold: number;
  csi_score: number;
}

function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function generateRow(
  date: Date,
  store: string,
  storeIndex: number,
  rowNum: number
): SalesRow {
  const vehicleType = randBool(0.52) ? "New" : "Used";
  const isNew = vehicleType === "New";

  // Base sale price
  const baseSalePrice = isNew
    ? randInt(28000, 68000)
    : randInt(12000, 42000);

  // ── Seeded business problems ──────────────────────────────────────────────

  let frontGross: number;
  let backGross: number;

  // Problem 1: Store 4 has declining front gross PVR
  if (store === "Store 4") {
    frontGross = isNew ? randInt(100, 600) : randInt(200, 900); // below avg
    backGross = randInt(600, 1800);
  }
  // Problem 5: Store 11 has lower F&I / back gross
  else if (store === "Store 11") {
    frontGross = randInt(800, 2200);
    backGross = randInt(100, 600); // poor F&I
  }
  // Problem 6: Store 3 has some negative gross deals
  else if (store === "Store 3" && randBool(0.12)) {
    frontGross = randInt(-800, -100); // negative
    backGross = randInt(400, 1200);
  }
  // Problem 3: Used vehicles have stronger gross
  else if (!isNew) {
    frontGross = randInt(1400, 3800); // used gets better front gross
    backGross = randInt(800, 2200);
  }
  else {
    frontGross = randInt(600, 2600); // normal new
    backGross = randInt(700, 2000);
  }

  // Lead source — Problem 2: Store 7 gets a lot of CarGurus but low close
  let leadSource: string;
  if (store === "Store 7") {
    leadSource = randBool(0.45) ? "CarGurus" : randChoice(LEAD_SOURCES);
  } else {
    leadSource = randChoice(LEAD_SOURCES);
  }

  // Status — Problem 2: Store 7 has low closing ratio
  let status: string;
  if (store === "Store 7" && leadSource === "CarGurus") {
    status = randBool(0.18) ? "Sold" : randChoice(["Lost", "Pending", "Lost"]);
  } else {
    status = randChoice(STATUSES);
  }

  // Problem 4: Aged inventory — some units over 60 days
  let daysInInventory: number;
  const isAged = storeIndex % 3 === 0 && randBool(0.18);
  if (isAged) {
    daysInInventory = randInt(61, 120);
  } else {
    daysInInventory = randInt(1, 55);
  }

  const make = randChoice(MAKES);
  const model = make === "Ford"
    ? randChoice(["F-150", "Explorer", "Escape", "Bronco"])
    : make === "Chevrolet"
      ? randChoice(["Silverado", "Equinox", "Tahoe", "Traverse"])
      : make === "Toyota"
        ? randChoice(["Camry", "RAV4", "Highlander", "Tacoma"])
        : randChoice(["Accord", "Pilot", "CR-V", "Ridgeline", "Terrain", "XT5", "Encore", "Envision"]);

  const year = isNew ? randInt(2024, 2026) : randInt(2019, 2024);
  const csiScore = status === "Sold" ? parseFloat((rand() * 2 + 8).toFixed(1)) : 0;
  const fiProducts = status === "Sold" ? randInt(0, 4) : 0;

  return {
    date: formatDate(date),
    store,
    salesperson: randChoice(SALESPERSONS),
    vehicle_type: vehicleType,
    sale_price: formatMoney(baseSalePrice),
    front_gross: formatMoney(frontGross),
    back_gross: formatMoney(backGross),
    lead_source: leadSource,
    status,
    days_in_inventory: daysInInventory,
    stock_number: `STK-${rowNum.toString().padStart(5, "0")}`,
    make,
    model,
    year,
    fi_products_sold: fiProducts,
    csi_score: csiScore,
  };
}

// ─── Main generator ───────────────────────────────────────────────────────────

function generate(): void {
  const startDate = new Date("2025-04-01");
  const rows: SalesRow[] = [];
  let rowNum = 1;

  for (let day = 0; day < 30; day++) {
    const date = addDays(startDate, day);
    const isWeekend =
      date.getDay() === 0 || date.getDay() === 6;

    for (let si = 0; si < STORES.length; si++) {
      const store = STORES[si];
      // Weekend traffic boost, weekday variation
      const dailyLeads = isWeekend ? randInt(6, 14) : randInt(3, 10);

      for (let r = 0; r < dailyLeads; r++) {
        rows.push(generateRow(date, store, si, rowNum++));
      }
    }
  }

  // CSV header
  const header = [
    "date", "store", "salesperson", "vehicle_type",
    "sale_price", "front_gross", "back_gross", "lead_source",
    "status", "days_in_inventory", "stock_number", "make",
    "model", "year", "fi_products_sold", "csi_score",
  ];

  const csvLines = [
    header.join(","),
    ...rows.map((row) =>
      header
        .map((col) => {
          const val = (row as unknown as Record<string, unknown>)[col];
          const str = String(val ?? "");
          // Quote fields containing commas
          if (str.includes(",") || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    ),
  ];

  const outputPath = path.join(
    path.dirname(__dirname),
    "public",
    "sample-dealership-sales.csv"
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, csvLines.join("\n"), "utf-8");

  const soldCount = rows.filter((r) => r.status === "Sold").length;
  console.log(`✅ Generated ${rows.length} rows (${soldCount} sold) → ${outputPath}`);
}

generate();
