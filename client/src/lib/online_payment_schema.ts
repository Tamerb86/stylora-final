import {
  bigint,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  date,
  index,
  unique,
} from "drizzle-orm/mysql-core";

/**
 * Online Payment System Schema
 * Comprehensive payment solution with deposits, payment links, recurring payments, and installments
 */

// ============================================================================
// PAYMENT LINKS
// ============================================================================

export const paymentLinks = mysqlTable("payment_links", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Link Details
  linkId: varchar("linkId", { length: 50 }).notNull(), // Unique short ID (e.g., "PAY-ABC123")
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  // Amount
  amountType: mysqlEnum("amountType", [
    "fixed",           // Fixed amount
    "variable",        // Customer can enter amount
    "minimum"          // Minimum amount required
  ]).default("fixed").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  minimumAmount: decimal("minimumAmount", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("NOK").notNull(),
  
  // Payment Type
  paymentType: mysqlEnum("paymentType", [
    "one_time",        // Single payment
    "deposit",         // Deposit/down payment
    "recurring",       // Recurring subscription
    "installment"      // Installment plan
  ]).default("one_time").notNull(),
  
  // Deposit Settings
  depositPercentage: decimal("depositPercentage", { precision: 5, scale: 2 }), // e.g., 20.00 for 20%
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }),
  
  // Recurring Settings
  recurringInterval: mysqlEnum("recurringInterval", [
    "daily",
    "weekly",
    "monthly",
    "quarterly",
    "yearly"
  ]),
  recurringCount: int("recurringCount"), // Number of payments (null = infinite)
  
  // Installment Settings
  installmentCount: int("installmentCount"), // Number of installments
  installmentInterval: mysqlEnum("installmentInterval", [
    "weekly",
    "biweekly",
    "monthly"
  ]),
  
  // Payment Methods
  allowedMethods: text("allowedMethods"), // JSON array: ["card", "vipps", "mobilepay"]
  
  // Customer Information
  requireCustomerInfo: boolean("requireCustomerInfo").default(true).notNull(),
  customerId: int("customerId"), // If linked to specific customer
  
  // Linked Resources
  linkedType: mysqlEnum("linkedType", [
    "appointment",
    "order",
    "invoice",
    "membership",
    "custom"
  ]),
  linkedId: int("linkedId"),
  
  // Status
  status: mysqlEnum("status", [
    "active",
    "expired",
    "completed",
    "cancelled"
  ]).default("active").notNull(),
  
  // Expiry
  expiresAt: timestamp("expiresAt"),
  
  // Usage Limits
  maxUses: int("maxUses"), // null = unlimited
  currentUses: int("currentUses").default(0).notNull(),
  
  // Notifications
  sendEmailNotification: boolean("sendEmailNotification").default(true).notNull(),
  sendSmsNotification: boolean("sendSmsNotification").default(false).notNull(),
  
  // Tracking
  createdBy: int("createdBy"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  linkIdIdx: unique("link_id_idx").on(table.linkId),
  statusIdx: index("status_idx").on(table.status),
  customerIdx: index("customer_idx").on(table.customerId),
  linkedIdx: index("linked_idx").on(table.linkedType, table.linkedId),
}));

// ============================================================================
// PAYMENT TRANSACTIONS
// ============================================================================

