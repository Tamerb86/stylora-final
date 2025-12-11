import { z } from "zod";
import { router, protectedProcedure } from "./trpc";
import { db } from "./db";
import {
  commissionRules,
  commissionCalculations,
  commissionPayments,
  commissionTargets,
  commissionAdjustments,
  employeeCommissionSettings,
} from "./commission_schema";
import {
  calculateCommission,
  recordCommission,
  calculateOrderCommission,
  calculateAppointmentCommission,
  approveCommissions,
  calculateTargetBonuses,
} from "./commission_calculator";
import { eq, and, sql, gte, lte, desc, sum, count } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Commission Router
 * API endpoints for commission management
 */

export const commissionRouter = router({
  // ==========================================================================
  // COMMISSION RULES
  // ==========================================================================

  getCommissionRules: protectedProcedure
    .input(z.object({
      employeeId: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(commissionRules.tenantId, ctx.tenantId)];

      if (input.employeeId !== undefined) {
        conditions.push(
          sql`(${commissionRules.employeeId} = ${input.employeeId} OR ${commissionRules.employeeId} IS NULL)`
        );
      }

      if (input.isActive !== undefined) {
        conditions.push(eq(commissionRules.isActive, input.isActive));
      }

      return await db
        .select()
        .from(commissionRules)
        .where(and(...conditions))
        .orderBy(desc(commissionRules.priority));
    }),

  createCommissionRule: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      ruleType: z.enum(["percentage", "tiered", "fixed_amount", "product_based", "service_based", "target_based"]),
      appliesTo: z.enum(["all_sales", "services_only", "products_only", "specific_category", "specific_product", "specific_service"]),
      targetId: z.number().optional(),
      commissionRate: z.string().optional(),
      fixedAmount: z.string().optional(),
      tieredRates: z.string().optional(),
      minimumSaleAmount: z.string().optional(),
      employeeId: z.number().optional(),
      priority: z.number().default(0),
      validFrom: z.string().optional(),
      validTo: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [result] = await db.insert(commissionRules).values({
        tenantId: ctx.tenantId,
        ...input,
      });

      return { id: result.insertId };
    }),

  updateCommissionRule: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      ruleType: z.enum(["percentage", "tiered", "fixed_amount", "product_based", "service_based", "target_based"]).optional(),
      appliesTo: z.enum(["all_sales", "services_only", "products_only", "specific_category", "specific_product", "specific_service"]).optional(),
      targetId: z.number().optional(),
      commissionRate: z.string().optional(),
      fixedAmount: z.string().optional(),
      tieredRates: z.string().optional(),
      minimumSaleAmount: z.string().optional(),
      employeeId: z.number().optional(),
      priority: z.number().optional(),
      isActive: z.boolean().optional(),
      validFrom: z.string().optional(),
      validTo: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      await db
        .update(commissionRules)
        .set(updates)
        .where(and(
          eq(commissionRules.id, id),
          eq(commissionRules.tenantId, ctx.tenantId)
        ));

      return { success: true };
    }),

  deleteCommissionRule: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(commissionRules)
        .where(and(
          eq(commissionRules.id, input.id),
          eq(commissionRules.tenantId, ctx.tenantId)
        ));

      return { success: true };
    }),

  // ==========================================================================
  // COMMISSION CALCULATIONS
  // ==========================================================================

  getCommissionCalculations: protectedProcedure
    .input(z.object({
      employeeId: z.number().optional(),
      status: z.enum(["pending", "approved", "paid", "cancelled"]).optional(),
      paymentPeriod: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(commissionCalculations.tenantId, ctx.tenantId)];

      if (input.employeeId) {
        conditions.push(eq(commissionCalculations.employeeId, input.employeeId));
      }

      if (input.status) {
        conditions.push(eq(commissionCalculations.status, input.status));
      }

      if (input.paymentPeriod) {
        conditions.push(eq(commissionCalculations.paymentPeriod, input.paymentPeriod));
      }

      if (input.startDate) {
        conditions.push(gte(commissionCalculations.saleDate, input.startDate));
      }

      if (input.endDate) {
        conditions.push(lte(commissionCalculations.saleDate, input.endDate));
      }

      return await db
        .select()
        .from(commissionCalculations)
        .where(and(...conditions))
        .orderBy(desc(commissionCalculations.saleDate));
    }),

  getCommissionSummary: protectedProcedure
    .input(z.object({
      employeeId: z.number().optional(),
      paymentPeriod: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(commissionCalculations.tenantId, ctx.tenantId)];

      if (input.employeeId) {
        conditions.push(eq(commissionCalculations.employeeId, input.employeeId));
      }

      if (input.paymentPeriod) {
        conditions.push(eq(commissionCalculations.paymentPeriod, input.paymentPeriod));
      }

      if (input.startDate) {
        conditions.push(gte(commissionCalculations.saleDate, input.startDate));
      }

      if (input.endDate) {
        conditions.push(lte(commissionCalculations.saleDate, input.endDate));
      }

      const [summary] = await db
        .select({
          totalSales: sum(commissionCalculations.saleAmount),
          totalCommission: sum(commissionCalculations.commissionAmount),
          count: count(),
        })
        .from(commissionCalculations)
        .where(and(...conditions));

      return {
        totalSales: parseFloat(summary.totalSales?.toString() || "0"),
        totalCommission: parseFloat(summary.totalCommission?.toString() || "0"),
        count: summary.count || 0,
      };
    }),

  calculateOrderCommission: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await calculateOrderCommission(ctx.tenantId, input.orderId);
      return { success: true };
    }),

  calculateAppointmentCommission: protectedProcedure
    .input(z.object({ appointmentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await calculateAppointmentCommission(ctx.tenantId, input.appointmentId);
      return { success: true };
    }),

  approveCommissions: protectedProcedure
    .input(z.object({
      paymentPeriod: z.string(),
      employeeId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const count = await approveCommissions(
        ctx.tenantId,
        input.paymentPeriod,
        input.employeeId,
        ctx.userId
      );

      return { count };
    }),

  // ==========================================================================
  // COMMISSION PAYMENTS
  // ==========================================================================

  getCommissionPayments: protectedProcedure
    .input(z.object({
      employeeId: z.number().optional(),
      status: z.enum(["draft", "pending", "paid", "cancelled"]).optional(),
      paymentPeriod: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(commissionPayments.tenantId, ctx.tenantId)];

      if (input.employeeId) {
        conditions.push(eq(commissionPayments.employeeId, input.employeeId));
      }

      if (input.status) {
        conditions.push(eq(commissionPayments.status, input.status));
      }

      if (input.paymentPeriod) {
        conditions.push(eq(commissionPayments.paymentPeriod, input.paymentPeriod));
      }

      return await db
        .select()
        .from(commissionPayments)
        .where(and(...conditions))
        .orderBy(desc(commissionPayments.createdAt));
    }),

  createCommissionPayment: protectedProcedure
    .input(z.object({
      paymentPeriod: z.string(),
      employeeId: z.number(),
      deductions: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get approved commissions for this period
      const calculations = await db
        .select()
        .from(commissionCalculations)
        .where(and(
          eq(commissionCalculations.tenantId, ctx.tenantId),
          eq(commissionCalculations.employeeId, input.employeeId),
          eq(commissionCalculations.paymentPeriod, input.paymentPeriod),
          eq(commissionCalculations.status, "approved")
        ));

      if (calculations.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No approved commissions found for this period",
        });
      }

      const totalSales = calculations.reduce((sum, calc) => sum + parseFloat(calc.saleAmount.toString()), 0);
      const totalCommission = calculations.reduce((sum, calc) => sum + parseFloat(calc.commissionAmount.toString()), 0);
      const deductions = parseFloat(input.deductions || "0");

      // Get employee settings for tax
      const [empSettings] = await db
        .select()
        .from(employeeCommissionSettings)
        .where(and(
          eq(employeeCommissionSettings.tenantId, ctx.tenantId),
          eq(employeeCommissionSettings.employeeId, input.employeeId)
        ));

      const taxRate = empSettings?.taxRate ? parseFloat(empSettings.taxRate.toString()) : 0;
      const taxAmount = (totalCommission * taxRate) / 100;
      const netPayment = totalCommission - deductions - taxAmount;

      // Generate payment number
      const paymentNumber = await generatePaymentNumber(ctx.tenantId, input.paymentPeriod);

      const [result] = await db.insert(commissionPayments).values({
        tenantId: ctx.tenantId,
        paymentNumber,
        paymentPeriod: input.paymentPeriod,
        employeeId: input.employeeId,
        totalSales: totalSales.toString(),
        totalCommission: totalCommission.toString(),
        deductions: deductions.toString(),
        taxAmount: taxAmount.toString(),
        netPayment: netPayment.toString(),
        status: "draft",
        notes: input.notes,
        createdBy: ctx.userId,
      });

      return { id: result.insertId, paymentNumber };
    }),

  processCommissionPayment: protectedProcedure
    .input(z.object({
      id: z.number(),
      paymentMethod: z.enum(["bank_transfer", "cash", "check", "payroll"]),
      paymentDate: z.string(),
      bankAccount: z.string().optional(),
      transactionReference: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...paymentDetails } = input;

      // Update payment status
      await db
        .update(commissionPayments)
        .set({
          ...paymentDetails,
          status: "paid",
          paidBy: ctx.userId,
        })
        .where(and(
          eq(commissionPayments.id, id),
          eq(commissionPayments.tenantId, ctx.tenantId)
        ));

      // Get payment details
      const [payment] = await db
        .select()
        .from(commissionPayments)
        .where(eq(commissionPayments.id, id));

      // Mark commissions as paid
      await db
        .update(commissionCalculations)
        .set({
          status: "paid",
          paidAt: new Date(),
          paidBy: ctx.userId,
        })
        .where(and(
          eq(commissionCalculations.tenantId, ctx.tenantId),
          eq(commissionCalculations.employeeId, payment.employeeId),
          eq(commissionCalculations.paymentPeriod, payment.paymentPeriod),
          eq(commissionCalculations.status, "approved")
        ));

      return { success: true };
    }),

  // ==========================================================================
  // COMMISSION TARGETS
  // ==========================================================================

  getCommissionTargets: protectedProcedure
    .input(z.object({
      employeeId: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(commissionTargets.tenantId, ctx.tenantId)];

      if (input.employeeId !== undefined) {
        conditions.push(
          sql`(${commissionTargets.employeeId} = ${input.employeeId} OR ${commissionTargets.employeeId} IS NULL)`
        );
      }

      if (input.isActive !== undefined) {
        conditions.push(eq(commissionTargets.isActive, input.isActive));
      }

      return await db
        .select()
        .from(commissionTargets)
        .where(and(...conditions))
        .orderBy(desc(commissionTargets.startDate));
    }),

  createCommissionTarget: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      employeeId: z.number().optional(),
      periodType: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly", "custom"]),
      startDate: z.string(),
      endDate: z.string(),
      targetType: z.enum(["sales_amount", "sales_count", "service_count", "product_count", "customer_count", "average_sale"]),
      targetValue: z.string(),
      bonusType: z.enum(["fixed_amount", "percentage", "tiered"]),
      bonusAmount: z.string().optional(),
      bonusPercentage: z.string().optional(),
      tieredBonuses: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [result] = await db.insert(commissionTargets).values({
        tenantId: ctx.tenantId,
        ...input,
      });

      return { id: result.insertId };
    }),

  // ==========================================================================
  // EMPLOYEE COMMISSION SETTINGS
  // ==========================================================================

  getEmployeeCommissionSettings: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [settings] = await db
        .select()
        .from(employeeCommissionSettings)
        .where(and(
          eq(employeeCommissionSettings.tenantId, ctx.tenantId),
          eq(employeeCommissionSettings.employeeId, input.employeeId)
        ));

      return settings || null;
    }),

  updateEmployeeCommissionSettings: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
      commissionEnabled: z.boolean().optional(),
      defaultCommissionRate: z.string().optional(),
      paymentFrequency: z.enum(["weekly", "biweekly", "monthly", "quarterly"]).optional(),
      minimumPayoutThreshold: z.string().optional(),
      bankName: z.string().optional(),
      bankAccount: z.string().optional(),
      taxRate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { employeeId, ...settings } = input;

      // Check if settings exist
      const [existing] = await db
        .select()
        .from(employeeCommissionSettings)
        .where(and(
          eq(employeeCommissionSettings.tenantId, ctx.tenantId),
          eq(employeeCommissionSettings.employeeId, employeeId)
        ));

      if (existing) {
        // Update
        await db
          .update(employeeCommissionSettings)
          .set(settings)
          .where(and(
            eq(employeeCommissionSettings.tenantId, ctx.tenantId),
            eq(employeeCommissionSettings.employeeId, employeeId)
          ));
      } else {
        // Insert
        await db.insert(employeeCommissionSettings).values({
          tenantId: ctx.tenantId,
          employeeId,
          ...settings,
        });
      }

      return { success: true };
    }),

  // ==========================================================================
  // COMMISSION REPORTS
  // ==========================================================================

  getCommissionReport: protectedProcedure
    .input(z.object({
      reportType: z.enum(["employee_summary", "period_summary", "detailed", "comparison"]),
      employeeId: z.number().optional(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      // Implementation depends on report type
      // This is a placeholder for the report generation logic
      return {
        reportType: input.reportType,
        data: [],
      };
    }),
});

// ==========================================================================
// HELPER FUNCTIONS
// ==========================================================================

async function generatePaymentNumber(tenantId: string, paymentPeriod: string): Promise<string> {
  const [year, month] = paymentPeriod.split('-');
  
  const [lastPayment] = await db
    .select()
    .from(commissionPayments)
    .where(and(
      eq(commissionPayments.tenantId, tenantId),
      eq(commissionPayments.paymentPeriod, paymentPeriod)
    ))
    .orderBy(desc(commissionPayments.id))
    .limit(1);

  let sequence = 1;
  if (lastPayment) {
    const lastNumber = lastPayment.paymentNumber.split('-').pop();
    sequence = parseInt(lastNumber || "0") + 1;
  }

  return `CP-${year}-${month}-${String(sequence).padStart(3, '0')}`;
}
