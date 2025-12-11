/**
 * Monthly Billing Scheduler
 * 
 * Automatically generates invoices at the end of each month for:
 * - Email overage charges
 * - SMS package fees and overage charges
 * 
 * Runs on the 1st of each month at 02:00 AM
 */

import cron from "node-cron";
import { getDb } from "./db";
import { tenants, emailOverageInvoices, smsOverageInvoices } from "../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import { stripe } from "./stripe";

/**
 * Generate invoice number
 */
function generateInvoiceNumber(type: "email" | "sms", tenantId: string, date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const prefix = type === "email" ? "EML" : "SMS";
  const shortTenantId = tenantId.substring(0, 8);
  return `${prefix}-${year}${month}-${shortTenantId}`;
}

/**
 * Create Stripe invoice for a tenant
 */
async function createStripeInvoice(
  tenantId: string,
  stripeCustomerId: string,
  description: string,
  amount: number,
  currency: string = "NOK"
): Promise<string> {
  try {
    // Create invoice item
    await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      description,
    });

    // Create and finalize invoice
    const invoice = await stripe.invoices.create({
      customer: stripeCustomerId,
      auto_advance: true, // Automatically finalize the invoice
      collection_method: "charge_automatically",
    });

    // Finalize the invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

    console.log(`✅ Created Stripe invoice ${finalizedInvoice.id} for tenant ${tenantId}`);
    return finalizedInvoice.id;
  } catch (error) {
    console.error(`❌ Failed to create Stripe invoice for tenant ${tenantId}:`, error);
    throw error;
  }
}

/**
 * Process email overage billing for a tenant
 */
async function processEmailOverageBilling(tenantId: string, tenant: any, db: any) {
  const emailsOverLimit = Math.max(0, (tenant.emailsSentThisMonth || 0) - (tenant.emailMonthlyLimit || 0));
  
  if (emailsOverLimit === 0) {
    console.log(`ℹ️ Tenant ${tenant.name} has no email overage`);
    return null;
  }

  const overageRate = parseFloat(tenant.emailOverageRate || "0.10");
  const subtotal = emailsOverLimit * overageRate;
  const vatRate = 25.00;
  const vatAmount = subtotal * (vatRate / 100);
  const totalAmount = subtotal + vatAmount;

  // Calculate billing period (previous month)
  const now = new Date();
  const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
  const billingPeriodStart = new Date(billingPeriodEnd.getFullYear(), billingPeriodEnd.getMonth(), 1);

  const invoiceNumber = generateInvoiceNumber("email", tenantId, now);

  // Create Stripe invoice if customer ID exists
  let stripeInvoiceId = null;
  if (tenant.stripeCustomerId) {
    try {
      stripeInvoiceId = await createStripeInvoice(
        tenantId,
        tenant.stripeCustomerId,
        `Email overage charges for ${billingPeriodStart.toLocaleDateString("no-NO", { month: "long", year: "numeric" })}`,
        totalAmount,
        "NOK"
      );
    } catch (error) {
      console.error(`Failed to create Stripe invoice for tenant ${tenant.name}:`, error);
    }
  }

  // Create invoice record in database
  await db.insert(emailOverageInvoices).values({
    tenantId,
    invoiceNumber,
    billingPeriodStart,
    billingPeriodEnd,
    emailsOverLimit,
    overageRate: overageRate.toFixed(2),
    subtotal: subtotal.toFixed(2),
    vatRate: vatRate.toFixed(2),
    vatAmount: vatAmount.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
    currency: "NOK",
    status: stripeInvoiceId ? "pending" : "pending",
    stripeInvoiceId,
    dueDate: new Date(now.getFullYear(), now.getMonth(), 15), // Due on 15th of current month
  });

  console.log(`✅ Created email overage invoice ${invoiceNumber} for tenant ${tenant.name}: ${emailsOverLimit} emails, ${totalAmount.toFixed(2)} NOK`);

  // Reset monthly counter
  await db.update(tenants)
    .set({
      emailsSentThisMonth: 0,
      emailOverageCharge: "0.00",
      currentMonthStart: new Date(now.getFullYear(), now.getMonth(), 1),
    })
    .where(eq(tenants.id, tenantId));

  return invoiceNumber;
}

/**
 * Process SMS overage billing for a tenant
 */