export const paymentTransactions = mysqlTable("payment_transactions", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Transaction Details
  transactionId: varchar("transactionId", { length: 100 }).notNull(), // Unique transaction ID
  
  // Payment Link
  paymentLinkId: int("paymentLinkId"),
  
  // Customer
  customerId: int("customerId"),
  customerName: varchar("customerName", { length: 255 }),
  customerEmail: varchar("customerEmail", { length: 255 }),
  customerPhone: varchar("customerPhone", { length: 50 }),
  
  // Amount
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("NOK").notNull(),
  
  // Payment Method
  paymentMethod: mysqlEnum("paymentMethod", [
    "card",
    "vipps",
    "mobilepay",
    "bank_transfer",
    "cash"
  ]).notNull(),
  
  // Payment Provider
  provider: mysqlEnum("provider", [
    "stripe",
    "vipps",
    "mobilepay"
  ]),
  providerTransactionId: varchar("providerTransactionId", { length: 255 }),
  providerMetadata: text("providerMetadata"), // JSON
  
  // Transaction Type
  transactionType: mysqlEnum("transactionType", [
    "payment",
    "deposit",
    "recurring_payment",
    "installment_payment",
    "refund",
    "chargeback"
  ]).notNull(),
  
  // Status
  status: mysqlEnum("status", [
    "pending",
    "processing",
    "succeeded",
    "failed",
    "refunded",
    "partially_refunded",
    "cancelled"
  ]).default("pending").notNull(),
  
  // Fees
  fee: decimal("fee", { precision: 10, scale: 2 }).default("0.00").notNull(),
  netAmount: decimal("netAmount", { precision: 10, scale: 2 }).notNull(),
  
  // Refund Information
  refundedAmount: decimal("refundedAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  refundReason: text("refundReason"),
  
  // Linked Resources
  linkedType: mysqlEnum("linkedType", [
    "appointment",
    "order",
    "invoice",
    "membership",
    "subscription",
    "installment_plan"
  ]),
  linkedId: int("linkedId"),
  
  // Timestamps
  paidAt: timestamp("paidAt"),
  refundedAt: timestamp("refundedAt"),
  
  // Notes
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  transactionIdIdx: unique("transaction_id_idx").on(table.transactionId),
  paymentLinkIdx: index("payment_link_idx").on(table.paymentLinkId),
  customerIdx: index("customer_idx").on(table.customerId),
  statusIdx: index("status_idx").on(table.status),
  linkedIdx: index("linked_idx").on(table.linkedType, table.linkedId),
  providerIdx: index("provider_idx").on(table.provider, table.providerTransactionId),
}));

// ============================================================================
// RECURRING SUBSCRIPTIONS
// ============================================================================

export const recurringSubscriptions = mysqlTable("recurring_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Subscription Details
  subscriptionId: varchar("subscriptionId", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Customer
  customerId: int("customerId").notNull(),
  
  // Amount
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("NOK").notNull(),
  
  // Billing Cycle
  billingInterval: mysqlEnum("billingInterval", [
    "daily",
    "weekly",
    "monthly",
    "quarterly",
    "yearly"
  ]).notNull(),
  billingDay: int("billingDay"), // Day of month (1-31) or week (1-7)
  
  // Payment Method
  paymentMethod: mysqlEnum("paymentMethod", [
    "card",
    "vipps",
    "mobilepay"
  ]).notNull(),
  paymentMethodId: varchar("paymentMethodId", { length: 255 }), // Stripe payment method ID
  
  // Subscription Period
  startDate: date("startDate").notNull(),
  endDate: date("endDate"), // null = no end date
  nextBillingDate: date("nextBillingDate").notNull(),
  
  // Trial Period
  trialEndDate: date("trialEndDate"),
  
  // Status
  status: mysqlEnum("status", [
    "active",
    "past_due",
    "cancelled",
    "paused",
    "expired"
  ]).default("active").notNull(),
  
  // Cancellation
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
  cancelledAt: timestamp("cancelledAt"),
  cancellationReason: text("cancellationReason"),
  
  // Payment History
  totalPayments: int("totalPayments").default(0).notNull(),
  successfulPayments: int("successfulPayments").default(0).notNull(),
  failedPayments: int("failedPayments").default(0).notNull(),
  lastPaymentDate: date("lastPaymentDate"),
  lastPaymentStatus: varchar("lastPaymentStatus", { length: 50 }),
  
  // Linked Resources
  linkedType: mysqlEnum("linkedType", [
    "membership",
    "service_plan",
    "custom"
  ]),
  linkedId: int("linkedId"),
  
  // Provider
  provider: mysqlEnum("provider", [
    "stripe",
    "vipps",
    "mobilepay"
  ]),
  providerSubscriptionId: varchar("providerSubscriptionId", { length: 255 }),
  
  // Notifications
  sendPaymentReminder: boolean("sendPaymentReminder").default(true).notNull(),
  reminderDaysBefore: int("reminderDaysBefore").default(3).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  subscriptionIdIdx: unique("subscription_id_idx").on(table.subscriptionId),
  customerIdx: index("customer_idx").on(table.customerId),
  statusIdx: index("status_idx").on(table.status),
  nextBillingIdx: index("next_billing_idx").on(table.nextBillingDate),
  linkedIdx: index("linked_idx").on(table.linkedType, table.linkedId),
}));

