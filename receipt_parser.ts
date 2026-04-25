import fs from "node:fs";
import path from "node:path";

type ParsedItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  rawLine: string;
};

const RECEIPT_PATH = path.join(process.cwd(), "receipt.txt");

function parseMoney(value: string): number {
  return Number(value.replace("$", "").trim());
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function cleanLine(line: string): string {
  return line
    .replace(/\s+/g, " ")
    .replace(/[|]/g, "")
    .trim();
}

function isNonItemLine(line: string): boolean {
  const upper = line.toUpperCase();

  return (
    upper.includes("SUBTOTAL") ||
    upper.includes("GRAND TOTAL") ||
    upper.includes("AMOUNT DUE") ||
    upper.includes("TAX") ||
    upper.includes("TIP") ||
    upper.includes("TABLE") ||
    upper.includes("GUEST") ||
    upper.includes("SEQUENCE") ||
    upper.includes("GRACIAS") ||
    upper.includes("QTY") ||
    upper.includes("PRICE") ||
    upper.includes("ITEM")
  );
}

function parseReceiptLine(line: string): ParsedItem | null {
  const cleaned = cleanLine(line);

  if (!cleaned || isNonItemLine(cleaned)) {
    return null;
  }

  /**
   * Handles:
   * MOJITO (2@$8.00) $16.00
   * AGUA BOTELLA (3@$1.50) $4.50
   */
  const quantityMatch = cleaned.match(
    /^(.*?)\s*\((\d+)\s*@\s*\$?(\d+(?:\.\d{2})?)\)\s*\$?(\d+(?:\.\d{2})?)$/,
  );

  if (quantityMatch) {
    const [, rawName, quantityRaw, unitRaw, totalRaw] = quantityMatch;

    return {
      name: rawName.trim(),
      quantity: Number(quantityRaw),
      unitPrice: parseMoney(unitRaw),
      totalPrice: parseMoney(totalRaw),
      rawLine: line,
    };
  }

  /**
   * Handles:
   * CHORIZO AL VINO 1 $7.95
   * MINI EMPANADILLAS 1 $6.95
   *
   * Also works if OCR drops the quantity and only sees:
   * CHORIZO AL VINO $7.95
   */
  const simpleMatch = cleaned.match(
    /^(.*?)\s+(?:(\d+)\s+)?\$?(\d+(?:\.\d{2})?)$/,
  );

  if (simpleMatch) {
    const [, rawName, quantityRaw, totalRaw] = simpleMatch;
    const quantity = quantityRaw ? Number(quantityRaw) : 1;
    const totalPrice = parseMoney(totalRaw);

    return {
      name: rawName.trim(),
      quantity,
      unitPrice: roundMoney(totalPrice / quantity),
      totalPrice,
      rawLine: line,
    };
  }

  return null;
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
  return text
    .split(/\r?\n/)
    .map(cleanLine)
    .map(parseReceiptLine)
    .filter((item): item is ParsedItem => item !== null);
}

function main(): void {
  if (!fs.existsSync(RECEIPT_PATH)) {
    console.error(`Could not find receipt.txt at: ${RECEIPT_PATH}`);
    process.exit(1);
  }

  const rawReceiptText = fs.readFileSync(RECEIPT_PATH, "utf-8");

  const parsedItems = parseReceiptText(rawReceiptText);
  const splitItems = splitMultiples(parsedItems);

  console.log("\nParsed receipt items:");
  console.table(parsedItems);

  console.log("\nSplit-out individual items:");
  console.table(splitItems);

  const subtotal = splitItems.reduce((sum, item) => sum + item.totalPrice, 0);

  fs.writeFileSync(
    path.join(process.cwd(), "parsed_items.json"),
    JSON.stringify(splitItems, null, 2),
    "utf-8",
    );

  console.log(`\nParsed subtotal: $${roundMoney(subtotal).toFixed(2)}`);
}

main();