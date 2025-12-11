// ==========================================
// SAAS MANAGEMENT TABLES
// Add these to your COMPLETE_SCHEMA.ts
// ==========================================

// Tenant Users (Admin/Manager accounts for each salon)
export const tenantUsers = pgTable("tenantUsers", {
  id: serial("id").primaryKey(),
  tenantId: text("tenantId").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  passwordHash: text("passwordHash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("owner"), // 'super_admin', 'owner', 'manager'
  isActive: boolean("isActive").default(true),
  lastLoginAt: timestamp("lastLoginAt"),
  emailVerified: boolean("emailVerified").default(false),
  emailVerificationToken: text("emailVerificationToken"),
  passwordResetToken: text("passwordResetToken"),
  passwordResetExpires: timestamp("passwordResetExpires"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// User Sessions
export const userSessions = pgTable("userSessions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => tenantUsers.id, { onDelete: "cascade" }),
  sessionToken: text("sessionToken").notNull().unique(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Tenant Subscriptions
export const tenantSubscriptions = pgTable("tenantSubscriptions", {
  id: serial("id").primaryKey(),
  tenantId: text("tenantId").notNull().references(() => tenants.id, { onDelete: "cascade" }).unique(),
  plan: text("plan").notNull(), // 'free', 'basic', 'professional', 'enterprise'
  status: text("status").notNull().default("active"), // 'active', 'cancelled', 'suspended', 'expired'
  billingCycle: text("billingCycle").notNull().default("monthly"), // 'monthly', 'yearly'
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("NOK"),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  nextBillingDate: timestamp("nextBillingDate"),
  autoRenew: boolean("autoRenew").default(true),
  trialEndsAt: timestamp("trialEndsAt"),
  cancelledAt: timestamp("cancelledAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Subscription Plans
export const subscriptionPlans = pgTable("subscriptionPlans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  monthlyPrice: decimal("monthlyPrice", { precision: 10, scale: 2 }).notNull(),
  yearlyPrice: decimal("yearlyPrice", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("NOK"),
  features: jsonb("features"), // Array of features
  limits: jsonb("limits"), // { maxEmployees: 10, maxBookings: 1000, etc }
  isActive: boolean("isActive").default(true),
  sortOrder: integer("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Tenant Invoices
export const tenantInvoices = pgTable("tenantInvoices", {
  id: serial("id").primaryKey(),
  tenantId: text("tenantId").notNull().references(() => tenants.id),
  subscriptionId: integer("subscriptionId").references(() => tenantSubscriptions.id),
  invoiceNumber: text("invoiceNumber").notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("NOK"),
  status: text("status").notNull().default("pending"), // 'pending', 'paid', 'overdue', 'cancelled'
  dueDate: timestamp("dueDate").notNull(),
  paidAt: timestamp("paidAt"),
  paymentMethod: text("paymentMethod"),
  paymentTransactionId: text("paymentTransactionId"),
  items: jsonb("items"), // Invoice line items
  createdAt: timestamp("createdAt").defaultNow(),
});

// Tenant Usage Tracking
export const tenantUsage = pgTable("tenantUsage", {
  id: serial("id").primaryKey(),
  tenantId: text("tenantId").notNull().references(() => tenants.id),
  period: text("period").notNull(), // 'YYYY-MM'
  bookingsCount: integer("bookingsCount").default(0),
  customersCount: integer("customersCount").default(0),
  employeesCount: integer("employeesCount").default(0),
  smsCount: integer("smsCount").default(0),
  emailCount: integer("emailCount").default(0),
  storageUsedMB: integer("storageUsedMB").default(0),
  apiCallsCount: integer("apiCallsCount").default(0),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Tenant Settings
export const tenantSettings = pgTable("tenantSettings", {
  id: serial("id").primaryKey(),
  tenantId: text("tenantId").notNull().references(() => tenants.id, { onDelete: "cascade" }).unique(),
  businessName: text("businessName"),
  businessType: text("businessType"), // 'salon', 'spa', 'barbershop', etc
  logo: text("logo"),
  timezone: text("timezone").default("Europe/Oslo"),
  language: text("language").default("no"),
  currency: text("currency").default("NOK"),
  dateFormat: text("dateFormat").default("DD.MM.YYYY"),
  timeFormat: text("timeFormat").default("24h"),
  weekStartsOn: integer("weekStartsOn").default(1), // 0=Sunday, 1=Monday
  bookingSettings: jsonb("bookingSettings"),
  notificationSettings: jsonb("notificationSettings"),
  paymentSettings: jsonb("paymentSettings"),
  emailSettings: jsonb("emailSettings"),
  smsSettings: jsonb("smsSettings"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Audit Log
export const auditLog = pgTable("auditLog", {
  id: serial("id").primaryKey(),
  tenantId: text("tenantId"),
  userId: integer("userId").references(() => tenantUsers.id),
  action: text("action").notNull(), // 'create', 'update', 'delete', 'login', etc
  entityType: text("entityType"), // 'customer', 'booking', 'employee', etc
  entityId: integer("entityId"),
  changes: jsonb("changes"), // Before/after values
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// System Notifications
export const systemNotifications = pgTable("systemNotifications", {
  id: serial("id").primaryKey(),
  tenantId: text("tenantId").references(() => tenants.id),
  userId: integer("userId").references(() => tenantUsers.id),
  type: text("type").notNull(), // 'info', 'warning', 'error', 'success'
  title: text("title").notNull(),
  message: text("message").notNull(),
  actionUrl: text("actionUrl"),
  isRead: boolean("isRead").default(false),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow(),
});

// Feature Flags
export const featureFlags = pgTable("featureFlags", {
  id: serial("id").primaryKey(),
  tenantId: text("tenantId").references(() => tenants.id),
  featureName: text("featureName").notNull(),
  isEnabled: boolean("isEnabled").default(false),
  config: jsonb("config"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

// Tenant Onboarding
export const tenantOnboarding = pgTable("tenantOnboarding", {
  id: serial("id").primaryKey(),
  tenantId: text("tenantId").notNull().references(() => tenants.id, { onDelete: "cascade" }).unique(),
  currentStep: integer("currentStep").default(1),
  completedSteps: jsonb("completedSteps").default([]),
  isCompleted: boolean("isCompleted").default(false),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});
