import { router, tenantProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export const financialRouter = router({
  // Create expense
  createExpense: adminProcedure
    .input(z.object({
      category: z.enum(["rent", "utilities", "supplies", "salaries", "marketing", "maintenance", "insurance", "taxes", "other"]),
      amount: z.string(), // Decimal as string
      description: z.string().optional(),
      expenseDate: z.string(), // YYYY-MM-DD
      receiptUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { expenses } = await import("../drizzle/schema");

      await dbInstance.insert(expenses).values({
        tenantId: String(ctx.tenantId),
        category: input.category,
        amount: input.amount,
        description: input.description || null,
        expenseDate: new Date(input.expenseDate),
        receiptUrl: input.receiptUrl || null,
        createdBy: ctx.user.id,
      });

      return { success: true };
    }),

  // List expenses
  listExpenses: tenantProcedure
    .input(z.object({
      startDate: z.string().optional(), // YYYY-MM-DD
      endDate: z.string().optional(),
      category: z.enum(["rent", "utilities", "supplies", "salaries", "marketing", "maintenance", "insurance", "taxes", "other"]).optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { expenses } = await import("../drizzle/schema");

      const conditions = [eq(expenses.tenantId, String(ctx.tenantId))];

      if (input.startDate) {
        conditions.push(gte(expenses.expenseDate, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(expenses.expenseDate, new Date(input.endDate)));
      }
      if (input.category) {
        conditions.push(eq(expenses.category, input.category));
      }

      return await dbInstance
        .select()
        .from(expenses)
        .where(and(...conditions))
        .orderBy(desc(expenses.expenseDate))
        .limit(input.limit);
    }),

  // Update expense
  updateExpense: adminProcedure
    .input(z.object({
      id: z.number(),
      category: z.enum(["rent", "utilities", "supplies", "salaries", "marketing", "maintenance", "insurance", "taxes", "other"]).optional(),
      amount: z.string().optional(),
      description: z.string().optional(),
      expenseDate: z.string().optional(),
      receiptUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { expenses } = await import("../drizzle/schema");

      const updateData: Record<string, unknown> = {};
      if (input.category) updateData.category = input.category;
      if (input.amount) updateData.amount = input.amount;
      if (input.description !== undefined) updateData.description = input.description || null;
      if (input.expenseDate) updateData.expenseDate = new Date(input.expenseDate);
      if (input.receiptUrl !== undefined) updateData.receiptUrl = input.receiptUrl || null;

      await dbInstance
        .update(expenses)
        .set(updateData)
        .where(and(
          eq(expenses.id, input.id),
          eq(expenses.tenantId, String(ctx.tenantId))
        ));

      return { success: true };
    }),

  // Delete expense
  deleteExpense: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { expenses } = await import("../drizzle/schema");

      await dbInstance
        .delete(expenses)
        .where(and(
          eq(expenses.id, input.id),
          eq(expenses.tenantId, String(ctx.tenantId))
        ));

      return { success: true };
    }),

  // Get financial summary
  getSummary: tenantProcedure
    .input(z.object({
      startDate: z.string(), // YYYY-MM-DD
      endDate: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { appointments, appointmentServices, services, expenses } = await import("../drizzle/schema");

      // Calculate revenue from completed appointments
      const revenueResult = await dbInstance
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${services.price} AS DECIMAL(10,2))), 0)`,
        })
        .from(appointments)
        .innerJoin(appointmentServices, eq(appointments.id, appointmentServices.appointmentId))
        .innerJoin(services, eq(appointmentServices.serviceId, services.id))
        .where(and(
          eq(appointments.tenantId, String(ctx.tenantId)),
          eq(appointments.status, "completed"),
          gte(appointments.appointmentDate, new Date(input.startDate)),
          lte(appointments.appointmentDate, new Date(input.endDate))
        ));

      const revenue = parseFloat(revenueResult[0]?.total || "0");

      // Calculate total expenses
      const expensesResult = await dbInstance
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${expenses.amount} AS DECIMAL(10,2))), 0)`,
        })
        .from(expenses)
        .where(and(
          eq(expenses.tenantId, String(ctx.tenantId)),
          gte(expenses.expenseDate, new Date(input.startDate)),
          lte(expenses.expenseDate, new Date(input.endDate))
        ));

      const totalExpenses = parseFloat(expensesResult[0]?.total || "0");

      return {
        revenue,
        expenses: totalExpenses,
        profit: revenue - totalExpenses,
        profitMargin: revenue > 0 ? ((revenue - totalExpenses) / revenue) * 100 : 0,
      };
    }),

  // Get revenue breakdown by service
  getRevenueByService: tenantProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ ctx, input }: { ctx: any; input: { startDate: string; endDate: string } }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { appointments, appointmentServices, services } = await import("../drizzle/schema");

      return await dbInstance
        .select({
          serviceName: services.name,
          count: sql<number>`COUNT(*)`,
          revenue: sql<string>`SUM(CAST(${services.price} AS DECIMAL(10,2)))`,
        })
        .from(appointments)
        .innerJoin(appointmentServices, eq(appointments.id, appointmentServices.appointmentId))
        .innerJoin(services, eq(appointmentServices.serviceId, services.id))
        .where(and(
          eq(appointments.tenantId, String(ctx.tenantId)),
          eq(appointments.status, "completed"),
          gte(appointments.appointmentDate, new Date(input.startDate)),
          lte(appointments.appointmentDate, new Date(input.endDate))
        ))
        .groupBy(services.id, services.name)
        .orderBy(desc(sql`SUM(CAST(${services.price} AS DECIMAL(10,2)))`));
    }),

  // Get expense breakdown by category
  getExpensesByCategory: tenantProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { expenses } = await import("../drizzle/schema");

      return await dbInstance
        .select({
          category: expenses.category,
          count: sql<number>`COUNT(*)`,
          total: sql<string>`SUM(CAST(${expenses.amount} AS DECIMAL(10,2)))`,
        })
        .from(expenses)
        .where(and(
          eq(expenses.tenantId, String(ctx.tenantId)),
          gte(expenses.expenseDate, new Date(input.startDate)),
          lte(expenses.expenseDate, new Date(input.endDate))
        ))
        .groupBy(expenses.category)
        .orderBy(desc(sql`SUM(CAST(${expenses.amount} AS DECIMAL(10,2)))`));
    }),

  // Get daily revenue trend
  getDailyRevenue: tenantProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const { appointments, appointmentServices, services } = await import("../drizzle/schema");

      return await dbInstance
        .select({
          date: appointments.appointmentDate,
          revenue: sql<string>`SUM(CAST(${services.price} AS DECIMAL(10,2)))`,
          appointmentCount: sql<number>`COUNT(DISTINCT ${appointments.id})`,
        })
        .from(appointments)
        .innerJoin(appointmentServices, eq(appointments.id, appointmentServices.appointmentId))
        .innerJoin(services, eq(appointmentServices.serviceId, services.id))
        .where(and(
          eq(appointments.tenantId, String(ctx.tenantId)),
          eq(appointments.status, "completed"),
          gte(appointments.appointmentDate, new Date(input.startDate)),
          lte(appointments.appointmentDate, new Date(input.endDate))
        ))
        .groupBy(appointments.appointmentDate)
        .orderBy(appointments.appointmentDate);
    }),
});
