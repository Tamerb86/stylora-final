import {
  bigint,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  date,
  index,
  unique,
} from "drizzle-orm/mysql-core";

/**
 * Inventory Management System Schema
 * Comprehensive inventory tracking with suppliers, stock movements, and barcode support
 */

// ============================================================================
// SUPPLIERS
// ============================================================================

export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  contactPerson: varchar("contactPerson", { length: 255 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  postalCode: varchar("postalCode", { length: 10 }),
  country: varchar("country", { length: 2 }).default("NO"), // ISO 3166-1 alpha-2
  orgNumber: varchar("orgNumber", { length: 20 }), // Organization number
  website: varchar("website", { length: 255 }),
  notes: text("notes"),
  paymentTerms: varchar("paymentTerms", { length: 100 }), // e.g., "Net 30", "Net 60"
  currency: varchar("currency", { length: 3 }).default("NOK"),
  isActive: boolean("isActive").default(true).notNull(),
  rating: int("rating"), // 1-5 stars
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  activeIdx: index("active_idx").on(table.isActive),
}));

// ============================================================================
// PRODUCT INVENTORY (extends existing products table)
// ============================================================================

export const productInventory = mysqlTable("product_inventory", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  productId: int("productId").notNull(), // FK to products table
  
  // Stock Levels
  currentStock: int("currentStock").default(0).notNull(),
  minStock: int("minStock").default(0).notNull(), // Minimum stock level for alerts
  maxStock: int("maxStock"), // Maximum stock level
  reorderPoint: int("reorderPoint").default(0).notNull(), // When to reorder
  reorderQuantity: int("reorderQuantity").default(0).notNull(), // How much to reorder
  
  // Barcode
  barcode: varchar("barcode", { length: 100 }), // EAN-13, UPC, etc.
  barcodeType: mysqlEnum("barcodeType", ["EAN13", "UPC", "CODE128", "QR"]),
  sku: varchar("sku", { length: 100 }), // Stock Keeping Unit
  
  // Supplier Information
  supplierId: int("supplierId"), // FK to suppliers
  supplierProductCode: varchar("supplierProductCode", { length: 100 }),
  costPrice: decimal("costPrice", { precision: 10, scale: 2 }).default("0.00"), // Purchase price
  
  // Location
  location: varchar("location", { length: 100 }), // Shelf/bin location
  
  // Alerts
  lowStockAlertEnabled: boolean("lowStockAlertEnabled").default(true).notNull(),
  lastLowStockAlertSent: timestamp("lastLowStockAlertSent"),
  
  // Tracking
  lastRestocked: timestamp("lastRestocked"),
  lastSold: timestamp("lastSold"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  productIdx: index("product_idx").on(table.productId),
  barcodeIdx: index("barcode_idx").on(table.barcode),
  skuIdx: index("sku_idx").on(table.sku),
  supplierIdx: index("supplier_idx").on(table.supplierId),
  lowStockIdx: index("low_stock_idx").on(table.currentStock, table.minStock),
}));

// ============================================================================
// PURCHASE ORDERS
// ============================================================================

export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  orderNumber: varchar("orderNumber", { length: 50 }).notNull(), // PO-2025-001
  supplierId: int("supplierId").notNull(),
  
  // Order Details
  orderDate: date("orderDate").notNull(),
  expectedDeliveryDate: date("expectedDeliveryDate"),
  actualDeliveryDate: date("actualDeliveryDate"),
  
  // Status
  status: mysqlEnum("status", [
    "draft",
    "pending",
    "ordered",
    "partially_received",
    "received",
    "canceled"
  ]).default("draft").notNull(),
  
  // Amounts
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default("0.00").notNull(),
  taxAmount: decimal("taxAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  shippingCost: decimal("shippingCost", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  
  // Payment
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "partially_paid", "paid"]).default("unpaid").notNull(),
  paymentDueDate: date("paymentDueDate"),
  
  // Notes
  notes: text("notes"),
  internalNotes: text("internalNotes"),
  
  // Tracking
  createdBy: int("createdBy"), // User ID
  approvedBy: int("approvedBy"), // User ID
  approvedAt: timestamp("approvedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  supplierIdx: index("supplier_idx").on(table.supplierId),
  statusIdx: index("status_idx").on(table.status),
  orderNumberIdx: unique("order_number_idx").on(table.tenantId, table.orderNumber),
}));

