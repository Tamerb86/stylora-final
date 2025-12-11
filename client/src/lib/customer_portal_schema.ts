/**
 * Customer Portal Schema
 * 
 * Schema for advanced customer portal with:
 * - Customer authentication
 * - Booking history
 * - Favorite services
 * - Favorite employees
 * - Saved payment methods
 * - Loyalty points balance
 */

import { mysqlTable, varchar, int, decimal, timestamp, boolean, text, index, uniqueIndex } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// ============================================================================
// CUSTOMER ACCOUNTS
// ============================================================================

/**
 * Customer Accounts - Authentication for customer portal
 */
export const customerAccounts = mysqlTable("customerAccounts", {
  id: int("id").primaryKey().autoincrement(),
  tenantId: varchar("tenantId", { length: 255 }).notNull(),
  customerId: int("customerId").notNull(), // FK to customers table
  
  // Authentication
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }), // bcrypt hash
  phone: varchar("phone", { length: 50 }),
  
  // Verification
  emailVerified: boolean("emailVerified").default(false),
  phoneVerified: boolean("phoneVerified").default(false),
  verificationToken: varchar("verificationToken", { length: 255 }),
  verificationTokenExpiry: timestamp("verificationTokenExpiry"),
  
  // Password Reset
  resetToken: varchar("resetToken", { length: 255 }),
  resetTokenExpiry: timestamp("resetTokenExpiry"),
  
  // Session Management
  lastLoginAt: timestamp("lastLoginAt"),
  lastLoginIp: varchar("lastLoginIp", { length: 45 }),
  loginAttempts: int("loginAttempts").default(0),
  lockedUntil: timestamp("lockedUntil"),
  
  // Preferences
  language: varchar("language", { length: 10 }).default("no"),
  timezone: varchar("timezone", { length: 50 }).default("Europe/Oslo"),
  emailNotifications: boolean("emailNotifications").default(true),
  smsNotifications: boolean("smsNotifications").default(true),
  marketingEmails: boolean("marketingEmails").default(false),
  
  // Status
  isActive: boolean("isActive").default(true),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  tenantEmailIdx: uniqueIndex("tenant_email_idx").on(table.tenantId, table.email),
  tenantCustomerIdx: uniqueIndex("tenant_customer_idx").on(table.tenantId, table.customerId),
  emailIdx: index("email_idx").on(table.email),
  phoneIdx: index("phone_idx").on(table.phone),
}));

// ============================================================================
// CUSTOMER FAVORITES
// ============================================================================

/**
 * Customer Favorite Services
 */
export const customerFavoriteServices = mysqlTable("customerFavoriteServices", {
  id: int("id").primaryKey().autoincrement(),
  tenantId: varchar("tenantId", { length: 255 }).notNull(),
  customerId: int("customerId").notNull(),
  serviceId: int("serviceId").notNull(),
  
  // Metadata
  addedAt: timestamp("addedAt").defaultNow(),
  timesBooked: int("timesBooked").default(0),
  lastBookedAt: timestamp("lastBookedAt"),
}, (table) => ({
  tenantCustomerServiceIdx: uniqueIndex("tenant_customer_service_idx").on(
    table.tenantId,
    table.customerId,
    table.serviceId
  ),
  customerIdx: index("customer_idx").on(table.customerId),
}));

/**
 * Customer Favorite Employees
 */
export const customerFavoriteEmployees = mysqlTable("customerFavoriteEmployees", {
  id: int("id").primaryKey().autoincrement(),
  tenantId: varchar("tenantId", { length: 255 }).notNull(),
  customerId: int("customerId").notNull(),
  employeeId: int("employeeId").notNull(),
  
  // Metadata
  addedAt: timestamp("addedAt").defaultNow(),
  timesBooked: int("timesBooked").default(0),
  lastBookedAt: timestamp("lastBookedAt"),
  rating: int("rating"), // 1-5 stars
  notes: text("notes"),
}, (table) => ({
  tenantCustomerEmployeeIdx: uniqueIndex("tenant_customer_employee_idx").on(
    table.tenantId,
    table.customerId,
    table.employeeId
  ),
  customerIdx: index("customer_idx").on(table.customerId),
}));

