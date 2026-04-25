/**
 * Fake in-memory database model for the expense splitter product layer.
 *
 * This is NOT a real database adapter yet. It is a typed seed model that lets us
 * build product flows before choosing storage/auth/payments. V1 creates invoices
 * only; it does not monitor or process payment fulfillment.
 */

type ISODateString = string;
type MoneyCents = number;

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
  rawLine: string | null;
};

type ExpenseSplit = {
  id: ExpenseSplitId;
  expenseId: ExpenseId;
  expenseItemId: ExpenseItemId | null;
  participantRef: TripParticipantRef;
  amountCents: MoneyCents;
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
      rawLine: "TEST_ITEM_TACOS 12.00",
    },
    {
      id: "expense_item_2",
      expenseId: "expense_1",
      name: "TEST_ITEM_BURGER",
      quantity: 1,
      unitPriceCents: 1500,
      totalPriceCents: 1500,
      rawLine: "TEST_ITEM_BURGER 15.00",
    },
    {
      id: "expense_item_3",
      expenseId: "expense_1",
      name: "TEST_ITEM_APPETIZER",
      quantity: 1,
      unitPriceCents: 900,
      totalPriceCents: 900,
      rawLine: "TEST_ITEM_APPETIZER 9.00",
    },
    {
      id: "expense_item_4",
      expenseId: "expense_1",
      name: "TEST_ITEM_DRINKS",
      quantity: 2,
      unitPriceCents: 300,
      totalPriceCents: 600,
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
      reason: "item_share",
    },
    {
      id: "split_2",
      expenseId: "expense_1",
      expenseItemId: "expense_item_2",
      participantRef: { kind: "user", id: "user_test_3" },
      amountCents: 1500,
      reason: "item_share",
    },
    {
      id: "split_3",
      expenseId: "expense_1",
      expenseItemId: "expense_item_3",
      participantRef: { kind: "phone_contact", id: "phone_guest_1" },
      amountCents: 900,
      reason: "item_share",
    },
    {
      id: "split_4",
      expenseId: "expense_1",
      expenseItemId: "expense_item_4",
      participantRef: { kind: "user", id: "user_test_2" },
      amountCents: 300,
      reason: "item_share",
    },
    {
      id: "split_5",
      expenseId: "expense_1",
      expenseItemId: "expense_item_4",
      participantRef: { kind: "user", id: "user_test_3" },
      amountCents: 300,
      reason: "item_share",
    },
    {
      id: "split_6",
      expenseId: "expense_1",
      expenseItemId: null,
      participantRef: { kind: "user", id: "user_test_2" },
      amountCents: 404,
      reason: "tax_share",
    },
    {
      id: "split_7",
      expenseId: "expense_1",
      expenseItemId: null,
      participantRef: { kind: "user", id: "user_test_3" },
      amountCents: 473,
      reason: "tax_share",
    },
    {
      id: "split_8",
      expenseId: "expense_1",
      expenseItemId: null,
      participantRef: { kind: "phone_contact", id: "phone_guest_1" },
      amountCents: 335,
      reason: "tax_share",
    },
  ],

  invoices: [
    {
      id: "invoice_1",
      tripGroupId: "trip_group_1",
      expenseIds: ["expense_1"],
      fromParticipantRef: { kind: "user", id: "user_test_1" },
      toParticipantRef: { kind: "user", id: "user_test_2" },
      amountCents: 1904,
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
      amountCents: 2273,
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
      amountCents: 1235,
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

function formatMoney(cents: MoneyCents) {
  return `$${(cents / 100).toFixed(2)}`;
}

function printDemo() {
  const tripGroupId = "trip_group_1";
  const tripGroup = fakeDatabase.tripGroups.find((trip) => trip.id === tripGroupId);

  if (!tripGroup) {
    throw new Error(`Trip group not found: ${tripGroupId}`);
  }

  console.log("Fake database loaded.");
  console.log(`Trip group: ${tripGroup.name}`);
  console.table(getTripParticipants(fakeDatabase, tripGroupId));

  console.log("Draft invoices:");
  console.table(
    getDraftInvoicesForTrip(fakeDatabase, tripGroupId).map((invoice) => ({
      invoiceId: invoice.id,
      to: invoice.toParticipantRef.id,
      amount: formatMoney(invoice.amountCents),
      status: invoice.status,
    })),
  );
}

printDemo();