// ============================================================================
// PURCHASE ORDER ITEMS
// ============================================================================

export const purchaseOrderItems = mysqlTable("purchase_order_items", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  purchaseOrderId: int("purchaseOrderId").notNull(),
  productId: int("productId").notNull(),
  
  // Quantities
  quantityOrdered: int("quantityOrdered").notNull(),
  quantityReceived: int("quantityReceived").default(0).notNull(),
  
  // Pricing
  unitCost: decimal("unitCost", { precision: 10, scale: 2 }).notNull(),
  lineTotal: decimal("lineTotal", { precision: 10, scale: 2 }).notNull(),
  
  // Notes
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  poIdx: index("po_idx").on(table.purchaseOrderId),
  productIdx: index("product_idx").on(table.productId),
}));

// ============================================================================
// STOCK MOVEMENTS
// ============================================================================

export const stockMovements = mysqlTable("stock_movements", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  productId: int("productId").notNull(),
  
  // Movement Details
  type: mysqlEnum("type", [
    "purchase",      // Stock in from purchase order
    "sale",          // Stock out from sale
    "adjustment",    // Manual adjustment
    "return",        // Return from customer
    "damage",        // Damaged/spoiled
    "transfer",      // Transfer between locations
    "initial"        // Initial stock entry
  ]).notNull(),
  
  // Quantity
  quantityBefore: int("quantityBefore").notNull(),
  quantityChange: int("quantityChange").notNull(), // Positive or negative
  quantityAfter: int("quantityAfter").notNull(),
  
  // Reference
  referenceType: varchar("referenceType", { length: 50 }), // "purchase_order", "order", "adjustment"
  referenceId: int("referenceId"), // ID of the reference
  
  // Cost
  unitCost: decimal("unitCost", { precision: 10, scale: 2 }),
  totalCost: decimal("totalCost", { precision: 10, scale: 2 }),
  
  // Details
  reason: text("reason"), // For adjustments
  notes: text("notes"),
  
  // Tracking
  performedBy: int("performedBy"), // User ID
  performedAt: timestamp("performedAt").defaultNow().notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  productIdx: index("product_idx").on(table.productId),
  typeIdx: index("type_idx").on(table.type),
  performedAtIdx: index("performed_at_idx").on(table.performedAt),
}));

// ============================================================================
// STOCK ALERTS
// ============================================================================

export const stockAlerts = mysqlTable("stock_alerts", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  productId: int("productId").notNull(),
  
  // Alert Details
  alertType: mysqlEnum("alertType", [
    "low_stock",
    "out_of_stock",
    "overstock",
    "expiring_soon"
  ]).notNull(),
  
  // Levels
  currentStock: int("currentStock").notNull(),
  thresholdLevel: int("thresholdLevel").notNull(),
  
  // Status
  status: mysqlEnum("status", ["active", "acknowledged", "resolved"]).default("active").notNull(),
  
  // Notification
  notificationSent: boolean("notificationSent").default(false).notNull(),
  notificationSentAt: timestamp("notificationSentAt"),
  
  // Resolution
  acknowledgedBy: int("acknowledgedBy"), // User ID
  acknowledgedAt: timestamp("acknowledgedAt"),
  resolvedAt: timestamp("resolvedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  productIdx: index("product_idx").on(table.productId),
  statusIdx: index("status_idx").on(table.status),
  alertTypeIdx: index("alert_type_idx").on(table.alertType),
}));