async function processSmsOverageBilling(tenantId: string, tenant: any, db: any) {
  if (!tenant.smsPackageActive) {
    console.log(`ℹ️ Tenant ${tenant.name} has no active SMS package`);
    return null;
  }

  const smsOverLimit = Math.max(0, (tenant.smsSentThisMonth || 0) - (tenant.smsPackageSize || 0));
  const packageCharge = parseFloat(tenant.smsPackagePrice || "0.00");
  const overageRate = parseFloat(tenant.smsOverageRate || "1.00");
  const overageCharge = smsOverLimit * overageRate;
  const subtotal = packageCharge + overageCharge;
  const vatRate = 25.00;
  const vatAmount = subtotal * (vatRate / 100);
  const totalAmount = subtotal + vatAmount;

  // Calculate billing period (previous month)
  const now = new Date();
  const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of previous month
  const billingPeriodStart = new Date(billingPeriodEnd.getFullYear(), billingPeriodEnd.getMonth(), 1);

  const invoiceNumber = generateInvoiceNumber("sms", tenantId, now);

  // Create Stripe invoice if customer ID exists
  let stripeInvoiceId = null;
  if (tenant.stripeCustomerId) {
    try {
      stripeInvoiceId = await createStripeInvoice(
        tenantId,
        tenant.stripeCustomerId,
        `SMS package and overage charges for ${billingPeriodStart.toLocaleDateString("no-NO", { month: "long", year: "numeric" })}`,
        totalAmount,
        "NOK"
      );
    } catch (error) {
      console.error(`Failed to create Stripe invoice for tenant ${tenant.name}:`, error);
    }
  }

  // Create invoice record in database
  await db.insert(smsOverageInvoices).values({
    tenantId,
    invoiceNumber,
    billingPeriodStart,
    billingPeriodEnd,
    smsOverLimit,
    overageRate: overageRate.toFixed(2),
    packageCharge: packageCharge.toFixed(2),
    overageCharge: overageCharge.toFixed(2),
    subtotal: subtotal.toFixed(2),
    vatRate: vatRate.toFixed(2),
    vatAmount: vatAmount.toFixed(2),
    totalAmount: totalAmount.toFixed(2),
    currency: "NOK",
    status: stripeInvoiceId ? "pending" : "pending",
    stripeInvoiceId,
    dueDate: new Date(now.getFullYear(), now.getMonth(), 15), // Due on 15th of current month
  });

  console.log(`✅ Created SMS overage invoice ${invoiceNumber} for tenant ${tenant.name}: Package ${packageCharge} NOK + ${smsOverLimit} overage SMS, ${totalAmount.toFixed(2)} NOK total`);

  // Reset monthly counter
  await db.update(tenants)
    .set({
      smsSentThisMonth: 0,
      smsOverageCharge: "0.00",
      currentMonthStart: new Date(now.getFullYear(), now.getMonth(), 1),
    })
    .where(eq(tenants.id, tenantId));

  return invoiceNumber;
}

/**
 * Run monthly billing for all tenants
 */
async function runMonthlyBilling() {
  console.log("🔄 Starting monthly billing process...");

  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    return;
  }

  try {
    // Get all active tenants
    const allTenants = await db.query.tenants.findMany({
      where: and(
        eq(tenants.isActive, true)
      ),
    });

    console.log(`📊 Processing billing for ${allTenants.length} tenants`);

    let emailInvoicesCreated = 0;
    let smsInvoicesCreated = 0;

    for (const tenant of allTenants) {
      try {
        // Process email overage billing
        const emailInvoice = await processEmailOverageBilling(tenant.id, tenant, db);
        if (emailInvoice) emailInvoicesCreated++;

        // Process SMS overage billing
        const smsInvoice = await processSmsOverageBilling(tenant.id, tenant, db);
        if (smsInvoice) smsInvoicesCreated++;

      } catch (error) {
        console.error(`❌ Error processing billing for tenant ${tenant.name}:`, error);
      }
    }

    console.log(`✅ Monthly billing complete: ${emailInvoicesCreated} email invoices, ${smsInvoicesCreated} SMS invoices created`);

  } catch (error) {
    console.error("❌ Error in monthly billing process:", error);
  }
}

/**
 * Start the monthly billing scheduler
 */
export function startMonthlyBillingScheduler() {
  // Run on the 1st of each month at 02:00 AM
  // Cron format: second minute hour day month weekday
  const cronExpression = "0 0 2 1 * *";

  cron.schedule(cronExpression, async () => {
    console.log("⏰ Monthly billing scheduler triggered");
    await runMonthlyBilling();
  });

  console.log("✅ Monthly billing scheduler started (runs on 1st of each month at 02:00 AM)");

  // Optional: Run immediately for testing
  // Uncomment the line below to test the billing process
  // runMonthlyBilling();
}
