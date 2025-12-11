import { getDb } from "./db";
import { getTripletexClient } from "./tripletex_client";
import {
  tripletexCustomerMapping,
  tripletexInvoiceMapping,
  tripletexSyncLog,
  tripletexSettings,
} from "./tripletex_schema";
import { customers, orders } from "./schema";
import { eq, and } from "drizzle-orm";

/**
 * Tripletex Sync Functions
 * 
 * Functions to sync data between Stylora and Tripletex
 */

// ============================================================================
// CUSTOMER SYNC
// ============================================================================

/**
 * Sync a single customer to Tripletex
 */
export async function syncCustomerToTripletex(tenantId: string, customerId: number) {
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
      .from(tripletexCustomerMapping)
      .where(
        and(
          eq(tripletexCustomerMapping.tenantId, tenantId),
          eq(tripletexCustomerMapping.customerId, customerId)
        )
      )
      .limit(1);

    if (existing) {
      return {
        success: true,
        message: "Customer already synced",
        tripletexCustomerId: existing.tripletexCustomerId,
      };
    }

    // Get Tripletex client
    const client = await getTripletexClient(tenantId);

    // Create customer in Tripletex
    const tripletexCustomer = await client.createCustomer({
      name: customer.name,
      email: customer.email || undefined,
      phoneNumber: customer.phone || undefined,
      address: customer.address || undefined,
      postalCode: customer.postalCode || undefined,
      city: customer.city || undefined,
    });

    // Save mapping
    await db.insert(tripletexCustomerMapping).values({
      tenantId,
      customerId,
      tripletexCustomerId: tripletexCustomer.id.toString(),
      tripletexCustomerNumber: tripletexCustomer.customerNumber?.toString(),
      status: "synced",
      syncedAt: new Date(),
    });

    // Log success
    await db.insert(tripletexSyncLog).values({
      tenantId,
      operation: "sync_customer",
      entityType: "customer",
      entityId: customerId,
      status: "success",
      message: `Customer ${customer.name} synced successfully`,
      recordsProcessed: 1,
      recordsSucceeded: 1,
      recordsFailed: 0,
      completedAt: new Date(),
    });

    return {
      success: true,
      message: "Customer synced successfully",
      tripletexCustomerId: tripletexCustomer.id.toString(),
    };
  } catch (error: any) {
    // Log error
    await db.insert(tripletexSyncLog).values({
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
      completedAt: new Date(),
    });

    throw error;
  }
}

/**
 * Sync multiple customers to Tripletex
 */
