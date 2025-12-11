import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./trpc";
import { db } from "./db";
import {
  paymentLinks,
  paymentTransactions,
  recurringSubscriptions,
  installmentPlans,
  installmentPayments,
  savedPaymentMethods,
  deposits,
} from "./online_payment_schema";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import { PaymentService, StripeProvider, VippsProvider, MobilePayProvider } from "./payment_providers";
import { sendEmail } from "./email";

/**
 * Online Payment Router
 * Complete API for online payments, deposits, subscriptions, and installments
 */

export const onlinePaymentRouter = router({
  // ==========================================================================
  // PAYMENT LINKS
  // ==========================================================================

  /**
   * Create a payment link
   */
  createPaymentLink: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        amountType: z.enum(["fixed", "variable", "minimum"]),
        amount: z.string().optional(),
        minimumAmount: z.string().optional(),
        currency: z.string().default("NOK"),
        paymentType: z.enum(["one_time", "deposit", "recurring", "installment"]),
        depositPercentage: z.string().optional(),
        depositAmount: z.string().optional(),
        recurringInterval: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]).optional(),
        recurringCount: z.number().optional(),
        installmentCount: z.number().optional(),
        installmentInterval: z.enum(["weekly", "biweekly", "monthly"]).optional(),
        allowedMethods: z.array(z.string()).optional(),
        requireCustomerInfo: z.boolean().default(true),
        customerId: z.number().optional(),
        linkedType: z.enum(["appointment", "order", "invoice", "membership", "custom"]).optional(),
        linkedId: z.number().optional(),
        expiresAt: z.string().optional(),
        maxUses: z.number().optional(),
        sendEmailNotification: z.boolean().default(true),
        sendSmsNotification: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const linkId = `PAY-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

      const [paymentLink] = await db.insert(paymentLinks).values({
        tenantId: ctx.user.tenantId,
        linkId,
        title: input.title,
        description: input.description,
        amountType: input.amountType,
        amount: input.amount,
        minimumAmount: input.minimumAmount,
        currency: input.currency,
        paymentType: input.paymentType,
        depositPercentage: input.depositPercentage,
        depositAmount: input.depositAmount,
        recurringInterval: input.recurringInterval,
        recurringCount: input.recurringCount,
        installmentCount: input.installmentCount,
        installmentInterval: input.installmentInterval,
        allowedMethods: JSON.stringify(input.allowedMethods || ["card", "vipps", "mobilepay"]),
        requireCustomerInfo: input.requireCustomerInfo,
        customerId: input.customerId,
        linkedType: input.linkedType,
        linkedId: input.linkedId,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        maxUses: input.maxUses,
        sendEmailNotification: input.sendEmailNotification,
        sendSmsNotification: input.sendSmsNotification,
        createdBy: ctx.user.id,
      });

      return { linkId, id: paymentLink.insertId };
    }),

  /**
   * Get payment link by linkId (public)
   */
  getPaymentLinkByLinkId: publicProcedure
    .input(z.object({ linkId: z.string() }))
    .query(async ({ input }) => {
      const [link] = await db
        .select()
        .from(paymentLinks)
        .where(eq(paymentLinks.linkId, input.linkId))
        .limit(1);

      if (!link) {
        throw new Error("Payment link not found");
      }

      // Check if expired
      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        throw new Error("Payment link has expired");
      }

      // Check if max uses reached
      if (link.maxUses && link.currentUses >= link.maxUses) {
        throw new Error("Payment link has reached maximum uses");
      }

      return link;
    }),

  /**
   * Get all payment links
   */
  getPaymentLinks: protectedProcedure
    .input(
      z.object({
        status: z.enum(["active", "expired", "completed", "cancelled"]).optional(),
        customerId: z.number().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(paymentLinks.tenantId, ctx.user.tenantId)];

      if (input.status) {
        conditions.push(eq(paymentLinks.status, input.status));
      }

      if (input.customerId) {
        conditions.push(eq(paymentLinks.customerId, input.customerId));
      }

      const links = await db
        .select()
        .from(paymentLinks)
        .where(and(...conditions))
        .orderBy(desc(paymentLinks.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return links;
    }),

  /**
   * Update payment link status
   */
  updatePaymentLinkStatus: protectedProcedure
    .input(
      z.object({
        linkId: z.string(),
        status: z.enum(["active", "expired", "completed", "cancelled"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .update(paymentLinks)
        .set({ status: input.status })
        .where(
          and(
            eq(paymentLinks.linkId, input.linkId),
            eq(paymentLinks.tenantId, ctx.user.tenantId)
          )
        );

      return { success: true };
    }),

  // ==========================================================================
  // PAYMENT TRANSACTIONS
  // ==========================================================================

  /**
   * Create a payment transaction
   */
  createPaymentTransaction: publicProcedure
    .input(
      z.object({
        paymentLinkId: z.number().optional(),
        customerId: z.number().optional(),
        customerName: z.string().optional(),
        customerEmail: z.string().email().optional(),
        customerPhone: z.string().optional(),
        amount: z.string(),
        currency: z.string().default("NOK"),
        paymentMethod: z.enum(["card", "vipps", "mobilepay", "bank_transfer", "cash"]),
        provider: z.enum(["stripe", "vipps", "mobilepay"]),
        transactionType: z.enum(["payment", "deposit", "recurring_payment", "installment_payment", "refund", "chargeback"]),
        linkedType: z.enum(["appointment", "order", "invoice", "membership", "subscription", "installment_plan"]).optional(),
        linkedId: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

      // Create payment with provider
      let providerResponse;
      let providerTransactionId;

      try {
        providerResponse = await PaymentService.createPayment({
          provider: input.provider,
          amount: Math.round(parseFloat(input.amount) * 100), // Convert to smallest unit
          currency: input.currency,
          description: `Payment ${transactionId}`,
          reference: transactionId,
          returnUrl: `${process.env.APP_URL}/payment/callback`,
          metadata: {
            transactionId,
            linkedType: input.linkedType || "",
            linkedId: input.linkedId?.toString() || "",
          },
        });

        providerTransactionId = providerResponse.id || providerResponse.reference;
      } catch (error: any) {
        console.error("Payment provider error:", error);
        throw new Error(`Payment creation failed: ${error.message}`);
      }

      // Get tenant ID from payment link if available
      let tenantId = "";
      if (input.paymentLinkId) {
        const [link] = await db
          .select()
          .from(paymentLinks)
          .where(eq(paymentLinks.id, input.paymentLinkId))
          .limit(1);
        
        if (link) {
          tenantId = link.tenantId;
        }
      }

      const amount = parseFloat(input.amount);
      const fee = amount * 0.025; // 2.5% fee
      const netAmount = amount - fee;

      const [transaction] = await db.insert(paymentTransactions).values({
        tenantId,
        transactionId,
        paymentLinkId: input.paymentLinkId,
        customerId: input.customerId,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        amount: input.amount,
        currency: input.currency,
        paymentMethod: input.paymentMethod,
        provider: input.provider,
        providerTransactionId,
        providerMetadata: JSON.stringify(providerResponse),
        transactionType: input.transactionType,
        status: "pending",
        fee: fee.toFixed(2),
        netAmount: netAmount.toFixed(2),
        linkedType: input.linkedType,
        linkedId: input.linkedId,
        notes: input.notes,
      });

      // Update payment link usage count
      if (input.paymentLinkId) {
        await db
          .update(paymentLinks)
          .set({
            currentUses: db.raw("current_uses + 1"),
          })
          .where(eq(paymentLinks.id, input.paymentLinkId));
      }

      return {
        transactionId,
        id: transaction.insertId,
        providerResponse,
      };
    }),

  /**
   * Get payment transactions
   */
  getPaymentTransactions: protectedProcedure
    .input(
      z.object({
        customerId: z.number().optional(),
        status: z.enum(["pending", "processing", "succeeded", "failed", "refunded", "partially_refunded", "cancelled"]).optional(),
        paymentMethod: z.enum(["card", "vipps", "mobilepay", "bank_transfer", "cash"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(paymentTransactions.tenantId, ctx.user.tenantId)];

      if (input.customerId) {
        conditions.push(eq(paymentTransactions.customerId, input.customerId));
      }

      if (input.status) {
        conditions.push(eq(paymentTransactions.status, input.status));
      }

      if (input.paymentMethod) {
        conditions.push(eq(paymentTransactions.paymentMethod, input.paymentMethod));
      }

      if (input.startDate) {
        conditions.push(gte(paymentTransactions.createdAt, new Date(input.startDate)));
      }

      if (input.endDate) {
        conditions.push(lte(paymentTransactions.createdAt, new Date(input.endDate)));
      }

      const transactions = await db
        .select()
        .from(paymentTransactions)
        .where(and(...conditions))
        .orderBy(desc(paymentTransactions.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return transactions;
    }),

  /**
   * Update payment transaction status
   */
  updatePaymentTransactionStatus: protectedProcedure
    .input(
      z.object({
        transactionId: z.string(),
        status: z.enum(["pending", "processing", "succeeded", "failed", "refunded", "partially_refunded", "cancelled"]),
        paidAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .update(paymentTransactions)
        .set({
          status: input.status,
          paidAt: input.paidAt ? new Date(input.paidAt) : undefined,
        })
        .where(
          and(
            eq(paymentTransactions.transactionId, input.transactionId),
            eq(paymentTransactions.tenantId, ctx.user.tenantId)
          )
        );

      return { success: true };
    }),

  /**
   * Create a refund
   */
  createRefund: protectedProcedure
    .input(
      z.object({
        transactionId: z.string(),
        amount: z.string().optional(), // Partial refund
        reason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get original transaction
      const [transaction] = await db
        .select()
        .from(paymentTransactions)
        .where(
          and(
            eq(paymentTransactions.transactionId, input.transactionId),
            eq(paymentTransactions.tenantId, ctx.user.tenantId)
          )
        )
        .limit(1);

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      if (transaction.status !== "succeeded") {
        throw new Error("Can only refund succeeded transactions");
      }

      const refundAmount = input.amount
        ? parseFloat(input.amount)
        : parseFloat(transaction.amount.toString());

      // Create refund with provider
      try {
        await PaymentService.createRefund({
          provider: transaction.provider!,
          paymentId: transaction.providerTransactionId!,
          amount: Math.round(refundAmount * 100),
          reason: input.reason,
        });
      } catch (error: any) {
        console.error("Refund error:", error);
        throw new Error(`Refund failed: ${error.message}`);
      }

      // Update transaction
      const currentRefunded = parseFloat(transaction.refundedAmount.toString());
      const totalRefunded = currentRefunded + refundAmount;
      const fullRefund = totalRefunded >= parseFloat(transaction.amount.toString());

      await db
        .update(paymentTransactions)
        .set({
          status: fullRefund ? "refunded" : "partially_refunded",
          refundedAmount: totalRefunded.toFixed(2),
          refundReason: input.reason,
          refundedAt: new Date(),
        })
        .where(eq(paymentTransactions.id, transaction.id));

      return { success: true, refundedAmount: totalRefunded };
    }),

  // ==========================================================================
  // RECURRING SUBSCRIPTIONS
  // ==========================================================================

  /**
   * Create a recurring subscription
   */
  createRecurringSubscription: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        customerId: z.number(),
        amount: z.string(),
        currency: z.string().default("NOK"),
        billingInterval: z.enum(["daily", "weekly", "monthly", "quarterly", "yearly"]),
        billingDay: z.number().optional(),
        startDate: z.string(),
        endDate: z.string().optional(),
        trialEndDate: z.string().optional(),
        paymentMethod: z.enum(["card", "vipps", "mobilepay"]),
        paymentMethodId: z.string().optional(),
        linkedType: z.enum(["membership", "service_plan", "custom"]).optional(),
        linkedId: z.number().optional(),
        provider: z.enum(["stripe", "vipps", "mobilepay"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const subscriptionId = `SUB-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

      // Calculate next billing date
      const startDate = new Date(input.startDate);
      let nextBillingDate = new Date(startDate);

      switch (input.billingInterval) {
        case "daily":
          nextBillingDate.setDate(nextBillingDate.getDate() + 1);
          break;
        case "weekly":
          nextBillingDate.setDate(nextBillingDate.getDate() + 7);
          break;
        case "monthly":
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
          break;
        case "quarterly":
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 3);
          break;
        case "yearly":
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
          break;
      }

      const [subscription] = await db.insert(recurringSubscriptions).values({
        tenantId: ctx.user.tenantId,
        subscriptionId,
        name: input.name,
        description: input.description,
        customerId: input.customerId,
        amount: input.amount,
        currency: input.currency,
        billingInterval: input.billingInterval,
        billingDay: input.billingDay,
        startDate: input.startDate,
        endDate: input.endDate,
        nextBillingDate: nextBillingDate.toISOString().split('T')[0],
        trialEndDate: input.trialEndDate,
        paymentMethod: input.paymentMethod,
        paymentMethodId: input.paymentMethodId,
        linkedType: input.linkedType,
        linkedId: input.linkedId,
        provider: input.provider,
      });

      return { subscriptionId, id: subscription.insertId };
    }),

  /**
   * Get recurring subscriptions
   */
  getRecurringSubscriptions: protectedProcedure
    .input(
      z.object({
        customerId: z.number().optional(),
        status: z.enum(["active", "past_due", "cancelled", "paused", "expired"]).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(recurringSubscriptions.tenantId, ctx.user.tenantId)];

      if (input.customerId) {
        conditions.push(eq(recurringSubscriptions.customerId, input.customerId));
      }

      if (input.status) {
        conditions.push(eq(recurringSubscriptions.status, input.status));
      }

      const subscriptions = await db
        .select()
        .from(recurringSubscriptions)
        .where(and(...conditions))
        .orderBy(desc(recurringSubscriptions.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return subscriptions;
    }),

  /**
   * Cancel a recurring subscription
   */
  cancelRecurringSubscription: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        cancelAtPeriodEnd: z.boolean().default(false),
        cancellationReason: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .update(recurringSubscriptions)
        .set({
          status: input.cancelAtPeriodEnd ? "active" : "cancelled",
          cancelAtPeriodEnd: input.cancelAtPeriodEnd,
          cancelledAt: new Date(),
          cancellationReason: input.cancellationReason,
        })
        .where(
          and(
            eq(recurringSubscriptions.subscriptionId, input.subscriptionId),
            eq(recurringSubscriptions.tenantId, ctx.user.tenantId)
          )
        );

      return { success: true };
    }),

  // ==========================================================================
  // INSTALLMENT PLANS
  // ==========================================================================

  /**
   * Create an installment plan
   */
  createInstallmentPlan: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        customerId: z.number(),
        totalAmount: z.string(),
        downPayment: z.string().default("0.00"),
        numberOfInstallments: z.number(),
        installmentInterval: z.enum(["weekly", "biweekly", "monthly"]),
        startDate: z.string(),
        paymentMethod: z.enum(["card", "vipps", "mobilepay"]),
        paymentMethodId: z.string().optional(),
        lateFeePercentage: z.string().optional(),
        linkedType: z.enum(["order", "invoice", "service", "custom"]).optional(),
        linkedId: z.number().optional(),
        provider: z.enum(["stripe", "vipps", "mobilepay"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const planId = `INST-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

      const totalAmount = parseFloat(input.totalAmount);
      const downPayment = parseFloat(input.downPayment);
      const remainingAmount = totalAmount - downPayment;
      const installmentAmount = remainingAmount / input.numberOfInstallments;

      // Calculate next payment date
      const startDate = new Date(input.startDate);
      let nextPaymentDate = new Date(startDate);

      switch (input.installmentInterval) {
        case "weekly":
          nextPaymentDate.setDate(nextPaymentDate.getDate() + 7);
          break;
        case "biweekly":
          nextPaymentDate.setDate(nextPaymentDate.getDate() + 14);
          break;
        case "monthly":
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
          break;
      }

      const [plan] = await db.insert(installmentPlans).values({
        tenantId: ctx.user.tenantId,
        planId,
        name: input.name,
        description: input.description,
        customerId: input.customerId,
        totalAmount: input.totalAmount,
        downPayment: input.downPayment,
        remainingAmount: remainingAmount.toFixed(2),
        numberOfInstallments: input.numberOfInstallments,
        installmentAmount: installmentAmount.toFixed(2),
        installmentInterval: input.installmentInterval,
        startDate: input.startDate,
        nextPaymentDate: nextPaymentDate.toISOString().split('T')[0],
        paymentMethod: input.paymentMethod,
        paymentMethodId: input.paymentMethodId,
        lateFeePercentage: input.lateFeePercentage,
        linkedType: input.linkedType,
        linkedId: input.linkedId,
        provider: input.provider,
      });

      // Create installment payment records
      for (let i = 1; i <= input.numberOfInstallments; i++) {
        const dueDate = new Date(startDate);
        
        switch (input.installmentInterval) {
          case "weekly":
            dueDate.setDate(dueDate.getDate() + (i * 7));
            break;
          case "biweekly":
            dueDate.setDate(dueDate.getDate() + (i * 14));
            break;
          case "monthly":
            dueDate.setMonth(dueDate.getMonth() + i);
            break;
        }

        await db.insert(installmentPayments).values({
          tenantId: ctx.user.tenantId,
          installmentPlanId: plan.insertId,
          installmentNumber: i,
          amount: installmentAmount.toFixed(2),
          totalAmount: installmentAmount.toFixed(2),
          dueDate: dueDate.toISOString().split('T')[0],
        });
      }

      return { planId, id: plan.insertId };
    }),

  /**
   * Get installment plans
   */
  getInstallmentPlans: protectedProcedure
    .input(
      z.object({
        customerId: z.number().optional(),
        status: z.enum(["active", "completed", "defaulted", "cancelled"]).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(installmentPlans.tenantId, ctx.user.tenantId)];

      if (input.customerId) {
        conditions.push(eq(installmentPlans.customerId, input.customerId));
      }

      if (input.status) {
        conditions.push(eq(installmentPlans.status, input.status));
      }

      const plans = await db
        .select()
        .from(installmentPlans)
        .where(and(...conditions))
        .orderBy(desc(installmentPlans.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return plans;
    }),

  /**
   * Get installment payments for a plan
   */
  getInstallmentPayments: protectedProcedure
    .input(z.object({ planId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get plan
      const [plan] = await db
        .select()
        .from(installmentPlans)
        .where(
          and(
            eq(installmentPlans.planId, input.planId),
            eq(installmentPlans.tenantId, ctx.user.tenantId)
          )
        )
        .limit(1);

      if (!plan) {
        throw new Error("Installment plan not found");
      }

      // Get payments
      const payments = await db
        .select()
        .from(installmentPayments)
        .where(
          and(
            eq(installmentPayments.installmentPlanId, plan.id),
            eq(installmentPayments.tenantId, ctx.user.tenantId)
          )
        )
        .orderBy(asc(installmentPayments.installmentNumber));

      return payments;
    }),

  // ==========================================================================
  // DEPOSITS
  // ==========================================================================

  /**
   * Create a deposit
   */
  createDeposit: protectedProcedure
    .input(
      z.object({
        customerId: z.number(),
        totalAmount: z.string(),
        depositAmount: z.string().optional(),
        depositPercentage: z.string().optional(),
        linkedType: z.enum(["appointment", "order", "service"]),
        linkedId: z.number(),
        remainingDueDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const depositId = `DEP-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

      const totalAmount = parseFloat(input.totalAmount);
      let depositAmount: number;

      if (input.depositAmount) {
        depositAmount = parseFloat(input.depositAmount);
      } else if (input.depositPercentage) {
        depositAmount = totalAmount * (parseFloat(input.depositPercentage) / 100);
      } else {
        throw new Error("Either depositAmount or depositPercentage must be provided");
      }

      const remainingAmount = totalAmount - depositAmount;

      const [deposit] = await db.insert(deposits).values({
        tenantId: ctx.user.tenantId,
        depositId,
        customerId: input.customerId,
        totalAmount: input.totalAmount,
        depositAmount: depositAmount.toFixed(2),
        depositPercentage: input.depositPercentage,
        remainingAmount: remainingAmount.toFixed(2),
        linkedType: input.linkedType,
        linkedId: input.linkedId,
        remainingDueDate: input.remainingDueDate,
      });

      return { depositId, id: deposit.insertId };
    }),

  /**
   * Get deposits
   */
  getDeposits: protectedProcedure
    .input(
      z.object({
        customerId: z.number().optional(),
        status: z.enum(["pending_deposit", "deposit_paid", "completed", "refunded", "expired"]).optional(),
        linkedType: z.enum(["appointment", "order", "service"]).optional(),
        linkedId: z.number().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(deposits.tenantId, ctx.user.tenantId)];

      if (input.customerId) {
        conditions.push(eq(deposits.customerId, input.customerId));
      }

      if (input.status) {
        conditions.push(eq(deposits.status, input.status));
      }

      if (input.linkedType) {
        conditions.push(eq(deposits.linkedType, input.linkedType));
      }

      if (input.linkedId) {
        conditions.push(eq(deposits.linkedId, input.linkedId));
      }

      const depositsList = await db
        .select()
        .from(deposits)
        .where(and(...conditions))
        .orderBy(desc(deposits.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return depositsList;
    }),

  /**
   * Mark deposit as paid
   */
  markDepositAsPaid: protectedProcedure
    .input(
      z.object({
        depositId: z.string(),
        transactionId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .update(deposits)
        .set({
          depositPaid: true,
          depositPaidAt: new Date(),
          depositTransactionId: input.transactionId,
          status: "deposit_paid",
        })
        .where(
          and(
            eq(deposits.depositId, input.depositId),
            eq(deposits.tenantId, ctx.user.tenantId)
          )
        );

      return { success: true };
    }),

  /**
   * Mark remaining payment as paid
   */
  markRemainingAsPaid: protectedProcedure
    .input(
      z.object({
        depositId: z.string(),
        transactionId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .update(deposits)
        .set({
          remainingPaid: true,
          remainingPaidAt: new Date(),
          remainingTransactionId: input.transactionId,
          status: "completed",
        })
        .where(
          and(
            eq(deposits.depositId, input.depositId),
            eq(deposits.tenantId, ctx.user.tenantId)
          )
        );

      return { success: true };
    }),
});
