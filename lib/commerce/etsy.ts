import { z } from "zod";

import { CURRENT_PLANNER_YEAR } from "@/lib/commerce/config";
import { inferTierFromEtsySignals } from "@/lib/commerce/etsy-mapping";

const etsyCsvInputSchema = z.object({
  csvText: z.string().trim().min(1, "Paste the Etsy CSV export first."),
});

export interface EtsyImportRecord {
  externalOrderId: string;
  purchaserEmail: string;
  purchaserName: string | null;
  listingKey: string | null;
  listingId: string | null;
  sku: string | null;
  productTier: "planner" | "planner_oracle";
  plannerYear: number;
  oracleEnabled: boolean;
  purchasedAt: string | null;
  metadata: Record<string, string>;
}

export function validateEtsyCsvInput(value: unknown) {
  return etsyCsvInputSchema.safeParse(value);
}

function parseCsvRow(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === "\"") {
      if (inQuotes && nextCharacter === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseCsv(csvText: string) {
  const lines = csvText
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("The Etsy export needs a header row and at least one order.");
  }

  const headers = parseCsvRow(lines[0]).map((header) => header.replace(/^\uFEFF/, "").toLowerCase());

  return lines.slice(1).map((line) => {
    const values = parseCsvRow(line);
    return headers.reduce<Record<string, string>>((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {});
  });
}

function getValue(record: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = record[key.toLowerCase()];
    if (value) return value;
  }
  return "";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeOrderId(value: string) {
  return value.trim().toUpperCase();
}

function normalizeDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function inferPlannerYear(record: Record<string, string>) {
  const candidates = [
    getValue(record, ["planner year", "year"]),
    getValue(record, ["item name", "listing title", "title", "sku"]),
  ];

  for (const candidate of candidates) {
    const match = candidate.match(/\b(20\d{2})\b/);
    if (match) {
      return Number(match[1]);
    }
  }

  return CURRENT_PLANNER_YEAR;
}

export function parseEtsyOrdersCsv(csvText: string): EtsyImportRecord[] {
  const rows = parseCsv(csvText);

  return rows.map((row) => {
    const externalOrderId = normalizeOrderId(
      getValue(row, ["sale id", "order id", "receipt id", "transaction id"])
    );
    const purchaserEmail = normalizeEmail(
      getValue(row, ["buyer email", "email", "ship email"])
    );
    const purchaserName =
      getValue(row, ["buyer name", "full name", "ship name"]) || null;
    const listingText = getValue(row, ["item name", "listing title", "title", "sku"]);
    const listingId = getValue(row, ["listing id", "listing_id"]) || null;
    const sku = getValue(row, ["sku", "skus"]) || null;

    if (!externalOrderId) {
      throw new Error("One or more Etsy rows are missing an order identifier.");
    }

    if (!purchaserEmail) {
      throw new Error(`Order ${externalOrderId} is missing a purchaser email.`);
    }

    const tier = inferTierFromEtsySignals({
      sku,
      listingId,
      listingText,
    });

    return {
      externalOrderId,
      purchaserEmail,
      purchaserName,
      listingKey: listingText || null,
      listingId,
      sku,
      productTier: tier.key,
      plannerYear: inferPlannerYear(row),
      oracleEnabled: tier.oracleEnabled,
      purchasedAt: normalizeDate(
        getValue(row, ["sale date", "purchase date", "paid on", "created"])
      ),
      metadata: row,
    };
  });
}
