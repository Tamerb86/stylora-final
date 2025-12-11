import { z } from "zod";
import { router, protectedProcedure } from "./trpc";
import { db } from "./db";
import { 
  customerSegments,
  customerSegmentMembers,
  marketingCampaigns,
  campaignRecipients,
  referralProgram,
  referrals,
  giftCards,
  giftCardTransactions,
  promoCodes,
  promoCodeUsage,
  customerFeedback,
  npsSurveys,
  customers,
} from "./schema";
import { eq, and, desc, sql, gte, lte, inArray } from "drizzle-orm";

export const crmRouter = router({
  // ============================================================================
  // CUSTOMER SEGMENTS
  // ============================================================================

  /**
   * Get all customer segments
   */
  getSegments: protectedProcedure.query(async ({ ctx }) => {
    const segments = await db
      .select()
      .from(customerSegments)
      .where(eq(customerSegments.tenantId, ctx.user.tenantId))
      .orderBy(desc(customerSegments.createdAt));

    return segments;
  }),

  /**
   * Create a new customer segment
   */
  createSegment: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        type: z.enum(["static", "dynamic"]),
        criteria: z.string().optional(), // JSON string
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [segment] = await db.insert(customerSegments).values({
        tenantId: ctx.user.tenantId,
        name: input.name,
        description: input.description,
        type: input.type,
        criteria: input.criteria,
        customerCount: 0,
      });

      return segment;
    }),

  /**
   * Add customers to a static segment
   */
  addCustomersToSegment: protectedProcedure
    .input(
      z.object({
        segmentId: z.number(),
        customerIds: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const values = input.customerIds.map((customerId) => ({
        tenantId: ctx.user.tenantId,
        segmentId: input.segmentId,
        customerId,
        addedBy: ctx.user.id,
      }));

      await db.insert(customerSegmentMembers).values(values);

      // Update customer count
      await db
        .update(customerSegments)
        .set({
          customerCount: sql`${customerSegments.customerCount} + ${input.customerIds.length}`,
        })
        .where(eq(customerSegments.id, input.segmentId));

      return { success: true };
    }),

  /**
   * Get customers in a segment
   */
  getSegmentCustomers: protectedProcedure
    .input(z.object({ segmentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const members = await db
        .select({
          customer: customers,
          addedAt: customerSegmentMembers.addedAt,
        })
        .from(customerSegmentMembers)
        .innerJoin(
          customers,
          eq(customerSegmentMembers.customerId, customers.id)
        )
        .where(
          and(
            eq(customerSegmentMembers.tenantId, ctx.user.tenantId),
            eq(customerSegmentMembers.segmentId, input.segmentId)
          )
        );

      return members;
    }),

  // ============================================================================
  // MARKETING CAMPAIGNS
  // ============================================================================

  /**
   * Get all marketing campaigns
   */
  getCampaigns: protectedProcedure.query(async ({ ctx }) => {
    const campaigns = await db
      .select()
      .from(marketingCampaigns)
      .where(eq(marketingCampaigns.tenantId, ctx.user.tenantId))
      .orderBy(desc(marketingCampaigns.createdAt));

    return campaigns;
  }),

  /**
   * Create a new marketing campaign
   */
  createCampaign: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        type: z.enum(["email", "sms", "both"]),
        segmentId: z.number().optional(),
        emailSubject: z.string().max(500).optional(),
        emailBody: z.string().optional(),
        smsMessage: z.string().optional(),
        scheduledFor: z.string().optional(),
        sendImmediately: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [campaign] = await db.insert(marketingCampaigns).values({
        tenantId: ctx.user.tenantId,
        name: input.name,
        description: input.description,
        type: input.type,
        segmentId: input.segmentId,
        emailSubject: input.emailSubject,
        emailBody: input.emailBody,
        smsMessage: input.smsMessage,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
        sendImmediately: input.sendImmediately,
        status: input.sendImmediately ? "sending" : "draft",
      });

      return campaign;
    }),

  /**
   * Send a campaign
   */
  sendCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Get campaign
      const [campaign] = await db
        .select()
        .from(marketingCampaigns)
        .where(
          and(
            eq(marketingCampaigns.id, input.campaignId),
            eq(marketingCampaigns.tenantId, ctx.user.tenantId)
          )
        );

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      // Get recipients
      let recipients;
      if (campaign.segmentId) {
        // Get customers from segment
        recipients = await db
          .select({ customer: customers })
          .from(customerSegmentMembers)
          .innerJoin(
            customers,
            eq(customerSegmentMembers.customerId, customers.id)
          )
          .where(
            and(
              eq(customerSegmentMembers.tenantId, ctx.user.tenantId),
              eq(customerSegmentMembers.segmentId, campaign.segmentId)
            )
          );
      } else {
        // All customers
        recipients = await db
          .select()
          .from(customers)
          .where(eq(customers.tenantId, ctx.user.tenantId));
      }

      // Create recipient records
      const recipientValues = recipients.map((r) => ({
        tenantId: ctx.user.tenantId,
        campaignId: campaign.id,
        customerId: "customer" in r ? r.customer.id : r.id,
      }));

      await db.insert(campaignRecipients).values(recipientValues);

      // Update campaign status
      await db
        .update(marketingCampaigns)
        .set({
          status: "sending",
          totalRecipients: recipients.length,
          sentAt: new Date(),
        })
        .where(eq(marketingCampaigns.id, campaign.id));

      // TODO: Implement actual email/SMS sending logic here
      // This would integrate with your email service (e.g., SendGrid, AWS SES)
      // and SMS service (e.g., Twilio)

      return { success: true, recipientCount: recipients.length };
    }),

  /**
   * Get campaign statistics
   */
  getCampaignStats: protectedProcedure
    .input(z.object({ campaignId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [campaign] = await db
        .select()
        .from(marketingCampaigns)
        .where(
          and(
            eq(marketingCampaigns.id, input.campaignId),
            eq(marketingCampaigns.tenantId, ctx.user.tenantId)
          )
        );

      if (!campaign) {
        throw new Error("Campaign not found");
      }

      const recipients = await db
        .select()
        .from(campaignRecipients)
        .where(eq(campaignRecipients.campaignId, input.campaignId));

      const stats = {
        totalRecipients: recipients.length,
        emailSent: recipients.filter((r) => r.emailSent).length,
        emailDelivered: recipients.filter((r) => r.emailDelivered).length,
        emailOpened: recipients.filter((r) => r.emailOpened).length,
        emailClicked: recipients.filter((r) => r.emailClicked).length,
        smsSent: recipients.filter((r) => r.smsSent).length,
        smsDelivered: recipients.filter((r) => r.smsDelivered).length,
      };

      return {
        campaign,
        stats,
      };
    }),

  // ============================================================================
  // REFERRAL PROGRAM
  // ============================================================================

  /**
   * Get referral program settings
   */
  getReferralProgram: protectedProcedure.query(async ({ ctx }) => {
    const [program] = await db
      .select()
      .from(referralProgram)
      .where(eq(referralProgram.tenantId, ctx.user.tenantId));

    return program;
  }),

  /**
   * Update referral program settings
   */
  updateReferralProgram: protectedProcedure
    .input(
      z.object({
        isActive: z.boolean(),
        referrerRewardType: z.enum(["discount", "points", "cash", "free_service"]),
        referrerRewardValue: z.string(),
        referredRewardType: z.enum(["discount", "points", "cash", "free_service"]),
        referredRewardValue: z.string(),
        minimumPurchase: z.string().optional(),
        expiryDays: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .insert(referralProgram)
        .values({
          tenantId: ctx.user.tenantId,
          ...input,
        })
        .onDuplicateKeyUpdate({
          set: input,
        });

      return { success: true };
    }),

  /**
   * Get all referrals
   */
  getReferrals: protectedProcedure.query(async ({ ctx }) => {
    const allReferrals = await db
      .select({
        referral: referrals,
        referrer: customers,
      })
      .from(referrals)
      .innerJoin(customers, eq(referrals.referrerId, customers.id))
      .where(eq(referrals.tenantId, ctx.user.tenantId))
      .orderBy(desc(referrals.referredAt));

    return allReferrals;
  }),

  /**
   * Create a referral
   */
  createReferral: protectedProcedure
    .input(
      z.object({
        referrerId: z.number(),
        referredEmail: z.string().email().optional(),
        referredPhone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate unique referral code
      const referralCode = `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      // Get program settings
      const [program] = await db
        .select()
        .from(referralProgram)
        .where(eq(referralProgram.tenantId, ctx.user.tenantId));

      const expiresAt = program?.expiryDays
        ? new Date(Date.now() + program.expiryDays * 24 * 60 * 60 * 1000)
        : null;

      const [referral] = await db.insert(referrals).values({
        tenantId: ctx.user.tenantId,
        referrerId: input.referrerId,
        referralCode,
        referredEmail: input.referredEmail,
        referredPhone: input.referredPhone,
        expiresAt,
      });

      return referral;
    }),

  // ============================================================================
  // GIFT CARDS
  // ============================================================================

  /**
   * Get all gift cards
   */
  getGiftCards: protectedProcedure.query(async ({ ctx }) => {
    const cards = await db
      .select()
      .from(giftCards)
      .where(eq(giftCards.tenantId, ctx.user.tenantId))
      .orderBy(desc(giftCards.purchasedAt));

    return cards;
  }),

  /**
   * Create a gift card
   */
  createGiftCard: protectedProcedure
    .input(
      z.object({
        initialValue: z.string(),
        purchasedBy: z.number().optional(),
        recipientName: z.string().optional(),
        recipientEmail: z.string().email().optional(),
        personalMessage: z.string().optional(),
        expiresAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate unique code
      const code = `GC-${Math.random().toString(36).substring(2, 12).toUpperCase()}`;

      const [card] = await db.insert(giftCards).values({
        tenantId: ctx.user.tenantId,
        code,
        initialValue: input.initialValue,
        currentBalance: input.initialValue,
        purchasedBy: input.purchasedBy,
        recipientName: input.recipientName,
        recipientEmail: input.recipientEmail,
        personalMessage: input.personalMessage,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      });

      return card;
    }),

  /**
   * Use gift card
   */
  useGiftCard: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        amount: z.string(),
        orderId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get gift card
      const [card] = await db
        .select()
        .from(giftCards)
        .where(
          and(
            eq(giftCards.tenantId, ctx.user.tenantId),
            eq(giftCards.code, input.code),
            eq(giftCards.status, "active")
          )
        );

      if (!card) {
        throw new Error("Gift card not found or inactive");
      }

      const amount = parseFloat(input.amount);
      const currentBalance = parseFloat(card.currentBalance);

      if (amount > currentBalance) {
        throw new Error("Insufficient balance");
      }

      const newBalance = (currentBalance - amount).toFixed(2);

      // Update balance
      await db
        .update(giftCards)
        .set({
          currentBalance: newBalance,
          status: parseFloat(newBalance) === 0 ? "used" : "active",
          usedAt: parseFloat(newBalance) === 0 ? new Date() : card.usedAt,
        })
        .where(eq(giftCards.id, card.id));

      // Record transaction
      await db.insert(giftCardTransactions).values({
        tenantId: ctx.user.tenantId,
        giftCardId: card.id,
        type: "use",
        amount: input.amount,
        balanceBefore: card.currentBalance,
        balanceAfter: newBalance,
        orderId: input.orderId,
        performedBy: ctx.user.id,
      });

      return { success: true, newBalance };
    }),

  // ============================================================================
  // PROMO CODES
  // ============================================================================

  /**
   * Get all promo codes
   */
  getPromoCodes: protectedProcedure.query(async ({ ctx }) => {
    const codes = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.tenantId, ctx.user.tenantId))
      .orderBy(desc(promoCodes.createdAt));

    return codes;
  }),

  /**
   * Create a promo code
   */
  createPromoCode: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1).max(50),
        description: z.string().optional(),
        discountType: z.enum(["percentage", "fixed_amount", "free_service"]),
        discountValue: z.string(),
        minimumPurchase: z.string().optional(),
        maximumDiscount: z.string().optional(),
        applicableToServices: z.string().optional(),
        applicableToProducts: z.string().optional(),
        usageLimit: z.number().optional(),
        usagePerCustomer: z.number().default(1),
        validFrom: z.string().optional(),
        validUntil: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [code] = await db.insert(promoCodes).values({
        tenantId: ctx.user.tenantId,
        code: input.code.toUpperCase(),
        description: input.description,
        discountType: input.discountType,
        discountValue: input.discountValue,
        minimumPurchase: input.minimumPurchase || "0.00",
        maximumDiscount: input.maximumDiscount,
        applicableToServices: input.applicableToServices,
        applicableToProducts: input.applicableToProducts,
        usageLimit: input.usageLimit,
        usagePerCustomer: input.usagePerCustomer,
        validFrom: input.validFrom ? new Date(input.validFrom) : null,
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
      });

      return code;
    }),

  /**
   * Validate and apply promo code
   */
  validatePromoCode: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        customerId: z.number(),
        orderAmount: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get promo code
      const [code] = await db
        .select()
        .from(promoCodes)
        .where(
          and(
            eq(promoCodes.tenantId, ctx.user.tenantId),
            eq(promoCodes.code, input.code.toUpperCase()),
            eq(promoCodes.isActive, true)
          )
        );

      if (!code) {
        return { valid: false, message: "Promo code not found or inactive" };
      }

      // Check validity dates
      const now = new Date();
      if (code.validFrom && new Date(code.validFrom) > now) {
        return { valid: false, message: "Promo code not yet valid" };
      }
      if (code.validUntil && new Date(code.validUntil) < now) {
        return { valid: false, message: "Promo code expired" };
      }

      // Check usage limit
      if (code.usageLimit && code.usageCount >= code.usageLimit) {
        return { valid: false, message: "Promo code usage limit reached" };
      }

      // Check per-customer usage
      const customerUsage = await db
        .select()
        .from(promoCodeUsage)
        .where(
          and(
            eq(promoCodeUsage.promoCodeId, code.id),
            eq(promoCodeUsage.customerId, input.customerId)
          )
        );

      if (customerUsage.length >= code.usagePerCustomer) {
        return {
          valid: false,
          message: "You have already used this promo code",
        };
      }

      // Check minimum purchase
      const orderAmount = parseFloat(input.orderAmount);
      const minimumPurchase = parseFloat(code.minimumPurchase);
      if (orderAmount < minimumPurchase) {
        return {
          valid: false,
          message: `Minimum purchase of ${minimumPurchase} required`,
        };
      }

      // Calculate discount
      let discountAmount = 0;
      if (code.discountType === "percentage") {
        discountAmount = (orderAmount * parseFloat(code.discountValue)) / 100;
        if (code.maximumDiscount) {
          discountAmount = Math.min(
            discountAmount,
            parseFloat(code.maximumDiscount)
          );
        }
      } else if (code.discountType === "fixed_amount") {
        discountAmount = parseFloat(code.discountValue);
      }

      return {
        valid: true,
        code,
        discountAmount: discountAmount.toFixed(2),
      };
    }),

  // ============================================================================
  // CUSTOMER FEEDBACK
  // ============================================================================

  /**
   * Get all customer feedback
   */
  getFeedback: protectedProcedure.query(async ({ ctx }) => {
    const feedback = await db
      .select({
        feedback: customerFeedback,
        customer: customers,
      })
      .from(customerFeedback)
      .innerJoin(customers, eq(customerFeedback.customerId, customers.id))
      .where(eq(customerFeedback.tenantId, ctx.user.tenantId))
      .orderBy(desc(customerFeedback.createdAt));

    return feedback;
  }),

  /**
   * Respond to feedback
   */
  respondToFeedback: protectedProcedure
    .input(
      z.object({
        feedbackId: z.number(),
        responseMessage: z.string(),
        isPublic: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await db
        .update(customerFeedback)
        .set({
          responseMessage: input.responseMessage,
          respondedBy: ctx.user.id,
          respondedAt: new Date(),
          status: "responded",
          isPublic: input.isPublic,
        })
        .where(
          and(
            eq(customerFeedback.id, input.feedbackId),
            eq(customerFeedback.tenantId, ctx.user.tenantId)
          )
        );

      return { success: true };
    }),

  // ============================================================================
  // NPS SURVEYS
  // ============================================================================

  /**
   * Get NPS statistics
   */
  getNpsStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      let query = db
        .select()
        .from(npsSurveys)
        .where(eq(npsSurveys.tenantId, ctx.user.tenantId));

      if (input.startDate) {
        query = query.where(
          gte(npsSurveys.createdAt, new Date(input.startDate))
        );
      }
      if (input.endDate) {
        query = query.where(lte(npsSurveys.createdAt, new Date(input.endDate)));
      }

      const surveys = await query;

      const total = surveys.length;
      const promoters = surveys.filter((s) => s.category === "promoter").length;
      const detractors = surveys.filter((s) => s.category === "detractor").length;

      const npsScore = total > 0 ? ((promoters - detractors) / total) * 100 : 0;

      return {
        total,
        promoters,
        passives: surveys.filter((s) => s.category === "passive").length,
        detractors,
        npsScore: Math.round(npsScore),
        averageScore:
          total > 0
            ? surveys.reduce((sum, s) => sum + s.score, 0) / total
            : 0,
      };
    }),

  /**
   * Get recent NPS surveys
   */
  getRecentNpsSurveys: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const surveys = await db
        .select({
          survey: npsSurveys,
          customer: customers,
        })
        .from(npsSurveys)
        .innerJoin(customers, eq(npsSurveys.customerId, customers.id))
        .where(eq(npsSurveys.tenantId, ctx.user.tenantId))
        .orderBy(desc(npsSurveys.createdAt))
        .limit(input.limit);

      return surveys;
    }),
});
