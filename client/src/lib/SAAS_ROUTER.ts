import { router, publicProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import * as schema from "./schema";
import { eq, and, desc, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

// ==========================================
// SAAS MANAGEMENT ROUTER
// Add this to your COMPLETE_ROUTERS.ts
// ==========================================

export const saasRouter = router({
  
  // ==========================================
  // AUTHENTICATION
  // ==========================================
  
  auth: router({
    // Register new tenant (Sign up)
    register: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string(),
        businessName: z.string(),
        businessType: z.string().optional(),
        phone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Check if email exists
        const [existingUser] = await db.select().from(schema.tenantUsers)
          .where(eq(schema.tenantUsers.email, input.email));
        
        if (existingUser) {
          throw new Error("Email already registered");
        }
        
        // Create tenant ID
        const tenantId = `tenant_${randomBytes(8).toString("hex")}`;
        
        // Create tenant
        const [tenant] = await db.insert(schema.tenants)
          .values({
            id: tenantId,
            name: input.businessName,
            email: input.email,
            phone: input.phone,
          })
          .returning();
        
        // Hash password
        const passwordHash = await bcrypt.hash(input.password, 10);
        
        // Create tenant user (owner)
        const [user] = await db.insert(schema.tenantUsers)
          .values({
            tenantId,
            email: input.email,
            passwordHash,
            name: input.name,
            role: "owner",
          })
          .returning();
        
        // Create subscription (14-day trial)
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14);
        
        await db.insert(schema.tenantSubscriptions).values({
          tenantId,
          plan: "free",
          status: "active",
          billingCycle: "monthly",
          price: "0",
          startDate: new Date(),
          trialEndsAt,
          nextBillingDate: trialEndsAt,
        });
        
        // Create tenant settings
        await db.insert(schema.tenantSettings).values({
          tenantId,
          businessName: input.businessName,
          businessType: input.businessType,
        });
        
        // Create onboarding
        await db.insert(schema.tenantOnboarding).values({
          tenantId,
          currentStep: 1,
          completedSteps: [],
        });
        
        // Create session
        const sessionToken = randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
        
        await db.insert(schema.userSessions).values({
          userId: user.id,
          sessionToken,
          expiresAt,
        });
        
        // Audit log
        await db.insert(schema.auditLog).values({
          tenantId,
          userId: user.id,
          action: "register",
          entityType: "tenant",
          entityId: user.id,
        });
        
        return {
          success: true,
          sessionToken,
          tenantId,
          userId: user.id,
          trialEndsAt,
        };
      }),

    // Login
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input }) => {
        const [user] = await db.select().from(schema.tenantUsers)
          .where(eq(schema.tenantUsers.email, input.email));
        
        if (!user) {
          throw new Error("Invalid credentials");
        }
        
        if (!user.isActive) {
          throw new Error("Account is deactivated");
        }
        
        const isValid = await bcrypt.compare(input.password, user.passwordHash);
        
        if (!isValid) {
          throw new Error("Invalid credentials");
        }
        
        // Check subscription status
        const [subscription] = await db.select().from(schema.tenantSubscriptions)
          .where(eq(schema.tenantSubscriptions.tenantId, user.tenantId));
        
        if (subscription && subscription.status === "suspended") {
          throw new Error("Subscription suspended. Please contact support.");
        }
        
        // Update last login
        await db.update(schema.tenantUsers)
          .set({ lastLoginAt: new Date() })
          .where(eq(schema.tenantUsers.id, user.id));
        
        // Create session
        const sessionToken = randomBytes(32).toString("hex");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        
        await db.insert(schema.userSessions).values({
          userId: user.id,
          sessionToken,
          expiresAt,
        });
        
        // Audit log
        await db.insert(schema.auditLog).values({
          tenantId: user.tenantId,
          userId: user.id,
          action: "login",
          entityType: "user",
          entityId: user.id,
        });
        
        return {
          success: true,
          sessionToken,
          tenantId: user.tenantId,
          userId: user.id,
          role: user.role,
        };
      }),

    // Logout
    logout: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .mutation(async ({ input }) => {
        await db.delete(schema.userSessions)
          .where(eq(schema.userSessions.sessionToken, input.sessionToken));
        
        return { success: true };
      }),

    // Verify session
    verifySession: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .query(async ({ input }) => {
        const [session] = await db.select().from(schema.userSessions)
          .where(eq(schema.userSessions.sessionToken, input.sessionToken));
        
        if (!session) {
          throw new Error("Invalid session");
        }
        
        if (new Date() > session.expiresAt) {
          await db.delete(schema.userSessions)
            .where(eq(schema.userSessions.id, session.id));
          throw new Error("Session expired");
        }
        
        const [user] = await db.select().from(schema.tenantUsers)
          .where(eq(schema.tenantUsers.id, session.userId));
        
        return {
          valid: true,
          userId: user.id,
          tenantId: user.tenantId,
          role: user.role,
          name: user.name,
          email: user.email,
        };
      }),

    // Request password reset
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const [user] = await db.select().from(schema.tenantUsers)
          .where(eq(schema.tenantUsers.email, input.email));
        
        if (!user) {
          // Don't reveal if email exists
          return { success: true };
        }
        
        const resetToken = randomBytes(32).toString("hex");
        const resetExpires = new Date();
        resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour
        
        await db.update(schema.tenantUsers)
          .set({
            passwordResetToken: resetToken,
            passwordResetExpires: resetExpires,
          })
          .where(eq(schema.tenantUsers.id, user.id));
        
        // TODO: Send email with reset link
        // const resetLink = `https://yourdomain.com/reset-password?token=${resetToken}`;
        
        return { success: true };
      }),

    // Reset password
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string(),
        newPassword: z.string().min(8),
      }))
      .mutation(async ({ input }) => {
        const [user] = await db.select().from(schema.tenantUsers)
          .where(eq(schema.tenantUsers.passwordResetToken, input.token));
        
        if (!user) {
          throw new Error("Invalid or expired reset token");
        }
        
        if (!user.passwordResetExpires || new Date() > user.passwordResetExpires) {
          throw new Error("Reset token expired");
        }
        
        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        
        await db.update(schema.tenantUsers)
          .set({
            passwordHash,
            passwordResetToken: null,
            passwordResetExpires: null,
          })
          .where(eq(schema.tenantUsers.id, user.id));
        
        return { success: true };
      }),
  }),

  // ==========================================
  // TENANT MANAGEMENT
  // ==========================================
  
  tenants: router({
    // Get current tenant info
    getCurrent: publicProcedure
      .input(z.object({ tenantId: z.string() }))
      .query(async ({ input }) => {
        const [tenant] = await db.select().from(schema.tenants)
          .where(eq(schema.tenants.id, input.tenantId));
        
        const [subscription] = await db.select().from(schema.tenantSubscriptions)
          .where(eq(schema.tenantSubscriptions.tenantId, input.tenantId));
        
        const [settings] = await db.select().from(schema.tenantSettings)
          .where(eq(schema.tenantSettings.tenantId, input.tenantId));
        
        return {
          tenant,
          subscription,
          settings,
        };
      }),

    // Update tenant
    update: publicProcedure
      .input(z.object({
        tenantId: z.string(),
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { tenantId, ...data } = input;
        
        const [tenant] = await db.update(schema.tenants)
          .set(data)
          .where(eq(schema.tenants.id, tenantId))
          .returning();
        
        return tenant;
      }),

    // Get all tenants (Super Admin only)
    getAll: publicProcedure
      .query(async () => {
        const tenants = await db.select().from(schema.tenants)
          .orderBy(desc(schema.tenants.createdAt));
        
        // Get subscriptions for all tenants
        const subscriptions = await db.select().from(schema.tenantSubscriptions);
        
        return tenants.map(tenant => {
          const subscription = subscriptions.find(s => s.tenantId === tenant.id);
          return {
            ...tenant,
            subscription,
          };
        });
      }),
  }),

  // ==========================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================
  
  subscriptions: router({
    // Get available plans
    getPlans: publicProcedure
      .query(async () => {
        return await db.select().from(schema.subscriptionPlans)
          .where(eq(schema.subscriptionPlans.isActive, true))
          .orderBy(schema.subscriptionPlans.sortOrder);
      }),

    // Get current subscription
    getCurrent: publicProcedure
      .input(z.object({ tenantId: z.string() }))
      .query(async ({ input }) => {
        const [subscription] = await db.select().from(schema.tenantSubscriptions)
          .where(eq(schema.tenantSubscriptions.tenantId, input.tenantId));
        
        return subscription;
      }),

    // Upgrade/Change plan
    changePlan: publicProcedure
      .input(z.object({
        tenantId: z.string(),
        planSlug: z.string(),
        billingCycle: z.enum(["monthly", "yearly"]),
      }))
      .mutation(async ({ input }) => {
        const [plan] = await db.select().from(schema.subscriptionPlans)
          .where(eq(schema.subscriptionPlans.slug, input.planSlug));
        
        if (!plan) {
          throw new Error("Plan not found");
        }
        
        const price = input.billingCycle === "monthly" 
          ? plan.monthlyPrice 
          : plan.yearlyPrice;
        
        const nextBillingDate = new Date();
        if (input.billingCycle === "monthly") {
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        } else {
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        }
        
        const [subscription] = await db.update(schema.tenantSubscriptions)
          .set({
            plan: input.planSlug,
            billingCycle: input.billingCycle,
            price,
            nextBillingDate,
            updatedAt: new Date(),
          })
          .where(eq(schema.tenantSubscriptions.tenantId, input.tenantId))
          .returning();
        
        return subscription;
      }),

    // Cancel subscription
    cancel: publicProcedure
      .input(z.object({ tenantId: z.string() }))
      .mutation(async ({ input }) => {
        await db.update(schema.tenantSubscriptions)
          .set({
            status: "cancelled",
            autoRenew: false,
            cancelledAt: new Date(),
          })
          .where(eq(schema.tenantSubscriptions.tenantId, input.tenantId));
        
        return { success: true };
      }),
  }),

  // ==========================================
  // INVOICES
  // ==========================================
  
  invoices: router({
    // Get tenant invoices
    getAll: publicProcedure
      .input(z.object({ tenantId: z.string() }))
      .query(async ({ input }) => {
        return await db.select().from(schema.tenantInvoices)
          .where(eq(schema.tenantInvoices.tenantId, input.tenantId))
          .orderBy(desc(schema.tenantInvoices.createdAt));
      }),

    // Create invoice
    create: publicProcedure
      .input(z.object({
        tenantId: z.string(),
        amount: z.string(),
        tax: z.string().optional(),
        items: z.any(),
        dueDate: z.date(),
      }))
      .mutation(async ({ input }) => {
        const invoiceNumber = `INV-${Date.now()}`;
        const total = (parseFloat(input.amount) + parseFloat(input.tax || "0")).toString();
        
        const [invoice] = await db.insert(schema.tenantInvoices)
          .values({
            ...input,
            invoiceNumber,
            total,
            tax: input.tax || "0",
          })
          .returning();
        
        return invoice;
      }),

    // Mark as paid
    markPaid: publicProcedure
      .input(z.object({
        invoiceId: z.number(),
        paymentMethod: z.string(),
        transactionId: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.update(schema.tenantInvoices)
          .set({
            status: "paid",
            paidAt: new Date(),
            paymentMethod: input.paymentMethod,
            paymentTransactionId: input.transactionId,
          })
          .where(eq(schema.tenantInvoices.id, input.invoiceId));
        
        return { success: true };
      }),
  }),

  // ==========================================
  // USAGE TRACKING
  // ==========================================
  
  usage: router({
    // Get current usage
    getCurrent: publicProcedure
      .input(z.object({ tenantId: z.string() }))
      .query(async ({ input }) => {
        const period = new Date().toISOString().slice(0, 7); // YYYY-MM
        
        const [usage] = await db.select().from(schema.tenantUsage)
          .where(and(
            eq(schema.tenantUsage.tenantId, input.tenantId),
            eq(schema.tenantUsage.period, period)
          ));
        
        if (!usage) {
          // Create if doesn't exist
          const [newUsage] = await db.insert(schema.tenantUsage)
            .values({
              tenantId: input.tenantId,
              period,
            })
            .returning();
          return newUsage;
        }
        
        return usage;
      }),

    // Track usage
    track: publicProcedure
      .input(z.object({
        tenantId: z.string(),
        type: z.enum(["booking", "customer", "employee", "sms", "email", "api"]),
      }))
      .mutation(async ({ input }) => {
        const period = new Date().toISOString().slice(0, 7);
        
        const fieldMap = {
          booking: "bookingsCount",
          customer: "customersCount",
          employee: "employeesCount",
          sms: "smsCount",
          email: "emailCount",
          api: "apiCallsCount",
        };
        
        const field = fieldMap[input.type];
        
        await db.insert(schema.tenantUsage)
          .values({
            tenantId: input.tenantId,
            period,
            [field]: 1,
          })
          .onConflictDoUpdate({
            target: [schema.tenantUsage.tenantId, schema.tenantUsage.period],
            set: {
              [field]: sql`${schema.tenantUsage[field]} + 1`,
            },
          });
        
        return { success: true };
      }),
  }),

  // ==========================================
  // SETTINGS
  // ==========================================
  
  settings: router({
    // Get settings
    get: publicProcedure
      .input(z.object({ tenantId: z.string() }))
      .query(async ({ input }) => {
        const [settings] = await db.select().from(schema.tenantSettings)
          .where(eq(schema.tenantSettings.tenantId, input.tenantId));
        
        return settings;
      }),

    // Update settings
    update: publicProcedure
      .input(z.object({
        tenantId: z.string(),
        businessName: z.string().optional(),
        logo: z.string().optional(),
        timezone: z.string().optional(),
        language: z.string().optional(),
        currency: z.string().optional(),
        bookingSettings: z.any().optional(),
        notificationSettings: z.any().optional(),
        paymentSettings: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const { tenantId, ...data } = input;
        
        const [settings] = await db.update(schema.tenantSettings)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(schema.tenantSettings.tenantId, tenantId))
          .returning();
        
        return settings;
      }),
  }),

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  
  notifications: router({
    // Get notifications
    getAll: publicProcedure
      .input(z.object({ 
        tenantId: z.string(),
        userId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        let query = db.select().from(schema.systemNotifications)
          .where(eq(schema.systemNotifications.tenantId, input.tenantId));
        
        if (input.userId) {
          query = query.where(eq(schema.systemNotifications.userId, input.userId));
        }
        
        return await query.orderBy(desc(schema.systemNotifications.createdAt));
      }),

    // Mark as read
    markRead: publicProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ input }) => {
        await db.update(schema.systemNotifications)
          .set({ isRead: true, readAt: new Date() })
          .where(eq(schema.systemNotifications.id, input.notificationId));
        
        return { success: true };
      }),
  }),
});
