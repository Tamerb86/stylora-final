/**
 * Sparebank1 Regnskap Sync Functions
 * 
 * Handles synchronization between Stylora and Sparebank1 Regnskap
 */

import { db } from "./db";
import { eq, and } from "drizzle-orm";
import {
  sparebank1RegnskapSettings,
  sparebank1RegnskapCustomers,
  sparebank1RegnskapInvoices,
  sparebank1RegnskapSyncLogs,
} from "./sparebank1_regnskap_schema";
import Sparebank1RegnskapClient, { type Sparebank1Customer, type Sparebank1Invoice } from "./sparebank1_regnskap_client";
import { customers, orders } from "./schema";
import { nanoid } from "nanoid";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get Sparebank1 client for tenant
 */
async function getSparebank1Client(tenantId: string): Promise<Sparebank1RegnskapClient | null> {
  const settings = await db.query.sparebank1RegnskapSettings.findFirst({
    where: eq(sparebank1RegnskapSettings.tenantId, tenantId),
  });

  if (!settings || !settings.isActive) {
    return null;
  }

  const client = new Sparebank1RegnskapClient({
    apiKey: settings.apiKey,
    companyId: settings.companyId,
    accessToken: settings.accessToken || undefined,
    refreshToken: settings.refreshToken || undefined,
  });

  // Refresh token if expired
  if (settings.tokenExpiresAt && new Date(settings.tokenExpiresAt) < new Date()) {
    const tokens = await client.authenticate();
    
    await db.update(sparebank1RegnskapSettings)
      .set({
        accessToken: tokens.accessToken,
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        updatedAt: new Date(),
      })
      .where(eq(sparebank1RegnskapSettings.id, settings.id));
  }

  return client;
}

/**
 * Create sync log entry
 */
async function createSyncLog(
  tenantId: string,
  syncType: string,
  status: string,
  stats: {
    processed: number;
    succeeded: number;
    failed: number;
  },
  startedAt: Date,
  errors?: any[]
) {
  const completedAt = new Date();
  const duration = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000);

  await db.insert(sparebank1RegnskapSyncLogs).values({
    id: nanoid(),
    tenantId,
    syncType,
    status,
    itemsProcessed: stats.processed,
    itemsSucceeded: stats.succeeded,
    itemsFailed: stats.failed,
    startedAt,
    completedAt,
    duration,
    errors: errors ? JSON.stringify(errors) : null,
  });
}

// ============================================================================
// Customer Sync
// ============================================================================

/**
 * Sync a single customer to Sparebank1 Regnskap
 */
export async function syncCustomerToSparebank1(
  tenantId: string,
  customerId: string
): Promise<{ success: boolean; sparebank1CustomerId?: string; error?: string }> {
  try {
    const client = await getSparebank1Client(tenantId);
    if (!client) {
      return { success: false, error: "Sparebank1 Regnskap not configured or inactive" };
    }

    // Get local customer
    const customer = await db.query.customers.findFirst({
      where: and(
        eq(customers.id, customerId),
        eq(customers.tenantId, tenantId)
      ),
    });

    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    // Check if already synced
    const existingMapping = await db.query.sparebank1RegnskapCustomers.findFirst({
      where: and(
        eq(sparebank1RegnskapCustomers.localCustomerId, customerId),
        eq(sparebank1RegnskapCustomers.tenantId, tenantId)
      ),
    });

    // Prepare Sparebank1 customer data
    const sparebank1Customer: Sparebank1Customer = {
      name: customer.name,
      email: customer.email || undefined,
      phone: customer.phone || undefined,
      address: customer.address ? {
        street: customer.address,
        city: customer.city || undefined,
        postalCode: customer.postalCode || undefined,
        country: "NO",
      } : undefined,
      isActive: true,
    };

    let sparebank1CustomerId: string;

    if (existingMapping) {
      // Update existing customer
      const updated = await client.updateCustomer(existingMapping.sparebank1CustomerId, sparebank1Customer);
      sparebank1CustomerId = updated.id!;

      await db.update(sparebank1RegnskapCustomers)
        .set({
          lastSyncedAt: new Date(),
          syncStatus: "synced",
          syncError: null,
          customerData: JSON.stringify(updated),
          updatedAt: new Date(),
        })
        .where(eq(sparebank1RegnskapCustomers.id, existingMapping.id));
    } else {
      // Create new customer
      const created = await client.createCustomer(sparebank1Customer);
      sparebank1CustomerId = created.id!;

      await db.insert(sparebank1RegnskapCustomers).values({
        id: nanoid(),
        tenantId,
        localCustomerId: customerId,
        sparebank1CustomerId,
        sparebank1CustomerNumber: created.customerNumber,
        lastSyncedAt: new Date(),
        syncStatus: "synced",
        customerData: JSON.stringify(created),
      });
    }

    return { success: true, sparebank1CustomerId };
  } catch (error: any) {
    console.error("Error syncing customer to Sparebank1:", error);
    
    // Update sync status
    const existingMapping = await db.query.sparebank1RegnskapCustomers.findFirst({
      where: and(
        eq(sparebank1RegnskapCustomers.localCustomerId, customerId),
        eq(sparebank1RegnskapCustomers.tenantId, tenantId)
      ),
    });

    if (existingMapping) {
      await db.update(sparebank1RegnskapCustomers)
        .set({
          syncStatus: "failed",
          syncError: error.message,
          updatedAt: new Date(),
        })
        .where(eq(sparebank1RegnskapCustomers.id, existingMapping.id));
    }

    return { success: false, error: error.message };
  }
}

