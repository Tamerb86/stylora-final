import { db } from "./db";
import {
  commissionRules,
  commissionCalculations,
  commissionTargets,
  employeeCommissionSettings,
} from "./commission_schema";
import { orders, orderItems, appointments, products, services } from "./schema";
import { eq, and, sql, gte, lte, desc } from "drizzle-orm";

/**
 * Commission Calculator
 * Automatic commission calculation system
 */

// ============================================================================
// TYPES
// ============================================================================

interface CommissionCalculationInput {
  tenantId: string;
  employeeId: number;
  sourceType: "order" | "appointment" | "product_sale" | "service_sale";
  sourceId: number;
  saleAmount: number;
  saleDate: Date;
  productId?: number;
  serviceId?: number;
  categoryId?: number;
}

interface TieredRate {
  min: number;
  max: number;
  rate: number;
}

interface CalculationResult {
  commissionAmount: number;
  commissionRate?: number;
  ruleId?: number;
  ruleType?: string;
  details: string;
}

// ============================================================================
// COMMISSION CALCULATION
// ============================================================================

/**
 * Calculate commission for a single sale
 */
export async function calculateCommission(
  input: CommissionCalculationInput
): Promise<CalculationResult> {
  const {
    tenantId,
    employeeId,
    sourceType,
    sourceId,
    saleAmount,
    saleDate,
    productId,
    serviceId,
    categoryId,
  } = input;

  console.log(`[Commission] Calculating for employee ${employeeId}, amount: ${saleAmount}`);

  // Get employee commission settings
  const [empSettings] = await db
    .select()
    .from(employeeCommissionSettings)
    .where(and(
      eq(employeeCommissionSettings.tenantId, tenantId),
      eq(employeeCommissionSettings.employeeId, employeeId)
    ));

  // Check if commission is enabled for this employee
  if (empSettings && !empSettings.commissionEnabled) {
    console.log(`[Commission] Commission disabled for employee ${employeeId}`);
    return {
      commissionAmount: 0,
      details: "Commission disabled for this employee",
    };
  }

  // Get applicable commission rules
  const rules = await db
    .select()
    .from(commissionRules)
    .where(and(
      eq(commissionRules.tenantId, tenantId),
      eq(commissionRules.isActive, true),
      or(
        eq(commissionRules.employeeId, employeeId),
        sql`${commissionRules.employeeId} IS NULL`
      ),
      or(
        sql`${commissionRules.validFrom} IS NULL`,
        lte(commissionRules.validFrom, saleDate.toISOString().split('T')[0])
      ),
      or(
        sql`${commissionRules.validTo} IS NULL`,
        gte(commissionRules.validTo, saleDate.toISOString().split('T')[0])
      )
    ))
    .orderBy(desc(commissionRules.priority));

  console.log(`[Commission] Found ${rules.length} applicable rules`);

  // Find the best matching rule
  let bestRule = null;
  let bestRuleScore = -1;

  for (const rule of rules) {
    let score = 0;

    // Check if rule applies to this sale
    if (rule.appliesTo === "all_sales") {
      score = 1;
    } else if (rule.appliesTo === "services_only" && serviceId) {
      score = 2;
    } else if (rule.appliesTo === "products_only" && productId) {
      score = 2;
    } else if (rule.appliesTo === "specific_category" && categoryId === rule.targetId) {
      score = 3;
    } else if (rule.appliesTo === "specific_product" && productId === rule.targetId) {
      score = 4;
    } else if (rule.appliesTo === "specific_service" && serviceId === rule.targetId) {
      score = 4;
    } else {
      continue; // Rule doesn't apply
    }

    // Check minimum sale amount
    if (rule.minimumSaleAmount && saleAmount < parseFloat(rule.minimumSaleAmount.toString())) {
      continue;
    }

    // Employee-specific rules have higher priority
    if (rule.employeeId === employeeId) {
      score += 10;
    }

    if (score > bestRuleScore) {
      bestRuleScore = score;
      bestRule = rule;
    }
  }

  // If no rule found, use default rate
  if (!bestRule) {
    const defaultRate = empSettings?.defaultCommissionRate 
      ? parseFloat(empSettings.defaultCommissionRate.toString())
      : 0;

    if (defaultRate === 0) {
      console.log(`[Commission] No rule found and no default rate`);
      return {
        commissionAmount: 0,
        details: "No applicable commission rule found",
      };
    }

    const commissionAmount = (saleAmount * defaultRate) / 100;
    console.log(`[Commission] Using default rate: ${defaultRate}%, amount: ${commissionAmount}`);

    return {
      commissionAmount,
      commissionRate: defaultRate,
      details: `Default commission rate: ${defaultRate}%`,
    };
  }

  // Calculate commission based on rule type
  let commissionAmount = 0;
  let commissionRate = 0;
  let details = "";

  switch (bestRule.ruleType) {
    case "percentage":
      commissionRate = parseFloat(bestRule.commissionRate?.toString() || "0");
      commissionAmount = (saleAmount * commissionRate) / 100;
      details = `Percentage: ${commissionRate}%`;
      break;

    case "fixed_amount":
      commissionAmount = parseFloat(bestRule.fixedAmount?.toString() || "0");
      details = `Fixed amount: ${commissionAmount} kr`;
      break;

    case "tiered":
      const tieredRates: TieredRate[] = bestRule.tieredRates 
        ? JSON.parse(bestRule.tieredRates)
        : [];
      
      for (const tier of tieredRates) {
        if (saleAmount >= tier.min && (tier.max === null || saleAmount <= tier.max)) {
          commissionRate = tier.rate;
          commissionAmount = (saleAmount * commissionRate) / 100;
          details = `Tiered rate: ${commissionRate}% (${tier.min} - ${tier.max || '∞'})`;
          break;
        }
      }
      break;

    default:
      console.warn(`[Commission] Unknown rule type: ${bestRule.ruleType}`);
      commissionAmount = 0;
      details = `Unknown rule type: ${bestRule.ruleType}`;
  }

  console.log(`[Commission] Calculated: ${commissionAmount} kr using rule ${bestRule.id}`);

  return {
    commissionAmount,
    commissionRate: commissionRate || undefined,
    ruleId: bestRule.id,
    ruleType: bestRule.ruleType,
    details,
  };
}

