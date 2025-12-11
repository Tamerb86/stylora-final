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
 * CRM & Marketing System Schema
 * 
 * This comprehensive schema includes:
 * 1. Customer Segmentation
 * 2. Marketing Campaigns (Automated)
 * 3. Birthday/Anniversary Reminders
 * 4. Re-engagement Campaigns (Inactive Customers)
 * 5. Referral Program
 * 6. Gift Cards/Vouchers
 * 7. Promotional Codes/Discounts
 * 8. Customer Feedback/Reviews
 * 9. NPS (Net Promoter Score)
 */

// ============================================================================
// CUSTOMER SEGMENTATION
// ============================================================================

export const customerSegments = mysqlTable("customerSegments", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Segment Info
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }), // Hex color for UI
  
  // Segment Type
  type: mysqlEnum("type", ["static", "dynamic"]).default("dynamic").notNull(),
  
  // Dynamic Segment Rules (JSON)
  rules: json("rules").$type<{
    conditions: Array<{
      field: string; // e.g., "totalSpent", "visitCount", "lastVisit"
      operator: string; // e.g., ">=", "<=", "=", "contains"
      value: any;
    }>;
    logic: "AND" | "OR";
  }>(),
  
  // Statistics
  customerCount: int("customerCount").default(0).notNull(),
  lastCalculatedAt: timestamp("lastCalculatedAt"),
  
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  
  // Metadata
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantSegmentsIdx: index("tenant_segments_idx").on(table.tenantId, table.isActive),
}));

export const customerSegmentMembers = mysqlTable("customerSegmentMembers", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  segmentId: int("segmentId").notNull(),
  customerId: int("customerId").notNull(),
  
  // For dynamic segments, track when added
  addedAt: timestamp("addedAt").defaultNow().notNull(),
  
  // For manual additions to static segments
  addedBy: int("addedBy"),
}, (table) => ({
  segmentCustomerIdx: uniqueIndex("segment_customer_idx").on(table.segmentId, table.customerId),
  customerSegmentsIdx: index("customer_segments_idx").on(table.customerId),
  tenantMembersIdx: index("tenant_members_idx").on(table.tenantId),
}));

// ============================================================================
// MARKETING CAMPAIGNS
// ============================================================================

export const marketingCampaigns = mysqlTable("marketingCampaigns", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Campaign Info
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  
  // Campaign Type
  type: mysqlEnum("type", [
    "birthday",
    "anniversary",
    "re_engagement",
    "promotional",
    "seasonal",
    "custom"
  ]).notNull(),
  
  // Target Audience
  targetType: mysqlEnum("targetType", ["all_customers", "segment", "custom"]).notNull(),
  targetSegmentId: int("targetSegmentId"), // If targetType = segment
  
  // Message Content
  channel: mysqlEnum("channel", ["email", "sms", "both"]).notNull(),
  emailSubject: varchar("emailSubject", { length: 200 }),
  emailBody: text("emailBody"),
  smsMessage: text("smsMessage"),
  
  // Discount/Offer (optional)
  includeDiscount: boolean("includeDiscount").default(false).notNull(),
  discountType: mysqlEnum("discountType", ["percentage", "fixed_amount", "promo_code"]),
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }),
  promoCodeId: int("promoCodeId"),
  
  // Schedule
  scheduleType: mysqlEnum("scheduleType", ["immediate", "scheduled", "recurring", "trigger"]).notNull(),
  scheduledAt: timestamp("scheduledAt"),
  
  // Recurring Settings
  recurringInterval: mysqlEnum("recurringInterval", ["daily", "weekly", "monthly"]),
  recurringDayOfWeek: int("recurringDayOfWeek"), // 0-6
  recurringDayOfMonth: int("recurringDayOfMonth"), // 1-31
  
  // Trigger Settings (for automated campaigns)
  triggerEvent: mysqlEnum("triggerEvent", [
    "birthday",
    "anniversary",
    "days_since_last_visit",
    "total_spent_reached",
    "visit_count_reached"
  ]),
  triggerValue: int("triggerValue"), // e.g., 30 days, 1000 NOK, 10 visits
  
  // Status
  status: mysqlEnum("status", ["draft", "scheduled", "running", "paused", "completed", "cancelled"]).default("draft").notNull(),
  
  // Statistics
  totalRecipients: int("totalRecipients").default(0).notNull(),
  emailsSent: int("emailsSent").default(0).notNull(),
  smsSent: int("smsSent").default(0).notNull(),
  emailsOpened: int("emailsOpened").default(0).notNull(),
  linksClicked: int("linksClicked").default(0).notNull(),
  conversions: int("conversions").default(0).notNull(),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0.00").notNull(),
  
  // Dates
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  
  // Metadata
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantCampaignsIdx: index("tenant_campaigns_idx").on(table.tenantId, table.status),
  typeIdx: index("type_idx").on(table.type),
  scheduledIdx: index("scheduled_idx").on(table.scheduledAt, table.status),
}));

