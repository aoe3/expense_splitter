import fs from "node:fs";
import path from "node:path";

type ExpenseRow = {
  expense: string;
  paidBy: string;
  amount: number;
  splitting: number;
  eachPersonOwes: number;
  splitBetween: string[];
};

type BalanceMap = Map<string, Map<string, number>>;

const CSV_PATH = path.join(process.cwd(), "expenses.csv");

function parseMoney(value: string): number {
  return Number(value.replace("$", "").trim());
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (const char of line) {
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseExpensesCSV(filePath: string): ExpenseRow[] {
  const raw = fs.readFileSync(filePath, "utf-8").trim();
  const lines = raw.split(/\r?\n/);

  const rows = lines.slice(1);

  return rows.map((line) => {
    const [
      expense,
      paidBy,
      amount,
      splitting,
      eachPersonOwes,
      splitBetweenRaw,
    ] = parseCSVLine(line);

    return {
      expense,
      paidBy: paidBy.trim(),
      amount: parseMoney(amount),
      splitting: Number(splitting),
      eachPersonOwes: parseMoney(eachPersonOwes),
      splitBetween: splitBetweenRaw
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    };
  });
}

function addDebt(
  balances: BalanceMap,
  personWhoOwes: string,
  personWhoIsOwed: string,
  amount: number,
): void {
  if (personWhoOwes === personWhoIsOwed) return;

  if (!balances.has(personWhoOwes)) {
    balances.set(personWhoOwes, new Map());
  }

  const debts = balances.get(personWhoOwes)!;
  const current = debts.get(personWhoIsOwed) ?? 0;

  debts.set(personWhoIsOwed, current + amount);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function getAllPeople(rows: ExpenseRow[]): string[] {
  const people = new Set<string>();

  for (const row of rows) {
    people.add(row.paidBy);

    for (const person of row.splitBetween) {
      people.add(person);
    }
  }

  return [...people].sort();
}

function buildDebtBalances(rows: ExpenseRow[]): BalanceMap {
  const balances: BalanceMap = new Map();

  for (const row of rows) {
    for (const person of row.splitBetween) {
      if (person !== row.paidBy) {
        addDebt(balances, person, row.paidBy, row.eachPersonOwes);
      }
    }
  }

  return balances;
}

function simplifyMutualDebts(people: string[], balances: BalanceMap): BalanceMap {
  const simplified: BalanceMap = new Map();

  for (const personA of people) {
    for (const personB of people) {
      if (personA >= personB) continue;

      const aOwesB = balances.get(personA)?.get(personB) ?? 0;
      const bOwesA = balances.get(personB)?.get(personA) ?? 0;

      const net = roundMoney(aOwesB - bOwesA);

      if (net > 0) {
        addDebt(simplified, personA, personB, net);
      } else if (net < 0) {
        addDebt(simplified, personB, personA, Math.abs(net));
      }
    }
  }

  return simplified;
}

function printPeople(people: string[]): void {
  console.log("\nPeople involved:");
  for (const person of people) {
    console.log(`- ${person}`);
  }
}

function printBalances(title: string, balances: BalanceMap): void {
  console.log(`\n${title}`);

  let hasAnyDebt = false;

  for (const [personWhoOwes, debts] of balances) {
    for (const [personWhoIsOwed, amount] of debts) {
      const rounded = roundMoney(amount);

      if (rounded > 0) {
        hasAnyDebt = true;
        console.log(
          `${personWhoOwes} owes ${personWhoIsOwed}: $${rounded.toFixed(2)}`,
        );
      }
    }
  }

  if (!hasAnyDebt) {
    console.log("No debts found.");
  }
}

function main(): void {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Could not find expenses.csv at: ${CSV_PATH}`);
    process.exit(1);
  }

  const rows = parseExpensesCSV(CSV_PATH);
  const people = getAllPeople(rows);

  const rawBalances = buildDebtBalances(rows);
  const simplifiedBalances = simplifyMutualDebts(people, rawBalances);

  printPeople(people);
  printBalances("Raw debts:", rawBalances);
  printBalances("Simplified debts:", simplifiedBalances);
}

main();