// ============================================================================
// INSTALLMENT PLANS
// ============================================================================

export const installmentPlans = mysqlTable("installment_plans", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Plan Details
  planId: varchar("planId", { length: 100 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Customer
  customerId: int("customerId").notNull(),
  
  // Total Amount
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  downPayment: decimal("downPayment", { precision: 10, scale: 2 }).default("0.00").notNull(),
  remainingAmount: decimal("remainingAmount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("NOK").notNull(),
  
  // Installment Settings
  numberOfInstallments: int("numberOfInstallments").notNull(),
  installmentAmount: decimal("installmentAmount", { precision: 10, scale: 2 }).notNull(),
  installmentInterval: mysqlEnum("installmentInterval", [
    "weekly",
    "biweekly",
    "monthly"
  ]).notNull(),
  
  // Dates
  startDate: date("startDate").notNull(),
  nextPaymentDate: date("nextPaymentDate").notNull(),
  
  // Payment Method
  paymentMethod: mysqlEnum("paymentMethod", [
    "card",
    "vipps",
    "mobilepay"
  ]).notNull(),
  paymentMethodId: varchar("paymentMethodId", { length: 255 }),
  
  // Status
  status: mysqlEnum("status", [
    "active",
    "completed",
    "defaulted",
    "cancelled"
  ]).default("active").notNull(),
  
  // Payment Tracking
  paidInstallments: int("paidInstallments").default(0).notNull(),
  missedPayments: int("missedPayments").default(0).notNull(),
  lastPaymentDate: date("lastPaymentDate"),
  
  // Late Fees
  lateFeeAmount: decimal("lateFeeAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  lateFeePercentage: decimal("lateFeePercentage", { precision: 5, scale: 2 }),
  
  // Linked Resources
  linkedType: mysqlEnum("linkedType", [
    "order",
    "invoice",
    "service",
    "custom"
  ]),
  linkedId: int("linkedId"),
  
  // Provider
  provider: mysqlEnum("provider", [
    "stripe",
    "vipps",
    "mobilepay"
  ]),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  planIdIdx: unique("plan_id_idx").on(table.planId),
  customerIdx: index("customer_idx").on(table.customerId),
  statusIdx: index("status_idx").on(table.status),
  nextPaymentIdx: index("next_payment_idx").on(table.nextPaymentDate),
  linkedIdx: index("linked_idx").on(table.linkedType, table.linkedId),
}));

// ============================================================================
// INSTALLMENT PAYMENTS
// ============================================================================

export const installmentPayments = mysqlTable("installment_payments", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Plan Reference
  installmentPlanId: int("installmentPlanId").notNull(),
  
  // Payment Details
  installmentNumber: int("installmentNumber").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  lateFee: decimal("lateFee", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  
  // Dates
  dueDate: date("dueDate").notNull(),
  paidDate: date("paidDate"),
  
  // Status
  status: mysqlEnum("status", [
    "pending",
    "paid",
    "overdue",
    "failed",
    "waived"
  ]).default("pending").notNull(),
  
  // Transaction Reference
  transactionId: int("transactionId"),
  
  // Attempts
  paymentAttempts: int("paymentAttempts").default(0).notNull(),
  lastAttemptDate: timestamp("lastAttemptDate"),
  failureReason: text("failureReason"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  planIdx: index("plan_idx").on(table.installmentPlanId),
  statusIdx: index("status_idx").on(table.status),
  dueDateIdx: index("due_date_idx").on(table.dueDate),
  transactionIdx: index("transaction_idx").on(table.transactionId),
}));

// ============================================================================
// PAYMENT METHODS (SAVED)
// ============================================================================

export const savedPaymentMethods = mysqlTable("saved_payment_methods", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Customer
  customerId: int("customerId").notNull(),
  
  // Payment Method Details
  type: mysqlEnum("type", [
    "card",
    "vipps",
    "mobilepay",
    "bank_account"
  ]).notNull(),
  
  // Provider
  provider: mysqlEnum("provider", [
    "stripe",
    "vipps",
    "mobilepay"
  ]).notNull(),
  providerPaymentMethodId: varchar("providerPaymentMethodId", { length: 255 }).notNull(),
  
  // Card Details (if type = card)
  cardBrand: varchar("cardBrand", { length: 50 }), // visa, mastercard, etc.
  cardLast4: varchar("cardLast4", { length: 4 }),
  cardExpMonth: int("cardExpMonth"),
  cardExpYear: int("cardExpYear"),
  
  // Default
  isDefault: boolean("isDefault").default(false).notNull(),
  
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  customerIdx: index("customer_idx").on(table.customerId),
  providerIdx: index("provider_idx").on(table.provider, table.providerPaymentMethodId),
}));