export const campaignRecipients = mysqlTable("campaignRecipients", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  campaignId: int("campaignId").notNull(),
  customerId: int("customerId").notNull(),
  
  // Delivery Status
  emailSent: boolean("emailSent").default(false).notNull(),
  emailSentAt: timestamp("emailSentAt"),
  emailOpened: boolean("emailOpened").default(false).notNull(),
  emailOpenedAt: timestamp("emailOpenedAt"),
  
  smsSent: boolean("smsSent").default(false).notNull(),
  smsSentAt: timestamp("smsSentAt"),
  
  linkClicked: boolean("linkClicked").default(false).notNull(),
  linkClickedAt: timestamp("linkClickedAt"),
  
  // Conversion
  converted: boolean("converted").default(false).notNull(),
  convertedAt: timestamp("convertedAt"),
  conversionValue: decimal("conversionValue", { precision: 10, scale: 2 }),
  
  // Errors
  errorMessage: text("errorMessage"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  campaignCustomerIdx: uniqueIndex("campaign_customer_idx").on(table.campaignId, table.customerId),
  customerCampaignsIdx: index("customer_campaigns_idx").on(table.customerId),
  tenantRecipientsIdx: index("tenant_recipients_idx").on(table.tenantId),
}));

// ============================================================================
// REFERRAL PROGRAM
// ============================================================================

export const referralProgram = mysqlTable("referralProgram", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Program Settings
  isActive: boolean("isActive").default(true).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  
  // Rewards
  referrerRewardType: mysqlEnum("referrerRewardType", ["percentage", "fixed_amount", "free_service", "points"]).notNull(),
  referrerRewardValue: decimal("referrerRewardValue", { precision: 10, scale: 2 }).notNull(),
  
  refereeRewardType: mysqlEnum("refereeRewardType", ["percentage", "fixed_amount", "free_service", "points"]).notNull(),
  refereeRewardValue: decimal("refereeRewardValue", { precision: 10, scale: 2 }).notNull(),
  
  // Conditions
  minimumPurchase: decimal("minimumPurchase", { precision: 10, scale: 2 }),
  maxReferralsPerCustomer: int("maxReferralsPerCustomer"), // null = unlimited
  rewardExpiryDays: int("rewardExpiryDays"), // null = no expiry
  
  // Statistics
  totalReferrals: int("totalReferrals").default(0).notNull(),
  successfulReferrals: int("successfulReferrals").default(0).notNull(),
  totalRewardsGiven: decimal("totalRewardsGiven", { precision: 10, scale: 2 }).default("0.00").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantProgramIdx: index("tenant_program_idx").on(table.tenantId, table.isActive),
}));

export const referrals = mysqlTable("referrals", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  programId: int("programId").notNull(),
  
  // Referrer (existing customer)
  referrerId: int("referrerId").notNull(),
  referralCode: varchar("referralCode", { length: 50 }).notNull().unique(),
  
  // Referee (new customer)
  refereeId: int("refereeId"),
  refereeName: varchar("refereeName", { length: 200 }),
  refereeEmail: varchar("refereeEmail", { length: 320 }),
  refereePhone: varchar("refereePhone", { length: 20 }),
  
  // Status
  status: mysqlEnum("status", ["pending", "completed", "rewarded", "expired", "cancelled"]).default("pending").notNull(),
  
  // Rewards
  referrerRewarded: boolean("referrerRewarded").default(false).notNull(),
  referrerRewardAmount: decimal("referrerRewardAmount", { precision: 10, scale: 2 }),
  referrerRewardedAt: timestamp("referrerRewardedAt"),
  
  refereeRewarded: boolean("refereeRewarded").default(false).notNull(),
  refereeRewardAmount: decimal("refereeRewardAmount", { precision: 10, scale: 2 }),
  refereeRewardedAt: timestamp("refereeRewardedAt"),
  
  // Conversion
  firstPurchaseAt: timestamp("firstPurchaseAt"),
  firstPurchaseAmount: decimal("firstPurchaseAmount", { precision: 10, scale: 2 }),
  
  expiresAt: timestamp("expiresAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantReferralsIdx: index("tenant_referrals_idx").on(table.tenantId, table.status),
  referrerIdx: index("referrer_idx").on(table.referrerId),
  referralCodeIdx: uniqueIndex("referral_code_idx").on(table.referralCode),
  refereeIdx: index("referee_idx").on(table.refereeId),
}));

// ============================================================================
// GIFT CARDS & VOUCHERS
// ============================================================================