/**
 * Record commission calculation in database
 */
export async function recordCommission(
  input: CommissionCalculationInput,
  calculation: CalculationResult
): Promise<number> {
  const {
    tenantId,
    employeeId,
    sourceType,
    sourceId,
    saleAmount,
    saleDate,
    productId,
    serviceId,
    categoryId,
  } = input;

  // Determine payment period (YYYY-MM format)
  const paymentPeriod = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;

  const [result] = await db.insert(commissionCalculations).values({
    tenantId,
    employeeId,
    sourceType,
    sourceId,
    saleAmount: saleAmount.toString(),
    saleDate: saleDate.toISOString().split('T')[0],
    productId,
    serviceId,
    categoryId,
    commissionRuleId: calculation.ruleId,
    ruleType: calculation.ruleType,
    commissionRate: calculation.commissionRate?.toString(),
    commissionAmount: calculation.commissionAmount.toString(),
    status: "pending",
    paymentPeriod,
    calculationDetails: JSON.stringify(calculation),
  });

  console.log(`[Commission] Recorded calculation ID: ${result.insertId}`);

  return result.insertId;
}

/**
 * Calculate and record commission for an order
 */
export async function calculateOrderCommission(
  tenantId: string,
  orderId: number
): Promise<void> {
  console.log(`[Commission] Processing order ${orderId}`);

  // Get order details
  const [order] = await db
    .select()
    .from(orders)
    .where(and(
      eq(orders.id, orderId),
      eq(orders.tenantId, tenantId)
    ));

  if (!order) {
    console.error(`[Commission] Order ${orderId} not found`);
    return;
  }

  // Get order items
  const items = await db
    .select({
      item: orderItems,
      product: products,
      service: services,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .leftJoin(services, eq(orderItems.serviceId, services.id))
    .where(eq(orderItems.orderId, orderId));

  console.log(`[Commission] Found ${items.length} items in order`);

  // Calculate commission for each item
  for (const { item, product, service } of items) {
    const employeeId = item.employeeId || order.employeeId;
    
    if (!employeeId) {
      console.log(`[Commission] No employee assigned to item ${item.id}`);
      continue;
    }

    const saleAmount = parseFloat(item.price.toString()) * item.quantity;
    const saleDate = order.createdAt;

    const input: CommissionCalculationInput = {
      tenantId,
      employeeId,
      sourceType: "order",
      sourceId: orderId,
      saleAmount,
      saleDate,
      productId: item.productId || undefined,
      serviceId: item.serviceId || undefined,
      categoryId: product?.categoryId || service?.categoryId || undefined,
    };

    const calculation = await calculateCommission(input);
    
    if (calculation.commissionAmount > 0) {
      await recordCommission(input, calculation);
    }
  }

  console.log(`[Commission] Completed processing order ${orderId}`);
}

/**
 * Calculate and record commission for an appointment
 */
export async function calculateAppointmentCommission(
  tenantId: string,
  appointmentId: number
): Promise<void> {
  console.log(`[Commission] Processing appointment ${appointmentId}`);

  // Get appointment details
  const [appointment] = await db
    .select({
      appointment: appointments,
      service: services,
    })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .where(and(
      eq(appointments.id, appointmentId),
      eq(appointments.tenantId, tenantId)
    ));

  if (!appointment) {
    console.error(`[Commission] Appointment ${appointmentId} not found`);
    return;
  }

  const employeeId = appointment.appointment.employeeId;
  
  if (!employeeId) {
    console.log(`[Commission] No employee assigned to appointment ${appointmentId}`);
    return;
  }

  // Only calculate commission if appointment is completed and paid
  if (appointment.appointment.status !== "completed") {
    console.log(`[Commission] Appointment ${appointmentId} not completed`);
    return;
  }

  const saleAmount = parseFloat(appointment.appointment.price?.toString() || "0");
  const saleDate = appointment.appointment.startTime;

  const input: CommissionCalculationInput = {
    tenantId,
    employeeId,
    sourceType: "appointment",
    sourceId: appointmentId,
    saleAmount,
    saleDate,
    serviceId: appointment.appointment.serviceId || undefined,
    categoryId: appointment.service?.categoryId || undefined,
  };

  const calculation = await calculateCommission(input);
  
  if (calculation.commissionAmount > 0) {
    await recordCommission(input, calculation);
  }

  console.log(`[Commission] Completed processing appointment ${appointmentId}`);
}

// ============================================================================
// COMMISSION APPROVAL
// ============================================================================

/**
 * Approve pending commissions for a period
 */
export async function approveCommissions(
  tenantId: string,
  paymentPeriod: string,
  employeeId?: number,
  approvedBy?: number
): Promise<number> {
  console.log(`[Commission] Approving commissions for period ${paymentPeriod}`);

  const conditions = [
    eq(commissionCalculations.tenantId, tenantId),
    eq(commissionCalculations.paymentPeriod, paymentPeriod),
    eq(commissionCalculations.status, "pending"),
  ];

  if (employeeId) {
    conditions.push(eq(commissionCalculations.employeeId, employeeId));
  }

  const result = await db
    .update(commissionCalculations)
    .set({
      status: "approved",
      approvedAt: new Date(),
      approvedBy,
    })
    .where(and(...conditions));

  console.log(`[Commission] Approved commissions`);

  return result.rowsAffected || 0;
}

// ============================================================================
// TARGET BONUS CALCULATION
// ============================================================================

/**
 * Calculate target bonuses for an employee
 */
export async function calculateTargetBonuses(
  tenantId: string,
  employeeId: number,
  startDate: Date,
  endDate: Date
): Promise<number> {
  console.log(`[Commission] Calculating target bonuses for employee ${employeeId}`);

  // Get active targets for this employee
  const targets = await db
    .select()
    .from(commissionTargets)
    .where(and(
      eq(commissionTargets.tenantId, tenantId),
      eq(commissionTargets.isActive, true),
      or(
        eq(commissionTargets.employeeId, employeeId),
        sql`${commissionTargets.employeeId} IS NULL`
      ),
      lte(commissionTargets.startDate, endDate.toISOString().split('T')[0]),
      gte(commissionTargets.endDate, startDate.toISOString().split('T')[0])
    ));

  let totalBonus = 0;

  for (const target of targets) {
    // Get employee's performance for this target period
    const performance = await getEmployeePerformance(
      tenantId,
      employeeId,
      target.targetType,
      new Date(target.startDate),
      new Date(target.endDate)
    );

    const targetValue = parseFloat(target.targetValue.toString());
    const achievementPercentage = (performance / targetValue) * 100;

    console.log(`[Commission] Target ${target.id}: ${achievementPercentage.toFixed(2)}% achieved`);

    if (achievementPercentage < 100) {
      continue; // Target not met
    }

    // Calculate bonus based on type
    let bonus = 0;

    switch (target.bonusType) {
      case "fixed_amount":
        bonus = parseFloat(target.bonusAmount?.toString() || "0");
        break;

      case "percentage":
        const bonusPercentage = parseFloat(target.bonusPercentage?.toString() || "0");
        bonus = (performance * bonusPercentage) / 100;
        break;

      case "tiered":
        const tieredBonuses = target.tieredBonuses ? JSON.parse(target.tieredBonuses) : [];
        for (const tier of tieredBonuses.sort((a: any, b: any) => b.threshold - a.threshold)) {
          if (achievementPercentage >= tier.threshold) {
            bonus = tier.bonus;
            break;
          }
        }
        break;
    }

    console.log(`[Commission] Target ${target.id} bonus: ${bonus} kr`);
    totalBonus += bonus;
  }

  return totalBonus;
}

/**
 * Get employee performance metric
 */
async function getEmployeePerformance(
  tenantId: string,
  employeeId: number,
  targetType: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const calculations = await db
    .select()
    .from(commissionCalculations)
    .where(and(
      eq(commissionCalculations.tenantId, tenantId),
      eq(commissionCalculations.employeeId, employeeId),
      gte(commissionCalculations.saleDate, startDate.toISOString().split('T')[0]),
      lte(commissionCalculations.saleDate, endDate.toISOString().split('T')[0])
    ));

  switch (targetType) {
    case "sales_amount":
      return calculations.reduce((sum, calc) => sum + parseFloat(calc.saleAmount.toString()), 0);

    case "sales_count":
      return calculations.length;

    case "service_count":
      return calculations.filter(c => c.sourceType === "service_sale" || c.sourceType === "appointment").length;

    case "product_count":
      return calculations.filter(c => c.sourceType === "product_sale").length;

    case "average_sale":
      const totalSales = calculations.reduce((sum, calc) => sum + parseFloat(calc.saleAmount.toString()), 0);
      return calculations.length > 0 ? totalSales / calculations.length : 0;

    default:
      return 0;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  CommissionCalculationInput,
  CalculationResult,
  TieredRate,
};
