/**
 * Visma eAccounting TRPC Router
 * 
 * API endpoints for Visma eAccounting integration
 */

import { z } from "zod";
import { router, protectedProcedure } from "./trpc";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import {
  vismaEaccountingSettings,
  vismaEaccountingCustomers,
  vismaEaccountingInvoices,
  vismaEaccountingSyncLogs,
  insertVismaEaccountingSettingsSchema,
} from "./visma_eaccounting_schema";
import VismaEaccountingClient from "./visma_eaccounting_client";
import {
  syncCustomerToVisma,
  syncAllCustomersToVisma,
  syncOrderToVismaInvoice,
  syncPaymentToVisma,
  performFullVismaSync,
} from "./visma_eaccounting_sync";
import { nanoid } from "nanoid";

export const vismaEaccountingRouter = router({
  // ============================================================================
  // Settings Management
  // ============================================================================

  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const settings = await db.query.vismaEaccountingSettings.findFirst({
      where: eq(vismaEaccountingSettings.tenantId, ctx.user.tenantId),
    });

    if (!settings) {
      return null;
    }

    // Don't expose sensitive data
    return {
      ...settings,
      clientSecret: settings.clientSecret ? "***" : null,
      accessToken: settings.accessToken ? "***" : null,
      refreshToken: settings.refreshToken ? "***" : null,
    };
  }),

  saveSettings: protectedProcedure
    .input(
      z.object({
        clientId: z.string().min(1),
        clientSecret: z.string().min(1),
        autoSync: z.boolean().optional(),
        syncInterval: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existingSettings = await db.query.vismaEaccountingSettings.findFirst({
        where: eq(vismaEaccountingSettings.tenantId, ctx.user.tenantId),
      });

      if (existingSettings) {
        await db
          .update(vismaEaccountingSettings)
          .set({
            clientId: input.clientId,
            clientSecret: input.clientSecret,
            autoSync: input.autoSync ?? existingSettings.autoSync,
            syncInterval: input.syncInterval ?? existingSettings.syncInterval,
            updatedAt: new Date(),
          })
          .where(eq(vismaEaccountingSettings.id, existingSettings.id));

        return { success: true, id: existingSettings.id };
      } else {
        const id = nanoid();
        await db.insert(vismaEaccountingSettings).values({
          id,
          tenantId: ctx.user.tenantId,
          clientId: input.clientId,
          clientSecret: input.clientSecret,
          autoSync: input.autoSync ?? false,
          syncInterval: input.syncInterval ?? 3600,
        });

        return { success: true, id };
      }
    }),

  testConnection: protectedProcedure.mutation(async ({ ctx }) => {
    const settings = await db.query.vismaEaccountingSettings.findFirst({
      where: eq(vismaEaccountingSettings.tenantId, ctx.user.tenantId),
    });

    if (!settings) {
      throw new Error("Visma eAccounting settings not found");
    }

    const client = new VismaEaccountingClient({
      clientId: settings.clientId,
      clientSecret: settings.clientSecret,
    });

    try {
      // Authenticate
      const tokens = await client.authenticate();

      // Save tokens
      await db
        .update(vismaEaccountingSettings)
        .set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(vismaEaccountingSettings.id, settings.id));

      // Test API call
      const isConnected = await client.testConnection();

      return {
        success: isConnected,
        message: isConnected
          ? "Successfully connected to Visma eAccounting"
          : "Authentication succeeded but API test failed",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to connect to Visma eAccounting",
      };
    }
  }),

  toggleActive: protectedProcedure
    .input(z.object({ isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(vismaEaccountingSettings)
        .set({
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(eq(vismaEaccountingSettings.tenantId, ctx.user.tenantId));

      return { success: true };
    }),

  // ============================================================================
  // Customer Sync
  // ============================================================================

  syncCustomer: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await syncCustomerToVisma(ctx.user.tenantId, input.customerId);
      return result;
    }),

  syncAllCustomers: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await syncAllCustomersToVisma(ctx.user.tenantId);
    return result;
  }),

  getCustomerMappings: protectedProcedure.query(async ({ ctx }) => {
    const mappings = await db.query.vismaEaccountingCustomers.findMany({
      where: eq(vismaEaccountingCustomers.tenantId, ctx.user.tenantId),
      orderBy: desc(vismaEaccountingCustomers.createdAt),
    });

    return mappings;
  }),

  // ============================================================================
  // Invoice Sync
  // ============================================================================

  syncInvoice: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await syncOrderToVismaInvoice(ctx.user.tenantId, input.orderId);
      return result;
    }),

  getInvoiceMappings: protectedProcedure.query(async ({ ctx }) => {
    const mappings = await db.query.vismaEaccountingInvoices.findMany({
      where: eq(vismaEaccountingInvoices.tenantId, ctx.user.tenantId),
      orderBy: desc(vismaEaccountingInvoices.createdAt),
    });

    return mappings;
  }),

  // ============================================================================
  // Payment Sync
  // ============================================================================

  syncPayment: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
        paymentAmount: z.number(),
        paymentDate: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await syncPaymentToVisma(
        ctx.user.tenantId,
        input.orderId,
        input.paymentAmount,
        input.paymentDate
      );
      return result;
    }),

  // ============================================================================
  // Full Sync
  // ============================================================================

  performFullSync: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await performFullVismaSync(ctx.user.tenantId);
    return result;
  }),

  // ============================================================================
  // Sync Logs
  // ============================================================================

  getSyncLogs: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const logs = await db.query.vismaEaccountingSyncLogs.findMany({
        where: eq(vismaEaccountingSyncLogs.tenantId, ctx.user.tenantId),
        orderBy: desc(vismaEaccountingSyncLogs.createdAt),
        limit: input.limit,
      });

      return logs;
    }),

  getLastSyncStatus: protectedProcedure.query(async ({ ctx }) => {
    const settings = await db.query.vismaEaccountingSettings.findFirst({
      where: eq(vismaEaccountingSettings.tenantId, ctx.user.tenantId),
    });

    const lastLog = await db.query.vismaEaccountingSyncLogs.findFirst({
      where: eq(vismaEaccountingSyncLogs.tenantId, ctx.user.tenantId),
      orderBy: desc(vismaEaccountingSyncLogs.createdAt),
    });

    return {
      lastSyncAt: settings?.lastSyncAt,
      lastSyncStatus: lastLog?.status,
      lastSyncStats: lastLog
        ? {
            processed: lastLog.itemsProcessed,
            succeeded: lastLog.itemsSucceeded,
            failed: lastLog.itemsFailed,
          }
        : null,
    };
  }),

  // ============================================================================
  // Statistics
  // ============================================================================

  getStatistics: protectedProcedure.query(async ({ ctx }) => {
    const customerMappings = await db.query.vismaEaccountingCustomers.findMany({
      where: eq(vismaEaccountingCustomers.tenantId, ctx.user.tenantId),
    });

    const invoiceMappings = await db.query.vismaEaccountingInvoices.findMany({
      where: eq(vismaEaccountingInvoices.tenantId, ctx.user.tenantId),
    });

    const syncedCustomers = customerMappings.filter((c) => c.syncStatus === "synced").length;
    const failedCustomers = customerMappings.filter((c) => c.syncStatus === "failed").length;

    const syncedInvoices = invoiceMappings.filter((i) => i.syncStatus === "synced").length;
    const failedInvoices = invoiceMappings.filter((i) => i.syncStatus === "failed").length;
    const paidInvoices = invoiceMappings.filter((i) => i.isPaid).length;

    return {
      customers: {
        total: customerMappings.length,
        synced: syncedCustomers,
        failed: failedCustomers,
      },
      invoices: {
        total: invoiceMappings.length,
        synced: syncedInvoices,
        failed: failedInvoices,
        paid: paidInvoices,
      },
    };
  }),
});

export default vismaEaccountingRouter;