// ============================================================================
// DEPOSITS
// ============================================================================

export const deposits = mysqlTable("deposits", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Deposit Details
  depositId: varchar("depositId", { length: 100 }).notNull(),
  
  // Customer
  customerId: int("customerId").notNull(),
  
  // Amounts
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }).notNull(),
  depositPercentage: decimal("depositPercentage", { precision: 5, scale: 2 }),
  remainingAmount: decimal("remainingAmount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("NOK").notNull(),
  
  // Payment
  depositPaid: boolean("depositPaid").default(false).notNull(),
  depositPaidAt: timestamp("depositPaidAt"),
  depositTransactionId: int("depositTransactionId"),
  
  // Remaining Payment
  remainingPaid: boolean("remainingPaid").default(false).notNull(),
  remainingPaidAt: timestamp("remainingPaidAt"),
  remainingTransactionId: int("remainingTransactionId"),
  
  // Due Date
  remainingDueDate: date("remainingDueDate"),
  
  // Status
  status: mysqlEnum("status", [
    "pending_deposit",
    "deposit_paid",
    "completed",
    "refunded",
    "expired"
  ]).default("pending_deposit").notNull(),
  
  // Linked Resources
  linkedType: mysqlEnum("linkedType", [
    "appointment",
    "order",
    "service"
  ]).notNull(),
  linkedId: int("linkedId").notNull(),
  
  // Refund
  refundedAmount: decimal("refundedAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  refundReason: text("refundReason"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  depositIdIdx: unique("deposit_id_idx").on(table.depositId),
  customerIdx: index("customer_idx").on(table.customerId),
  statusIdx: index("status_idx").on(table.status),
  linkedIdx: index("linked_idx").on(table.linkedType, table.linkedId),
}));

// ============================================================================
// EXPORTS
// ============================================================================

export type PaymentLink = typeof paymentLinks.$inferSelect;
export type NewPaymentLink = typeof paymentLinks.$inferInsert;

export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
export type NewPaymentTransaction = typeof paymentTransactions.$inferInsert;

export type RecurringSubscription = typeof recurringSubscriptions.$inferSelect;
export type NewRecurringSubscription = typeof recurringSubscriptions.$inferInsert;

export type InstallmentPlan = typeof installmentPlans.$inferSelect;
export type NewInstallmentPlan = typeof installmentPlans.$inferInsert;

export type InstallmentPayment = typeof installmentPayments.$inferSelect;
export type NewInstallmentPayment = typeof installmentPayments.$inferInsert;

export type SavedPaymentMethod = typeof savedPaymentMethods.$inferSelect;
export type NewSavedPaymentMethod = typeof savedPaymentMethods.$inferInsert;

export type Deposit = typeof deposits.$inferSelect;
export type NewDeposit = typeof deposits.$inferInsert;
