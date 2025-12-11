import { router, protectedProcedure } from "./trpc";
import { z } from "zod";
import { db } from "./db";
import { 
  suppliers, 
  productInventory, 
  purchaseOrders, 
  purchaseOrderItems,
  stockMovements,
  stockAlerts,
  inventoryCounts,
  inventoryCountItems,
  productVariants
} from "./inventory_schema";
import { products } from "./schema";
import { eq, and, sql, desc, asc, gte, lte, like, or } from "drizzle-orm";

export const inventoryRouter = router({
  
  // ============================================================================
  // SUPPLIERS
  // ============================================================================
  
  getSuppliers: protectedProcedure
    .input(z.object({
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(suppliers.tenantId, ctx.tenantId)];
      
      if (input?.isActive !== undefined) {
        conditions.push(eq(suppliers.isActive, input.isActive));
      }
      
      return await db
        .select()
        .from(suppliers)
        .where(and(...conditions))
        .orderBy(asc(suppliers.name));
    }),
  
  getSupplier: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [supplier] = await db
        .select()
        .from(suppliers)
        .where(and(
          eq(suppliers.id, input.id),
          eq(suppliers.tenantId, ctx.tenantId)
        ));
      
      return supplier;
    }),
  
  createSupplier: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      contactPerson: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().default("NO"),
      orgNumber: z.string().optional(),
      website: z.string().optional(),
      notes: z.string().optional(),
      paymentTerms: z.string().optional(),
      currency: z.string().default("NOK"),
      rating: z.number().min(1).max(5).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [result] = await db.insert(suppliers).values({
        tenantId: ctx.tenantId,
        ...input,
      });
      
      return { id: result.insertId };
    }),
  
  updateSupplier: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      contactPerson: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
      orgNumber: z.string().optional(),
      website: z.string().optional(),
      notes: z.string().optional(),
      paymentTerms: z.string().optional(),
      currency: z.string().optional(),
      rating: z.number().min(1).max(5).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      
      await db
        .update(suppliers)
        .set(data)
        .where(and(
          eq(suppliers.id, id),
          eq(suppliers.tenantId, ctx.tenantId)
        ));
      
      return { success: true };
    }),
  
  deleteSupplier: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(suppliers)
        .where(and(
          eq(suppliers.id, input.id),
          eq(suppliers.tenantId, ctx.tenantId)
        ));
      
      return { success: true };
    }),
  
  // ============================================================================
  // PRODUCT INVENTORY
  // ============================================================================
  
  getInventoryList: protectedProcedure
    .input(z.object({
      lowStockOnly: z.boolean().optional(),
      outOfStockOnly: z.boolean().optional(),
      search: z.string().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(productInventory.tenantId, ctx.tenantId)];
      
      if (input?.lowStockOnly) {
        conditions.push(sql`${productInventory.currentStock} <= ${productInventory.minStock}`);
      }
      
      if (input?.outOfStockOnly) {
        conditions.push(eq(productInventory.currentStock, 0));
      }
      
      let query = db
        .select({
          inventory: productInventory,
          product: products,
          supplier: suppliers,
        })
        .from(productInventory)
        .leftJoin(products, eq(productInventory.productId, products.id))
        .leftJoin(suppliers, eq(productInventory.supplierId, suppliers.id))
        .where(and(...conditions));
      
      if (input?.search) {
        query = query.where(
          or(
            like(products.name, `%${input.search}%`),
            like(productInventory.barcode, `%${input.search}%`),
            like(productInventory.sku, `%${input.search}%`)
          )
        );
      }
      
      return await query.orderBy(asc(products.name));
    }),
  
  getProductInventory: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ ctx, input }) => {
      const [inventory] = await db
        .select()
        .from(productInventory)
        .where(and(
          eq(productInventory.productId, input.productId),
          eq(productInventory.tenantId, ctx.tenantId)
        ));
      
      return inventory;
    }),
  
  createOrUpdateInventory: protectedProcedure
    .input(z.object({
      productId: z.number(),
      currentStock: z.number().optional(),
      minStock: z.number().default(0),
      maxStock: z.number().optional(),
      reorderPoint: z.number().default(0),
      reorderQuantity: z.number().default(0),
      barcode: z.string().optional(),
      barcodeType: z.enum(["EAN13", "UPC", "CODE128", "QR"]).optional(),
      sku: z.string().optional(),
      supplierId: z.number().optional(),
      supplierProductCode: z.string().optional(),
      costPrice: z.string().optional(),
      location: z.string().optional(),
      lowStockAlertEnabled: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const { productId, ...data } = input;
      
      // Check if inventory exists
      const [existing] = await db
        .select()
        .from(productInventory)
        .where(and(
          eq(productInventory.productId, productId),
          eq(productInventory.tenantId, ctx.tenantId)
        ));
      
      if (existing) {
        // Update
        await db
          .update(productInventory)
          .set(data)
          .where(eq(productInventory.id, existing.id));
        
        return { id: existing.id, created: false };
      } else {
        // Create
        const [result] = await db.insert(productInventory).values({
          tenantId: ctx.tenantId,
          productId,
          ...data,
        });
        
        return { id: result.insertId, created: true };
      }
    }),
  
  scanBarcode: protectedProcedure
    .input(z.object({ barcode: z.string() }))
    .query(async ({ ctx, input }) => {
      const [inventory] = await db
        .select({
          inventory: productInventory,
          product: products,
        })
        .from(productInventory)
        .leftJoin(products, eq(productInventory.productId, products.id))
        .where(and(
          eq(productInventory.barcode, input.barcode),
          eq(productInventory.tenantId, ctx.tenantId)
        ));
      
      return inventory;
    }),
  
  // ============================================================================
  // STOCK MOVEMENTS
  // ============================================================================
  
  recordStockMovement: protectedProcedure
    .input(z.object({
      productId: z.number(),
      type: z.enum(["purchase", "sale", "adjustment", "return", "damage", "transfer", "initial"]),
      quantityChange: z.number(),
      referenceType: z.string().optional(),
      referenceId: z.number().optional(),
      unitCost: z.string().optional(),
      reason: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get current inventory
      const [inventory] = await db
        .select()
        .from(productInventory)
        .where(and(
          eq(productInventory.productId, input.productId),
          eq(productInventory.tenantId, ctx.tenantId)
        ));
      
      if (!inventory) {
        throw new Error("Product inventory not found");
      }
      
      const quantityBefore = inventory.currentStock;
      const quantityAfter = quantityBefore + input.quantityChange;
      
      if (quantityAfter < 0) {
        throw new Error("Insufficient stock");
      }
      
      const unitCost = input.unitCost ? parseFloat(input.unitCost) : (inventory.costPrice ? parseFloat(inventory.costPrice.toString()) : 0);
      const totalCost = unitCost * Math.abs(input.quantityChange);
      
      // Record movement
      const [movement] = await db.insert(stockMovements).values({
        tenantId: ctx.tenantId,
        productId: input.productId,
        type: input.type,
        quantityBefore,
        quantityChange: input.quantityChange,
        quantityAfter,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        unitCost: unitCost.toString(),
        totalCost: totalCost.toString(),
        reason: input.reason,
        notes: input.notes,
        performedBy: ctx.userId,
      });
      
      // Update inventory
      await db
        .update(productInventory)
        .set({ 
          currentStock: quantityAfter,
          lastRestocked: input.type === "purchase" ? new Date() : inventory.lastRestocked,
          lastSold: input.type === "sale" ? new Date() : inventory.lastSold,
        })
        .where(eq(productInventory.id, inventory.id));
      
      // Check for low stock alert
      if (quantityAfter <= inventory.minStock && inventory.lowStockAlertEnabled) {
        await db.insert(stockAlerts).values({
          tenantId: ctx.tenantId,
          productId: input.productId,
          alertType: quantityAfter === 0 ? "out_of_stock" : "low_stock",
          currentStock: quantityAfter,
          thresholdLevel: inventory.minStock,
        });
      }
      
      return { id: movement.insertId, quantityAfter };
    }),
  
  getStockMovements: protectedProcedure
    .input(z.object({
      productId: z.number().optional(),
      type: z.enum(["purchase", "sale", "adjustment", "return", "damage", "transfer", "initial"]).optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      limit: z.number().default(100),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(stockMovements.tenantId, ctx.tenantId)];
      
      if (input?.productId) {
        conditions.push(eq(stockMovements.productId, input.productId));
      }
      
      if (input?.type) {
        conditions.push(eq(stockMovements.type, input.type));
      }
      
      if (input?.startDate) {
        conditions.push(gte(stockMovements.performedAt, new Date(input.startDate)));
      }
      
      if (input?.endDate) {
        conditions.push(lte(stockMovements.performedAt, new Date(input.endDate)));
      }
      
      return await db
        .select({
          movement: stockMovements,
          product: products,
        })
        .from(stockMovements)
        .leftJoin(products, eq(stockMovements.productId, products.id))
        .where(and(...conditions))
        .orderBy(desc(stockMovements.performedAt))
        .limit(input?.limit || 100);
    }),
  
  // ============================================================================
  // PURCHASE ORDERS
  // ============================================================================
  
  getPurchaseOrders: protectedProcedure
    .input(z.object({
      status: z.enum(["draft", "pending", "ordered", "partially_received", "received", "canceled"]).optional(),
      supplierId: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(purchaseOrders.tenantId, ctx.tenantId)];
      
      if (input?.status) {
        conditions.push(eq(purchaseOrders.status, input.status));
      }
      
      if (input?.supplierId) {
        conditions.push(eq(purchaseOrders.supplierId, input.supplierId));
      }
      
      return await db
        .select({
          purchaseOrder: purchaseOrders,
          supplier: suppliers,
        })
        .from(purchaseOrders)
        .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
        .where(and(...conditions))
        .orderBy(desc(purchaseOrders.createdAt));
    }),
  
  getPurchaseOrder: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [po] = await db
        .select({
          purchaseOrder: purchaseOrders,
          supplier: suppliers,
        })
        .from(purchaseOrders)
        .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
        .where(and(
          eq(purchaseOrders.id, input.id),
          eq(purchaseOrders.tenantId, ctx.tenantId)
        ));
      
      if (!po) return null;
      
      const items = await db
        .select({
          item: purchaseOrderItems,
          product: products,
        })
        .from(purchaseOrderItems)
        .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
        .where(eq(purchaseOrderItems.purchaseOrderId, input.id));
      
      return { ...po, items };
    }),
  
  createPurchaseOrder: protectedProcedure
    .input(z.object({
      supplierId: z.number(),
      orderDate: z.string(),
      expectedDeliveryDate: z.string().optional(),
      notes: z.string().optional(),
      items: z.array(z.object({
        productId: z.number(),
        quantityOrdered: z.number(),
        unitCost: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Generate order number
      const year = new Date().getFullYear();
      const [lastPO] = await db
        .select()
        .from(purchaseOrders)
        .where(and(
          eq(purchaseOrders.tenantId, ctx.tenantId),
          like(purchaseOrders.orderNumber, `PO-${year}-%`)
        ))
        .orderBy(desc(purchaseOrders.orderNumber))
        .limit(1);
      
      let nextNumber = 1;
      if (lastPO) {
        const lastNumber = parseInt(lastPO.orderNumber.split('-')[2]);
        nextNumber = lastNumber + 1;
      }
      
      const orderNumber = `PO-${year}-${nextNumber.toString().padStart(3, '0')}`;
      
      // Calculate totals
      let subtotal = 0;
      for (const item of input.items) {
        subtotal += parseFloat(item.unitCost) * item.quantityOrdered;
      }
      
      const taxAmount = subtotal * 0.25; // 25% MVA
      const totalAmount = subtotal + taxAmount;
      
      // Create PO
      const [po] = await db.insert(purchaseOrders).values({
        tenantId: ctx.tenantId,
        orderNumber,
        supplierId: input.supplierId,
        orderDate: input.orderDate,
        expectedDeliveryDate: input.expectedDeliveryDate,
        notes: input.notes,
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        totalAmount: totalAmount.toString(),
        createdBy: ctx.userId,
      });
      
      // Create items
      for (const item of input.items) {
        const lineTotal = parseFloat(item.unitCost) * item.quantityOrdered;
        
        await db.insert(purchaseOrderItems).values({
          tenantId: ctx.tenantId,
          purchaseOrderId: po.insertId,
          productId: item.productId,
          quantityOrdered: item.quantityOrdered,
          unitCost: item.unitCost,
          lineTotal: lineTotal.toString(),
        });
      }
      
      return { id: po.insertId, orderNumber };
    }),
  
  receivePurchaseOrder: protectedProcedure
    .input(z.object({
      id: z.number(),
      items: z.array(z.object({
        itemId: z.number(),
        quantityReceived: z.number(),
      })),
      actualDeliveryDate: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Update items
      for (const item of input.items) {
        const [poItem] = await db
          .select()
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.id, item.itemId));
        
        if (!poItem) continue;
        
        await db
          .update(purchaseOrderItems)
          .set({ 
            quantityReceived: sql`${purchaseOrderItems.quantityReceived} + ${item.quantityReceived}`
          })
          .where(eq(purchaseOrderItems.id, item.itemId));
        
        // Record stock movement
        await db.insert(stockMovements).values({
          tenantId: ctx.tenantId,
          productId: poItem.productId,
          type: "purchase",
          quantityBefore: 0, // Will be updated by recordStockMovement
          quantityChange: item.quantityReceived,
          quantityAfter: 0, // Will be updated by recordStockMovement
          referenceType: "purchase_order",
          referenceId: input.id,
          unitCost: poItem.unitCost.toString(),
          totalCost: (parseFloat(poItem.unitCost.toString()) * item.quantityReceived).toString(),
          performedBy: ctx.userId,
        });
        
        // Update inventory
        await db.execute(sql`
          UPDATE product_inventory 
          SET current_stock = current_stock + ${item.quantityReceived},
              last_restocked = NOW()
          WHERE product_id = ${poItem.productId} 
            AND tenant_id = ${ctx.tenantId}
        `);
      }
      
      // Check if fully received
      const allItems = await db
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, input.id));
      
      const fullyReceived = allItems.every(item => item.quantityReceived >= item.quantityOrdered);
      const partiallyReceived = allItems.some(item => item.quantityReceived > 0);
      
      const newStatus = fullyReceived ? "received" : (partiallyReceived ? "partially_received" : "ordered");
      
      // Update PO
      await db
        .update(purchaseOrders)
        .set({ 
          status: newStatus,
          actualDeliveryDate: input.actualDeliveryDate,
        })
        .where(and(
          eq(purchaseOrders.id, input.id),
          eq(purchaseOrders.tenantId, ctx.tenantId)
        ));
      
      return { success: true, status: newStatus };
    }),
  
  // ============================================================================
  // STOCK ALERTS
  // ============================================================================
  
  getStockAlerts: protectedProcedure
    .input(z.object({
      status: z.enum(["active", "acknowledged", "resolved"]).optional(),
      alertType: z.enum(["low_stock", "out_of_stock", "overstock", "expiring_soon"]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(stockAlerts.tenantId, ctx.tenantId)];
      
      if (input?.status) {
        conditions.push(eq(stockAlerts.status, input.status));
      }
      
      if (input?.alertType) {
        conditions.push(eq(stockAlerts.alertType, input.alertType));
      }
      
      return await db
        .select({
          alert: stockAlerts,
          product: products,
        })
        .from(stockAlerts)
        .leftJoin(products, eq(stockAlerts.productId, products.id))
        .where(and(...conditions))
        .orderBy(desc(stockAlerts.createdAt));
    }),
  
  acknowledgeAlert: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(stockAlerts)
        .set({ 
          status: "acknowledged",
          acknowledgedBy: ctx.userId,
          acknowledgedAt: new Date(),
        })
        .where(and(
          eq(stockAlerts.id, input.id),
          eq(stockAlerts.tenantId, ctx.tenantId)
        ));
      
      return { success: true };
    }),
  
  // ============================================================================
  // INVENTORY REPORTS
  // ============================================================================
  
  getInventoryReport: protectedProcedure
    .input(z.object({
      reportType: z.enum(["stock_levels", "stock_value", "movements", "low_stock"]),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (input.reportType === "stock_levels") {
        return await db
          .select({
            inventory: productInventory,
            product: products,
            supplier: suppliers,
          })
          .from(productInventory)
          .leftJoin(products, eq(productInventory.productId, products.id))
          .leftJoin(suppliers, eq(productInventory.supplierId, suppliers.id))
          .where(eq(productInventory.tenantId, ctx.tenantId))
          .orderBy(asc(products.name));
      }
      
      if (input.reportType === "low_stock") {
        return await db
          .select({
            inventory: productInventory,
            product: products,
          })
          .from(productInventory)
          .leftJoin(products, eq(productInventory.productId, products.id))
          .where(and(
            eq(productInventory.tenantId, ctx.tenantId),
            sql`${productInventory.currentStock} <= ${productInventory.minStock}`
          ))
          .orderBy(asc(productInventory.currentStock));
      }
      
      return [];
    }),
});
