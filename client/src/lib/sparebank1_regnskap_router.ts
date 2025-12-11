/**
 * Sparebank1 Regnskap TRPC Router
 * 
 * API endpoints for Sparebank1 Regnskap integration
 */

import { z } from "zod";
import { router, protectedProcedure } from "./trpc";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import {
  sparebank1RegnskapSettings,
  sparebank1RegnskapCustomers,
  sparebank1RegnskapInvoices,
  sparebank1RegnskapSyncLogs,
  insertSparebank1RegnskapSettingsSchema,
} from "./sparebank1_regnskap_schema";
import Sparebank1RegnskapClient from "./sparebank1_regnskap_client";
import {
  syncCustomerToSparebank1,
  syncAllCustomersToSparebank1,
  syncOrderToSparebank1Invoice,
  syncPaymentToSparebank1,
  performFullSparebank1Sync,
} from "./sparebank1_regnskap_sync";
import { nanoid } from "nanoid";

export const sparebank1RegnskapRouter = router({
  // ============================================================================
  // Settings Management
  // ============================================================================

  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const settings = await db.query.sparebank1RegnskapSettings.findFirst({
      where: eq(sparebank1RegnskapSettings.tenantId, ctx.user.tenantId),
    });

    if (!settings) {
      return null;
    }

    // Don't expose sensitive data
    return {
      ...settings,
      apiKey: settings.apiKey ? "***" : null,
      accessToken: settings.accessToken ? "***" : null,
      refreshToken: settings.refreshToken ? "***" : null,
    };
  }),

  saveSettings: protectedProcedure
    .input(
      z.object({
        apiKey: z.string().min(1),
        companyId: z.string().min(1),
        bankAccountNumber: z.string().optional(),
        autoSync: z.boolean().optional(),
        syncInterval: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existingSettings = await db.query.sparebank1RegnskapSettings.findFirst({
        where: eq(sparebank1RegnskapSettings.tenantId, ctx.user.tenantId),
      });

      if (existingSettings) {
        await db
          .update(sparebank1RegnskapSettings)
          .set({
            apiKey: input.apiKey,
            companyId: input.companyId,
            bankAccountNumber: input.bankAccountNumber,
            autoSync: input.autoSync ?? existingSettings.autoSync,
            syncInterval: input.syncInterval ?? existingSettings.syncInterval,
            updatedAt: new Date(),
          })
          .where(eq(sparebank1RegnskapSettings.id, existingSettings.id));

        return { success: true, id: existingSettings.id };
      } else {
        const id = nanoid();
        await db.insert(sparebank1RegnskapSettings).values({
          id,
          tenantId: ctx.user.tenantId,
          apiKey: input.apiKey,
          companyId: input.companyId,
          bankAccountNumber: input.bankAccountNumber,
          autoSync: input.autoSync ?? false,
          syncInterval: input.syncInterval ?? 3600,
        });

        return { success: true, id };
      }
    }),

  testConnection: protectedProcedure.mutation(async ({ ctx }) => {
    const settings = await db.query.sparebank1RegnskapSettings.findFirst({
      where: eq(sparebank1RegnskapSettings.tenantId, ctx.user.tenantId),
    });

    if (!settings) {
      throw new Error("Sparebank1 Regnskap settings not found");
    }

    const client = new Sparebank1RegnskapClient({
      apiKey: settings.apiKey,
      companyId: settings.companyId,
    });

    try {
      // Authenticate
      const tokens = await client.authenticate();

      // Save tokens
      await db
        .update(sparebank1RegnskapSettings)
        .set({
          accessToken: tokens.accessToken,
          tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(sparebank1RegnskapSettings.id, settings.id));

      // Test API call
      const isConnected = await client.testConnection();

      return {
        success: isConnected,
        message: isConnected
          ? "Successfully connected to Sparebank1 Regnskap"
          : "Authentication succeeded but API test failed",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Failed to connect to Sparebank1 Regnskap",
      };
    }
  }),

  toggleActive: protectedProcedure
    .input(z.object({ isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(sparebank1RegnskapSettings)
        .set({
          isActive: input.isActive,
          updatedAt: new Date(),
        })
        .where(eq(sparebank1RegnskapSettings.tenantId, ctx.user.tenantId));

      return { success: true };
    }),

  // ============================================================================
  // Customer Sync
  // ============================================================================

  syncCustomer: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await syncCustomerToSparebank1(ctx.user.tenantId, input.customerId);
      return result;
    }),

  syncAllCustomers: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await syncAllCustomersToSparebank1(ctx.user.tenantId);
    return result;
  }),

  getCustomerMappings: protectedProcedure.query(async ({ ctx }) => {
    const mappings = await db.query.sparebank1RegnskapCustomers.findMany({
      where: eq(sparebank1RegnskapCustomers.tenantId, ctx.user.tenantId),
      orderBy: desc(sparebank1RegnskapCustomers.createdAt),
    });

    return mappings;
  }),

  // ============================================================================
  // Invoice Sync
  // ============================================================================

  syncInvoice: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const result = await syncOrderToSparebank1Invoice(ctx.user.tenantId, input.orderId);
      return result;
    }),

  getInvoiceMappings: protectedProcedure.query(async ({ ctx }) => {
    const mappings = await db.query.sparebank1RegnskapInvoices.findMany({
      where: eq(sparebank1RegnskapInvoices.tenantId, ctx.user.tenantId),
      orderBy: desc(sparebank1RegnskapInvoices.createdAt),
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
      const result = await syncPaymentToSparebank1(
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
    const result = await performFullSparebank1Sync(ctx.user.tenantId);
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
      const logs = await db.query.sparebank1RegnskapSyncLogs.findMany({
        where: eq(sparebank1RegnskapSyncLogs.tenantId, ctx.user.tenantId),
        orderBy: desc(sparebank1RegnskapSyncLogs.createdAt),
        limit: input.limit,
      });

      return logs;
    }),

  getLastSyncStatus: protectedProcedure.query(async ({ ctx }) => {
    const settings = await db.query.sparebank1RegnskapSettings.findFirst({
      where: eq(sparebank1RegnskapSettings.tenantId, ctx.user.tenantId),
    });

    const lastLog = await db.query.sparebank1RegnskapSyncLogs.findFirst({
      where: eq(sparebank1RegnskapSyncLogs.tenantId, ctx.user.tenantId),
      orderBy: desc(sparebank1RegnskapSyncLogs.createdAt),
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
    const customerMappings = await db.query.sparebank1RegnskapCustomers.findMany({
      where: eq(sparebank1RegnskapCustomers.tenantId, ctx.user.tenantId),
    });

    const invoiceMappings = await db.query.sparebank1RegnskapInvoices.findMany({
      where: eq(sparebank1RegnskapInvoices.tenantId, ctx.user.tenantId),
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

  // ============================================================================
  // Bank Integration (Sparebank1 Specific)
  // ============================================================================

  getBankTransactions: protectedProcedure
    .input(
      z.object({
        fromDate: z.string(),
        toDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const settings = await db.query.sparebank1RegnskapSettings.findFirst({
        where: eq(sparebank1RegnskapSettings.tenantId, ctx.user.tenantId),
      });

      if (!settings || !settings.bankAccountNumber) {
        throw new Error("Bank account not configured");
      }

      const client = new Sparebank1RegnskapClient({
        apiKey: settings.apiKey,
        companyId: settings.companyId,
        accessToken: settings.accessToken || undefined,
      });

      const transactions = await client.getBankTransactions(
        settings.bankAccountNumber,
        input.fromDate,
        input.toDate
      );

      return transactions;
    }),
});

export default sparebank1RegnskapRouter;
