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
 * Commission System Schema
 * Automatic commission calculation for employees based on sales and services
 */

// ============================================================================
// COMMISSION RULES
// ============================================================================

export const commissionRules = mysqlTable("commission_rules", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Rule Details
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Rule Type
  ruleType: mysqlEnum("ruleType", [
    "percentage",        // Fixed percentage of sale
    "tiered",           // Different percentages for different tiers
    "fixed_amount",     // Fixed amount per sale
    "product_based",    // Different rates per product/category
    "service_based",    // Different rates per service
    "target_based"      // Bonus when target is reached
  ]).notNull(),
  
  // Applies To
  appliesTo: mysqlEnum("appliesTo", [
    "all_sales",        // All sales
    "services_only",    // Only services
    "products_only",    // Only products
    "specific_category", // Specific category
    "specific_product", // Specific product
    "specific_service"  // Specific service
  ]).default("all_sales").notNull(),
  
  // Target (for category/product/service specific)
  targetId: int("targetId"), // Category/Product/Service ID
  
  // Commission Rates
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }), // Percentage (e.g., 15.00 for 15%)
  fixedAmount: decimal("fixedAmount", { precision: 10, scale: 2 }), // Fixed amount per sale
  
  // Tiered Rates (JSON for flexibility)
  tieredRates: text("tieredRates"), // JSON: [{ min: 0, max: 10000, rate: 10 }, { min: 10001, max: 50000, rate: 15 }]
  
  // Minimum Sale Amount
  minimumSaleAmount: decimal("minimumSaleAmount", { precision: 10, scale: 2 }).default("0.00"),
  
  // Employee Assignment
  employeeId: int("employeeId"), // If null, applies to all employees
  
  // Priority (higher number = higher priority)
  priority: int("priority").default(0).notNull(),
  
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  
  // Validity Period
  validFrom: date("validFrom"),
  validTo: date("validTo"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  employeeIdx: index("employee_idx").on(table.employeeId),
  activeIdx: index("active_idx").on(table.isActive),
  ruleTypeIdx: index("rule_type_idx").on(table.ruleType),
}));

// ============================================================================
// COMMISSION CALCULATIONS
// ============================================================================

export const commissionCalculations = mysqlTable("commission_calculations", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Employee
  employeeId: int("employeeId").notNull(),
  
  // Source Transaction
  sourceType: mysqlEnum("sourceType", [
    "order",            // From order/sale
    "appointment",      // From appointment
    "product_sale",     // Product sale
    "service_sale",     // Service sale
    "manual"            // Manual adjustment
  ]).notNull(),
  sourceId: int("sourceId"), // Order/Appointment ID
  
  // Sale Details
  saleAmount: decimal("saleAmount", { precision: 10, scale: 2 }).notNull(),
  saleDate: date("saleDate").notNull(),
  
  // Product/Service Details
  productId: int("productId"),
  serviceId: int("serviceId"),
  categoryId: int("categoryId"),
  
  // Commission Rule Applied
  commissionRuleId: int("commissionRuleId"),
  ruleType: varchar("ruleType", { length: 50 }),
  
  // Commission Calculation
  commissionRate: decimal("commissionRate", { precision: 5, scale: 2 }), // Percentage applied
  commissionAmount: decimal("commissionAmount", { precision: 10, scale: 2 }).notNull(),
  
  // Status
  status: mysqlEnum("status", [
    "pending",          // Calculated but not approved
    "approved",         // Approved for payment
    "paid",             // Already paid
    "cancelled"         // Cancelled
  ]).default("pending").notNull(),
  
  // Payment Details
  paymentPeriod: varchar("paymentPeriod", { length: 20 }), // e.g., "2025-12", "2025-W50"
  paidAt: timestamp("paidAt"),
  paidBy: int("paidBy"), // User ID who processed payment
  
  // Notes
  notes: text("notes"),
  calculationDetails: text("calculationDetails"), // JSON with detailed breakdown
  
  // Tracking
  calculatedAt: timestamp("calculatedAt").defaultNow().notNull(),
  approvedAt: timestamp("approvedAt"),
  approvedBy: int("approvedBy"), // User ID who approved
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  employeeIdx: index("employee_idx").on(table.employeeId),
  statusIdx: index("status_idx").on(table.status),
  saleDateIdx: index("sale_date_idx").on(table.saleDate),
  paymentPeriodIdx: index("payment_period_idx").on(table.paymentPeriod),
  sourceIdx: index("source_idx").on(table.sourceType, table.sourceId),
}));

// ============================================================================
// COMMISSION PAYMENTS
// ============================================================================

export const commissionPayments = mysqlTable("commission_payments", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Payment Details
  paymentNumber: varchar("paymentNumber", { length: 50 }).notNull(), // CP-2025-12-001
  paymentPeriod: varchar("paymentPeriod", { length: 20 }).notNull(), // e.g., "2025-12"
  
  // Employee
  employeeId: int("employeeId").notNull(),
  
  // Amounts
  totalSales: decimal("totalSales", { precision: 10, scale: 2 }).notNull(),
  totalCommission: decimal("totalCommission", { precision: 10, scale: 2 }).notNull(),
  deductions: decimal("deductions", { precision: 10, scale: 2 }).default("0.00").notNull(),
  netPayment: decimal("netPayment", { precision: 10, scale: 2 }).notNull(),
  
  // Tax
  taxAmount: decimal("taxAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  
  // Payment Method
  paymentMethod: mysqlEnum("paymentMethod", [
    "bank_transfer",
    "cash",
    "check",
    "payroll"
  ]),
  
  // Status
  status: mysqlEnum("status", [
    "draft",
    "pending",
    "paid",
    "cancelled"
  ]).default("draft").notNull(),
  
  // Payment Date
  paymentDate: date("paymentDate"),
  
  // Bank Details (if bank transfer)
  bankAccount: varchar("bankAccount", { length: 100 }),
  transactionReference: varchar("transactionReference", { length: 100 }),
  
  // Notes
  notes: text("notes"),
  
  // Tracking
  createdBy: int("createdBy"),
  paidBy: int("paidBy"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  employeeIdx: index("employee_idx").on(table.employeeId),
  statusIdx: index("status_idx").on(table.status),
  paymentPeriodIdx: index("payment_period_idx").on(table.paymentPeriod),
  paymentNumberIdx: unique("payment_number_idx").on(table.tenantId, table.paymentNumber),
}));

