/**
 * Fake in-memory database model for the expense splitter product layer.
 *
 * This is NOT a real database adapter yet. It is a typed seed model that lets us
 * build product flows before choosing storage/auth/payments. V1 creates invoices
 * only; it does not monitor or process payment fulfillment.
 *
 * Table order / dependency order:
 * 1. users
 * 2. phoneNumbers
 * 3. userConnections
 * 4. tripGroups
 * 5. receiptArtifacts
 * 6. expenses
 * 7. expenseItems
 * 8. expenseSplits
 * 9. invoices
 */

type ISODateString = string;
type MoneyCents = number;
type CurrencyCode = "USD";

type UserId = string;
type PhoneNumberId = string;
type TripGroupId = string;
type ReceiptArtifactId = string;
type ExpenseId = string;
type ExpenseItemId = string;
type ExpenseSplitId = string;
type InvoiceId = string;

type TripGroupStatus = "active" | "complete" | "archived";
type ReceiptArtifactStatus = "uploaded" | "ocr_complete" | "parsed" | "needs_review" | "approved";
type ExpenseStatus = "draft" | "ready_for_invoice" | "invoiced";
type InvoiceStatus = "draft" | "sent";

type ParticipantKind = "user" | "phone_contact";

type TripParticipantRef = {
  kind: ParticipantKind;
  id: UserId | PhoneNumberId;
};

type User = {
  id: UserId;
  displayName: string;
  primaryPhoneNumberId: PhoneNumberId;
  createdAt: ISODateString;
};

type PhoneNumber = {
  id: PhoneNumberId;
  e164: string;
  label: string;
  /** If null, this number belongs to someone who has not joined the app yet. */
  userId: UserId | null;
  createdAt: ISODateString;
};

type UserConnection = {
  id: string;
  userId: UserId;
  friendUserId: UserId;
  createdAt: ISODateString;
};

type TripGroup = {
  id: TripGroupId;
  name: string;
  createdByUserId: UserId;
  participantRefs: TripParticipantRef[];
  status: TripGroupStatus;
  createdAt: ISODateString;
  completedAt: ISODateString | null;
};

type ReceiptArtifact = {
  id: ReceiptArtifactId;
  tripGroupId: TripGroupId;
  uploadedByUserId: UserId;
  sourceKind: "camera_photo" | "screenshot" | "manual";
  localUri: string;
  ocrTextPath: string | null;
  parserOutputPath: string | null;
  status: ReceiptArtifactStatus;
  createdAt: ISODateString;
};

type ExpenseItem = {
  id: ExpenseItemId;
  expenseId: ExpenseId;
  name: string;
  quantity: number;
  unitPriceCents: MoneyCents;
  totalPriceCents: MoneyCents;
  currency: CurrencyCode;
  rawLine: string | null;
};

type ExpenseSplit = {
  id: ExpenseSplitId;
  expenseId: ExpenseId;
  expenseItemId: ExpenseItemId | null;
  participantRef: TripParticipantRef;
  amountCents: MoneyCents;
  currency: CurrencyCode;
  reason: "item_share" | "tax_share" | "tip_share" | "manual_adjustment";
};

type Expense = {
  id: ExpenseId;
  tripGroupId: TripGroupId;
  receiptArtifactId: ReceiptArtifactId | null;
  paidBy: TripParticipantRef;
  merchantName: string;
  expenseDate: ISODateString;
  subtotalCents: MoneyCents;
  taxCents: MoneyCents;
  tipCents: MoneyCents;
  totalCents: MoneyCents;
  currency: CurrencyCode;
  status: ExpenseStatus;
  createdAt: ISODateString;
};

type Invoice = {
  id: InvoiceId;
  tripGroupId: TripGroupId;
  expenseIds: ExpenseId[];
  fromParticipantRef: TripParticipantRef;
  toParticipantRef: TripParticipantRef;
  amountCents: MoneyCents;
  currency: CurrencyCode;
  status: InvoiceStatus;
  sentAt: ISODateString | null;
  createdAt: ISODateString;
};

type FakeDatabase = {
  users: User[];
  phoneNumbers: PhoneNumber[];
  userConnections: UserConnection[];
  tripGroups: TripGroup[];
  receiptArtifacts: ReceiptArtifact[];
  expenses: Expense[];
  expenseItems: ExpenseItem[];
  expenseSplits: ExpenseSplit[];
  invoices: Invoice[];
};

