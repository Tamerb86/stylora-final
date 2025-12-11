// ==========================================
// INPUT VALIDATION SCHEMAS - STYLORA
// Using Zod for type-safe validation
// ==========================================

import { z } from "zod";

// ==========================================
// 1. COMMON SCHEMAS
// ==========================================

// Norwegian phone number (8 digits, optional +47)
export const norwegianPhoneSchema = z.string()
  .regex(/^(\+47)?[0-9]{8}$/, "Invalid Norwegian phone number")
  .transform((val) => val.replace(/\+47/, ""));

// Email with additional validation
export const emailSchema = z.string()
  .email("Invalid email address")
  .min(5, "Email too short")
  .max(100, "Email too long")
  .toLowerCase()
  .trim();

// Strong password
export const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// Tenant ID
export const tenantIdSchema = z.string()
  .min(1, "Tenant ID required")
  .max(50, "Tenant ID too long");

// Positive integer
export const positiveIntSchema = z.number()
  .int("Must be an integer")
  .positive("Must be positive");

// Positive decimal (for prices)
export const priceSchema = z.number()
  .positive("Price must be positive")
  .multipleOf(0.01, "Price must have at most 2 decimal places");

// Date in future
export const futureDateSchema = z.date()
  .refine((date) => date > new Date(), "Date must be in the future");

// ==========================================
// 2. USER SCHEMAS
// ==========================================

