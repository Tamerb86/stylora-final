/**
 * Visma eAccounting Sync Functions
 * 
 * Handles synchronization between Stylora and Visma eAccounting
 */

import { db } from "./db";
import { eq, and } from "drizzle-orm";
import {
  vismaEaccountingSettings,
  vismaEaccountingCustomers,
  vismaEaccountingInvoices,
  vismaEaccountingSyncLogs,
} from "./visma_eaccounting_schema";
import VismaEaccountingClient, { type VismaCustomer, type VismaInvoice } from "./visma_eaccounting_client";
import { customers, orders } from "./schema";
import { nanoid } from "nanoid";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get Visma client for tenant
 */
async function getVismaClient(tenantId: string): Promise<VismaEaccountingClient | null> {
  const settings = await db.query.vismaEaccountingSettings.findFirst({
    where: eq(vismaEaccountingSettings.tenantId, tenantId),
  });

  if (!settings || !settings.isActive) {
    return null;
  }

  const client = new VismaEaccountingClient({
    clientId: settings.clientId,
    clientSecret: settings.clientSecret,
    accessToken: settings.accessToken || undefined,
    refreshToken: settings.refreshToken || undefined,
  });

  // Refresh token if expired
  if (settings.tokenExpiresAt && new Date(settings.tokenExpiresAt) < new Date()) {
    if (settings.refreshToken) {
      const tokens = await client.refreshAccessToken(settings.refreshToken);
      
      await db.update(vismaEaccountingSettings)
        .set({
          accessToken: tokens.accessToken,
          tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
          updatedAt: new Date(),
        })
        .where(eq(vismaEaccountingSettings.id, settings.id));
    } else {
      // Re-authenticate
      const tokens = await client.authenticate();
      
      await db.update(vismaEaccountingSettings)
        .set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
          updatedAt: new Date(),
        })
        .where(eq(vismaEaccountingSettings.id, settings.id));
    }
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

  await db.insert(vismaEaccountingSyncLogs).values({
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
 * Sync a single customer to Visma eAccounting
 */
export async function syncCustomerToVisma(
  tenantId: string,
  customerId: string
): Promise<{ success: boolean; vismaCustomerId?: string; error?: string }> {
  try {
    const client = await getVismaClient(tenantId);
    if (!client) {
      return { success: false, error: "Visma eAccounting not configured or inactive" };
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
    const existingMapping = await db.query.vismaEaccountingCustomers.findFirst({
      where: and(
        eq(vismaEaccountingCustomers.localCustomerId, customerId),
        eq(vismaEaccountingCustomers.tenantId, tenantId)
      ),
    });

    // Prepare Visma customer data
    const vismaCustomer: VismaCustomer = {
      name: customer.name,
      email: customer.email || undefined,
      mobilePhone: customer.phone || undefined,
      invoiceAddress: customer.address ? {
        address1: customer.address,
        city: customer.city || undefined,
        postalCode: customer.postalCode || undefined,
        countryCode: "NO",
      } : undefined,
      isActive: true,
    };

    let vismaCustomerId: string;

    if (existingMapping) {
      // Update existing customer
      const updated = await client.updateCustomer(existingMapping.vismaCustomerId, vismaCustomer);
      vismaCustomerId = updated.id!;

      await db.update(vismaEaccountingCustomers)
        .set({
          lastSyncedAt: new Date(),
          syncStatus: "synced",
          syncError: null,
          customerData: JSON.stringify(updated),
          updatedAt: new Date(),
        })
        .where(eq(vismaEaccountingCustomers.id, existingMapping.id));
    } else {
      // Create new customer
      const created = await client.createCustomer(vismaCustomer);
      vismaCustomerId = created.id!;

      await db.insert(vismaEaccountingCustomers).values({
        id: nanoid(),
        tenantId,
        localCustomerId: customerId,
        vismaCustomerId,
        lastSyncedAt: new Date(),
        syncStatus: "synced",
        customerData: JSON.stringify(created),
      });
    }

    return { success: true, vismaCustomerId };
  } catch (error: any) {
    console.error("Error syncing customer to Visma:", error);
    
    // Update sync status
    const existingMapping = await db.query.vismaEaccountingCustomers.findFirst({
      where: and(
        eq(vismaEaccountingCustomers.localCustomerId, customerId),
        eq(vismaEaccountingCustomers.tenantId, tenantId)
      ),
    });

    if (existingMapping) {
      await db.update(vismaEaccountingCustomers)
        .set({
          syncStatus: "failed",
          syncError: error.message,
          updatedAt: new Date(),
        })
        .where(eq(vismaEaccountingCustomers.id, existingMapping.id));
    }

    return { success: false, error: error.message };
  }
}

/**
 * Sync all customers to Visma eAccounting
 */
export async function syncAllCustomersToVisma(tenantId: string): Promise<{
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
      const result = await syncCustomerToVisma(tenantId, customer.id);
      
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
 * Sync an order as invoice to Visma eAccounting
 */
export async function syncOrderToVismaInvoice(
  tenantId: string,
  orderId: string
): Promise<{ success: boolean; vismaInvoiceId?: string; error?: string }> {
  try {
    const client = await getVismaClient(tenantId);
    if (!client) {
      return { success: false, error: "Visma eAccounting not configured or inactive" };
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
    const existingInvoice = await db.query.vismaEaccountingInvoices.findFirst({
      where: and(
        eq(vismaEaccountingInvoices.localOrderId, orderId),
        eq(vismaEaccountingInvoices.tenantId, tenantId)
      ),
    });

    if (existingInvoice) {
      return { success: true, vismaInvoiceId: existingInvoice.vismaInvoiceId };
    }

    // Ensure customer is synced
    let vismaCustomerId: string;
    const customerMapping = await db.query.vismaEaccountingCustomers.findFirst({
      where: and(
        eq(vismaEaccountingCustomers.localCustomerId, order.customerId),
        eq(vismaEaccountingCustomers.tenantId, tenantId)
      ),
    });

    if (customerMapping) {
      vismaCustomerId = customerMapping.vismaCustomerId;
    } else {
      const syncResult = await syncCustomerToVisma(tenantId, order.customerId);
      if (!syncResult.success || !syncResult.vismaCustomerId) {
        return { success: false, error: "Failed to sync customer first" };
      }
      vismaCustomerId = syncResult.vismaCustomerId;
    }

    // Prepare invoice data
    const invoiceDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const vismaInvoice: VismaInvoice = {
      customerId: vismaCustomerId,
      invoiceDate,
      dueDate,
      rows: order.items.map((item: any) => ({
        description: item.name || "Service",
        quantity: item.quantity || 1,
        unitPrice: (item.price || 0) / 100, // Convert from øre to kr
        vatRate: 25, // 25% MVA
      })),
    };

    // Create invoice in Visma
    const createdInvoice = await client.createInvoice(vismaInvoice);

    // Save mapping
    await db.insert(vismaEaccountingInvoices).values({
      id: nanoid(),
      tenantId,
      localOrderId: orderId,
      vismaInvoiceId: createdInvoice.id!,
      vismaInvoiceNumber: createdInvoice.invoiceNumber?.toString(),
      vismaCustomerId,
      invoiceDate: new Date(invoiceDate),
      dueDate: new Date(dueDate),
      totalAmount: order.totalAmount,
      vatAmount: Math.floor(order.totalAmount * 0.2), // 25% MVA
      status: "sent",
      lastSyncedAt: new Date(),
      syncStatus: "synced",
      invoiceData: JSON.stringify(createdInvoice),
    });

    return { success: true, vismaInvoiceId: createdInvoice.id };
  } catch (error: any) {
    console.error("Error syncing invoice to Visma:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Payment Sync
// ============================================================================

/**
 * Sync payment to Visma eAccounting
 */
export async function syncPaymentToVisma(
  tenantId: string,
  orderId: string,
  paymentAmount: number,
  paymentDate: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getVismaClient(tenantId);
    if (!client) {
      return { success: false, error: "Visma eAccounting not configured or inactive" };
    }

    // Get invoice mapping
    const invoiceMapping = await db.query.vismaEaccountingInvoices.findFirst({
      where: and(
        eq(vismaEaccountingInvoices.localOrderId, orderId),
        eq(vismaEaccountingInvoices.tenantId, tenantId)
      ),
    });

    if (!invoiceMapping) {
      return { success: false, error: "Invoice not synced to Visma" };
    }

    // Post payment
    await client.postInvoicePayment(invoiceMapping.vismaInvoiceId, {
      amount: paymentAmount / 100, // Convert from øre to kr
      paymentDate: paymentDate.toISOString().split('T')[0],
      paymentMethod: "Card",
      description: "Payment from Stylora",
    });

    // Update invoice status
    await db.update(vismaEaccountingInvoices)
      .set({
        isPaid: true,
        paidAt: paymentDate,
        status: "paid",
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(vismaEaccountingInvoices.id, invoiceMapping.id));

    return { success: true };
  } catch (error: any) {
    console.error("Error syncing payment to Visma:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Full Sync
// ============================================================================

/**
 * Perform full sync of all data
 */
export async function performFullVismaSync(tenantId: string): Promise<{
  customers: { processed: number; succeeded: number; failed: number };
  invoices: { processed: number; succeeded: number; failed: number };
}> {
  const startedAt = new Date();

  // Sync customers
  const customerResult = await syncAllCustomersToVisma(tenantId);

  // Sync invoices (orders)
  const invoiceStats = { processed: 0, succeeded: 0, failed: 0 };
  const invoiceErrors: any[] = [];

  const allOrders = await db.query.orders.findMany({
    where: eq(orders.tenantId, tenantId),
  });

  for (const order of allOrders) {
    invoiceStats.processed++;
    const result = await syncOrderToVismaInvoice(tenantId, order.id);
    
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
  await db.update(vismaEaccountingSettings)
    .set({
      lastSyncAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(vismaEaccountingSettings.tenantId, tenantId));

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
  syncCustomerToVisma,
  syncAllCustomersToVisma,
  syncOrderToVismaInvoice,
  syncPaymentToVisma,
  performFullVismaSync,
};
