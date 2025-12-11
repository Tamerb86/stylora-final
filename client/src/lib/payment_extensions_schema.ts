import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  date,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

/**
 * Payment System Extensions
 * 
 * This file extends the existing payment system with:
 * 1. Payment Links (shareable payment URLs)
 * 2. Recurring Subscriptions (memberships, monthly services)
 * 3. Installment Plans (payment plans)
 * 4. Deposits (down payments)
 * 
 * These tables integrate with existing:
 * - payments table
 * - paymentProviders table
 * - customers table
 * - orders table
 * - appointments table
 */

// ============================================================================
// PAYMENT LINKS
// ============================================================================

export const paymentLinks = mysqlTable("paymentLinks", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Link Info
  linkId: varchar("linkId", { length: 50 }).notNull().unique(), // e.g., "PAY-ABC123"
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  
  // Amount Configuration
  amountType: mysqlEnum("amountType", ["fixed", "variable", "minimum"]).default("fixed").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }), // Fixed or minimum amount
  currency: varchar("currency", { length: 3 }).default("NOK").notNull(),
  
  // Payment Type
  paymentType: mysqlEnum("paymentType", ["one_time", "deposit", "recurring", "installment"]).default("one_time").notNull(),
  
  // Deposit Settings (if paymentType = deposit)
  depositPercentage: decimal("depositPercentage", { precision: 5, scale: 2 }), // e.g., 20.00 for 20%
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }),
  
  // Recurring Settings (if paymentType = recurring)
  recurringInterval: mysqlEnum("recurringInterval", ["daily", "weekly", "monthly", "quarterly", "yearly"]),
  recurringCount: int("recurringCount"), // Number of payments, null = indefinite
  
  // Installment Settings (if paymentType = installment)
  installmentCount: int("installmentCount"),
  installmentInterval: mysqlEnum("installmentInterval", ["weekly", "biweekly", "monthly"]),
  
  // Payment Methods
  allowedMethods: json("allowedMethods").$type<string[]>(), // ["card", "vipps", "mobilepay"]
  
  // Customer Info
  requireCustomerInfo: boolean("requireCustomerInfo").default(true).notNull(),
  customerId: int("customerId"), // Optional: specific customer
  
  // Linked Entity
  linkedType: mysqlEnum("linkedType", ["appointment", "order", "invoice", "membership", "custom"]),
  linkedId: int("linkedId"),
  
  // Link Settings
  expiresAt: timestamp("expiresAt"),
  maxUses: int("maxUses"), // Maximum number of times link can be used
  currentUses: int("currentUses").default(0).notNull(),
  
  // Notifications
  sendEmailNotification: boolean("sendEmailNotification").default(true).notNull(),
  sendSmsNotification: boolean("sendSmsNotification").default(false).notNull(),
  
  // Status
  status: mysqlEnum("status", ["active", "expired", "completed", "cancelled"]).default("active").notNull(),
  
  // Metadata
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantLinksIdx: index("tenant_links_idx").on(table.tenantId, table.status),
  linkIdIdx: uniqueIndex("link_id_idx").on(table.linkId),
  customerLinksIdx: index("customer_links_idx").on(table.customerId),
  linkedEntityIdx: index("linked_entity_idx").on(table.linkedType, table.linkedId),
}));

// ============================================================================
// RECURRING SUBSCRIPTIONS
// ============================================================================

