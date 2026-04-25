import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

type ParsedItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  rawLine: string;
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

type ExpenseCSVRow = {
  expense: string;
  paidBy: string;
  amount: number;
  splitting: number;
  eachPersonOwes: number;
  splitBetween: string[];
};

type SplitMode = "even" | "percent" | "dollar";
type SourceMode = "itemized" | "non-itemized";

const DATA_GENERATED_DIR = path.join(process.cwd(), "data", "generated");
const ITEMS_PATH = path.join(DATA_GENERATED_DIR, "parsed_items.json");
const RECEIPT_SUMMARY_PATH = path.join(DATA_GENERATED_DIR, "receipt_summary.json");
const CSV_PATH = path.join(DATA_GENERATED_DIR, "expenses.csv");

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

function centsToMoney(cents: number): number {
  return cents / 100;
}

function formatMoney(value: number): string {
  return `$${roundMoney(value).toFixed(2)}`;
}

function csvEscape(value: string): string {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

function normalizeName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";

  return trimmed
    .split(/\s+/)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function parsePeople(inputValue: string): string[] {
  const seen = new Set<string>();

  return inputValue
    .split(",")
    .map(normalizeName)
    .filter(Boolean)
    .filter((person) => {
      if (seen.has(person)) return false;
      seen.add(person);
      return true;
    });
}

function parseMoneyInput(value: string): number | null {
  const normalized = value.replace("$", "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? roundMoney(parsed) : null;
}

function parsePercentInput(value: string): number | null {
  const normalized = value.replace("%", "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function rowToCSV(row: ExpenseCSVRow): string {
  return [
    row.expense,
    row.paidBy,
    formatMoney(row.amount),
    row.splitting.toString(),
    formatMoney(row.eachPersonOwes),
    csvEscape(row.splitBetween.join(", ")),
  ].join(",");
}

function writeExpensesCSV(rows: ExpenseCSVRow[]): void {
  fs.mkdirSync(DATA_GENERATED_DIR, { recursive: true });

  const header =
    "Expense,Paid By,Amount,# Splitting,Each Person Owes,Split Between";

  const csv = [header, ...rows.map(rowToCSV)].join("\n");

  fs.writeFileSync(CSV_PATH, csv, "utf-8");
}

function loadItems(): ParsedItem[] | null {
  if (!fs.existsSync(ITEMS_PATH)) return null;

  const items = JSON.parse(fs.readFileSync(ITEMS_PATH, "utf-8")) as ParsedItem[];
  return items.length > 0 ? items : null;
}

function loadReceiptSummary(): ReceiptSummary | null {
  if (!fs.existsSync(RECEIPT_SUMMARY_PATH)) return null;

  return JSON.parse(fs.readFileSync(RECEIPT_SUMMARY_PATH, "utf-8")) as ReceiptSummary;
}

function printKnownPeople(knownPeople: string[]): void {
  console.log("\nPeople:");
  knownPeople.forEach((person, index) => {
    console.log(`  ${index + 1}. ${person}`);
  });
}

function resolvePeopleSelection(answer: string, knownPeople: string[]): string[] | null {
  const trimmed = answer.trim();
  if (!trimmed) return null;

  if (trimmed.toUpperCase() === "ALL") {
    return [...knownPeople];
  }

  const pieces = trimmed.split(",").map((piece) => piece.trim()).filter(Boolean);
  if (pieces.length === 0) return null;

  const selected: string[] = [];

  for (const piece of pieces) {
    if (/^\d+$/.test(piece)) {
      const index = Number(piece) - 1;
      const person = knownPeople[index];

      if (!person) {
        console.log(`❌ No person exists for number ${piece}.`);
        return null;
      }

      if (!selected.includes(person)) selected.push(person);
      continue;
    }

    const name = normalizeName(piece);
    if (!knownPeople.includes(name)) {
      console.log(`❌ Unknown name: ${name}`);
      return null;
    }

    if (!selected.includes(name)) selected.push(name);
  }

  return selected;
}

async function promptYesNo(
  rl: readline.Interface,
  question: string,
): Promise<boolean> {
  while (true) {
    const answer = (await rl.question(`${question} (yes/no)\n> `)).trim().toLowerCase();

    if (["y", "yes"].includes(answer)) return true;
    if (["n", "no"].includes(answer)) return false;

    console.log("❌ Enter yes or no.");
  }
}

async function promptKnownPeople(rl: readline.Interface): Promise<string[]> {
  while (true) {
    const groupInput = await rl.question(
      "\nEnter everyone on the trip/group, comma-separated:\n> ",
    );

    const knownPeople = parsePeople(groupInput);

    if (knownPeople.length > 0) {
      printKnownPeople(knownPeople);
      const confirmed = await promptYesNo(rl, "Is this people list correct?");
      if (confirmed) return knownPeople;
      continue;
    }

    console.log("❌ Must have at least one person.");
  }
}

async function promptPaidBy(
  rl: readline.Interface,
  knownPeople: string[],
): Promise<string> {
  while (true) {
    printKnownPeople(knownPeople);
    const paidByInput = await rl.question(
      "\nWho paid? Enter a name or number from the list. If the payer is not listed, type their full name.\n> ",
    );

    const byNumber = resolvePeopleSelection(paidByInput, knownPeople);
    if (byNumber && byNumber.length === 1) return byNumber[0];
    if (byNumber && byNumber.length > 1) {
      console.log("❌ Payer must be exactly one person.");
      continue;
    }

    const paidBy = normalizeName(paidByInput);

    if (!paidBy) {
      console.log("❌ Enter a name.");
      continue;
    }

    if (!knownPeople.includes(paidBy)) {
      const add = await promptYesNo(
        rl,
        `${paidBy} is not in the people list. Add them as the payer?`,
      );

      if (!add) continue;
      knownPeople.push(paidBy);
    }

    return paidBy;
  }
}

async function promptSplit(
  rl: readline.Interface,
  knownPeople: string[],
  previousSplit: string[] | null,
): Promise<string[]> {
  while (true) {
    printKnownPeople(knownPeople);
    console.log("\nEnter who split this item.");
    console.log("Examples: ALL   |   1,3   |   James, Kayla");
    if (previousSplit) {
      console.log(`Shortcut: SAME = ${previousSplit.join(", ")}`);
    }

    const answer = await rl.question("> ");
    const trimmed = answer.trim();

    if (previousSplit && trimmed.toUpperCase() === "SAME") {
      return [...previousSplit];
    }

    const selected = resolvePeopleSelection(trimmed, knownPeople);

    if (!selected || selected.length === 0) {
      console.log("❌ Enter at least one valid person, ALL, or SAME when available.");
      continue;
    }

    return selected;
  }
}

async function promptMoney(
  rl: readline.Interface,
  prompt: string,
): Promise<number> {
  while (true) {
    const answer = await rl.question(prompt);
    const parsed = parseMoneyInput(answer);

    if (parsed !== null) return parsed;

    console.log("❌ Enter a dollar amount like 12.34 or $12.34.");
  }
}

async function promptDetectedTotalCorrection(
  rl: readline.Interface,
  detectedTotal: number | null,
  sourceLine: string | null,
): Promise<number> {
  if (detectedTotal === null || detectedTotal <= 0) {
    return promptMoney(rl, "\nNo usable total was detected. Enter receipt total manually:\n> ");
  }

  console.log(`\nDetected total: ${formatMoney(detectedTotal)}`);
  if (sourceLine) console.log(`Total source: ${sourceLine}`);

  while (true) {
    const answer = await rl.question(
      "Confirm total. Type YES to accept, or enter the corrected dollar amount.\n> ",
    );

    if (["y", "yes"].includes(answer.trim().toLowerCase())) {
      return detectedTotal;
    }

    const corrected = parseMoneyInput(answer);
    if (corrected !== null) {
      console.log(`Using corrected total: ${formatMoney(corrected)}`);
      return corrected;
    }

    console.log("❌ Type YES to accept the detected total, or enter a valid amount like 120.30.");
  }
}

async function promptSplitMode(rl: readline.Interface): Promise<SplitMode> {
  while (true) {
    console.log("\nHow do you want to split this non-itemized receipt?");
    console.log("1. Split total evenly");
    console.log("2. Assign percentages");
    console.log("3. Assign exact dollar values");

    const answer = await rl.question("> ");
    const normalized = answer.trim().toLowerCase();

    if (normalized === "1" || normalized === "even") return "even";
    if (["2", "percent", "percentage", "percentages"].includes(normalized)) return "percent";
    if (["3", "dollar", "dollars", "amount", "amounts", "exact"].includes(normalized)) return "dollar";

    console.log("❌ Choose 1, 2, or 3.");
  }
}

function allocateEvenly(total: number, people: string[]): Map<string, number> {
  const totalCents = toCents(total);
  const baseCents = Math.floor(totalCents / people.length);
  let remainder = totalCents - baseCents * people.length;

  const allocations = new Map<string, number>();

  for (const person of people) {
    const extraCent = remainder > 0 ? 1 : 0;
    allocations.set(person, centsToMoney(baseCents + extraCent));
    remainder -= extraCent;
  }

  return allocations;
}

function allocateByPercent(total: number, percentages: Map<string, number>): Map<string, number> {
  const totalCents = toCents(total);
  const entries = [...percentages.entries()];
  const rawAllocations = entries.map(([person, percent], originalIndex) => {
    const exactCents = (totalCents * percent) / 100;
    const floorCents = Math.floor(exactCents);

    return {
      person,
      floorCents,
      remainder: exactCents - floorCents,
      originalIndex,
    };
  });

  let assignedCents = rawAllocations.reduce((sum, item) => sum + item.floorCents, 0);
  let remainingCents = totalCents - assignedCents;

  rawAllocations.sort((a, b) => b.remainder - a.remainder);

  for (const item of rawAllocations) {
    if (remainingCents <= 0) break;
    item.floorCents += 1;
    remainingCents -= 1;
  }

  return new Map(
    rawAllocations
      .sort((a, b) => a.originalIndex - b.originalIndex)
      .map((item) => [item.person, centsToMoney(item.floorCents)]),
  );
}

async function promptPercentAllocations(
  rl: readline.Interface,
  total: number,
  people: string[],
): Promise<Map<string, number>> {
  while (true) {
    const percentages = new Map<string, number>();

    for (const person of people) {
      while (true) {
        const answer = await rl.question(`${person}'s percentage of ${formatMoney(total)}:\n> `);
        const percent = parsePercentInput(answer);

        if (percent !== null) {
          percentages.set(person, percent);
          break;
        }

        console.log("❌ Enter a percentage like 25 or 25%.");
      }
    }

    const totalPercent = [...percentages.values()].reduce((sum, percent) => sum + percent, 0);

    if (Math.abs(totalPercent - 100) <= 0.01) {
      return allocateByPercent(total, percentages);
    }

    console.log(`❌ Percentages must add to 100. Current total: ${totalPercent.toFixed(2)}%. Try again.`);
  }
}

async function promptDollarAllocations(
  rl: readline.Interface,
  total: number,
  people: string[],
): Promise<Map<string, number>> {
  while (true) {
    const allocations = new Map<string, number>();

    for (const person of people) {
      const amount = await promptMoney(
        rl,
        `${person}'s dollar amount out of ${formatMoney(total)}:\n> `,
      );
      allocations.set(person, amount);
    }

    const allocatedTotalCents = [...allocations.values()].reduce((sum, amount) => sum + toCents(amount), 0);

    if (allocatedTotalCents === toCents(total)) {
      return allocations;
    }

    console.log(
      `❌ Dollar amounts must add to ${formatMoney(total)}. Current total: ${formatMoney(centsToMoney(allocatedTotalCents))}. Try again.`,
    );
  }
}

function allocationRows(
  allocations: Map<string, number>,
  paidBy: string,
  expensePrefix = "Non-itemized receipt",
): ExpenseCSVRow[] {
  const rows: ExpenseCSVRow[] = [];

  for (const [person, amount] of allocations.entries()) {
    if (amount <= 0) continue;

    rows.push({
      expense: `${expensePrefix} - ${person}`,
      paidBy,
      amount: roundMoney(amount),
      splitting: 1,
      eachPersonOwes: roundMoney(amount),
      splitBetween: [person],
    });
  }

  return rows;
}

function printAllocation(allocations: Map<string, number>): void {
  console.log("\nAllocation:");
  for (const [person, amount] of allocations.entries()) {
    console.log(`- ${person}: ${formatMoney(amount)}`);
  }
}

async function buildNonItemizedRows(
  rl: readline.Interface,
  summary: ReceiptSummary,
  knownPeople: string[],
  paidBy: string,
): Promise<ExpenseCSVRow[]> {
  console.log("\nDetected a non-itemized receipt.");
  console.log(`Parser confidence: ${summary.confidence.toFixed(2)}`);
  console.log(`Candidate item lines: ${summary.candidateItemLines}`);

  const detectedTotal = summary.total > 0 ? roundMoney(summary.total) : null;
  const total = await promptDetectedTotalCorrection(rl, detectedTotal, summary.totalSourceLine);

  console.log("\nWho should split this receipt?");
  const splitBetween = await promptSplit(rl, knownPeople, null);
  const mode = await promptSplitMode(rl);

  let allocations: Map<string, number>;

  if (mode === "even") {
    allocations = allocateEvenly(total, splitBetween);
  } else if (mode === "percent") {
    allocations = await promptPercentAllocations(rl, total, splitBetween);
  } else {
    allocations = await promptDollarAllocations(rl, total, splitBetween);
  }

  printAllocation(allocations);

  const confirmed = await promptYesNo(
    rl,
    "Confirm this non-itemized allocation and continue?",
  );

  if (!confirmed) {
    console.log("Canceled before writing expenses.csv.");
    process.exit(0);
  }

  return allocationRows(allocations, paidBy);
}

async function buildItemizedRows(
  items: ParsedItem[],
  knownPeople: string[],
  paidBy: string,
  rl: readline.Interface,
): Promise<ExpenseCSVRow[]> {
  const rows: ExpenseCSVRow[] = [];
  let previousSplit: string[] | null = null;

  console.log("\nItems:");
  items.forEach((item, i) => {
    console.log(`${i + 1}. ${item.name} — ${formatMoney(item.totalPrice)}`);
  });

  console.log("\nAssign splits for each item.");
  console.log("No split is assumed. Use ALL, numbers, names, or SAME when shown.");

  for (const item of items) {
    console.log(`\n${item.name} — ${formatMoney(item.totalPrice)}`);
    const splitBetween = await promptSplit(rl, knownPeople, previousSplit);
    previousSplit = splitBetween;

    const splitting = splitBetween.length;
    const eachPersonOwes = roundMoney(item.totalPrice / splitting);

    rows.push({
      expense: item.name,
      paidBy,
      amount: roundMoney(item.totalPrice),
      splitting,
      eachPersonOwes,
      splitBetween,
    });
  }

  return rows;
}

function printRowsSummary(rows: ExpenseCSVRow[]): void {
  console.log("\nExpense rows to write:");
  for (const row of rows) {
    console.log(
      `- ${row.expense}: ${row.paidBy} paid ${formatMoney(row.amount)}; ${row.splitBetween.join(", ")} owe ${formatMoney(row.eachPersonOwes)} each`,
    );
  }

  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  console.log(`\nTotal represented in expenses.csv: ${formatMoney(total)}`);
}

async function chooseSourceMode(
  rl: readline.Interface,
  hasItems: boolean,
  hasSummary: boolean,
): Promise<SourceMode> {
  if (hasItems && !hasSummary) return "itemized";
  if (!hasItems && hasSummary) return "non-itemized";

  while (true) {
    console.log("\nBoth parsed_items.json and receipt_summary.json exist.");
    console.log("Choose which source to use:");
    console.log("1. Itemized parsed items");
    console.log("2. Non-itemized receipt summary");

    const answer = await rl.question("> ");
    if (answer.trim() === "1") return "itemized";
    if (answer.trim() === "2") return "non-itemized";

    console.log("❌ Choose 1 or 2.");
  }
}

async function main(): Promise<void> {
  const rl = readline.createInterface({ input, output });

  try {
    const items = loadItems();
    const summary = loadReceiptSummary();

    if (!items && !summary) {
      console.error("Missing parsed_items.json or receipt_summary.json.");
      console.error("Run: npm run parse");
      return;
    }

    const mode = await chooseSourceMode(rl, Boolean(items), Boolean(summary));
    const knownPeople = await promptKnownPeople(rl);
    const paidBy = await promptPaidBy(rl, knownPeople);

    const rows = mode === "non-itemized"
      ? await buildNonItemizedRows(rl, summary!, knownPeople, paidBy)
      : await buildItemizedRows(items!, knownPeople, paidBy, rl);

    printRowsSummary(rows);

    const confirmed = await promptYesNo(rl, "Write these rows to expenses.csv?");
    if (!confirmed) {
      console.log("Canceled. expenses.csv was not written.");
      return;
    }

    writeExpensesCSV(rows);

    console.log("\n✅ expenses.csv written.");
    console.log("Run: npm run invoice");
  } finally {
    rl.close();
  }
}

main();