export async function syncCustomersToTripletex(tenantId: string, customerIds: number[]) {
  let succeeded = 0;
  let failed = 0;

  for (const customerId of customerIds) {
    try {
      await syncCustomerToTripletex(tenantId, customerId);
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
    .from(tripletexCustomerMapping)
    .where(
      and(
        eq(tripletexCustomerMapping.tenantId, tenantId),
        eq(tripletexCustomerMapping.customerId, customerId)
      )
    )
    .limit(1);

  return {
    isSynced: !!mapping,
    tripletexCustomerId: mapping?.tripletexCustomerId,
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

  const allCustomers = await db
    .select()
    .from(customers)
    .where(eq(customers.tenantId, tenantId));

  const syncedCustomerIds = await db
    .select({ customerId: tripletexCustomerMapping.customerId })
    .from(tripletexCustomerMapping)
    .where(eq(tripletexCustomerMapping.tenantId, tenantId));

  const syncedIds = new Set(syncedCustomerIds.map((m) => m.customerId));
  
  return allCustomers.filter((c) => !syncedIds.has(c.id));
}

// ============================================================================
// ORDER/INVOICE SYNC
// ============================================================================

/**
 * Sync a single order/invoice to Tripletex
 */
export async function syncOrderToTripletex(tenantId: string, orderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get order data
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
      .from(tripletexInvoiceMapping)
      .where(
        and(
          eq(tripletexInvoiceMapping.tenantId, tenantId),
          eq(tripletexInvoiceMapping.orderId, orderId)
        )
      )
      .limit(1);

    if (existing) {
      return {
        success: true,
        message: "Invoice already synced",
        tripletexInvoiceId: existing.tripletexInvoiceId,
      };
    }

    // Get or sync customer first
    if (!order.customerId) {
      throw new Error("Order has no customer");
    }

    let customerMapping = await db
      .select()
      .from(tripletexCustomerMapping)
      .where(
        and(
          eq(tripletexCustomerMapping.tenantId, tenantId),
          eq(tripletexCustomerMapping.customerId, order.customerId)
        )
      )
      .limit(1);

    if (customerMapping.length === 0) {
      await syncCustomerToTripletex(tenantId, order.customerId);
      customerMapping = await db
        .select()
        .from(tripletexCustomerMapping)
        .where(
          and(
            eq(tripletexCustomerMapping.tenantId, tenantId),
            eq(tripletexCustomerMapping.customerId, order.customerId)
          )
        )
        .limit(1);
    }

    const tripletexCustomerId = customerMapping[0].tripletexCustomerId;

    // Get settings for defaults
    const [settings] = await db
      .select()
      .from(tripletexSettings)
      .where(eq(tripletexSettings.tenantId, tenantId))
      .limit(1);

    // Get Tripletex client
    const client = await getTripletexClient(tenantId);

    // Prepare invoice data
    const invoiceDate = order.createdAt.toISOString().split("T")[0];
    const dueDate = new Date(order.createdAt);
    dueDate.setDate(dueDate.getDate() + (settings?.defaultPaymentTerms || 14));
    const dueDateStr = dueDate.toISOString().split("T")[0];

    // Parse items from order
    const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;

    // Create invoice in Tripletex
    const tripletexInvoice = await client.createInvoice({
      customerId: tripletexCustomerId,
      invoiceDate,
      dueDate: dueDateStr,
      orderLines: items.map((item: any) => ({
        description: item.name || item.description || "Service",
        quantity: item.quantity || 1,
        unitPrice: (item.price || 0) / 100, // Convert from øre to NOK
        vatType: settings?.defaultVatType || "3",
      })),
      reference: `Stylora Order #${orderId}`,
    });

    // Save mapping
    await db.insert(tripletexInvoiceMapping).values({
      tenantId,
      orderId,
      tripletexInvoiceId: tripletexInvoice.id.toString(),
      tripletexInvoiceNumber: tripletexInvoice.invoiceNumber?.toString(),
      amount: order.totalAmount,
      currency: settings?.defaultCurrency || "NOK",
      invoiceDate,
      dueDate: dueDateStr,
      status: order.status === "completed" ? "paid" : "synced",
      syncedAt: new Date(),
    });

    // Log success
    await db.insert(tripletexSyncLog).values({
      tenantId,
      operation: "sync_invoice",
      entityType: "invoice",
      entityId: orderId,
      status: "success",
      message: `Invoice #${tripletexInvoice.invoiceNumber} created successfully`,
      recordsProcessed: 1,
      recordsSucceeded: 1,
      recordsFailed: 0,
      completedAt: new Date(),
    });

    return {
      success: true,
      message: "Invoice synced successfully",
      tripletexInvoiceId: tripletexInvoice.id.toString(),
      tripletexInvoiceNumber: tripletexInvoice.invoiceNumber?.toString(),
    };
  } catch (error: any) {
    // Log error
    await db.insert(tripletexSyncLog).values({
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
      completedAt: new Date(),
    });

    throw error;
  }
}

/**
 * Sync multiple orders to Tripletex
 */
export async function syncOrdersToTripletex(tenantId: string, orderIds: number[]) {
  let succeeded = 0;
  let failed = 0;

  for (const orderId of orderIds) {
    try {
      await syncOrderToTripletex(tenantId, orderId);
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

  const allOrders = await db
    .select()
    .from(orders)
    .where(and(eq(orders.tenantId, tenantId), eq(orders.status, "completed")));

  const syncedOrderIds = await db
    .select({ orderId: tripletexInvoiceMapping.orderId })
    .from(tripletexInvoiceMapping)
    .where(eq(tripletexInvoiceMapping.tenantId, tenantId));

  const syncedIds = new Set(syncedOrderIds.map((m) => m.orderId));
  
  return allOrders.filter((o) => !syncedIds.has(o.id));
}

// ============================================================================
// PAYMENT SYNC
// ============================================================================

/**
 * Sync payment to Tripletex
 */
export async function syncPaymentToTripletex(tenantId: string, orderId: number, paymentAmount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get invoice mapping
    const [mapping] = await db
      .select()
      .from(tripletexInvoiceMapping)
      .where(
        and(
          eq(tripletexInvoiceMapping.tenantId, tenantId),
          eq(tripletexInvoiceMapping.orderId, orderId)
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

    // Get Tripletex client
    const client = await getTripletexClient(tenantId);

    // Register payment
    const paymentDate = order?.updatedAt?.toISOString().split("T")[0] || new Date().toISOString().split("T")[0];
    
    await client.registerPayment({
      invoiceId: mapping.tripletexInvoiceId,
      amount: paymentAmount / 100, // Convert from øre to NOK
      paymentDate,
      reference: `Stylora Payment #${orderId}`,
    });

    // Update mapping status
    await db
      .update(tripletexInvoiceMapping)
      .set({ status: "paid", paidAt: new Date() })
      .where(eq(tripletexInvoiceMapping.id, mapping.id));

    // Log success
    await db.insert(tripletexSyncLog).values({
      tenantId,
      operation: "sync_payment",
      entityType: "payment",
      entityId: orderId,
      status: "success",
      message: `Payment registered for invoice #${mapping.tripletexInvoiceNumber}`,
      recordsProcessed: 1,
      recordsSucceeded: 1,
      recordsFailed: 0,
      completedAt: new Date(),
    });

    return {
      success: true,
      message: "Payment synced successfully",
    };
  } catch (error: any) {
    // Log error
    await db.insert(tripletexSyncLog).values({
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
      completedAt: new Date(),
    });

    throw error;
  }
}

/**
 * Sync refund to Tripletex as credit note
 */
export async function syncRefundToTripletex(tenantId: string, refundId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Get refund data (placeholder - adjust based on your schema)
    const refund: any = { orderId: 0, amount: 0, reason: "" };

    // Get invoice mapping
    const [mapping] = await db
      .select()
      .from(tripletexInvoiceMapping)
      .where(
        and(
          eq(tripletexInvoiceMapping.tenantId, tenantId),
          eq(tripletexInvoiceMapping.orderId, refund.orderId)
        )
      )
      .limit(1);

    if (!mapping) {
      throw new Error("Invoice not synced yet");
    }

    // Get Tripletex client
    const client = await getTripletexClient(tenantId);

    // Create credit note
    const creditNote = await client.createCreditNote({
      invoiceId: mapping.tripletexInvoiceId,
      creditNoteDate: new Date().toISOString().split("T")[0],
      comment: refund.reason || "Refund",
    });

    // Log success
    await db.insert(tripletexSyncLog).values({
      tenantId,
      operation: "sync_refund",
      entityType: "refund",
      entityId: refundId,
      status: "success",
      message: `Credit note created successfully`,
      recordsProcessed: 1,
      recordsSucceeded: 1,
      recordsFailed: 0,
      completedAt: new Date(),
    });

    return {
      success: true,
      message: "Refund synced successfully",
      creditNoteId: creditNote.id.toString(),
    };
  } catch (error: any) {
    // Log error
    await db.insert(tripletexSyncLog).values({
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
      completedAt: new Date(),
    });

    throw error;
  }
}