export const recurringSubscriptions = mysqlTable("recurringSubscriptions", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Subscription Info
  subscriptionId: varchar("subscriptionId", { length: 50 }).notNull().unique(), // e.g., "SUB-XYZ789"
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  
  // Customer
  customerId: int("customerId").notNull(),
  
  // Billing
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("NOK").notNull(),
  billingInterval: mysqlEnum("billingInterval", ["daily", "weekly", "monthly", "quarterly", "yearly"]).notNull(),
  billingDay: int("billingDay"), // Day of month (1-31) for monthly/quarterly/yearly
  
  // Schedule
  startDate: date("startDate").notNull(),
  endDate: date("endDate"), // null = no end date
  nextBillingDate: date("nextBillingDate").notNull(),
  trialEndDate: date("trialEndDate"),
  
  // Payment Method
  paymentMethod: mysqlEnum("paymentMethod", ["card", "vipps", "mobilepay"]).notNull(),
  paymentMethodId: varchar("paymentMethodId", { length: 255 }), // Saved payment method ID
  
  // Linked Entity
  linkedType: mysqlEnum("linkedType", ["membership", "service_plan", "custom"]),
  linkedId: int("linkedId"),
  
  // Provider Integration
  provider: mysqlEnum("provider", ["stripe", "vipps", "mobilepay"]).notNull(),
  providerSubscriptionId: varchar("providerSubscriptionId", { length: 255 }), // Provider's subscription ID
  providerMetadata: json("providerMetadata"),
  
  // Status
  status: mysqlEnum("status", ["active", "past_due", "cancelled", "paused", "expired"]).default("active").notNull(),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
  cancelledAt: timestamp("cancelledAt"),
  cancellationReason: text("cancellationReason"),
  
  // Statistics
  totalPayments: int("totalPayments").default(0).notNull(),
  successfulPayments: int("successfulPayments").default(0).notNull(),
  failedPayments: int("failedPayments").default(0).notNull(),
  totalRevenue: decimal("totalRevenue", { precision: 10, scale: 2 }).default("0.00").notNull(),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantSubscriptionsIdx: index("tenant_subscriptions_idx").on(table.tenantId, table.status),
  subscriptionIdIdx: uniqueIndex("subscription_id_idx").on(table.subscriptionId),
  customerSubscriptionsIdx: index("customer_subscriptions_idx").on(table.customerId),
  nextBillingIdx: index("next_billing_idx").on(table.nextBillingDate, table.status),
  providerSubscriptionIdx: index("provider_subscription_idx").on(table.providerSubscriptionId),
}));

// ============================================================================
// INSTALLMENT PLANS
// ============================================================================

export const installmentPlans = mysqlTable("installmentPlans", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Plan Info
  planId: varchar("planId", { length: 50 }).notNull().unique(), // e.g., "INST-ABC123"
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  
  // Customer
  customerId: int("customerId").notNull(),
  
  // Amounts
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  downPayment: decimal("downPayment", { precision: 10, scale: 2 }).default("0.00").notNull(),
  remainingAmount: decimal("remainingAmount", { precision: 10, scale: 2 }).notNull(),
  numberOfInstallments: int("numberOfInstallments").notNull(),
  installmentAmount: decimal("installmentAmount", { precision: 10, scale: 2 }).notNull(),
  
  // Schedule
  installmentInterval: mysqlEnum("installmentInterval", ["weekly", "biweekly", "monthly"]).notNull(),
  startDate: date("startDate").notNull(),
  nextPaymentDate: date("nextPaymentDate").notNull(),
  
  // Payment Method
  paymentMethod: mysqlEnum("paymentMethod", ["card", "vipps", "mobilepay"]).notNull(),
  paymentMethodId: varchar("paymentMethodId", { length: 255 }),
  
  // Late Fees
  lateFeePercentage: decimal("lateFeePercentage", { precision: 5, scale: 2 }), // e.g., 5.00 for 5%
  totalLateFees: decimal("totalLateFees", { precision: 10, scale: 2 }).default("0.00").notNull(),
  
  // Linked Entity
  linkedType: mysqlEnum("linkedType", ["order", "invoice", "service", "custom"]),
  linkedId: int("linkedId"),
  
  // Provider Integration
  provider: mysqlEnum("provider", ["stripe", "vipps", "mobilepay"]).notNull(),
  providerPlanId: varchar("providerPlanId", { length: 255 }),
  
  // Status
  status: mysqlEnum("status", ["active", "completed", "defaulted", "cancelled"]).default("active").notNull(),
  
  // Progress
  paidInstallments: int("paidInstallments").default(0).notNull(),
  missedPayments: int("missedPayments").default(0).notNull(),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
}, (table) => ({
  tenantPlansIdx: index("tenant_plans_idx").on(table.tenantId, table.status),
  planIdIdx: uniqueIndex("plan_id_idx").on(table.planId),
  customerPlansIdx: index("customer_plans_idx").on(table.customerId),
  nextPaymentIdx: index("next_payment_idx").on(table.nextPaymentDate, table.status),
}));

