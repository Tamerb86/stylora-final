import { z } from "zod";
import { router, protectedProcedure } from "./trpc";
import { getDb } from "./db";
import { tripletexSettings, tripletexSyncLog } from "./tripletex_schema";
import { eq, desc } from "drizzle-orm";
import { TripletexClient } from "./tripletex_client";
import {
  syncCustomerToTripletex,
  syncCustomersToTripletex,
  getCustomerSyncStatus,
  getUnsyncedCustomers,
  syncOrderToTripletex,
  syncOrdersToTripletex,
  getUnsyncedOrders,
  syncPaymentToTripletex,
  syncRefundToTripletex,
} from "./tripletex_sync";

/**
 * Tripletex Integration Router
 * 
 * TRPC router for Tripletex integration endpoints
 */

export const tripletexRouter = router({
  // ============================================================================
  // SETTINGS
  // ============================================================================

  /**
   * Get Tripletex settings for current tenant
   */
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [settings] = await db
      .select()
      .from(tripletexSettings)
      .where(eq(tripletexSettings.tenantId, ctx.user.tenantId))
      .limit(1);

    return settings || null;
  }),

  /**
   * Update Tripletex settings
   */
  updateSettings: protectedProcedure
    .input(
      z.object({
        consumerToken: z.string().min(1),
        employeeToken: z.string().min(1),
        companyId: z.string().optional(),
        organizationNumber: z.string().optional(),
        baseUrl: z.string().url().default("https://tripletex.no/v2"),
        environment: z.enum(["production", "sandbox"]).default("production"),
        isEnabled: z.boolean().default(false),
        syncFrequency: z.enum(["manual", "daily", "weekly", "monthly"]).default("daily"),
        syncTime: z.string().default("23:00"),
        autoSyncCustomers: z.boolean().default(true),
        autoSyncInvoices: z.boolean().default(true),
        autoSyncPayments: z.boolean().default(true),
        defaultVatType: z.string().default("3"),
        defaultAccountCode: z.string().default("3000"),
        defaultPaymentTerms: z.number().default(14),
        defaultCurrency: z.string().default("NOK"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [existing] = await db
        .select()
        .from(tripletexSettings)
        .where(eq(tripletexSettings.tenantId, ctx.user.tenantId))
        .limit(1);

      if (existing) {
        await db
          .update(tripletexSettings)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(tripletexSettings.tenantId, ctx.user.tenantId));
      } else {
        await db.insert(tripletexSettings).values({
          tenantId: ctx.user.tenantId,
          ...input,
        });
      }

      return { success: true };
    }),

  /**
   * Test connection to Tripletex
   */
  testConnection: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [settings] = await db
      .select()
      .from(tripletexSettings)
      .where(eq(tripletexSettings.tenantId, ctx.user.tenantId))
      .limit(1);

    if (!settings) {
      throw new Error("Tripletex settings not found");
    }

    const client = new TripletexClient({
      baseUrl: settings.baseUrl,
      consumerToken: settings.consumerToken,
      employeeToken: settings.employeeToken,
      sessionToken: settings.sessionToken || undefined,
      companyId: settings.companyId || undefined,
    });

    // Create session and test connection
    await client.createSession();
    const isConnected = await client.testConnection();

    if (!isConnected) {
      throw new Error("Connection test failed");
    }

    return { success: true, message: "Connection successful" };
  }),

  // ============================================================================
  // SYNC LOGS
  // ============================================================================

  /**
   * Get sync logs
   */
  getSyncLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const logs = await db
        .select()
        .from(tripletexSyncLog)
        .where(eq(tripletexSyncLog.tenantId, ctx.user.tenantId))
        .orderBy(desc(tripletexSyncLog.createdAt))
        .limit(input.limit);

      return logs;
    }),

  // ============================================================================
  // CUSTOMER SYNC
  // ============================================================================

  /**
   * Sync a single customer
   */
  syncCustomer: protectedProcedure
    .input(
      z.object({
        customerId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await syncCustomerToTripletex(ctx.user.tenantId, input.customerId);
    }),

  /**
   * Sync multiple customers
   */
  syncCustomers: protectedProcedure
    .input(
      z.object({
        customerIds: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await syncCustomersToTripletex(ctx.user.tenantId, input.customerIds);
    }),

  /**
   * Get customer sync status
   */
  getCustomerSyncStatus: protectedProcedure
    .input(
      z.object({
        customerId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getCustomerSyncStatus(ctx.user.tenantId, input.customerId);
    }),

  /**
   * Get unsynced customers
   */
  getUnsyncedCustomers: protectedProcedure.query(async ({ ctx }) => {
    return await getUnsyncedCustomers(ctx.user.tenantId);
  }),

  // ============================================================================
  // INVOICE SYNC
  // ============================================================================

  /**
   * Sync a single order/invoice
   */
  syncOrder: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await syncOrderToTripletex(ctx.user.tenantId, input.orderId);
    }),

  /**
   * Sync multiple orders
   */
  syncOrders: protectedProcedure
    .input(
      z.object({
        orderIds: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await syncOrdersToTripletex(ctx.user.tenantId, input.orderIds);
    }),

  /**
   * Get unsynced orders
   */
  getUnsyncedOrders: protectedProcedure.query(async ({ ctx }) => {
    return await getUnsyncedOrders(ctx.user.tenantId);
  }),

  // ============================================================================
  // PAYMENT SYNC
  // ============================================================================

  /**
   * Sync payment
   */
  syncPayment: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
        paymentAmount: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await syncPaymentToTripletex(ctx.user.tenantId, input.orderId, input.paymentAmount);
    }),

  /**
   * Sync refund
   */
  syncRefund: protectedProcedure
    .input(
      z.object({
        refundId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await syncRefundToTripletex(ctx.user.tenantId, input.refundId);
    }),

  // ============================================================================
  // MANUAL SYNC
  // ============================================================================

  /**
   * Manual sync all
   */
  manualSync: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const startTime = Date.now();

    try {
      // Get unsynced customers
      const unsyncedCustomers = await getUnsyncedCustomers(ctx.user.tenantId);
      const customerIds = unsyncedCustomers.map((c) => c.id);

      // Get unsynced orders
      const unsyncedOrders = await getUnsyncedOrders(ctx.user.tenantId);
      const orderIds = unsyncedOrders.map((o) => o.id);

      // Sync customers
      const customerResults = await syncCustomersToTripletex(ctx.user.tenantId, customerIds);

      // Sync orders
      const orderResults = await syncOrdersToTripletex(ctx.user.tenantId, orderIds);

      const duration = Date.now() - startTime;

      // Log overall sync
      await db.insert(tripletexSyncLog).values({
        tenantId: ctx.user.tenantId,
        operation: "manual_sync",
        entityType: "all",
        status: "success",
        message: "Manual sync completed",
        recordsProcessed: customerResults.totalProcessed + orderResults.totalProcessed,
        recordsSucceeded: customerResults.succeeded + orderResults.succeeded,
        recordsFailed: customerResults.failed + orderResults.failed,
        durationMs: duration,
        completedAt: new Date(),
      });

      // Update settings
      await db
        .update(tripletexSettings)
        .set({
          lastSyncAt: new Date(),
          lastSyncStatus: "success",
        })
        .where(eq(tripletexSettings.tenantId, ctx.user.tenantId));

      return {
        success: true,
        customers: customerResults,
        orders: orderResults,
        durationMs: duration,
      };
    } catch (error: any) {
      // Log error
      await db.insert(tripletexSyncLog).values({
        tenantId: ctx.user.tenantId,
        operation: "manual_sync",
        entityType: "all",
        status: "failed",
        message: "Manual sync failed",
        errorDetails: error.message,
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
      });

      // Update settings
      await db
        .update(tripletexSettings)
        .set({
          lastSyncAt: new Date(),
          lastSyncStatus: "failed",
        })
        .where(eq(tripletexSettings.tenantId, ctx.user.tenantId));

      throw error;
    }
  }),
});