const now = "2026-04-25T04:00:00.000Z";
const currency: CurrencyCode = "USD";

export const fakeDatabase: FakeDatabase = {
  users: [
    {
      id: "user_test_1",
      displayName: "TEST_USER_1",
      primaryPhoneNumberId: "phone_user_1",
      createdAt: now,
    },
    {
      id: "user_test_2",
      displayName: "TEST_USER_2",
      primaryPhoneNumberId: "phone_user_2",
      createdAt: now,
    },
    {
      id: "user_test_3",
      displayName: "TEST_USER_3",
      primaryPhoneNumberId: "phone_user_3",
      createdAt: now,
    },
    {
      id: "user_test_4",
      displayName: "TEST_USER_4",
      primaryPhoneNumberId: "phone_user_4",
      createdAt: now,
    },
  ],

  phoneNumbers: [
    {
      id: "phone_user_1",
      e164: "+15550000001",
      label: "TEST_USER_1 mobile",
      userId: "user_test_1",
      createdAt: now,
    },
    {
      id: "phone_user_2",
      e164: "+15550000002",
      label: "TEST_USER_2 mobile",
      userId: "user_test_2",
      createdAt: now,
    },
    {
      id: "phone_user_3",
      e164: "+15550000003",
      label: "TEST_USER_3 mobile",
      userId: "user_test_3",
      createdAt: now,
    },
    {
      id: "phone_user_4",
      e164: "+15550000004",
      label: "TEST_USER_4 mobile",
      userId: "user_test_4",
      createdAt: now,
    },
    {
      id: "phone_guest_1",
      e164: "+15550000005",
      label: "TEST_GUEST_1 mobile",
      userId: null,
      createdAt: now,
    },
    {
      id: "phone_guest_2",
      e164: "+15550000006",
      label: "TEST_GUEST_2 mobile",
      userId: null,
      createdAt: now,
    },
  ],

  userConnections: [
    {
      id: "connection_1_2",
      userId: "user_test_1",
      friendUserId: "user_test_2",
      createdAt: now,
    },
    {
      id: "connection_1_3",
      userId: "user_test_1",
      friendUserId: "user_test_3",
      createdAt: now,
    },
    {
      id: "connection_1_4",
      userId: "user_test_1",
      friendUserId: "user_test_4",
      createdAt: now,
    },
  ],

  tripGroups: [
    {
      id: "trip_group_1",
      name: "TEST_TRIP_GROUP_1",
      createdByUserId: "user_test_1",
      participantRefs: [
        { kind: "user", id: "user_test_1" },
        { kind: "user", id: "user_test_2" },
        { kind: "user", id: "user_test_3" },
        { kind: "phone_contact", id: "phone_guest_1" },
      ],
      status: "active",
      createdAt: now,
      completedAt: null,
    },
  ],

  receiptArtifacts: [
    {
      id: "receipt_artifact_1",
      tripGroupId: "trip_group_1",
      uploadedByUserId: "user_test_1",
      sourceKind: "camera_photo",
      localUri: "file:///mock/receipts/restaurant_receipt_1.jpg",
      ocrTextPath: "data/generated/receipt_restaurant_ocr.txt",
      parserOutputPath: "data/generated/parsed_items.json",
      status: "approved",
      createdAt: now,
    },
  ],

  expenses: [
    {
      id: "expense_1",
      tripGroupId: "trip_group_1",
      receiptArtifactId: "receipt_artifact_1",
      paidBy: { kind: "user", id: "user_test_1" },
      merchantName: "TEST_RESTAURANT",
      expenseDate: "2026-04-25T01:30:00.000Z",
      subtotalCents: 4200,
      taxCents: 372,
      tipCents: 840,
      totalCents: 5412,
      currency,
      status: "ready_for_invoice",
      createdAt: now,
    },
  ],

  expenseItems: [
    {
      id: "expense_item_1",
      expenseId: "expense_1",
      name: "TEST_ITEM_TACOS",
      quantity: 1,
      unitPriceCents: 1200,
      totalPriceCents: 1200,
      currency,
      rawLine: "TEST_ITEM_TACOS 12.00",
    },
    {
      id: "expense_item_2",
      expenseId: "expense_1",
      name: "TEST_ITEM_BURGER",
      quantity: 1,
      unitPriceCents: 1500,
      totalPriceCents: 1500,
      currency,
      rawLine: "TEST_ITEM_BURGER 15.00",
    },
    {
      id: "expense_item_3",
      expenseId: "expense_1",
      name: "TEST_ITEM_APPETIZER",
      quantity: 1,
      unitPriceCents: 900,
      totalPriceCents: 900,
      currency,
      rawLine: "TEST_ITEM_APPETIZER 9.00",
    },
    {
      id: "expense_item_4",
      expenseId: "expense_1",
      name: "TEST_ITEM_DRINKS",
      quantity: 2,
      unitPriceCents: 300,
      totalPriceCents: 600,
      currency,
      rawLine: "TEST_ITEM_DRINKS 2 @ 3.00",
    },
  ],

  expenseSplits: [
    {
      id: "split_1",
      expenseId: "expense_1",
      expenseItemId: "expense_item_1",
      participantRef: { kind: "user", id: "user_test_2" },
      amountCents: 1200,
      currency,
      reason: "item_share",
    },
    {
      id: "split_2",
      expenseId: "expense_1",
      expenseItemId: "expense_item_2",
      participantRef: { kind: "user", id: "user_test_3" },
      amountCents: 1500,
      currency,
      reason: "item_share",
    },
    {
      id: "split_3",
      expenseId: "expense_1",
      expenseItemId: "expense_item_3",
      participantRef: { kind: "phone_contact", id: "phone_guest_1" },
      amountCents: 900,
      currency,
      reason: "item_share",
    },
    {
      id: "split_4",
      expenseId: "expense_1",
      expenseItemId: "expense_item_4",
      participantRef: { kind: "user", id: "user_test_2" },
      amountCents: 300,
      currency,
      reason: "item_share",
    },
    {
      id: "split_5",
      expenseId: "expense_1",
      expenseItemId: "expense_item_4",
      participantRef: { kind: "user", id: "user_test_3" },
      amountCents: 300,
      currency,
      reason: "item_share",
    },
    {
      id: "split_6",
      expenseId: "expense_1",
      expenseItemId: null,
      participantRef: { kind: "user", id: "user_test_2" },
      amountCents: 133,
      currency,
      reason: "tax_share",
    },
    {
      id: "split_7",
      expenseId: "expense_1",
      expenseItemId: null,
      participantRef: { kind: "user", id: "user_test_3" },
      amountCents: 160,
      currency,
      reason: "tax_share",
    },
    {
      id: "split_8",
      expenseId: "expense_1",
      expenseItemId: null,
      participantRef: { kind: "phone_contact", id: "phone_guest_1" },
      amountCents: 79,
      currency,
      reason: "tax_share",
    },
    {
      id: "split_9",
      expenseId: "expense_1",
      expenseItemId: null,
      participantRef: { kind: "user", id: "user_test_2" },
      amountCents: 300,
      currency,
      reason: "tip_share",
    },
    {
      id: "split_10",
      expenseId: "expense_1",
      expenseItemId: null,
      participantRef: { kind: "user", id: "user_test_3" },
      amountCents: 360,
      currency,
      reason: "tip_share",
    },
    {
      id: "split_11",
      expenseId: "expense_1",
      expenseItemId: null,
      participantRef: { kind: "phone_contact", id: "phone_guest_1" },
      amountCents: 180,
      currency,
      reason: "tip_share",
    },
  ],

  invoices: [
    {
      id: "invoice_1",
      tripGroupId: "trip_group_1",
      expenseIds: ["expense_1"],
      fromParticipantRef: { kind: "user", id: "user_test_1" },
      toParticipantRef: { kind: "user", id: "user_test_2" },
      amountCents: 1933,
      currency,
      status: "draft",
      sentAt: null,
      createdAt: now,
    },
    {
      id: "invoice_2",
      tripGroupId: "trip_group_1",
      expenseIds: ["expense_1"],
      fromParticipantRef: { kind: "user", id: "user_test_1" },
      toParticipantRef: { kind: "user", id: "user_test_3" },
      amountCents: 2320,
      currency,
      status: "draft",
      sentAt: null,
      createdAt: now,
    },
    {
      id: "invoice_3",
      tripGroupId: "trip_group_1",
      expenseIds: ["expense_1"],
      fromParticipantRef: { kind: "user", id: "user_test_1" },
      toParticipantRef: { kind: "phone_contact", id: "phone_guest_1" },
      amountCents: 1159,
      currency,
      status: "draft",
      sentAt: null,
      createdAt: now,
    },
  ],
};

