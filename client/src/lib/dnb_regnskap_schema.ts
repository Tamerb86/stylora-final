import { mysqlTable, int, varchar, text, boolean, timestamp, mysqlEnum, index } from "drizzle-orm/mysql-core";

// ============================================================================
// DNB REGNSKAP ACCOUNTING INTEGRATION
// ============================================================================

export const dnbRegnskapSettings = mysqlTable("dnbRegnskapSettings", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull().unique(),
  enabled: boolean("enabled").default(false).notNull(),
  
  // OAuth Credentials (DNB uses OAuth 2.0)
  clientId: text("clientId"),
  clientSecret: text("clientSecret"), // Encrypted
  companyId: varchar("companyId", { length: 100 }),
  organizationNumber: varchar("organizationNumber", { length: 20 }), // Norwegian org number
  
  // Tokens
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  
  // API Settings
  apiBaseUrl: varchar("apiBaseUrl", { length: 255 }).default("https://api.dnb.no/regnskap/v1"),
  environment: mysqlEnum("environment", ["production", "sandbox"]).default("sandbox").notNull(),
  
  // Sync Settings
  syncFrequency: mysqlEnum("syncFrequency", ["daily", "weekly", "monthly", "manual", "custom"]).default("daily").notNull(),
  syncDayOfWeek: int("syncDayOfWeek"), // 0-6 (0=Sunday)
  syncDayOfMonth: int("syncDayOfMonth"), // 1-31 or -1 for last day
  syncHour: int("syncHour").default(23).notNull(), // 0-23
  syncMinute: int("syncMinute").default(0).notNull(), // 0-59
  
  // Auto-sync options
  autoSyncCustomers: boolean("autoSyncCustomers").default(true).notNull(),
  autoSyncInvoices: boolean("autoSyncInvoices").default(true).notNull(),
  autoSyncPayments: boolean("autoSyncPayments").default(true).notNull(),
  
  // Sync Status
  lastSyncAt: timestamp("lastSyncAt"),
  nextSyncAt: timestamp("nextSyncAt"),
  lastSyncStatus: mysqlEnum("lastSyncStatus", ["success", "failed", "partial"]),
  lastSyncErrors: text("lastSyncErrors"),
  
  // Accounting Settings
  defaultVatCode: varchar("defaultVatCode", { length: 10 }).default("3"), // Norwegian VAT code (25%)
  defaultAccountCode: varchar("defaultAccountCode", { length: 10 }).default("3000"), // Sales account
  defaultPaymentTerms: int("defaultPaymentTerms").default(14), // Days
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("dnb_regnskap_settings_tenant_idx").on(table.tenantId),
}));

// Invoice mapping table
export const dnbRegnskapInvoiceMapping = mysqlTable("dnbRegnskapInvoiceMapping", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  orderId: int("orderId").notNull(), // Reference to orders table
  dnbInvoiceId: varchar("dnbInvoiceId", { length: 100 }).notNull(),
  dnbInvoiceNumber: varchar("dnbInvoiceNumber", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["pending", "synced", "failed", "paid", "cancelled"]).default("pending").notNull(),
  errorMessage: text("errorMessage"),
  syncedAt: timestamp("syncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantOrderIdx: index("dnb_invoice_tenant_order_idx").on(table.tenantId, table.orderId),
  dnbInvoiceIdx: index("dnb_invoice_id_idx").on(table.dnbInvoiceId),
  statusIdx: index("dnb_invoice_status_idx").on(table.status),
}));

// Customer mapping table
export const dnbRegnskapCustomerMapping = mysqlTable("dnbRegnskapCustomerMapping", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  customerId: int("customerId").notNull(), // Reference to customers table
  dnbCustomerId: varchar("dnbCustomerId", { length: 100 }).notNull(),
  dnbCustomerNumber: varchar("dnbCustomerNumber", { length: 50 }),
  status: mysqlEnum("status", ["synced", "failed"]).default("synced").notNull(),
  errorMessage: text("errorMessage"),
  syncedAt: timestamp("syncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantCustomerIdx: index("dnb_customer_tenant_customer_idx").on(table.tenantId, table.customerId),
  dnbCustomerIdx: index("dnb_customer_id_idx").on(table.dnbCustomerId),
}));

// Sync log table
export const dnbRegnskapSyncLog = mysqlTable("dnbRegnskapSyncLog", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  operation: mysqlEnum("operation", [
    "sync_customer",
    "sync_invoice",
    "sync_payment",
    "sync_refund",
    "update_status",
    "manual_sync"
  ]).notNull(),
  entityType: mysqlEnum("entityType", ["customer", "invoice", "payment", "refund"]),
  entityId: int("entityId"),
  status: mysqlEnum("status", ["success", "failed", "partial"]).notNull(),
  message: text("message"),
  errorDetails: text("errorDetails"),
  recordsProcessed: int("recordsProcessed").default(0),
  recordsSucceeded: int("recordsSucceeded").default(0),
  recordsFailed: int("recordsFailed").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("dnb_sync_log_tenant_idx").on(table.tenantId),
  operationIdx: index("dnb_sync_log_operation_idx").on(table.operation),
  statusIdx: index("dnb_sync_log_status_idx").on(table.status),
  createdAtIdx: index("dnb_sync_log_created_at_idx").on(table.createdAt),
}));

// Type exports
export type DnbRegnskapSettings = typeof dnbRegnskapSettings.$inferSelect;
export type InsertDnbRegnskapSettings = typeof dnbRegnskapSettings.$inferInsert;

export type DnbRegnskapInvoiceMapping = typeof dnbRegnskapInvoiceMapping.$inferSelect;
export type InsertDnbRegnskapInvoiceMapping = typeof dnbRegnskapInvoiceMapping.$inferInsert;

export type DnbRegnskapCustomerMapping = typeof dnbRegnskapCustomerMapping.$inferSelect;
export type InsertDnbRegnskapCustomerMapping = typeof dnbRegnskapCustomerMapping.$inferInsert;

export type DnbRegnskapSyncLog = typeof dnbRegnskapSyncLog.$inferSelect;
export type InsertDnbRegnskapSyncLog = typeof dnbRegnskapSyncLog.$inferInsert;