// ============================================================================
// COMMISSION TARGETS
// ============================================================================

export const commissionTargets = mysqlTable("commission_targets", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Target Details
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Employee
  employeeId: int("employeeId"), // If null, applies to all employees
  
  // Target Period
  periodType: mysqlEnum("periodType", [
    "daily",
    "weekly",
    "monthly",
    "quarterly",
    "yearly",
    "custom"
  ]).notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  
  // Target Metrics
  targetType: mysqlEnum("targetType", [
    "sales_amount",     // Total sales amount
    "sales_count",      // Number of sales
    "service_count",    // Number of services
    "product_count",    // Number of products sold
    "customer_count",   // Number of customers served
    "average_sale"      // Average sale amount
  ]).notNull(),
  
  targetValue: decimal("targetValue", { precision: 10, scale: 2 }).notNull(),
  
  // Bonus
  bonusType: mysqlEnum("bonusType", [
    "fixed_amount",     // Fixed bonus amount
    "percentage",       // Percentage of sales
    "tiered"           // Different bonuses for different achievement levels
  ]).notNull(),
  
  bonusAmount: decimal("bonusAmount", { precision: 10, scale: 2 }),
  bonusPercentage: decimal("bonusPercentage", { precision: 5, scale: 2 }),
  
  // Tiered Bonuses (JSON)
  tieredBonuses: text("tieredBonuses"), // JSON: [{ threshold: 80, bonus: 1000 }, { threshold: 100, bonus: 2000 }]
  
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  employeeIdx: index("employee_idx").on(table.employeeId),
  activeIdx: index("active_idx").on(table.isActive),
  periodIdx: index("period_idx").on(table.startDate, table.endDate),
}));

// ============================================================================
// COMMISSION ADJUSTMENTS
// ============================================================================

export const commissionAdjustments = mysqlTable("commission_adjustments", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Employee
  employeeId: int("employeeId").notNull(),
  
  // Adjustment Details
  adjustmentType: mysqlEnum("adjustmentType", [
    "bonus",            // Additional bonus
    "deduction",        // Deduction
    "correction",       // Correction of error
    "advance",          // Advance payment
    "refund"           // Refund to employee
  ]).notNull(),
  
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  
  // Period
  paymentPeriod: varchar("paymentPeriod", { length: 20 }).notNull(),
  
  // Reason
  reason: text("reason").notNull(),
  notes: text("notes"),
  
  // Status
  status: mysqlEnum("status", [
    "pending",
    "approved",
    "paid",
    "cancelled"
  ]).default("pending").notNull(),
  
  // Approval
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  
  // Tracking
  createdBy: int("createdBy").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  employeeIdx: index("employee_idx").on(table.employeeId),
  statusIdx: index("status_idx").on(table.status),
  paymentPeriodIdx: index("payment_period_idx").on(table.paymentPeriod),
}));

// ============================================================================
// EMPLOYEE COMMISSION SETTINGS
// ============================================================================

export const employeeCommissionSettings = mysqlTable("employee_commission_settings", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  employeeId: int("employeeId").notNull(),
  
  // Commission Enabled
  commissionEnabled: boolean("commissionEnabled").default(true).notNull(),
  
  // Default Commission Rate (if no specific rule applies)
  defaultCommissionRate: decimal("defaultCommissionRate", { precision: 5, scale: 2 }),
  
  // Payment Frequency
  paymentFrequency: mysqlEnum("paymentFrequency", [
    "weekly",
    "biweekly",
    "monthly",
    "quarterly"
  ]).default("monthly").notNull(),
  
  // Minimum Payout Threshold
  minimumPayoutThreshold: decimal("minimumPayoutThreshold", { precision: 10, scale: 2 }).default("0.00"),
  
  // Bank Details
  bankName: varchar("bankName", { length: 255 }),
  bankAccount: varchar("bankAccount", { length: 100 }),
  
  // Tax Settings
  taxRate: decimal("taxRate", { precision: 5, scale: 2 }), // Tax percentage
  
  // Notes
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  employeeIdx: unique("employee_idx").on(table.tenantId, table.employeeId),
}));

// ============================================================================
// EXPORTS
// ============================================================================

export type CommissionRule = typeof commissionRules.$inferSelect;
export type NewCommissionRule = typeof commissionRules.$inferInsert;

export type CommissionCalculation = typeof commissionCalculations.$inferSelect;
export type NewCommissionCalculation = typeof commissionCalculations.$inferInsert;

export type CommissionPayment = typeof commissionPayments.$inferSelect;
export type NewCommissionPayment = typeof commissionPayments.$inferInsert;

export type CommissionTarget = typeof commissionTargets.$inferSelect;
export type NewCommissionTarget = typeof commissionTargets.$inferInsert;

export type CommissionAdjustment = typeof commissionAdjustments.$inferSelect;
export type NewCommissionAdjustment = typeof commissionAdjustments.$inferInsert;

export type EmployeeCommissionSettings = typeof employeeCommissionSettings.$inferSelect;
export type NewEmployeeCommissionSettings = typeof employeeCommissionSettings.$inferInsert;