export const giftCards = mysqlTable("giftCards", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Card Info
  code: varchar("code", { length: 50 }).notNull().unique(),
  type: mysqlEnum("type", ["gift_card", "voucher"]).notNull(),
  
  // Value
  initialValue: decimal("initialValue", { precision: 10, scale: 2 }).notNull(),
  currentBalance: decimal("currentBalance", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("NOK").notNull(),
  
  // Ownership
  purchasedBy: int("purchasedBy"), // Customer who purchased
  recipientName: varchar("recipientName", { length: 200 }),
  recipientEmail: varchar("recipientEmail", { length: 320 }),
  recipientPhone: varchar("recipientPhone", { length: 20 }),
  
  // Restrictions
  applicableServices: json("applicableServices").$type<number[]>(), // Service IDs, null = all
  applicableProducts: json("applicableProducts").$type<number[]>(), // Product IDs, null = all
  minimumPurchase: decimal("minimumPurchase", { precision: 10, scale: 2 }),
  
  // Validity
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"),
  
  // Status
  status: mysqlEnum("status", ["active", "partially_used", "fully_used", "expired", "cancelled"]).default("active").notNull(),
  
  // Payment
  paymentId: int("paymentId"), // Reference to payment if purchased
  
  // Message (for gift cards)
  personalMessage: text("personalMessage"),
  
  // Metadata
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantCardsIdx: index("tenant_cards_idx").on(table.tenantId, table.status),
  codeIdx: uniqueIndex("code_idx").on(table.code),
  purchasedByIdx: index("purchased_by_idx").on(table.purchasedBy),
  expiresIdx: index("expires_idx").on(table.expiresAt, table.status),
}));

export const giftCardTransactions = mysqlTable("giftCardTransactions", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  giftCardId: int("giftCardId").notNull(),
  
  // Transaction Type
  type: mysqlEnum("type", ["purchase", "redemption", "refund", "adjustment"]).notNull(),
  
  // Amount
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceBefore: decimal("balanceBefore", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balanceAfter", { precision: 10, scale: 2 }).notNull(),
  
  // Related Entities
  orderId: int("orderId"),
  appointmentId: int("appointmentId"),
  paymentId: int("paymentId"),
  
  // Metadata
  notes: text("notes"),
  processedBy: int("processedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  giftCardIdx: index("gift_card_idx").on(table.giftCardId),
  tenantTransactionsIdx: index("tenant_transactions_idx").on(table.tenantId, table.createdAt),
  orderIdx: index("order_idx").on(table.orderId),
}));

// ============================================================================
// PROMOTIONAL CODES & DISCOUNTS
// ============================================================================

export const promoCodes = mysqlTable("promoCodes", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Code Info
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  
  // Discount Type
  discountType: mysqlEnum("discountType", ["percentage", "fixed_amount", "free_service"]).notNull(),
  discountValue: decimal("discountValue", { precision: 10, scale: 2 }).notNull(),
  maxDiscount: decimal("maxDiscount", { precision: 10, scale: 2 }), // Max discount for percentage type
  
  // Restrictions
  minimumPurchase: decimal("minimumPurchase", { precision: 10, scale: 2 }),
  applicableServices: json("applicableServices").$type<number[]>(),
  applicableProducts: json("applicableProducts").$type<number[]>(),
  applicableCategories: json("applicableCategories").$type<string[]>(),
  
  // Usage Limits
  maxUses: int("maxUses"), // null = unlimited
  maxUsesPerCustomer: int("maxUsesPerCustomer").default(1).notNull(),
  currentUses: int("currentUses").default(0).notNull(),
  
  // Customer Restrictions
  customerSegmentId: int("customerSegmentId"), // null = all customers
  firstTimeCustomersOnly: boolean("firstTimeCustomersOnly").default(false).notNull(),
  
  // Validity
  validFrom: timestamp("validFrom").notNull(),
  validUntil: timestamp("validUntil"),
  
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  
  // Statistics
  totalRevenue: decimal("totalRevenue", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalDiscount: decimal("totalDiscount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  
  // Metadata
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantCodesIdx: index("tenant_codes_idx").on(table.tenantId, table.isActive),
  codeIdx: uniqueIndex("code_idx").on(table.tenantId, table.code),
  validityIdx: index("validity_idx").on(table.validFrom, table.validUntil),
}));