export function getTripParticipants(db: FakeDatabase, tripGroupId: TripGroupId) {
  const tripGroup = db.tripGroups.find((trip) => trip.id === tripGroupId);

  if (!tripGroup) {
    throw new Error(`Trip group not found: ${tripGroupId}`);
  }

  return tripGroup.participantRefs.map((participantRef) => {
    if (participantRef.kind === "user") {
      const user = db.users.find((candidate) => candidate.id === participantRef.id);

      if (!user) {
        throw new Error(`Trip participant user not found: ${participantRef.id}`);
      }

      return {
        participantRef,
        displayName: user.displayName,
        phoneNumber: db.phoneNumbers.find((phone) => phone.id === user.primaryPhoneNumberId)?.e164 ?? null,
      };
    }

    const phoneNumber = db.phoneNumbers.find((phone) => phone.id === participantRef.id);

    if (!phoneNumber) {
      throw new Error(`Trip participant phone number not found: ${participantRef.id}`);
    }

    return {
      participantRef,
      displayName: phoneNumber.label,
      phoneNumber: phoneNumber.e164,
    };
  });
}

export function getDraftInvoicesForTrip(db: FakeDatabase, tripGroupId: TripGroupId) {
  return db.invoices.filter((invoice) => invoice.tripGroupId === tripGroupId && invoice.status === "draft");
}