// ============================================================================
// INVENTORY COUNTS (Physical Inventory)
// ============================================================================

export const inventoryCounts = mysqlTable("inventory_counts", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  
  // Count Details
  countNumber: varchar("countNumber", { length: 50 }).notNull(), // IC-2025-001
  countDate: date("countDate").notNull(),
  
  // Status
  status: mysqlEnum("status", ["planned", "in_progress", "completed", "canceled"]).default("planned").notNull(),
  
  // Tracking
  startedBy: int("startedBy"), // User ID
  startedAt: timestamp("startedAt"),
  completedBy: int("completedBy"), // User ID
  completedAt: timestamp("completedAt"),
  
  // Notes
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  statusIdx: index("status_idx").on(table.status),
  countNumberIdx: unique("count_number_idx").on(table.tenantId, table.countNumber),
}));

// ============================================================================
// INVENTORY COUNT ITEMS
// ============================================================================

export const inventoryCountItems = mysqlTable("inventory_count_items", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  inventoryCountId: int("inventoryCountId").notNull(),
  productId: int("productId").notNull(),
  
  // Counts
  systemQuantity: int("systemQuantity").notNull(), // What system says
  countedQuantity: int("countedQuantity"), // What was actually counted
  variance: int("variance"), // Difference
  
  // Cost Impact
  unitCost: decimal("unitCost", { precision: 10, scale: 2 }),
  varianceCost: decimal("varianceCost", { precision: 10, scale: 2 }), // variance * unitCost
  
  // Notes
  notes: text("notes"),
  
  // Tracking
  countedBy: int("countedBy"), // User ID
  countedAt: timestamp("countedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  countIdx: index("count_idx").on(table.inventoryCountId),
  productIdx: index("product_idx").on(table.productId),
}));

// ============================================================================
// PRODUCT VARIANTS (for sizes, colors, etc.)
// ============================================================================

export const productVariants = mysqlTable("product_variants", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: varchar("tenantId", { length: 36 }).notNull(),
  productId: int("productId").notNull(), // Parent product
  
  // Variant Details
  variantName: varchar("variantName", { length: 255 }).notNull(), // e.g., "Red - Large"
  sku: varchar("sku", { length: 100 }), // Unique SKU for variant
  barcode: varchar("barcode", { length: 100 }),
  
  // Attributes
  size: varchar("size", { length: 50 }),
  color: varchar("color", { length: 50 }),
  material: varchar("material", { length: 100 }),
  
  // Stock
  currentStock: int("currentStock").default(0).notNull(),
  minStock: int("minStock").default(0).notNull(),
  
  // Pricing
  costPrice: decimal("costPrice", { precision: 10, scale: 2 }),
  retailPrice: decimal("retailPrice", { precision: 10, scale: 2 }),
  
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantIdx: index("tenant_idx").on(table.tenantId),
  productIdx: index("product_idx").on(table.productId),
  barcodeIdx: index("barcode_idx").on(table.barcode),
  skuIdx: index("sku_idx").on(table.sku),
}));

// ============================================================================
// EXPORTS
// ============================================================================

export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;

export type ProductInventory = typeof productInventory.$inferSelect;
export type NewProductInventory = typeof productInventory.$inferInsert;

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type NewPurchaseOrder = typeof purchaseOrders.$inferInsert;

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type NewPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;

export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;

export type StockAlert = typeof stockAlerts.$inferSelect;
export type NewStockAlert = typeof stockAlerts.$inferInsert;

export type InventoryCount = typeof inventoryCounts.$inferSelect;
export type NewInventoryCount = typeof inventoryCounts.$inferInsert;

export type InventoryCountItem = typeof inventoryCountItems.$inferSelect;
export type NewInventoryCountItem = typeof inventoryCountItems.$inferInsert;

export type ProductVariant = typeof productVariants.$inferSelect;
export type NewProductVariant = typeof productVariants.$inferInsert;
