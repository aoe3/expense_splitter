import fs from "node:fs";
import path from "node:path";

type ParsedItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  rawLine: string;
};

type ReceiptAnalysis = {
  parsedItems: number;
  linesWithPrices: number;
  candidateItemLines: number;
  confidence: number;
  isItemized: boolean;
};

type ReceiptSummary = {
  receiptType: "non-itemized";
  total: number;
  totalSourceLine: string | null;
  parsedItems: number;
  candidateItemLines: number;
  confidence: number;
  source: string;
};

const RECEIPT_PATH = path.join(process.cwd(), "receipt.txt");
const PARSED_ITEMS_PATH = path.join(process.cwd(), "parsed_items.json");
const RECEIPT_SUMMARY_PATH = path.join(process.cwd(), "receipt_summary.json");

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseMoney(value: string): number {
  return Number(
    value
      .replace("$", "")
      .replace(",", ".")        // fix 234,40 → 234.40
      .replace(/[^\d.]/g, "")   // remove garbage like %
      .trim()
  );
}

function cleanLine(line: string): string {
  return line
    .replace(/[|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isBadLine(line: string): boolean {
  const upper = line.toUpperCase();

  return (
    !line ||
    upper.includes("SUBTOTAL") ||
    upper.includes("SUB TOTAL") ||
    upper.includes("GRAND TOTAL") ||
    upper.includes("TOTAL AMOUNT") ||
    upper.includes("AMOUNT DUE") ||
    upper.includes("PAID AMOUNT") ||
    upper.includes("BILL PAYMENT") ||
    upper.includes("AMOUNT COLLECTED") ||
    upper.includes("TAX") ||
    upper.includes("TIP") ||
    upper.includes("TABLE") ||
    upper.includes("GUEST") ||
    upper.includes("SEQUENCE") ||
    upper.includes("SERVER") ||
    upper.includes("CASHIER") ||
    upper.includes("CREDIT CARD") ||
    upper.includes("CARD NO") ||
    upper.includes("ACCOUNT") ||
    upper.includes("CUSTOMER") ||
    upper.includes("THANK") ||
    upper.includes("GRACIAS") ||
    upper.includes("INVOICE") ||
    upper.includes("QTY") ||
    upper.includes("PRICE")
  );
}

function hasPrice(line: string): boolean {
  return /\$?\d+[.,]\d{2}/.test(line);
}

function isOnlyPrice(line: string): boolean {
  return /^\$?\d+[.,]\d{2}$/.test(line.trim());
}

function looksLikeItemName(line: string): boolean {
  if (isBadLine(line)) return false;
  if (hasPrice(line)) return false;
  if (/^\d+$/.test(line)) return false;
  if (line.length < 2) return false;

  return /[A-Za-z]/.test(line);
}

function getMoneyValues(line: string): number[] {
  const matches = line.match(/\$?\d+[.,]\d{2}/g) ?? [];
  return matches.map(parseMoney).filter((value) => Number.isFinite(value));
}

function getLastMoneyValue(line: string): number | null {
  const values = getMoneyValues(line);
  return values.length > 0 ? values[values.length - 1] : null;
}

function isStrongTotalKeyword(line: string): boolean {
  const upper = line.toUpperCase();

  return (
    upper.includes("AMOUNT DUE") ||
    upper.includes("GRAND TOTAL") ||
    upper.includes("TOTAL AMOUNT") ||
    upper.includes("PAID AMOUNT") ||
    upper.includes("AMOUNT COLLECTED") ||
    upper === "TOTAL"
  );
}

function isWeakTotalKeyword(line: string): boolean {
  const upper = line.toUpperCase();

  return (
    upper.includes("TOTAL") &&
    !upper.includes("SUBTOTAL") &&
    !upper.includes("SUB TOTAL") &&
    !upper.includes("TAX") &&
    !upper.includes("TIP")
  );
}

function extractNonItemizedTotal(lines: string[]): { total: number | null; sourceLine: string | null } {
  const strongCandidates: Array<{ total: number; sourceLine: string }> = [];
  const weakCandidates: Array<{ total: number; sourceLine: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const sameLineAmount = getLastMoneyValue(line);

    if (isStrongTotalKeyword(line)) {
      if (sameLineAmount !== null) {
        strongCandidates.push({ total: sameLineAmount, sourceLine: line });
      }

      const nextLine = lines[i + 1];
      if (nextLine && isOnlyPrice(nextLine)) {
        strongCandidates.push({ total: parseMoney(nextLine), sourceLine: `${line} / ${nextLine}` });
      }
    } else if (isWeakTotalKeyword(line)) {
      if (sameLineAmount !== null) {
        weakCandidates.push({ total: sameLineAmount, sourceLine: line });
      }

      const nextLine = lines[i + 1];
      if (nextLine && isOnlyPrice(nextLine)) {
        weakCandidates.push({ total: parseMoney(nextLine), sourceLine: `${line} / ${nextLine}` });
      }
    }
  }

  const candidates = strongCandidates.length > 0 ? strongCandidates : weakCandidates;

  if (candidates.length === 0) {
    return { total: null, sourceLine: null };
  }

  const best = candidates.reduce((largest, current) =>
    current.total > largest.total ? current : largest,
  );

  return {
    total: roundMoney(best.total),
    sourceLine: best.sourceLine,
  };
}

function parseReceiptLine(line: string): ParsedItem | null {
  const cleaned = cleanLine(line);

  if (isBadLine(cleaned)) return null;

  /**
   * MOJITO (2@$8.00) $16.00
   * AGUA BOTELLA (3@$1.50) $4.50
   */
  const quantityAtPriceMatch = cleaned.match(
    /^(.*?)\s*\((\d+)\s*@\s*\$?(\d+(?:[.,]\d{2})?)\)\s*\$?(\d+(?:[.,]\d{2})?)$/,
  );

  if (quantityAtPriceMatch) {
    const [, rawName, quantityRaw, unitRaw, totalRaw] = quantityAtPriceMatch;

    return {
      name: rawName.trim(),
      quantity: Number(quantityRaw),
      unitPrice: parseMoney(unitRaw),
      totalPrice: parseMoney(totalRaw),
      rawLine: line,
    };
  }

  /**
   * MOJITO 2 $16.00
   * MOJITO 2 16.00
   */
  const qtyTotalMatch = cleaned.match(
    /^(.*?)\s+(\d+)\s+\$?(\d+(?:[.,]\d{2})?)$/,
  );

  if (qtyTotalMatch) {
    const [, rawName, quantityRaw, totalRaw] = qtyTotalMatch;
    const quantity = Number(quantityRaw);
    const totalPrice = parseMoney(totalRaw);

    return {
      name: rawName.trim(),
      quantity,
      unitPrice: roundMoney(totalPrice / quantity),
      totalPrice,
      rawLine: line,
    };
  }

  /**
   * MOJITO $8.00
   * MOJITO 8.00
   */
  const simplePriceMatch = cleaned.match(
    /^(.*?)\s+\$?(\d+(?:[.,]\d{2})?)$/,
  );

  if (simplePriceMatch) {
    const [, rawName, totalRaw] = simplePriceMatch;
    const name = rawName.trim();

    if (!name || !/[A-Za-z]/.test(name)) return null;

    const totalPrice = parseMoney(totalRaw);

    return {
      name,
      quantity: 1,
      unitPrice: totalPrice,
      totalPrice,
      rawLine: line,
    };
  }

  return null;
}

function combineSplitNameAndPriceLines(lines: string[]): string[] {
  const combined: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const current = lines[i];
    const next = lines[i + 1];

    if (looksLikeItemName(current) && next && isOnlyPrice(next)) {
      combined.push(`${current} ${next}`);
      i++;
      continue;
    }

    combined.push(current);
  }

  return combined;
}

function splitMultiples(items: ParsedItem[]): ParsedItem[] {
  const splitItems: ParsedItem[] = [];

  for (const item of items) {
    if (item.quantity <= 1) {
      splitItems.push(item);
      continue;
    }

    for (let i = 1; i <= item.quantity; i++) {
      splitItems.push({
        name: `${item.name} ${i}/${item.quantity}`,
        quantity: 1,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice,
        rawLine: item.rawLine,
      });
    }
  }

  return splitItems;
}

function parseReceiptText(text: string): ParsedItem[] {
  const cleanedLines = text
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  const combinedLines = combineSplitNameAndPriceLines(cleanedLines);

  return combinedLines
    .map(parseReceiptLine)
    .filter((item): item is ParsedItem => item !== null);
}

function analyzeReceipt(lines: string[], parsedItems: ParsedItem[]): ReceiptAnalysis {
  const linesWithPrices = lines.filter(hasPrice).length;

  const candidateItemLines = lines.filter(
    (line) => hasPrice(line) && !isBadLine(line),
  ).length;

  const parsedCount = parsedItems.length;

  const confidence =
    candidateItemLines === 0
      ? 0
      : parsedCount / candidateItemLines;

  const isItemized =
    parsedCount >= 2 &&
    candidateItemLines >= 3 &&
    confidence > 0.4;

  return {
    parsedItems: parsedCount,
    linesWithPrices,
    candidateItemLines,
    confidence,
    isItemized,
  };
}

function deleteIfExists(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function main(): void {
  if (!fs.existsSync(RECEIPT_PATH)) {
    console.error(`Could not find receipt.txt at: ${RECEIPT_PATH}`);
    process.exit(1);
  }

  const rawReceiptText = fs.readFileSync(RECEIPT_PATH, "utf-8");

  const cleanedLines = rawReceiptText
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);

  const parsedItems = parseReceiptText(rawReceiptText);
  const splitItems = splitMultiples(parsedItems);

  const analysis = analyzeReceipt(cleanedLines, parsedItems);

  if (!analysis.isItemized) {
    const extractedTotal = extractNonItemizedTotal(cleanedLines);

    deleteIfExists(PARSED_ITEMS_PATH);

    const summary: ReceiptSummary = {
      receiptType: "non-itemized",
      total: extractedTotal.total ?? 0,
      totalSourceLine: extractedTotal.sourceLine,
      parsedItems: analysis.parsedItems,
      candidateItemLines: analysis.candidateItemLines,
      confidence: roundMoney(analysis.confidence),
      source: RECEIPT_PATH,
    };

    fs.writeFileSync(
      RECEIPT_SUMMARY_PATH,
      JSON.stringify(summary, null, 2),
      "utf-8",
    );

    console.log("\n⚠️ Likely NON-itemized receipt.");
    console.log(`Parsed items: ${analysis.parsedItems}`);
    console.log(`Candidate lines: ${analysis.candidateItemLines}`);
    console.log(`Confidence: ${analysis.confidence.toFixed(2)}`);

    if (extractedTotal.total !== null) {
      console.log(`Detected total: $${extractedTotal.total.toFixed(2)}`);
      console.log(`Total source: ${extractedTotal.sourceLine}`);
    } else {
      console.log("Detected total: not found");
      console.log("You can still enter the total manually in expense_builder.ts.");
    }

    console.log(`Wrote ${RECEIPT_SUMMARY_PATH}`);
    console.log("Run: npx tsx expense_builder.ts");
    return;
  }

  deleteIfExists(RECEIPT_SUMMARY_PATH);

  fs.writeFileSync(
    PARSED_ITEMS_PATH,
    JSON.stringify(splitItems, null, 2),
    "utf-8",
  );

  console.log("\nParsed receipt items:");
  console.table(parsedItems);

  console.log("\nSplit-out individual items:");
  console.table(splitItems);

  const subtotal = splitItems.reduce((sum, item) => sum + item.totalPrice, 0);

  console.log(`\nParsed subtotal: $${roundMoney(subtotal).toFixed(2)}`);
  console.log(`Wrote ${PARSED_ITEMS_PATH}`);
  console.log("Run: npx tsx expense_builder.ts");
}

main();
