import { getDb } from "./db";
import { getDnbRegnskapClient } from "./dnb_regnskap_client";
import {
  dnbRegnskapCustomerMapping,
  dnbRegnskapInvoiceMapping,
  dnbRegnskapSyncLog,
  dnbRegnskapSettings,
} from "./dnb_regnskap_schema";
import { customers, orders } from "./schema";
import { eq, and, isNull, inArray } from "drizzle-orm";

/**
 * DNB Regnskap Sync Functions
 * 
 * Functions to sync data between Stylora and DNB Regnskap
 */

// ============================================================================
// CUSTOMER SYNC
// ============================================================================

/**
 * Sync a single customer to DNB Regnskap
 */
export async function syncCustomerToDnb(tenantId: string, customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get customer data
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
      .limit(1);

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Check if already synced
    const [existing] = await db
      .select()
      .from(dnbRegnskapCustomerMapping)
      .where(
        and(
          eq(dnbRegnskapCustomerMapping.tenantId, tenantId),
          eq(dnbRegnskapCustomerMapping.customerId, customerId)
        )
      )
      .limit(1);

    if (existing) {
      return {
        success: true,
        message: "Customer already synced",
        dnbCustomerId: existing.dnbCustomerId,
      };
    }

    // Get DNB client
    const client = await getDnbRegnskapClient(tenantId);

    // Create customer in DNB
    const dnbCustomer = await client.createCustomer({
      name: customer.name,
      email: customer.email || undefined,
      phone: customer.phone || undefined,
      address: customer.address || undefined,
      postalCode: customer.postalCode || undefined,
      city: customer.city || undefined,
    });

    // Save mapping
    await db.insert(dnbRegnskapCustomerMapping).values({
      tenantId,
      customerId,
      dnbCustomerId: dnbCustomer.id,
      dnbCustomerNumber: dnbCustomer.customerNumber,
      status: "synced",
      syncedAt: new Date(),
    });

    // Log success
    await db.insert(dnbRegnskapSyncLog).values({
      tenantId,
      operation: "sync_customer",
      entityType: "customer",
      entityId: customerId,
      status: "success",
      message: `Customer ${customer.name} synced successfully`,
      recordsProcessed: 1,
      recordsSucceeded: 1,
      recordsFailed: 0,
    });

    return {
      success: true,
      message: "Customer synced successfully",
      dnbCustomerId: dnbCustomer.id,
    };
  } catch (error: any) {
    // Log error
    await db.insert(dnbRegnskapSyncLog).values({
      tenantId,
      operation: "sync_customer",
      entityType: "customer",
      entityId: customerId,
      status: "failed",
      message: "Failed to sync customer",
      errorDetails: error.message,
      recordsProcessed: 1,
      recordsSucceeded: 0,
      recordsFailed: 1,
    });

    throw error;
  }
}

/**
 * Sync multiple customers to DNB Regnskap
 */
export async function syncCustomersToDnb(tenantId: string, customerIds: number[]) {
  let succeeded = 0;
  let failed = 0;

  for (const customerId of customerIds) {
    try {
      await syncCustomerToDnb(tenantId, customerId);
      succeeded++;
    } catch (error) {
      failed++;
      console.error(`Failed to sync customer ${customerId}:`, error);
    }
  }

  return {
    totalProcessed: customerIds.length,
    succeeded,
    failed,
  };
}

/**
 * Get customer sync status
 */
export async function getCustomerSyncStatus(tenantId: string, customerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [mapping] = await db
    .select()
    .from(dnbRegnskapCustomerMapping)
    .where(
      and(
        eq(dnbRegnskapCustomerMapping.tenantId, tenantId),
        eq(dnbRegnskapCustomerMapping.customerId, customerId)
      )
    )
    .limit(1);

  return {
    isSynced: !!mapping,
    dnbCustomerId: mapping?.dnbCustomerId,
    syncedAt: mapping?.syncedAt,
    status: mapping?.status,
  };
}

/**
 * Get unsynced customers
 */
export async function getUnsyncedCustomers(tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all customers that are not in the mapping table
  const allCustomers = await db
    .select()
    .from(customers)
    .where(eq(customers.tenantId, tenantId));

  const syncedCustomerIds = await db
    .select({ customerId: dnbRegnskapCustomerMapping.customerId })
    .from(dnbRegnskapCustomerMapping)
    .where(eq(dnbRegnskapCustomerMapping.tenantId, tenantId));

  const syncedIds = new Set(syncedCustomerIds.map((m) => m.customerId));
  
  return allCustomers.filter((c) => !syncedIds.has(c.id));
}

// ============================================================================
// ORDER/INVOICE SYNC
// ============================================================================

/**
 * Sync a single order/invoice to DNB Regnskap
 */