// ============================================================================
// INSTALLMENT PAYMENTS
// ============================================================================

export const installmentPayments = mysqlTable("installmentPayments", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Plan Reference
  installmentPlanId: int("installmentPlanId").notNull(),
  
  // Installment Info
  installmentNumber: int("installmentNumber").notNull(), // 1, 2, 3, ...
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  lateFee: decimal("lateFee", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(), // amount + lateFee
  
  // Schedule
  dueDate: date("dueDate").notNull(),
  
  // Payment Reference
  paymentId: int("paymentId"), // Reference to payments table when paid
  
  // Status
  status: mysqlEnum("status", ["pending", "paid", "overdue", "failed", "waived"]).default("pending").notNull(),
  
  // Dates
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  planPaymentsIdx: index("plan_payments_idx").on(table.installmentPlanId),
  tenantPaymentsIdx: index("tenant_payments_idx").on(table.tenantId, table.status),
  dueDateIdx: index("due_date_idx").on(table.dueDate, table.status),
  paymentRefIdx: index("payment_ref_idx").on(table.paymentId),
}));

// ============================================================================
// DEPOSITS
// ============================================================================

export const deposits = mysqlTable("deposits", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Deposit Info
  depositId: varchar("depositId", { length: 50 }).notNull().unique(), // e.g., "DEP-ABC123"
  
  // Customer
  customerId: int("customerId").notNull(),
  
  // Amounts
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }).notNull(),
  depositPercentage: decimal("depositPercentage", { precision: 5, scale: 2 }), // e.g., 20.00 for 20%
  remainingAmount: decimal("remainingAmount", { precision: 10, scale: 2 }).notNull(),
  
  // Linked Entity
  linkedType: mysqlEnum("linkedType", ["appointment", "order", "service"]).notNull(),
  linkedId: int("linkedId").notNull(),
  
  // Deposit Payment
  depositPaid: boolean("depositPaid").default(false).notNull(),
  depositPaidAt: timestamp("depositPaidAt"),
  depositTransactionId: int("depositTransactionId"), // Reference to payments table
  
  // Remaining Payment
  remainingPaid: boolean("remainingPaid").default(false).notNull(),
  remainingPaidAt: timestamp("remainingPaidAt"),
  remainingTransactionId: int("remainingTransactionId"), // Reference to payments table
  remainingDueDate: date("remainingDueDate"),
  
  // Status
  status: mysqlEnum("status", ["pending_deposit", "deposit_paid", "completed", "refunded", "expired"]).default("pending_deposit").notNull(),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantDepositsIdx: index("tenant_deposits_idx").on(table.tenantId, table.status),
  depositIdIdx: uniqueIndex("deposit_id_idx").on(table.depositId),
  customerDepositsIdx: index("customer_deposits_idx").on(table.customerId),
  linkedEntityIdx: index("linked_entity_idx").on(table.linkedType, table.linkedId),
  depositTransactionIdx: index("deposit_transaction_idx").on(table.depositTransactionId),
  remainingTransactionIdx: index("remaining_transaction_idx").on(table.remainingTransactionId),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PaymentLink = typeof paymentLinks.$inferSelect;
export type InsertPaymentLink = typeof paymentLinks.$inferInsert;

export type RecurringSubscription = typeof recurringSubscriptions.$inferSelect;
export type InsertRecurringSubscription = typeof recurringSubscriptions.$inferInsert;

export type InstallmentPlan = typeof installmentPlans.$inferSelect;
export type InsertInstallmentPlan = typeof installmentPlans.$inferInsert;

export type InstallmentPayment = typeof installmentPayments.$inferSelect;
export type InsertInstallmentPayment = typeof installmentPayments.$inferInsert;

export type Deposit = typeof deposits.$inferSelect;
export type InsertDeposit = typeof deposits.$inferInsert;
