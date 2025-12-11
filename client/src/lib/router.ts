
    // Sync single customer
    syncCustomer: adminProcedure
      .input(z.object({
        customerId: z.number(),
      }))
      .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
        const result = await syncCustomerToFiken(ctx.tenantId, input.customerId);
        return result;
      }),

    // Sync all customers
    syncAllCustomers: adminProcedure
      .mutation(async ({ ctx }: { ctx: any }) => {
        const result = await bulkSyncCustomers(ctx.tenantId);
        return result;
      }),

    // Sync single order
    syncOrder: adminProcedure
      .input(z.object({
        orderId: z.number(),
      }))
      .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
        const result = await syncOrderToFiken(ctx.tenantId, input.orderId);
        return result;
      }),

    // Sync all orders
    syncAllOrders: adminProcedure
      .mutation(async ({ ctx }: { ctx: any }) => {
        const result = await bulkSyncOrders(ctx.tenantId);
        return result;
      }),

    // Get sync logs
    getSyncLogs: adminProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        operation: z.enum(["customer_sync", "invoice_sync", "payment_sync", "product_sync", "full_sync", "test_connection", "oauth_refresh"]).optional(),
      }))
      .query(async ({ ctx, input }: { ctx: any; input: any }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        }

        let query = db
          .select()
          .from(fikenSyncLog)
          .where(eq(fikenSyncLog.tenantId, ctx.tenantId))
          .orderBy(desc(fikenSyncLog.createdAt))
          .limit(input.limit);

        if (input.operation) {
          query = db
            .select()
            .from(fikenSyncLog)
            .where(and(
              eq(fikenSyncLog.tenantId, ctx.tenantId),
              eq(fikenSyncLog.operation, input.operation)
            ))
            .orderBy(desc(fikenSyncLog.createdAt))
            .limit(input.limit);
        }

        const logs = await query;
        return logs;
      }),

    // Update settings
    updateSettings: adminProcedure
      .input(z.object({
        syncFrequency: z.enum(["manual", "daily", "weekly", "monthly"]).optional(),
        autoSyncCustomers: z.boolean().optional(),
        autoSyncInvoices: z.boolean().optional(),
        autoSyncPayments: z.boolean().optional(),
        autoSyncProducts: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }: { ctx: any; input: any }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        }

        const [existing] = await db
          .select()
          .from(fikenSettings)
          .where(eq(fikenSettings.tenantId, ctx.tenantId))
          .limit(1);

        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Fiken settings not found" });
        }

        await db
          .update(fikenSettings)
          .set({
            ...input,
            updatedAt: new Date(),
          })
          .where(eq(fikenSettings.id, existing.id));

        return { success: true };
      }),
  });
}
