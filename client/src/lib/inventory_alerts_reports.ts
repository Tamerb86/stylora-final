import { db } from "./db";
import { productInventory, stockAlerts, products, suppliers } from "./inventory_schema";
import { eq, and, sql, lte } from "drizzle-orm";
import { sendEmail } from "./email";

/**
 * Inventory Alerts & Reports System
 * Automatic monitoring and notification system for inventory management
 */

// ============================================================================
// ALERT SYSTEM
// ============================================================================

/**
 * Check all products for low stock and create alerts
 * Should be run periodically (e.g., every hour)
 */
export async function checkLowStockAlerts(tenantId: string) {
  console.log(`[Inventory] Checking low stock alerts for tenant: ${tenantId}`);
  
  try {
    // Get all products with low stock
    const lowStockProducts = await db
      .select({
        inventory: productInventory,
        product: products,
        supplier: suppliers,
      })
      .from(productInventory)
      .leftJoin(products, eq(productInventory.productId, products.id))
      .leftJoin(suppliers, eq(productInventory.supplierId, suppliers.id))
      .where(and(
        eq(productInventory.tenantId, tenantId),
        eq(productInventory.lowStockAlertEnabled, true),
        sql`${productInventory.currentStock} <= ${productInventory.minStock}`
      ));
    
    console.log(`[Inventory] Found ${lowStockProducts.length} products with low stock`);
    
    for (const item of lowStockProducts) {
      // Check if alert already exists and is active
      const [existingAlert] = await db
        .select()
        .from(stockAlerts)
        .where(and(
          eq(stockAlerts.tenantId, tenantId),
          eq(stockAlerts.productId, item.inventory.productId),
          eq(stockAlerts.status, "active"),
          eq(stockAlerts.alertType, item.inventory.currentStock === 0 ? "out_of_stock" : "low_stock")
        ))
        .limit(1);
      
      if (existingAlert) {
        console.log(`[Inventory] Alert already exists for product ${item.product?.name}`);
        continue;
      }
      
      // Create new alert
      const alertType = item.inventory.currentStock === 0 ? "out_of_stock" : "low_stock";
      
      await db.insert(stockAlerts).values({
        tenantId,
        productId: item.inventory.productId,
        alertType,
        currentStock: item.inventory.currentStock,
        thresholdLevel: item.inventory.minStock,
        status: "active",
      });
      
      console.log(`[Inventory] Created ${alertType} alert for product: ${item.product?.name}`);
      
      // Update last alert sent timestamp
      await db
        .update(productInventory)
        .set({ lastLowStockAlertSent: new Date() })
        .where(eq(productInventory.id, item.inventory.id));
    }
    
    return {
      success: true,
      alertsCreated: lowStockProducts.length,
    };
  } catch (error) {
    console.error("[Inventory] Error checking low stock alerts:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send email notifications for active alerts
 * Should be run periodically (e.g., daily)
 */
export async function sendAlertNotifications(tenantId: string, recipientEmail: string) {
  console.log(`[Inventory] Sending alert notifications to: ${recipientEmail}`);
  
  try {
    // Get all active alerts that haven't been notified
    const activeAlerts = await db
      .select({
        alert: stockAlerts,
        product: products,
        inventory: productInventory,
        supplier: suppliers,
      })
      .from(stockAlerts)
      .leftJoin(products, eq(stockAlerts.productId, products.id))
      .leftJoin(productInventory, eq(stockAlerts.productId, productInventory.productId))
      .leftJoin(suppliers, eq(productInventory.supplierId, suppliers.id))
      .where(and(
        eq(stockAlerts.tenantId, tenantId),
        eq(stockAlerts.status, "active"),
        eq(stockAlerts.notificationSent, false)
      ));
    
    if (activeAlerts.length === 0) {
      console.log("[Inventory] No alerts to send");
      return { success: true, notificationsSent: 0 };
    }
    
    // Group alerts by type
    const outOfStock = activeAlerts.filter(a => a.alert.alertType === "out_of_stock");
    const lowStock = activeAlerts.filter(a => a.alert.alertType === "low_stock");
    
    // Build email content
    let emailHtml = `
      <h2>Lagervarsel</h2>
      <p>Du har ${activeAlerts.length} aktive lagervarsler:</p>
    `;
    
    if (outOfStock.length > 0) {
      emailHtml += `
        <h3 style="color: #dc2626;">Tomt Lager (${outOfStock.length})</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Produkt</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">SKU</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Leverandør</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">Påfyllingsmengde</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      for (const item of outOfStock) {
        emailHtml += `
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.product?.name || "-"}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.inventory?.sku || "-"}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.supplier?.name || "-"}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${item.inventory?.reorderQuantity || 0}</td>
          </tr>
        `;
      }
      
      emailHtml += `
          </tbody>
        </table>
        <br/>
      `;
    }
    
    if (lowStock.length > 0) {
      emailHtml += `
        <h3 style="color: #ea580c;">Lav Beholdning (${lowStock.length})</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Produkt</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">SKU</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">Beholdning</th>
              <th style="padding: 8px; text-align: right; border: 1px solid #e5e7eb;">Min</th>
              <th style="padding: 8px; text-align: left; border: 1px solid #e5e7eb;">Leverandør</th>
            </tr>
          </thead>
          <tbody>
      `;
      
      for (const item of lowStock) {
        emailHtml += `
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.product?.name || "-"}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.inventory?.sku || "-"}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${item.alert.currentStock}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: right;">${item.alert.thresholdLevel}</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${item.supplier?.name || "-"}</td>
          </tr>
        `;
      }
      
      emailHtml += `
          </tbody>
        </table>
      `;
    }
    
    emailHtml += `
      <br/>
      <p style="color: #6b7280; font-size: 14px;">
        Logg inn på systemet for å se alle detaljer og opprette innkjøpsordre.
      </p>
    `;
    
    // Send email
    await sendEmail({
      to: recipientEmail,
      subject: `Lagervarsel: ${activeAlerts.length} produkter krever oppmerksomhet`,
      html: emailHtml,
    });
    
    // Mark alerts as notified
    for (const item of activeAlerts) {
      await db
        .update(stockAlerts)
        .set({ 
          notificationSent: true,
          notificationSentAt: new Date(),
        })
        .where(eq(stockAlerts.id, item.alert.id));
    }
    
    console.log(`[Inventory] Sent notification for ${activeAlerts.length} alerts`);
    
    return {
      success: true,
      notificationsSent: activeAlerts.length,
    };
  } catch (error) {
    console.error("[Inventory] Error sending alert notifications:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Generate Stock Levels Report
 */
export async function generateStockLevelsReport(tenantId: string) {
  const inventory = await db
    .select({
      inventory: productInventory,
      product: products,
      supplier: suppliers,
    })
    .from(productInventory)
    .leftJoin(products, eq(productInventory.productId, products.id))
    .leftJoin(suppliers, eq(productInventory.supplierId, suppliers.id))
    .where(eq(productInventory.tenantId, tenantId));
  
  return inventory.map(item => ({
    productName: item.product?.name || "",
    sku: item.inventory.sku || "",
    barcode: item.inventory.barcode || "",
    currentStock: item.inventory.currentStock,
    minStock: item.inventory.minStock,
    maxStock: item.inventory.maxStock || 0,
    reorderPoint: item.inventory.reorderPoint,
    reorderQuantity: item.inventory.reorderQuantity,
    supplier: item.supplier?.name || "",
    location: item.inventory.location || "",
    costPrice: parseFloat(item.inventory.costPrice?.toString() || "0"),
    totalValue: item.inventory.currentStock * parseFloat(item.inventory.costPrice?.toString() || "0"),
    status: item.inventory.currentStock === 0 ? "Tomt" : 
            item.inventory.currentStock <= item.inventory.minStock ? "Lav" : "OK",
  }));
}

/**
 * Generate Stock Value Report
 */
export async function generateStockValueReport(tenantId: string) {
  const inventory = await db
    .select({
      inventory: productInventory,
      product: products,
    })
    .from(productInventory)
    .leftJoin(products, eq(productInventory.productId, products.id))
    .where(eq(productInventory.tenantId, tenantId));
  
  const items = inventory.map(item => {
    const costPrice = parseFloat(item.inventory.costPrice?.toString() || "0");
    const retailPrice = parseFloat(item.product?.price?.toString() || "0");
    const currentStock = item.inventory.currentStock;
    
    return {
      productName: item.product?.name || "",
      category: item.product?.category || "",
      currentStock,
      costPrice,
      retailPrice,
      costValue: currentStock * costPrice,
      retailValue: currentStock * retailPrice,
      potentialProfit: currentStock * (retailPrice - costPrice),
    };
  });
  
  const summary = {
    totalProducts: items.length,
    totalUnits: items.reduce((sum, item) => sum + item.currentStock, 0),
    totalCostValue: items.reduce((sum, item) => sum + item.costValue, 0),
    totalRetailValue: items.reduce((sum, item) => sum + item.retailValue, 0),
    totalPotentialProfit: items.reduce((sum, item) => sum + item.potentialProfit, 0),
  };
  
  return { items, summary };
}

/**
 * Generate Low Stock Report
 */
export async function generateLowStockReport(tenantId: string) {
  const lowStockItems = await db
    .select({
      inventory: productInventory,
      product: products,
      supplier: suppliers,
    })
    .from(productInventory)
    .leftJoin(products, eq(productInventory.productId, products.id))
    .leftJoin(suppliers, eq(productInventory.supplierId, suppliers.id))
    .where(and(
      eq(productInventory.tenantId, tenantId),
      sql`${productInventory.currentStock} <= ${productInventory.minStock}`
    ));
  
  return lowStockItems.map(item => ({
    productName: item.product?.name || "",
    sku: item.inventory.sku || "",
    currentStock: item.inventory.currentStock,
    minStock: item.inventory.minStock,
    deficit: item.inventory.minStock - item.inventory.currentStock,
    reorderQuantity: item.inventory.reorderQuantity,
    supplier: item.supplier?.name || "",
    supplierContact: item.supplier?.email || item.supplier?.phone || "",
    costPrice: parseFloat(item.inventory.costPrice?.toString() || "0"),
    estimatedCost: item.inventory.reorderQuantity * parseFloat(item.inventory.costPrice?.toString() || "0"),
    status: item.inventory.currentStock === 0 ? "Tomt" : "Lav",
  }));
}

/**
 * Generate Stock Movements Report
 */
export async function generateStockMovementsReport(
  tenantId: string,
  startDate: Date,
  endDate: Date
) {
  const { stockMovements } = await import("./inventory_schema");
  
  const movements = await db
    .select({
      movement: stockMovements,
      product: products,
    })
    .from(stockMovements)
    .leftJoin(products, eq(stockMovements.productId, products.id))
    .where(and(
      eq(stockMovements.tenantId, tenantId),
      sql`${stockMovements.performedAt} >= ${startDate}`,
      sql`${stockMovements.performedAt} <= ${endDate}`
    ));
  
  const summary = {
    totalMovements: movements.length,
    purchases: movements.filter(m => m.movement.type === "purchase").length,
    sales: movements.filter(m => m.movement.type === "sale").length,
    adjustments: movements.filter(m => m.movement.type === "adjustment").length,
    returns: movements.filter(m => m.movement.type === "return").length,
    damages: movements.filter(m => m.movement.type === "damage").length,
  };
  
  return {
    movements: movements.map(m => ({
      date: m.movement.performedAt,
      product: m.product?.name || "",
      type: m.movement.type,
      quantityChange: m.movement.quantityChange,
      quantityBefore: m.movement.quantityBefore,
      quantityAfter: m.movement.quantityAfter,
      unitCost: parseFloat(m.movement.unitCost?.toString() || "0"),
      totalCost: parseFloat(m.movement.totalCost?.toString() || "0"),
      reason: m.movement.reason || "",
    })),
    summary,
  };
}

// ============================================================================
// SCHEDULED TASKS
// ============================================================================

/**
 * Run all scheduled inventory tasks
 * Should be called by a cron job or scheduler
 */
export async function runScheduledInventoryTasks(tenantId: string, ownerEmail: string) {
  console.log(`[Inventory] Running scheduled tasks for tenant: ${tenantId}`);
  
  const results = {
    lowStockCheck: await checkLowStockAlerts(tenantId),
    notifications: await sendAlertNotifications(tenantId, ownerEmail),
  };
  
  console.log("[Inventory] Scheduled tasks completed:", results);
  
  return results;
}