export const registerSchema = z.object({
  name: z.string().min(2, "Name too short").max(100, "Name too long").trim(),
  businessName: z.string().min(2).max(200).trim(),
  email: emailSchema,
  phone: norwegianPhoneSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password required"),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

// ==========================================
// 3. CUSTOMER SCHEMAS
// ==========================================

export const createCustomerSchema = z.object({
  tenantId: tenantIdSchema,
  name: z.string().min(2).max(100).trim(),
  email: emailSchema.optional(),
  phone: norwegianPhoneSchema,
  address: z.string().max(500).trim().optional(),
  notes: z.string().max(1000).trim().optional(),
});

export const updateCustomerSchema = z.object({
  id: positiveIntSchema,
  tenantId: tenantIdSchema,
  name: z.string().min(2).max(100).trim().optional(),
  email: emailSchema.optional(),
  phone: norwegianPhoneSchema.optional(),
  address: z.string().max(500).trim().optional(),
  notes: z.string().max(1000).trim().optional(),
});

// ==========================================
// 4. BOOKING SCHEMAS
// ==========================================

export const createBookingSchema = z.object({
  tenantId: tenantIdSchema,
  customerId: positiveIntSchema,
  employeeId: positiveIntSchema,
  serviceId: positiveIntSchema,
  appointmentDate: z.date(),
  duration: z.number().int().min(15, "Duration must be at least 15 minutes").max(480, "Duration too long"),
  notes: z.string().max(1000).trim().optional(),
}).refine((data) => data.appointmentDate > new Date(), {
  message: "Appointment date must be in the future",
  path: ["appointmentDate"],
});

export const cancelBookingSchema = z.object({
  id: positiveIntSchema,
  tenantId: tenantIdSchema,
  cancellationReason: z.string().min(5, "Reason too short").max(500).trim(),
});

export const modifyBookingSchema = z.object({
  id: positiveIntSchema,
  tenantId: tenantIdSchema,
  appointmentDate: z.date().optional(),
  employeeId: positiveIntSchema.optional(),
  notes: z.string().max(1000).trim().optional(),
});

// ==========================================
// 5. SERVICE SCHEMAS
// ==========================================

export const createServiceSchema = z.object({
  tenantId: tenantIdSchema,
  name: z.string().min(2, "Name too short").max(100, "Name too long").trim(),
  description: z.string().max(1000).trim().optional(),
  duration: z.number().int().min(15).max(480),
  price: priceSchema,
  category: z.string().max(50).trim().optional(),
});

export const updateServiceSchema = z.object({
  id: positiveIntSchema,
  tenantId: tenantIdSchema,
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(1000).trim().optional(),
  duration: z.number().int().min(15).max(480).optional(),
  price: priceSchema.optional(),
  category: z.string().max(50).trim().optional(),
  isActive: z.boolean().optional(),
});

// ==========================================
// 6. EMPLOYEE SCHEMAS
// ==========================================

export const createEmployeeSchema = z.object({
  tenantId: tenantIdSchema,
  name: z.string().min(2).max(100).trim(),
  email: emailSchema.optional(),
  phone: norwegianPhoneSchema.optional(),
  role: z.enum(["owner", "manager", "employee"]),
});

export const updateEmployeeSchema = z.object({
  id: positiveIntSchema,
  tenantId: tenantIdSchema,
  name: z.string().min(2).max(100).trim().optional(),
  email: emailSchema.optional(),
  phone: norwegianPhoneSchema.optional(),
  role: z.enum(["owner", "manager", "employee"]).optional(),
  isActive: z.boolean().optional(),
});

// ==========================================
// 7. PAYMENT SCHEMAS
// ==========================================

export const createPaymentSchema = z.object({
  tenantId: tenantIdSchema,
  orderId: positiveIntSchema,
  amount: priceSchema,
  method: z.enum(["cash", "card", "vipps", "invoice"]),
  provider: z.string().max(50).optional(),
  transactionId: z.string().max(100).optional(),
});

// ==========================================
// 8. INVENTORY SCHEMAS
// ==========================================

export const createInventoryItemSchema = z.object({
  tenantId: tenantIdSchema,
  name: z.string().min(2).max(200).trim(),
  sku: z.string().max(50).trim().optional(),
  barcode: z.string().max(50).trim().optional(),
  category: z.string().max(100).trim().optional(),
  quantity: z.number().int().min(0),
  unit: z.string().max(20).trim(),
  costPrice: priceSchema.optional(),
  sellingPrice: priceSchema.optional(),
  reorderLevel: z.number().int().min(0).optional(),
  supplierId: positiveIntSchema.optional(),
});

export const updateInventorySchema = z.object({
  id: positiveIntSchema,
  tenantId: tenantIdSchema,
  quantity: z.number().int().min(0),
  reason: z.string().min(5).max(500).trim(),
});

// ==========================================
// 9. COMMISSION SCHEMAS
// ==========================================

export const createCommissionRuleSchema = z.object({
  tenantId: tenantIdSchema,
  name: z.string().min(2).max(100).trim(),
  type: z.enum(["percentage", "fixed", "tiered"]),
  value: z.number().positive(),
  appliesTo: z.enum(["all_services", "specific_services", "specific_categories"]),
  serviceIds: z.array(positiveIntSchema).optional(),
  categories: z.array(z.string()).optional(),
  minAmount: priceSchema.optional(),
  maxAmount: priceSchema.optional(),
});

// ==========================================
// 10. CRM SCHEMAS
// ==========================================

export const createCampaignSchema = z.object({
  tenantId: tenantIdSchema,
  name: z.string().min(2).max(200).trim(),
  type: z.enum(["email", "sms", "push"]),
  subject: z.string().min(5).max(200).trim().optional(),
  content: z.string().min(10).max(5000).trim(),
  segmentId: positiveIntSchema.optional(),
  scheduledFor: z.date().optional(),
});

export const createGiftCardSchema = z.object({
  tenantId: tenantIdSchema,
  code: z.string().min(6).max(20).trim().toUpperCase(),
  initialValue: priceSchema,
  expiresAt: z.date().optional(),
  recipientName: z.string().max(100).trim().optional(),
  recipientEmail: emailSchema.optional(),
  message: z.string().max(500).trim().optional(),
});

// ==========================================
// 11. REPORT SCHEMAS
// ==========================================

export const dateRangeSchema = z.object({
  tenantId: tenantIdSchema,
  startDate: z.date(),
  endDate: z.date(),
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
}).refine((data) => {
  const daysDiff = (data.endDate.getTime() - data.startDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff <= 365;
}, {
  message: "Date range cannot exceed 365 days",
  path: ["endDate"],
});

// ==========================================
// 12. FILE UPLOAD SCHEMAS
// ==========================================

export const fileUploadSchema = z.object({
  filename: z.string().min(1).max(255).regex(/^[a-zA-Z0-9._-]+$/, "Invalid filename"),
  mimetype: z.enum([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ]),
  size: z.number().max(5 * 1024 * 1024, "File size must be less than 5MB"),
});

// ==========================================
// 13. SEARCH & FILTER SCHEMAS
// ==========================================

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export const searchSchema = z.object({
  tenantId: tenantIdSchema,
  query: z.string().min(1).max(200).trim(),
  ...paginationSchema.shape,
});

export const sortSchema = z.object({
  sortBy: z.string().max(50),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// ==========================================
// 14. VALIDATION HELPERS
// ==========================================

export const validateInput = <T>(schema: z.ZodSchema<T>, input: unknown): T => {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`);
      throw new Error(`Validation failed: ${messages.join(", ")}`);
    }
    throw error;
  }
};

export const validateInputSafe = <T>(
  schema: z.ZodSchema<T>,
  input: unknown
): { success: true; data: T } | { success: false; errors: string[] } => {
  const result = schema.safeParse(input);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const errors = result.error.errors.map((err) => `${err.path.join(".")}: ${err.message}`);
    return { success: false, errors };
  }
};

// ==========================================
// 15. USAGE EXAMPLES
// ==========================================

/*
// Example 1: Validate registration input
const result = validateInputSafe(registerSchema, {
  name: "John Doe",
  businessName: "John's Salon",
  email: "john@example.com",
  phone: "+4712345678",
  password: "Test123!@#",
  confirmPassword: "Test123!@#",
});

if (!result.success) {
  console.error("Validation errors:", result.errors);
} else {
  console.log("Valid data:", result.data);
}

// Example 2: Use in tRPC procedure
router({
  createCustomer: protectedProcedure
    .input(createCustomerSchema)
    .mutation(async ({ input }) => {
      // input is already validated and typed
      return await db.insert(schema.customers).values(input);
    }),
});

// Example 3: Custom validation
const customSchema = z.object({
  age: z.number().int().min(18, "Must be 18 or older"),
}).refine((data) => data.age < 100, {
  message: "Age seems unrealistic",
  path: ["age"],
});
*/

// ==========================================
// 16. EXPORT ALL SCHEMAS
// ==========================================

export default {
  // Common
  norwegianPhoneSchema,
  emailSchema,
  passwordSchema,
  tenantIdSchema,
  positiveIntSchema,
  priceSchema,
  futureDateSchema,
  
  // User
  registerSchema,
  loginSchema,
  updatePasswordSchema,
  resetPasswordSchema,
  
  // Customer
  createCustomerSchema,
  updateCustomerSchema,
  
  // Booking
  createBookingSchema,
  cancelBookingSchema,
  modifyBookingSchema,
  
  // Service
  createServiceSchema,
  updateServiceSchema,
  
  // Employee
  createEmployeeSchema,
  updateEmployeeSchema,
  
  // Payment
  createPaymentSchema,
  
  // Inventory
  createInventoryItemSchema,
  updateInventorySchema,
  
  // Commission
  createCommissionRuleSchema,
  
  // CRM
  createCampaignSchema,
  createGiftCardSchema,
  
  // Report
  dateRangeSchema,
  
  // File
  fileUploadSchema,
  
  // Search
  paginationSchema,
  searchSchema,
  sortSchema,
  
  // Helpers
  validateInput,
  validateInputSafe,
};
