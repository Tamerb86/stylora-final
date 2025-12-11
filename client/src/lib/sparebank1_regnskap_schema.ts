import { pgTable, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Sparebank1 Regnskap Integration Schema
 * 
 * Based on Unimicro platform (same underlying system)
 * Sparebank1 Regnskap is a white-label version of Unimicro
 */

// ============================================================================
// Sparebank1 Regnskap Settings Table
// ============================================================================

export const sparebank1RegnskapSettings = pgTable("sparebank1_regnskap_settings", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  
  // API Credentials (similar to Unimicro)
  apiKey: text("api_key").notNull(),
  companyId: text("company_id").notNull(),
  
  // OAuth 2.0 Tokens (if using OAuth)
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  
  // Sparebank1 Specific
  bankAccountNumber: text("bank_account_number"), // Sparebank1 account
  
  // Configuration
  autoSync: boolean("auto_sync").default(false),
  syncInterval: integer("sync_interval").default(3600), // seconds
  lastSyncAt: timestamp("last_sync_at"),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSparebank1RegnskapSettingsSchema = createInsertSchema(sparebank1RegnskapSettings);
export const selectSparebank1RegnskapSettingsSchema = createSelectSchema(sparebank1RegnskapSettings);

// ============================================================================
// Sparebank1 Regnskap Customer Mapping Table
// ============================================================================

export const sparebank1RegnskapCustomers = pgTable("sparebank1_regnskap_customers", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  
  // Local Reference
  localCustomerId: text("local_customer_id").notNull(),
  
  // Sparebank1 Reference
  sparebank1CustomerId: text("sparebank1_customer_id").notNull().unique(),
  sparebank1CustomerNumber: text("sparebank1_customer_number"),
  
  // Sync Status
  lastSyncedAt: timestamp("last_synced_at"),
  syncStatus: text("sync_status").default("synced"), // synced, pending, failed
  syncError: text("sync_error"),
  
  // Customer Data Snapshot
  customerData: jsonb("customer_data"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSparebank1RegnskapCustomersSchema = createInsertSchema(sparebank1RegnskapCustomers);
export const selectSparebank1RegnskapCustomersSchema = createSelectSchema(sparebank1RegnskapCustomers);

// ============================================================================
// Sparebank1 Regnskap Invoice Mapping Table
// ============================================================================

export const sparebank1RegnskapInvoices = pgTable("sparebank1_regnskap_invoices", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  
  // Local Reference
  localOrderId: text("local_order_id").notNull(),
  
  // Sparebank1 Reference
  sparebank1InvoiceId: text("sparebank1_invoice_id").notNull().unique(),
  sparebank1InvoiceNumber: text("sparebank1_invoice_number"),
  
  // Customer Reference
  sparebank1CustomerId: text("sparebank1_customer_id").notNull(),
  
  // Invoice Details
  invoiceDate: timestamp("invoice_date"),
  dueDate: timestamp("due_date"),
  totalAmount: integer("total_amount"), // in øre
  vatAmount: integer("vat_amount"), // in øre
  
  // Status
  status: text("status").default("draft"), // draft, sent, paid, overdue
  isPaid: boolean("is_paid").default(false),
  paidAt: timestamp("paid_at"),
  
  // Sync Status
  lastSyncedAt: timestamp("last_synced_at"),
  syncStatus: text("sync_status").default("synced"),
  syncError: text("sync_error"),
  
  // Invoice Data Snapshot
  invoiceData: jsonb("invoice_data"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSparebank1RegnskapInvoicesSchema = createInsertSchema(sparebank1RegnskapInvoices);
export const selectSparebank1RegnskapInvoicesSchema = createSelectSchema(sparebank1RegnskapInvoices);

// ============================================================================
// Sparebank1 Regnskap Sync Logs Table
// ============================================================================

export const sparebank1RegnskapSyncLogs = pgTable("sparebank1_regnskap_sync_logs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  
  // Sync Details
  syncType: text("sync_type").notNull(), // customer, invoice, payment, full
  status: text("status").notNull(), // success, partial, failed
  
  // Statistics
  itemsProcessed: integer("items_processed").default(0),
  itemsSucceeded: integer("items_succeeded").default(0),
  itemsFailed: integer("items_failed").default(0),
  
  // Timing
  startedAt: timestamp("started_at").notNull(),
  completedAt: timestamp("completed_at"),
  duration: integer("duration"), // seconds
  
  // Error Details
  errors: jsonb("errors"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSparebank1RegnskapSyncLogsSchema = createInsertSchema(sparebank1RegnskapSyncLogs);
export const selectSparebank1RegnskapSyncLogsSchema = createSelectSchema(sparebank1RegnskapSyncLogs);

// ============================================================================
// Type Exports
// ============================================================================

export type Sparebank1RegnskapSettings = typeof sparebank1RegnskapSettings.$inferSelect;
export type InsertSparebank1RegnskapSettings = z.infer<typeof insertSparebank1RegnskapSettingsSchema>;

export type Sparebank1RegnskapCustomer = typeof sparebank1RegnskapCustomers.$inferSelect;
export type InsertSparebank1RegnskapCustomer = z.infer<typeof insertSparebank1RegnskapCustomersSchema>;

export type Sparebank1RegnskapInvoice = typeof sparebank1RegnskapInvoices.$inferSelect;
export type InsertSparebank1RegnskapInvoice = z.infer<typeof insertSparebank1RegnskapInvoicesSchema>;

export type Sparebank1RegnskapSyncLog = typeof sparebank1RegnskapSyncLogs.$inferSelect;
export type InsertSparebank1RegnskapSyncLog = z.infer<typeof insertSparebank1RegnskapSyncLogsSchema>;
