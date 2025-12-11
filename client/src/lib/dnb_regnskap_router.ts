import { z } from "zod";
import { router, adminProcedure } from "./trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

/**
 * DNB Regnskap Router
 * 
 * API endpoints for DNB Regnskap accounting integration
 */

export const dnbRegnskapRouter = router({
  // Get DNB Regnskap settings for current tenant
  getSettings: adminProcedure.query(async ({ ctx }) => {
    const dbInstance = await db.getDb();
    if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    
    const { dnbRegnskapSettings } = await import("./dnb_regnskap_schema");
    const { eq } = await import("drizzle-orm");
    
    const [settings] = await dbInstance
      .select()
      .from(dnbRegnskapSettings)
      .where(eq(dnbRegnskapSettings.tenantId, ctx.tenantId))
      .limit(1);
    
    if (!settings) {
      // Return default settings if not configured yet
      return {
        enabled: false,
        clientId: "",
        companyId: "",
        organizationNumber: "",
        apiBaseUrl: "https://api.dnb.no/regnskap/v1",
        environment: "sandbox" as const,
        syncFrequency: "daily" as const,
        syncHour: 23,
        syncMinute: 0,
        autoSyncCustomers: true,
        autoSyncInvoices: true,
        autoSyncPayments: true,
        defaultVatCode: "3",
        defaultAccountCode: "3000",
        defaultPaymentTerms: 14,
      };
    }
    
    // Don't expose sensitive data
    return {
      ...settings,
      clientSecret: settings.clientSecret ? "***" : "",
      accessToken: settings.accessToken ? "***" : "",
      refreshToken: settings.refreshToken ? "***" : "",
    };
  }),

  // Update DNB Regnskap settings
  updateSettings: adminProcedure
    .input(z.object({
      enabled: z.boolean().optional(),
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
      companyId: z.string().optional(),
      organizationNumber: z.string().optional(),
      apiBaseUrl: z.string().optional(),
      environment: z.enum(["production", "sandbox"]).optional(),
      syncFrequency: z.enum(["daily", "weekly", "monthly", "manual", "custom"]).optional(),
      syncDayOfWeek: z.number().min(0).max(6).optional(),
      syncDayOfMonth: z.number().min(-1).max(31).optional(),
      syncHour: z.number().min(0).max(23).optional(),
      syncMinute: z.number().min(0).max(59).optional(),
      autoSyncCustomers: z.boolean().optional(),
      autoSyncInvoices: z.boolean().optional(),
      autoSyncPayments: z.boolean().optional(),
      defaultVatCode: z.string().optional(),
      defaultAccountCode: z.string().optional(),
      defaultPaymentTerms: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const { dnbRegnskapSettings } = await import("./dnb_regnskap_schema");
      const { eq } = await import("drizzle-orm");
      
      // Check if settings exist
      const [existing] = await dbInstance
        .select()
        .from(dnbRegnskapSettings)
        .where(eq(dnbRegnskapSettings.tenantId, ctx.tenantId))
        .limit(1);
      
      if (existing) {
        // Update existing settings
        await dbInstance
          .update(dnbRegnskapSettings)
          .set(input)
          .where(eq(dnbRegnskapSettings.tenantId, ctx.tenantId));
      } else {
        // Create new settings
        await dbInstance.insert(dnbRegnskapSettings).values({
          tenantId: ctx.tenantId,
          ...input,
        });
      }
      
      return { success: true };
    }),

  // Test connection to DNB Regnskap
  testConnection: adminProcedure.mutation(async ({ ctx }) => {
    try {
      const { getDnbRegnskapClient } = await import("./dnb_regnskap_client");
      const client = await getDnbRegnskapClient(ctx.tenantId);
      const isConnected = await client.testConnection();
      
      return {
        success: isConnected,
        message: isConnected ? "Connection successful" : "Connection failed",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || "Connection test failed",
      };
    }
  }),

  // Get sync logs
  getSyncLogs: adminProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(50),
      operation: z.enum(["sync_customer", "sync_invoice", "sync_payment", "sync_refund", "update_status", "manual_sync"]).optional(),
      status: z.enum(["success", "failed", "partial"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const { dnbRegnskapSyncLog } = await import("./dnb_regnskap_schema");
      const { eq, and, desc } = await import("drizzle-orm");
      
      const conditions = [eq(dnbRegnskapSyncLog.tenantId, ctx.tenantId)];
      if (input.operation) conditions.push(eq(dnbRegnskapSyncLog.operation, input.operation));
      if (input.status) conditions.push(eq(dnbRegnskapSyncLog.status, input.status));
      
      const logs = await dbInstance
        .select()
        .from(dnbRegnskapSyncLog)
        .where(and(...conditions))
        .orderBy(desc(dnbRegnskapSyncLog.createdAt))
        .limit(input.limit);
      
      return logs;
    }),
  
  // Sync single customer to DNB Regnskap
  syncCustomer: adminProcedure
    .input(z.object({ customerId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { syncCustomerToDnb } = await import("./dnb_regnskap_sync");
      return syncCustomerToDnb(ctx.tenantId, input.customerId);
    }),
  
  // Sync multiple customers to DNB Regnskap
  syncCustomers: adminProcedure
    .input(z.object({ customerIds: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      const { syncCustomersToDnb } = await import("./dnb_regnskap_sync");
      return syncCustomersToDnb(ctx.tenantId, input.customerIds);
    }),
  
  // Get customer sync status
  getCustomerSyncStatus: adminProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { getCustomerSyncStatus } = await import("./dnb_regnskap_sync");
      return getCustomerSyncStatus(ctx.tenantId, input.customerId);
    }),
  
  // Get unsynced customers
  getUnsyncedCustomers: adminProcedure.query(async ({ ctx }) => {
    const { getUnsyncedCustomers } = await import("./dnb_regnskap_sync");
    return getUnsyncedCustomers(ctx.tenantId);
  }),
  
  // Sync single order/invoice to DNB Regnskap
  syncOrder: adminProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { syncOrderToDnb } = await import("./dnb_regnskap_sync");
      return syncOrderToDnb(ctx.tenantId, input.orderId);
    }),
  
  // Sync multiple orders/invoices to DNB Regnskap
  syncOrders: adminProcedure
    .input(z.object({ orderIds: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      const { syncOrdersToDnb } = await import("./dnb_regnskap_sync");
      return syncOrdersToDnb(ctx.tenantId, input.orderIds);
    }),
  
  // Get unsynced orders
  getUnsyncedOrders: adminProcedure.query(async ({ ctx }) => {
    const { getUnsyncedOrders } = await import("./dnb_regnskap_sync");
    return getUnsyncedOrders(ctx.tenantId);
  }),
  
  // Sync payment to DNB Regnskap
  syncPayment: adminProcedure
    .input(z.object({ orderId: z.number(), paymentAmount: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { syncPaymentToDnb } = await import("./dnb_regnskap_sync");
      return syncPaymentToDnb(ctx.tenantId, input.orderId, input.paymentAmount);
    }),
  
  // Sync refund to DNB Regnskap as credit note
  syncRefund: adminProcedure
    .input(z.object({ refundId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { syncRefundToDnb } = await import("./dnb_regnskap_sync");
      return syncRefundToDnb(ctx.tenantId, input.refundId);
    }),
  
  // Manual sync trigger (full sync - customers + orders)
  manualSync: adminProcedure.mutation(async ({ ctx }) => {
    const dbInstance = await db.getDb();
    if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    
    let totalProcessed = 0;
    let totalSucceeded = 0;
    let totalFailed = 0;
    
    // 1. Sync customers first
    const { getUnsyncedCustomers, syncCustomersToDnb } = await import("./dnb_regnskap_sync");
    const unsyncedCustomers = await getUnsyncedCustomers(ctx.tenantId);
    
    if (unsyncedCustomers.length > 0) {
      const customerResult = await syncCustomersToDnb(
        ctx.tenantId,
        unsyncedCustomers.map((c: any) => c.id)
      );
      totalProcessed += customerResult.totalProcessed;
      totalSucceeded += customerResult.succeeded;
      totalFailed += customerResult.failed;
    }
    
    // 2. Sync orders/invoices
    const { getUnsyncedOrders, syncOrdersToDnb } = await import("./dnb_regnskap_sync");
    const unsyncedOrders = await getUnsyncedOrders(ctx.tenantId);
    
    if (unsyncedOrders.length > 0) {
      const orderResult = await syncOrdersToDnb(
        ctx.tenantId,
        unsyncedOrders.map((o: any) => o.id)
      );
      totalProcessed += orderResult.totalProcessed;
      totalSucceeded += orderResult.succeeded;
      totalFailed += orderResult.failed;
    }
    
    // 3. Update last sync timestamp
    const { dnbRegnskapSettings } = await import("./dnb_regnskap_schema");
    const { eq } = await import("drizzle-orm");
    
    await dbInstance
      .update(dnbRegnskapSettings)
      .set({
        lastSyncAt: new Date(),
        lastSyncStatus: totalFailed === 0 ? "success" : (totalSucceeded > 0 ? "partial" : "failed"),
      })
      .where(eq(dnbRegnskapSettings.tenantId, ctx.tenantId));
    
    return {
      success: true,
      totalProcessed,
      succeeded: totalSucceeded,
      failed: totalFailed,
      message: `Synced ${totalSucceeded} of ${totalProcessed} records successfully`,
    };
  }),
});