// ============================================================================
// SAVED PAYMENT METHODS
// ============================================================================

/**
 * Customer Saved Payment Methods
 */
export const customerPaymentMethods = mysqlTable("customerPaymentMethods", {
  id: int("id").primaryKey().autoincrement(),
  tenantId: varchar("tenantId", { length: 255 }).notNull(),
  customerId: int("customerId").notNull(),
  
  // Payment Method Type
  type: varchar("type", { length: 50 }).notNull(), // 'card', 'vipps', 'mobilepay'
  provider: varchar("provider", { length: 50 }).notNull(), // 'stripe', 'vipps', 'mobilepay'
  
  // Card Details (for display only, actual data stored with provider)
  cardBrand: varchar("cardBrand", { length: 50 }), // 'visa', 'mastercard', etc.
  cardLast4: varchar("cardLast4", { length: 4 }),
  cardExpMonth: int("cardExpMonth"),
  cardExpYear: int("cardExpYear"),
  
  // Provider References
  stripePaymentMethodId: varchar("stripePaymentMethodId", { length: 255 }),
  vippsAgreementId: varchar("vippsAgreementId", { length: 255 }),
  mobilepayAgreementId: varchar("mobilepayAgreementId", { length: 255 }),
  
  // Settings
  isDefault: boolean("isDefault").default(false),
  nickname: varchar("nickname", { length: 100 }), // e.g., "My Visa Card"
  
  // Status
  isActive: boolean("isActive").default(true),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  tenantCustomerIdx: index("tenant_customer_idx").on(table.tenantId, table.customerId),
  customerDefaultIdx: index("customer_default_idx").on(table.customerId, table.isDefault),
}));

// ============================================================================
// CUSTOMER PORTAL SESSIONS
// ============================================================================

/**
 * Customer Portal Sessions - For session management
 */
export const customerPortalSessions = mysqlTable("customerPortalSessions", {
  id: int("id").primaryKey().autoincrement(),
  tenantId: varchar("tenantId", { length: 255 }).notNull(),
  customerAccountId: int("customerAccountId").notNull(),
  
  // Session Data
  sessionToken: varchar("sessionToken", { length: 255 }).notNull(),
  deviceInfo: text("deviceInfo"), // User agent, device type, etc.
  ipAddress: varchar("ipAddress", { length: 45 }),
  
  // Timestamps
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  sessionTokenIdx: uniqueIndex("session_token_idx").on(table.sessionToken),
  customerAccountIdx: index("customer_account_idx").on(table.customerAccountId),
  expiresAtIdx: index("expires_at_idx").on(table.expiresAt),
}));

// ============================================================================
// CUSTOMER ACTIVITY LOG
// ============================================================================

/**
 * Customer Activity Log - Track customer actions
 */