export async function syncOrderToDnb(tenantId: string, orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get order data with items
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.tenantId, tenantId)))
      .limit(1);

    if (!order) {
      throw new Error("Order not found");
    }

    // Check if already synced
    const [existing] = await db
      .select()
      .from(dnbRegnskapInvoiceMapping)
      .where(
        and(
          eq(dnbRegnskapInvoiceMapping.tenantId, tenantId),
          eq(dnbRegnskapInvoiceMapping.orderId, orderId)
        )
      )
      .limit(1);

    if (existing) {
      return {
        success: true,
        message: "Invoice already synced",
        dnbInvoiceId: existing.dnbInvoiceId,
      };
    }

    // Get or sync customer first
    if (!order.customerId) {
      throw new Error("Order has no customer");
    }

    let customerMapping = await db
      .select()
      .from(dnbRegnskapCustomerMapping)
      .where(
        and(
          eq(dnbRegnskapCustomerMapping.tenantId, tenantId),
          eq(dnbRegnskapCustomerMapping.customerId, order.customerId)
        )
      )
      .limit(1);

    if (customerMapping.length === 0) {
      // Sync customer first
      await syncCustomerToDnb(tenantId, order.customerId);
      customerMapping = await db
        .select()
        .from(dnbRegnskapCustomerMapping)
        .where(
          and(
            eq(dnbRegnskapCustomerMapping.tenantId, tenantId),
            eq(dnbRegnskapCustomerMapping.customerId, order.customerId)
          )
        )
        .limit(1);
    }

    const dnbCustomerId = customerMapping[0].dnbCustomerId;

    // Get DNB settings for default values
    const [settings] = await db
      .select()
      .from(dnbRegnskapSettings)
      .where(eq(dnbRegnskapSettings.tenantId, tenantId))
      .limit(1);

    // Get DNB client
    const client = await getDnbRegnskapClient(tenantId);

    // Prepare invoice data
    const invoiceDate = order.createdAt.toISOString().split("T")[0];
    const dueDate = new Date(order.createdAt);
    dueDate.setDate(dueDate.getDate() + (settings?.defaultPaymentTerms || 14));
    const dueDateStr = dueDate.toISOString().split("T")[0];

    // Parse items from order
    const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;

    // Create invoice in DNB
    const dnbInvoice = await client.createInvoice({
      customerId: dnbCustomerId,
      invoiceDate,
      dueDate: dueDateStr,
      lines: items.map((item: any) => ({
        description: item.name || item.description || "Service",
        quantity: item.quantity || 1,
        unitPrice: item.price || 0,
        vatCode: settings?.defaultVatCode || "3",
        accountCode: settings?.defaultAccountCode || "3000",
      })),
      reference: `Stylora Order #${orderId}`,
    });

    // Save mapping
    await db.insert(dnbRegnskapInvoiceMapping).values({
      tenantId,
      orderId,
      dnbInvoiceId: dnbInvoice.id,
      dnbInvoiceNumber: dnbInvoice.invoiceNumber,
      status: order.status === "completed" ? "paid" : "synced",
      syncedAt: new Date(),
    });

    // Log success
    await db.insert(dnbRegnskapSyncLog).values({
      tenantId,
      operation: "sync_invoice",
      entityType: "invoice",
      entityId: orderId,
      status: "success",
      message: `Invoice #${dnbInvoice.invoiceNumber} created successfully`,
      recordsProcessed: 1,
      recordsSucceeded: 1,
      recordsFailed: 0,
    });

    return {
      success: true,
      message: "Invoice synced successfully",
      dnbInvoiceId: dnbInvoice.id,
      dnbInvoiceNumber: dnbInvoice.invoiceNumber,
    };
  } catch (error: any) {
    // Log error
    await db.insert(dnbRegnskapSyncLog).values({
      tenantId,
      operation: "sync_invoice",
      entityType: "invoice",
      entityId: orderId,
      status: "failed",
      message: "Failed to sync invoice",
      errorDetails: error.message,
      recordsProcessed: 1,
      recordsSucceeded: 0,
      recordsFailed: 1,
    });

    throw error;
  }
}

/**
 * Sync multiple orders to DNB Regnskap
 */
export async function syncOrdersToDnb(tenantId: string, orderIds: number[]) {
  let succeeded = 0;
  let failed = 0;

  for (const orderId of orderIds) {
    try {
      await syncOrderToDnb(tenantId, orderId);
      succeeded++;
    } catch (error) {
      failed++;
      console.error(`Failed to sync order ${orderId}:`, error);
    }
  }

  return {
    totalProcessed: orderIds.length,
    succeeded,
    failed,
  };
}

/**
 * Get unsynced orders
 */
