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

type ExpenseCSVRow = {
  expense: string;
  paidBy: string;
  amount: number;
  splitting: number;
  eachPersonOwes: number;
  splitBetween: string[];
};

const ITEMS_PATH = path.join(process.cwd(), "parsed_items.json");
const CSV_PATH = path.join(process.cwd(), "expenses.csv");

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
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
  return trimmed[0].toUpperCase() + trimmed.slice(1).toLowerCase();
}

function parsePeople(inputValue: string): string[] {
  return inputValue
    .split(",")
    .map(normalizeName)
    .filter(Boolean);
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
  const header =
    "Expense,Paid By,Amount,# Splitting,Each Person Owes,Split Between";

  const csv = [header, ...rows.map(rowToCSV)].join("\n");

  fs.writeFileSync(CSV_PATH, csv, "utf-8");
}

function loadItems(): ParsedItem[] {
  if (!fs.existsSync(ITEMS_PATH)) {
    console.error(`Missing parsed_items.json`);
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(ITEMS_PATH, "utf-8"));
}

async function promptSplit(
  rl: readline.Interface,
  knownPeople: string[],
): Promise<string[]> {
  while (true) {
    const answer = await rl.question("> ");
    const trimmed = answer.trim();

    if (trimmed.toUpperCase() === "ALL") {
      return [...knownPeople];
    }

    const people = parsePeople(trimmed);

    if (people.length === 0) {
      console.log("❌ Enter at least one name.");
      continue;
    }

    const invalid = people.filter(p => !knownPeople.includes(p));

    if (invalid.length > 0) {
      console.log(`❌ Unknown name(s): ${invalid.join(", ")}`);
      console.log(`Valid: ${knownPeople.join(", ")}`);
      continue;
    }

    return people;
  }
}

async function main(): Promise<void> {
  const rl = readline.createInterface({ input, output });

  const items = loadItems();

  console.log("\nItems:");
  items.forEach((item, i) => {
    console.log(`${i + 1}. ${item.name} — ${formatMoney(item.totalPrice)}`);
  });

  const groupInput = await rl.question(
    "\nEnter everyone on the trip/group:\n> "
  );

  const knownPeople = parsePeople(groupInput);

  if (knownPeople.length === 0) {
    console.log("❌ Must have at least one person.");
    process.exit(1);
  }

  const paidByInput = await rl.question("\nWho paid?\n> ");
  const paidBy = normalizeName(paidByInput);

  if (!knownPeople.includes(paidBy)) {
    knownPeople.push(paidBy);
  }

  const rows: ExpenseCSVRow[] = [];

  console.log("\nAssign splits (type ALL for everyone)");

  for (const item of items) {
    console.log(`\n${item.name} — ${formatMoney(item.totalPrice)}`);
    const splitBetween = await promptSplit(rl, knownPeople);

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

  writeExpensesCSV(rows);

  console.log("\n✅ expenses.csv written.");
  console.log("Run: npx tsx invoice_creator.ts");

  rl.close();
}

main();