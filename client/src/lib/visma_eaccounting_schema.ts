import { pgTable, text, timestamp, boolean, integer, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Visma eAccounting Integration Schema
 * 
 * Tables for managing integration with Visma eAccounting API
 * https://eaccountingapi.vismaonline.com/v2
 */

// ============================================================================
// Visma eAccounting Settings Table
// ============================================================================

export const vismaEaccountingSettings = pgTable("visma_eaccounting_settings", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  
  // OAuth 2.0 Credentials
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret").notNull(),
  
  // OAuth 2.0 Tokens
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  
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

export const insertVismaEaccountingSettingsSchema = createInsertSchema(vismaEaccountingSettings);
export const selectVismaEaccountingSettingsSchema = createSelectSchema(vismaEaccountingSettings);

// ============================================================================
// Visma eAccounting Customer Mapping Table
// ============================================================================

export const vismaEaccountingCustomers = pgTable("visma_eaccounting_customers", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  
  // Local Reference
  localCustomerId: text("local_customer_id").notNull(),
  
  // Visma eAccounting Reference (UUID)
  vismaCustomerId: text("visma_customer_id").notNull().unique(),
  
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

export const insertVismaEaccountingCustomersSchema = createInsertSchema(vismaEaccountingCustomers);
export const selectVismaEaccountingCustomersSchema = createSelectSchema(vismaEaccountingCustomers);

// ============================================================================
// Visma eAccounting Invoice Mapping Table
// ============================================================================

export const vismaEaccountingInvoices = pgTable("visma_eaccounting_invoices", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  
  // Local Reference
  localOrderId: text("local_order_id").notNull(),
  
  // Visma eAccounting Reference (UUID)
  vismaInvoiceId: text("visma_invoice_id").notNull().unique(),
  vismaInvoiceNumber: text("visma_invoice_number"),
  
  // Customer Reference
  vismaCustomerId: text("visma_customer_id").notNull(),
  
  // Invoice Details
  invoiceDate: timestamp("invoice_date"),
  dueDate: timestamp("due_date"),
  totalAmount: integer("total_amount"), // in øre
  vatAmount: integer("vat_amount"), // in øre
  
  // Status
  status: text("status").default("draft"), // draft, sent, paid, overdue, void
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

export const insertVismaEaccountingInvoicesSchema = createInsertSchema(vismaEaccountingInvoices);
export const selectVismaEaccountingInvoicesSchema = createSelectSchema(vismaEaccountingInvoices);

// ============================================================================
// Visma eAccounting Sync Logs Table
// ============================================================================

export const vismaEaccountingSyncLogs = pgTable("visma_eaccounting_sync_logs", {
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

export const insertVismaEaccountingSyncLogsSchema = createInsertSchema(vismaEaccountingSyncLogs);
export const selectVismaEaccountingSyncLogsSchema = createSelectSchema(vismaEaccountingSyncLogs);

// ============================================================================
// Type Exports
// ============================================================================

export type VismaEaccountingSettings = typeof vismaEaccountingSettings.$inferSelect;
export type InsertVismaEaccountingSettings = z.infer<typeof insertVismaEaccountingSettingsSchema>;

export type VismaEaccountingCustomer = typeof vismaEaccountingCustomers.$inferSelect;
export type InsertVismaEaccountingCustomer = z.infer<typeof insertVismaEaccountingCustomersSchema>;

export type VismaEaccountingInvoice = typeof vismaEaccountingInvoices.$inferSelect;
export type InsertVismaEaccountingInvoice = z.infer<typeof insertVismaEaccountingInvoicesSchema>;

export type VismaEaccountingSyncLog = typeof vismaEaccountingSyncLogs.$inferSelect;
export type InsertVismaEaccountingSyncLog = z.infer<typeof insertVismaEaccountingSyncLogsSchema>;
