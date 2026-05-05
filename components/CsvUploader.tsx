"use client";

import React, { useRef, useState, useCallback } from "react";
import { validateFile, parseCsvFile } from "@/lib/csv";
import type { CsvValidationResult } from "@/lib/types";

interface Props {
  onParsed: (result: CsvValidationResult) => void;
  onError: (msg: string) => void;
  isLoading?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function CsvUploader({ onParsed, onError, inputRef }: Props) {
  const internalRef = useRef<HTMLInputElement>(null);
  const fileRef = inputRef ?? internalRef;
  const [progress, setProgress] = useState<number | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        onError(validationError);
        return;
      }

      setProgress(0);
      parseCsvFile(file, {
        onProgress: ({ rowsParsed }) => {
          setProgress(rowsParsed);
        },
        onComplete: (result) => {
          setProgress(null);
          onParsed(result);
        },
        onError: (msg) => {
          setProgress(null);
          onError(msg);
        },
      });
    },
    [onParsed, onError]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleInputChange}
        aria-label="Upload CSV file"
      />
      {progress !== null && (
        <div className="text-sm text-slate-500 mt-2">
          Parsing... {progress} rows processed
        </div>
      )}
    </>
  );
}