/**
 * Sync all customers to Sparebank1 Regnskap
 */
export async function syncAllCustomersToSparebank1(tenantId: string): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  errors: any[];
}> {
  const startedAt = new Date();
  const stats = { processed: 0, succeeded: 0, failed: 0 };
  const errors: any[] = [];

  try {
    const allCustomers = await db.query.customers.findMany({
      where: eq(customers.tenantId, tenantId),
    });

    for (const customer of allCustomers) {
      stats.processed++;
      const result = await syncCustomerToSparebank1(tenantId, customer.id);
      
      if (result.success) {
        stats.succeeded++;
      } else {
        stats.failed++;
        errors.push({
          customerId: customer.id,
          customerName: customer.name,
          error: result.error,
        });
      }
    }

    const status = stats.failed === 0 ? "success" : stats.succeeded > 0 ? "partial" : "failed";
    await createSyncLog(tenantId, "customer", status, stats, startedAt, errors);

    return { ...stats, errors };
  } catch (error: any) {
    await createSyncLog(tenantId, "customer", "failed", stats, startedAt, [{ error: error.message }]);
    throw error;
  }
}

// ============================================================================
// Invoice Sync
// ============================================================================

/**
 * Sync an order as invoice to Sparebank1 Regnskap
 */
export async function syncOrderToSparebank1Invoice(
  tenantId: string,
  orderId: string
): Promise<{ success: boolean; sparebank1InvoiceId?: string; error?: string }> {
  try {
    const client = await getSparebank1Client(tenantId);
    if (!client) {
      return { success: false, error: "Sparebank1 Regnskap not configured or inactive" };
    }

    // Get local order
    const order = await db.query.orders.findFirst({
      where: and(
        eq(orders.id, orderId),
        eq(orders.tenantId, tenantId)
      ),
      with: {
        customer: true,
        items: true,
      },
    });

    if (!order) {
      return { success: false, error: "Order not found" };
    }

    // Check if already synced
    const existingInvoice = await db.query.sparebank1RegnskapInvoices.findFirst({
      where: and(
        eq(sparebank1RegnskapInvoices.localOrderId, orderId),
        eq(sparebank1RegnskapInvoices.tenantId, tenantId)
      ),
    });

    if (existingInvoice) {
      return { success: true, sparebank1InvoiceId: existingInvoice.sparebank1InvoiceId };
    }

    // Ensure customer is synced
    let sparebank1CustomerId: string;
    const customerMapping = await db.query.sparebank1RegnskapCustomers.findFirst({
      where: and(
        eq(sparebank1RegnskapCustomers.localCustomerId, order.customerId),
        eq(sparebank1RegnskapCustomers.tenantId, tenantId)
      ),
    });

    if (customerMapping) {
      sparebank1CustomerId = customerMapping.sparebank1CustomerId;
    } else {
      const syncResult = await syncCustomerToSparebank1(tenantId, order.customerId);
      if (!syncResult.success || !syncResult.sparebank1CustomerId) {
        return { success: false, error: "Failed to sync customer first" };
      }
      sparebank1CustomerId = syncResult.sparebank1CustomerId;
    }

    // Prepare invoice data
    const invoiceDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const sparebank1Invoice: Sparebank1Invoice = {
      customerId: sparebank1CustomerId,
      invoiceDate,
      dueDate,
      lines: order.items.map((item: any) => ({
        description: item.name || "Service",
        quantity: item.quantity || 1,
        unitPrice: (item.price || 0) / 100, // Convert from øre to kr
        vatRate: 25, // 25% MVA
      })),
    };

    // Create invoice in Sparebank1
    const createdInvoice = await client.createInvoice(sparebank1Invoice);

    // Save mapping
    await db.insert(sparebank1RegnskapInvoices).values({
      id: nanoid(),
      tenantId,
      localOrderId: orderId,
      sparebank1InvoiceId: createdInvoice.id!,
      sparebank1InvoiceNumber: createdInvoice.invoiceNumber,
      sparebank1CustomerId,
      invoiceDate: new Date(invoiceDate),
      dueDate: new Date(dueDate),
      totalAmount: order.totalAmount,
      vatAmount: Math.floor(order.totalAmount * 0.2), // 25% MVA
      status: "sent",
      lastSyncedAt: new Date(),
      syncStatus: "synced",
      invoiceData: JSON.stringify(createdInvoice),
    });

    return { success: true, sparebank1InvoiceId: createdInvoice.id };
  } catch (error: any) {
    console.error("Error syncing invoice to Sparebank1:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Payment Sync
// ============================================================================

/**
 * Sync payment to Sparebank1 Regnskap
 */
export async function syncPaymentToSparebank1(
  tenantId: string,
  orderId: string,
  paymentAmount: number,
  paymentDate: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getSparebank1Client(tenantId);
    if (!client) {
      return { success: false, error: "Sparebank1 Regnskap not configured or inactive" };
    }

    // Get invoice mapping
    const invoiceMapping = await db.query.sparebank1RegnskapInvoices.findFirst({
      where: and(
        eq(sparebank1RegnskapInvoices.localOrderId, orderId),
        eq(sparebank1RegnskapInvoices.tenantId, tenantId)
      ),
    });

    if (!invoiceMapping) {
      return { success: false, error: "Invoice not synced to Sparebank1" };
    }

    // Register payment
    await client.registerPayment(invoiceMapping.sparebank1InvoiceId, {
      amount: paymentAmount / 100, // Convert from øre to kr
      paymentDate: paymentDate.toISOString().split('T')[0],
      paymentMethod: "Card",
      reference: `Stylora-${orderId}`,
    });

    // Update invoice status
    await db.update(sparebank1RegnskapInvoices)
      .set({
        isPaid: true,
        paidAt: paymentDate,
        status: "paid",
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(sparebank1RegnskapInvoices.id, invoiceMapping.id));

    return { success: true };
  } catch (error: any) {
    console.error("Error syncing payment to Sparebank1:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Full Sync
// ============================================================================

/**
 * Perform full sync of all data
 */
export async function performFullSparebank1Sync(tenantId: string): Promise<{
  customers: { processed: number; succeeded: number; failed: number };
  invoices: { processed: number; succeeded: number; failed: number };
}> {
  const startedAt = new Date();

  // Sync customers
  const customerResult = await syncAllCustomersToSparebank1(tenantId);

  // Sync invoices (orders)
  const invoiceStats = { processed: 0, succeeded: 0, failed: 0 };
  const invoiceErrors: any[] = [];

  const allOrders = await db.query.orders.findMany({
    where: eq(orders.tenantId, tenantId),
  });

  for (const order of allOrders) {
    invoiceStats.processed++;
    const result = await syncOrderToSparebank1Invoice(tenantId, order.id);
    
    if (result.success) {
      invoiceStats.succeeded++;
    } else {
      invoiceStats.failed++;
      invoiceErrors.push({
        orderId: order.id,
        error: result.error,
      });
    }
  }

  const invoiceStatus = invoiceStats.failed === 0 ? "success" : invoiceStats.succeeded > 0 ? "partial" : "failed";
  await createSyncLog(tenantId, "invoice", invoiceStatus, invoiceStats, startedAt, invoiceErrors);

  // Update last sync time
  await db.update(sparebank1RegnskapSettings)
    .set({
      lastSyncAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(sparebank1RegnskapSettings.tenantId, tenantId));

  return {
    customers: {
      processed: customerResult.processed,
      succeeded: customerResult.succeeded,
      failed: customerResult.failed,
    },
    invoices: invoiceStats,
  };
}

export default {
  syncCustomerToSparebank1,
  syncAllCustomersToSparebank1,
  syncOrderToSparebank1Invoice,
  syncPaymentToSparebank1,
  performFullSparebank1Sync,
};