export async function getUnsyncedOrders(tenantId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all completed orders that are not in the mapping table
  const allOrders = await db
    .select()
    .from(orders)
    .where(and(eq(orders.tenantId, tenantId), eq(orders.status, "completed")));

  const syncedOrderIds = await db
    .select({ orderId: dnbRegnskapInvoiceMapping.orderId })
    .from(dnbRegnskapInvoiceMapping)
    .where(eq(dnbRegnskapInvoiceMapping.tenantId, tenantId));

  const syncedIds = new Set(syncedOrderIds.map((m) => m.orderId));
  
  return allOrders.filter((o) => !syncedIds.has(o.id));
}

// ============================================================================
// PAYMENT SYNC
// ============================================================================

/**
 * Sync payment to DNB Regnskap
 */
export async function syncPaymentToDnb(tenantId: string, orderId: number, paymentAmount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get invoice mapping
    const [mapping] = await db
      .select()
      .from(dnbRegnskapInvoiceMapping)
      .where(
        and(
          eq(dnbRegnskapInvoiceMapping.tenantId, tenantId),
          eq(dnbRegnskapInvoiceMapping.orderId, orderId)
        )
      )
      .limit(1);

    if (!mapping) {
      throw new Error("Invoice not synced yet");
    }

    // Get order for payment date
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    // Get DNB client
    const client = await getDnbRegnskapClient(tenantId);

    // Register payment
    const paymentDate = order?.updatedAt?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0];
    
    await client.registerPayment({
      invoiceId: mapping.dnbInvoiceId,
      amount: paymentAmount,
      paymentDate,
      paymentMethod: order?.paymentMethod || "card",
      reference: `Stylora Payment #${orderId}`,
    });

    // Update mapping status
    await db
      .update(dnbRegnskapInvoiceMapping)
      .set({ status: "paid" })
      .where(eq(dnbRegnskapInvoiceMapping.id, mapping.id));

    // Log success
    await db.insert(dnbRegnskapSyncLog).values({
      tenantId,
      operation: "sync_payment",
      entityType: "payment",
      entityId: orderId,
      status: "success",
      message: `Payment registered for invoice #${mapping.dnbInvoiceNumber}`,
      recordsProcessed: 1,
      recordsSucceeded: 1,
      recordsFailed: 0,
    });

    return {
      success: true,
      message: "Payment synced successfully",
    };
  } catch (error: any) {
    // Log error
    await db.insert(dnbRegnskapSyncLog).values({
      tenantId,
      operation: "sync_payment",
      entityType: "payment",
      entityId: orderId,
      status: "failed",
      message: "Failed to sync payment",
      errorDetails: error.message,
      recordsProcessed: 1,
      recordsSucceeded: 0,
      recordsFailed: 1,
    });

    throw error;
  }
}

/**
 * Sync refund to DNB Regnskap as credit note
 */
export async function syncRefundToDnb(tenantId: string, refundId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get refund data (assuming refunds table exists)
    // This is a placeholder - adjust based on your actual refunds schema
    const refund: any = { orderId: 0, amount: 0, reason: "" }; // TODO: Get from refunds table

    // Get invoice mapping
    const [mapping] = await db
      .select()
      .from(dnbRegnskapInvoiceMapping)
      .where(
        and(
          eq(dnbRegnskapInvoiceMapping.tenantId, tenantId),
          eq(dnbRegnskapInvoiceMapping.orderId, refund.orderId)
        )
      )
      .limit(1);

    if (!mapping) {
      throw new Error("Invoice not synced yet");
    }

    // Get DNB client
    const client = await getDnbRegnskapClient(tenantId);

    // Create credit note
    const creditNote = await client.createCreditNote({
      invoiceId: mapping.dnbInvoiceId,
      amount: refund.amount,
      reason: refund.reason || "Refund",
      creditNoteDate: new Date().toISOString().split("T")[0],
    });

    // Log success
    await db.insert(dnbRegnskapSyncLog).values({
      tenantId,
      operation: "sync_refund",
      entityType: "refund",
      entityId: refundId,
      status: "success",
      message: `Credit note #${creditNote.creditNoteNumber} created successfully`,
      recordsProcessed: 1,
      recordsSucceeded: 1,
      recordsFailed: 0,
    });

    return {
      success: true,
      message: "Refund synced successfully",
      creditNoteNumber: creditNote.creditNoteNumber,
    };
  } catch (error: any) {
    // Log error
    await db.insert(dnbRegnskapSyncLog).values({
      tenantId,
      operation: "sync_refund",
      entityType: "refund",
      entityId: refundId,
      status: "failed",
      message: "Failed to sync refund",
      errorDetails: error.message,
      recordsProcessed: 1,
      recordsSucceeded: 0,
      recordsFailed: 1,
    });

    throw error;
  }
}