export const customerActivityLog = mysqlTable("customerActivityLog", {
  id: int("id").primaryKey().autoincrement(),
  tenantId: varchar("tenantId", { length: 255 }).notNull(),
  customerAccountId: int("customerAccountId").notNull(),
  
  // Activity Details
  activityType: varchar("activityType", { length: 50 }).notNull(), // 'login', 'booking_created', 'booking_cancelled', etc.
  description: text("description"),
  metadata: text("metadata"), // JSON string with additional data
  
  // Context
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  
  // Timestamp
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  customerAccountIdx: index("customer_account_idx").on(table.customerAccountId),
  activityTypeIdx: index("activity_type_idx").on(table.activityType),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

// ============================================================================
// CUSTOMER PORTAL SETTINGS
// ============================================================================

/**
 * Customer Portal Settings - Per-tenant portal configuration
 */
export const customerPortalSettings = mysqlTable("customerPortalSettings", {
  id: int("id").primaryKey().autoincrement(),
  tenantId: varchar("tenantId", { length: 255 }).notNull().unique(),
  
  // Portal Features
  enablePortal: boolean("enablePortal").default(true),
  enableSelfRegistration: boolean("enableSelfRegistration").default(true),
  requireEmailVerification: boolean("requireEmailVerification").default(true),
  requirePhoneVerification: boolean("requirePhoneVerification").default(false),
  
  // Booking Features
  allowOnlineBooking: boolean("allowOnlineBooking").default(true),
  allowBookingCancellation: boolean("allowBookingCancellation").default(true),
  allowBookingModification: boolean("allowBookingModification").default(true),
  cancellationHoursLimit: int("cancellationHoursLimit").default(24), // Hours before appointment
  
  // Payment Features
  enableSavedPaymentMethods: boolean("enableSavedPaymentMethods").default(true),
  requirePaymentForBooking: boolean("requirePaymentForBooking").default(false),
  depositPercentage: int("depositPercentage").default(0), // 0-100
  
  // Loyalty Features
  showLoyaltyPoints: boolean("showLoyaltyPoints").default(true),
  
  // Customization
  portalTitle: varchar("portalTitle", { length: 255 }),
  portalLogo: varchar("portalLogo", { length: 500 }), // URL
  primaryColor: varchar("primaryColor", { length: 7 }).default("#3B82F6"),
  secondaryColor: varchar("secondaryColor", { length: 7 }).default("#F97316"),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const customerAccountsRelations = relations(customerAccounts, ({ one, many }) => ({
  // customer: one(customers, {
  //   fields: [customerAccounts.customerId],
  //   references: [customers.id],
  // }),
  sessions: many(customerPortalSessions),
  activityLog: many(customerActivityLog),
  favoriteServices: many(customerFavoriteServices),
  favoriteEmployees: many(customerFavoriteEmployees),
  paymentMethods: many(customerPaymentMethods),
}));

export const customerFavoriteServicesRelations = relations(customerFavoriteServices, ({ one }) => ({
  customerAccount: one(customerAccounts, {
    fields: [customerFavoriteServices.customerId],
    references: [customerAccounts.customerId],
  }),
  // service: one(services, {
  //   fields: [customerFavoriteServices.serviceId],
  //   references: [services.id],
  // }),
}));

export const customerFavoriteEmployeesRelations = relations(customerFavoriteEmployees, ({ one }) => ({
  customerAccount: one(customerAccounts, {
    fields: [customerFavoriteEmployees.customerId],
    references: [customerAccounts.customerId],
  }),
  // employee: one(employees, {
  //   fields: [customerFavoriteEmployees.employeeId],
  //   references: [employees.id],
  // }),
}));

export const customerPaymentMethodsRelations = relations(customerPaymentMethods, ({ one }) => ({
  customerAccount: one(customerAccounts, {
    fields: [customerPaymentMethods.customerId],
    references: [customerAccounts.customerId],
  }),
}));

export const customerPortalSessionsRelations = relations(customerPortalSessions, ({ one }) => ({
  customerAccount: one(customerAccounts, {
    fields: [customerPortalSessions.customerAccountId],
    references: [customerAccounts.id],
  }),
}));

export const customerActivityLogRelations = relations(customerActivityLog, ({ one }) => ({
  customerAccount: one(customerAccounts, {
    fields: [customerActivityLog.customerAccountId],
    references: [customerAccounts.id],
  }),
}));

// ============================================================================
// TYPES
// ============================================================================

export type CustomerAccount = typeof customerAccounts.$inferSelect;
export type NewCustomerAccount = typeof customerAccounts.$inferInsert;

export type CustomerFavoriteService = typeof customerFavoriteServices.$inferSelect;
export type NewCustomerFavoriteService = typeof customerFavoriteServices.$inferInsert;

export type CustomerFavoriteEmployee = typeof customerFavoriteEmployees.$inferSelect;
export type NewCustomerFavoriteEmployee = typeof customerFavoriteEmployees.$inferInsert;

export type CustomerPaymentMethod = typeof customerPaymentMethods.$inferSelect;
export type NewCustomerPaymentMethod = typeof customerPaymentMethods.$inferInsert;

export type CustomerPortalSession = typeof customerPortalSessions.$inferSelect;
export type NewCustomerPortalSession = typeof customerPortalSessions.$inferInsert;

export type CustomerActivityLog = typeof customerActivityLog.$inferSelect;
export type NewCustomerActivityLog = typeof customerActivityLog.$inferInsert;

export type CustomerPortalSettings = typeof customerPortalSettings.$inferSelect;
export type NewCustomerPortalSettings = typeof customerPortalSettings.$inferInsert;
