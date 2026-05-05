/* eslint-disable @typescript-eslint/no-explicit-any */
import Papa from "papaparse";
import type { RawRow, NormalizedRow, CsvValidationResult } from "./types";
import { buildColumnMap, normalizeRow } from "./normalize";
import { REQUIRED_COLUMNS } from "./normalize";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export interface ParseProgress {
  rowsParsed: number;
}

export interface ParseOptions {
  onProgress?: (progress: ParseProgress) => void;
  onComplete?: (result: CsvValidationResult) => void;
  onError?: (error: string) => void;
}

/**
 * Validates file before parsing.
 * Returns error string or null if OK.
 */
export function validateFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return "Only .csv files are accepted.";
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds the 25 MB limit.`;
  }
  return null;
}

/**
 * Parse a CSV File using Papa Parse in streaming mode.
 * Normalizes columns, validates required fields, and returns clean rows.
 * The `any` cast is necessary because Papa Parse's TypeScript overloads
 * don't correctly represent the browser File API in all versions.
 */
export function parseCsvFile(file: File, options: ParseOptions = {}): void {
  const { onProgress, onComplete, onError } = options;

  const errors: string[] = [];
  const warnings: string[] = [];
  const parsedRows: NormalizedRow[] = [];

  let columnMap: Record<string, string> | null = null;
  let headerValidated = false;
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  (Papa.parse as any)(file, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    chunk: (results: Papa.ParseResult<RawRow>, parser: Papa.Parser) => {
      const chunk = results.data as RawRow[];

      // First chunk: validate headers
      if (!headerValidated && chunk.length > 0) {
        const rawHeaders = Object.keys(chunk[0]);
        const { columnMap: cm, missingRequired } = buildColumnMap(rawHeaders);

        if (missingRequired.length > 0) {
          errors.push(
            `Missing required columns: ${missingRequired.join(", ")}. ` +
              `Required: ${REQUIRED_COLUMNS.join(", ")}.`
          );
          parser.abort();
          onError?.(errors[0]);
          return;
        }
        columnMap = cm;
        headerValidated = true;
      }

      if (!columnMap) return;

      for (const raw of chunk) {
        const normalized = normalizeRow(raw, columnMap);
        if (!normalized) continue;
        parsedRows.push(normalized);
        if (!minDate || normalized.date < minDate) minDate = normalized.date;
        if (!maxDate || normalized.date > maxDate) maxDate = normalized.date;
      }

      onProgress?.({ rowsParsed: parsedRows.length });
    },
    complete: () => {
      if (errors.length > 0) return;

      if (parsedRows.length === 0) {
        onError?.("No valid rows found in the CSV. Please check the file format.");
        return;
      }

      const result: CsvValidationResult = {
        valid: true,
        errors: [],
        warnings,
        rowCount: parsedRows.length,
        parsedRows,
        dateRange: minDate && maxDate ? { start: minDate, end: maxDate } : null,
        fileName: file.name,
      };

      onComplete?.(result);
    },
    error: (err: Papa.ParseError) => {
      onError?.(`CSV parsing failed: ${err.message}`);
    },
  });
}

/**
 * Parse a CSV string (used for loading sample data from public folder).
 */
export function parseCsvString(
  csvText: string,
  fileName = "sample-dealership-sales.csv"
): CsvValidationResult {
  const errors: string[] = [];
  const parsedRows: NormalizedRow[] = [];
  let columnMap: Record<string, string> | null = null;
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  const result = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    errors.push("CSV parsing failed: " + result.errors[0]?.message);
    return { valid: false, errors, warnings: [], rowCount: 0, parsedRows: [], dateRange: null, fileName };
  }

  if (result.data.length === 0) {
    return { valid: false, errors: ["No rows found in the CSV."], warnings: [], rowCount: 0, parsedRows: [], dateRange: null, fileName };
  }

  const rawHeaders = Object.keys(result.data[0]);
  const { columnMap: cm, missingRequired } = buildColumnMap(rawHeaders);

  if (missingRequired.length > 0) {
    return {
      valid: false,
      errors: [`Missing required columns: ${missingRequired.join(", ")}`],
      warnings: [],
      rowCount: 0,
      parsedRows: [],
      dateRange: null,
      fileName,
    };
  }
  columnMap = cm;

  for (const raw of result.data) {
    const normalized = normalizeRow(raw, columnMap);
    if (!normalized) continue;
    parsedRows.push(normalized);
    if (!minDate || normalized.date < minDate) minDate = normalized.date;
    if (!maxDate || normalized.date > maxDate) maxDate = normalized.date;
  }

  return {
    valid: true,
    errors: [],
    warnings: [],
    rowCount: parsedRows.length,
    parsedRows,
    dateRange: minDate && maxDate ? { start: minDate, end: maxDate } : null,
    fileName,
  };
}
