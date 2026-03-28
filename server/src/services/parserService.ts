import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import pdf from "pdf-parse";

export type ParsedTransaction = {
  txn_id: string;
  sender_account: string;
  receiver_account: string;
  amount: number;
  timestamp: Date;
  type: string;
  status: string;
  reference_id?: string;
};

const normalizeRow = (row: Record<string, unknown>, index: number): ParsedTransaction => ({
  txn_id: String(row.txn_id ?? row.txnId ?? row.id ?? `TXN-${index + 1}`),
  sender_account: String(row.sender_account ?? row.senderAccount ?? row.sender ?? ""),
  receiver_account: String(row.receiver_account ?? row.receiverAccount ?? row.receiver ?? ""),
  amount: Number(row.amount ?? row.value ?? 0),
  timestamp: new Date(String(row.timestamp ?? row.date ?? new Date().toISOString())),
  type: String(row.type ?? row.txnType ?? "BANK"),
  status: String(row.status ?? "SUCCESS"),
  reference_id: row.reference_id ? String(row.reference_id) : row.referenceId ? String(row.referenceId) : undefined
});

const parseCsvFile = async (filePath: string) => {
  const content = await fs.readFile(filePath, "utf8");
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as Record<string, unknown>[];
  return rows.map(normalizeRow);
};

const parseJsonFile = async (filePath: string) => {
  const content = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(content) as Record<string, unknown>[];
  return parsed.map(normalizeRow);
};

const parseXlsxFile = async (filePath: string) => {
  const workbook = XLSX.readFile(filePath);
  const rows = workbook.SheetNames.flatMap((sheetName) =>
    XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName])
  );
  return rows.map(normalizeRow);
};

const parsePdfFile = async (filePath: string) => {
  const buffer = await fs.readFile(filePath);
  const parsed = await pdf(buffer);
  const accountRegex = /\b[A-Z]{2,5}[0-9]{6,12}\b/g;
  const amountRegex = /₹?\s?([0-9,]+(?:\.[0-9]{1,2})?)/g;
  const accounts = parsed.text.match(accountRegex) ?? [];
  const amounts = [...parsed.text.matchAll(amountRegex)].map((match) =>
    Number(match[1].replaceAll(",", ""))
  );

  const rows: ParsedTransaction[] = [];
  for (let index = 0; index < Math.max(accounts.length - 1, 0); index += 1) {
    rows.push({
      txn_id: `PDF-${index + 1}`,
      sender_account: accounts[index],
      receiver_account: accounts[index + 1],
      amount: amounts[index] ?? 0,
      timestamp: new Date(),
      type: "PDF_IMPORT",
      status: "EXTRACTED",
      reference_id: `PDFREF-${index + 1}`
    });
  }
  return rows;
};

export const parseEvidenceFile = async (storageKey: string) => {
  const ext = path.extname(storageKey).toLowerCase();

  if (ext === ".csv") return parseCsvFile(storageKey);
  if (ext === ".json") return parseJsonFile(storageKey);
  if (ext === ".xlsx" || ext === ".xls") return parseXlsxFile(storageKey);
  if (ext === ".pdf") return parsePdfFile(storageKey);
  if (ext === ".txt") return parseCsvFile(storageKey);

  throw new Error(`Unsupported file type: ${ext}`);
};