export function formatMoney(cents: MoneyCents, moneyCurrency: CurrencyCode = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: moneyCurrency,
  }).format(cents / 100);
}

function assertMoneyIntegrity(db: FakeDatabase) {
  for (const expense of db.expenses) {
    const itemTotal = db.expenseItems
      .filter((item) => item.expenseId === expense.id)
      .reduce((sum, item) => sum + item.totalPriceCents, 0);

    const expectedTotal = expense.subtotalCents + expense.taxCents + expense.tipCents;
    const splitTotal = db.expenseSplits
      .filter((split) => split.expenseId === expense.id)
      .reduce((sum, split) => sum + split.amountCents, 0);

    if (itemTotal !== expense.subtotalCents) {
      throw new Error(`Expense ${expense.id} item total ${itemTotal} does not match subtotal ${expense.subtotalCents}.`);
    }

    if (expectedTotal !== expense.totalCents) {
      throw new Error(`Expense ${expense.id} expected total ${expectedTotal} does not match total ${expense.totalCents}.`);
    }

    if (splitTotal !== expense.totalCents) {
      throw new Error(`Expense ${expense.id} split total ${splitTotal} does not match total ${expense.totalCents}.`);
    }
  }
}

function printDemo() {
  assertMoneyIntegrity(fakeDatabase);

  const tripGroupId = "trip_group_1";
  const tripGroup = fakeDatabase.tripGroups.find((trip) => trip.id === tripGroupId);

  if (!tripGroup) {
    throw new Error(`Trip group not found: ${tripGroupId}`);
  }

  console.log("Fake database loaded.");
  console.log(`Trip group: ${tripGroup.name}`);
  console.log("Users table:");
  console.table(
    fakeDatabase.users.map((user) => ({
      id: user.id,
      displayName: user.displayName,
      primaryPhoneNumberId: user.primaryPhoneNumberId,
    })),
  );

  console.log("Trip participants:");
  console.table(getTripParticipants(fakeDatabase, tripGroupId));

  console.log("Draft invoices:");
  console.table(
    getDraftInvoicesForTrip(fakeDatabase, tripGroupId).map((invoice) => ({
      invoiceId: invoice.id,
      to: invoice.toParticipantRef.id,
      amountCents: invoice.amountCents,
      currency: invoice.currency,
      displayAmount: formatMoney(invoice.amountCents, invoice.currency),
      status: invoice.status,
    })),
  );
}

printDemo();
