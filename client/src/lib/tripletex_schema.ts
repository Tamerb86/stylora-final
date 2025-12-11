import { pgTable, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

/**
 * Tripletex Integration Schema
 * 
 * Tables for Tripletex accounting integration
 */

// ============================================================================
// SETTINGS TABLE
// ============================================================================

export const tripletexSettings = pgTable("tripletex_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: text("tenant_id").notNull(),
  
  // Authentication
  consumerToken: text("consumer_token").notNull(), // From Tripletex registration
  employeeToken: text("employee_token").notNull(), // From user settings
  sessionToken: text("session_token"), // Created via API
  sessionTokenExpiresAt: timestamp("session_token_expires_at"),
  
  // Company Info
  companyId: text("company_id"), // 0 or blank = current company
  organizationNumber: text("organization_number"),
  
  // API Configuration
  baseUrl: text("base_url").notNull().default("https://tripletex.no/v2"),
  environment: text("environment").notNull().default("production"), // production or sandbox
  
  // Integration Status
  isEnabled: boolean("is_enabled").notNull().default(false),
  lastSyncAt: timestamp("last_sync_at"),
  lastSyncStatus: text("last_sync_status"), // success, failed, partial
  
  // Sync Settings
  syncFrequency: text("sync_frequency").default("daily"), // manual, daily, weekly, monthly
  syncTime: text("sync_time").default("23:00"), // HH:mm format
  autoSyncCustomers: boolean("auto_sync_customers").default(true),
  autoSyncInvoices: boolean("auto_sync_invoices").default(true),
  autoSyncPayments: boolean("auto_sync_payments").default(true),
  
  // Accounting Defaults
  defaultVatType: text("default_vat_type").default("3"), // 3 = 25% MVA
  defaultAccountCode: text("default_account_code").default("3000"), // Sales account
  defaultPaymentTerms: integer("default_payment_terms").default(14), // Days
  defaultCurrency: text("default_currency").default("NOK"),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================================================
// CUSTOMER MAPPING TABLE
// ============================================================================

export const tripletexCustomerMapping = pgTable("tripletex_customer_mapping", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: text("tenant_id").notNull(),
  
  // Stylora Customer
  customerId: integer("customer_id").notNull(), // FK to customers table
  
  // Tripletex Customer
  tripletexCustomerId: text("tripletex_customer_id").notNull(),
  tripletexCustomerNumber: text("tripletex_customer_number"),
  
  // Sync Status
  status: text("status").notNull().default("synced"), // synced, failed
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
  lastError: text("last_error"),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================================================
// INVOICE MAPPING TABLE
// ============================================================================

export const tripletexInvoiceMapping = pgTable("tripletex_invoice_mapping", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: text("tenant_id").notNull(),
  
  // Stylora Order
  orderId: integer("order_id").notNull(), // FK to orders table
  
  // Tripletex Invoice
  tripletexInvoiceId: text("tripletex_invoice_id").notNull(),
  tripletexInvoiceNumber: text("tripletex_invoice_number"),
  
  // Invoice Details
  amount: integer("amount"), // Amount in øre/cents
  currency: text("currency").default("NOK"),
  invoiceDate: text("invoice_date"), // YYYY-MM-DD
  dueDate: text("due_date"), // YYYY-MM-DD
  
  // Sync Status
  status: text("status").notNull().default("synced"), // pending, synced, sent, paid, failed, cancelled
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
  sentAt: timestamp("sent_at"),
  paidAt: timestamp("paid_at"),
  lastError: text("last_error"),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================================================
// SYNC LOG TABLE
// ============================================================================

export const tripletexSyncLog = pgTable("tripletex_sync_log", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: text("tenant_id").notNull(),
  
  // Operation Details
  operation: text("operation").notNull(), // sync_customer, sync_invoice, sync_payment, sync_refund, etc.
  entityType: text("entity_type").notNull(), // customer, invoice, payment, refund
  entityId: integer("entity_id"), // ID of the entity being synced
  
  // Status
  status: text("status").notNull(), // success, failed, partial
  message: text("message"),
  errorDetails: text("error_details"),
  
  // Statistics
  recordsProcessed: integer("records_processed").default(0),
  recordsSucceeded: integer("records_succeeded").default(0),
  recordsFailed: integer("records_failed").default(0),
  
  // Timing
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),
  
  // Additional Data
  metadata: jsonb("metadata"), // Any additional context
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ============================================================================
// PRODUCT MAPPING TABLE (Optional - for future use)
// ============================================================================

export const tripletexProductMapping = pgTable("tripletex_product_mapping", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: text("tenant_id").notNull(),
  
  // Stylora Service/Product
  serviceId: integer("service_id"), // FK to services table
  productId: integer("product_id"), // FK to products table (if exists)
  
  // Tripletex Product
  tripletexProductId: text("tripletex_product_id").notNull(),
  tripletexProductNumber: text("tripletex_product_number"),
  
  // Sync Status
  status: text("status").notNull().default("synced"),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================================================
// TYPES
// ============================================================================

export type TripletexSettings = typeof tripletexSettings.$inferSelect;
export type NewTripletexSettings = typeof tripletexSettings.$inferInsert;

export type TripletexCustomerMapping = typeof tripletexCustomerMapping.$inferSelect;
export type NewTripletexCustomerMapping = typeof tripletexCustomerMapping.$inferInsert;

export type TripletexInvoiceMapping = typeof tripletexInvoiceMapping.$inferSelect;
export type NewTripletexInvoiceMapping = typeof tripletexInvoiceMapping.$inferInsert;

export type TripletexSyncLog = typeof tripletexSyncLog.$inferSelect;
export type NewTripletexSyncLog = typeof tripletexSyncLog.$inferInsert;

export type TripletexProductMapping = typeof tripletexProductMapping.$inferSelect;
export type NewTripletexProductMapping = typeof tripletexProductMapping.$inferInsert;