export const promoCodeUsage = mysqlTable("promoCodeUsage", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  promoCodeId: int("promoCodeId").notNull(),
  customerId: int("customerId").notNull(),
  
  // Usage Details
  orderId: int("orderId"),
  appointmentId: int("appointmentId"),
  
  orderAmount: decimal("orderAmount", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discountAmount", { precision: 10, scale: 2 }).notNull(),
  finalAmount: decimal("finalAmount", { precision: 10, scale: 2 }).notNull(),
  
  usedAt: timestamp("usedAt").defaultNow().notNull(),
}, (table) => ({
  promoCodeIdx: index("promo_code_idx").on(table.promoCodeId),
  customerIdx: index("customer_idx").on(table.customerId),
  tenantUsageIdx: index("tenant_usage_idx").on(table.tenantId, table.usedAt),
}));

// ============================================================================
// CUSTOMER FEEDBACK & REVIEWS
// ============================================================================

export const customerFeedback = mysqlTable("customerFeedback", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Customer
  customerId: int("customerId").notNull(),
  
  // Related Entity
  feedbackType: mysqlEnum("feedbackType", ["appointment", "service", "employee", "general"]).notNull(),
  appointmentId: int("appointmentId"),
  serviceId: int("serviceId"),
  employeeId: int("employeeId"),
  
  // Rating
  rating: int("rating").notNull(), // 1-5 stars
  
  // Review
  title: varchar("title", { length: 200 }),
  comment: text("comment"),
  
  // Status
  status: mysqlEnum("status", ["pending", "approved", "rejected", "hidden"]).default("pending").notNull(),
  isPublic: boolean("isPublic").default(false).notNull(),
  
  // Response
  response: text("response"),
  respondedBy: int("respondedBy"),
  respondedAt: timestamp("respondedAt"),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantFeedbackIdx: index("tenant_feedback_idx").on(table.tenantId, table.status),
  customerIdx: index("customer_idx").on(table.customerId),
  appointmentIdx: index("appointment_idx").on(table.appointmentId),
  serviceIdx: index("service_idx").on(table.serviceId),
  employeeIdx: index("employee_idx").on(table.employeeId),
  ratingIdx: index("rating_idx").on(table.rating),
}));

// ============================================================================
// NPS (NET PROMOTER SCORE)
// ============================================================================

export const npsSurveys = mysqlTable("npsSurveys", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  customerId: int("customerId").notNull(),
  
  // NPS Score (0-10)
  score: int("score").notNull(),
  
  // Category based on score
  category: mysqlEnum("category", ["detractor", "passive", "promoter"]).notNull(),
  // Detractor: 0-6, Passive: 7-8, Promoter: 9-10
  
  // Feedback
  feedback: text("feedback"),
  
  // Trigger
  triggeredBy: mysqlEnum("triggeredBy", ["appointment_completion", "purchase", "campaign", "manual"]).notNull(),
  appointmentId: int("appointmentId"),
  orderId: int("orderId"),
  campaignId: int("campaignId"),
  
  // Follow-up
  followedUp: boolean("followedUp").default(false).notNull(),
  followUpNotes: text("followUpNotes"),
  followedUpBy: int("followedUpBy"),
  followedUpAt: timestamp("followedUpAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantSurveysIdx: index("tenant_surveys_idx").on(table.tenantId, table.createdAt),
  customerIdx: index("customer_idx").on(table.customerId),
  scoreIdx: index("score_idx").on(table.score),
  categoryIdx: index("category_idx").on(table.category),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CustomerSegment = typeof customerSegments.$inferSelect;
export type InsertCustomerSegment = typeof customerSegments.$inferInsert;

export type CustomerSegmentMember = typeof customerSegmentMembers.$inferSelect;
export type InsertCustomerSegmentMember = typeof customerSegmentMembers.$inferInsert;

export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;
export type InsertMarketingCampaign = typeof marketingCampaigns.$inferInsert;

export type CampaignRecipient = typeof campaignRecipients.$inferSelect;
export type InsertCampaignRecipient = typeof campaignRecipients.$inferInsert;

export type ReferralProgram = typeof referralProgram.$inferSelect;
export type InsertReferralProgram = typeof referralProgram.$inferInsert;

export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = typeof referrals.$inferInsert;

export type GiftCard = typeof giftCards.$inferSelect;
export type InsertGiftCard = typeof giftCards.$inferInsert;

export type GiftCardTransaction = typeof giftCardTransactions.$inferSelect;
export type InsertGiftCardTransaction = typeof giftCardTransactions.$inferInsert;

export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = typeof promoCodes.$inferInsert;

export type PromoCodeUsage = typeof promoCodeUsage.$inferSelect;
export type InsertPromoCodeUsage = typeof promoCodeUsage.$inferInsert;

export type CustomerFeedback = typeof customerFeedback.$inferSelect;
export type InsertCustomerFeedback = typeof customerFeedback.$inferInsert;

export type NpsSurvey = typeof npsSurveys.$inferSelect;
export type InsertNpsSurvey = typeof npsSurveys.$inferInsert;
