/**
 * Navigation Updates for Stylora
 * 
 * This file contains the updated navigation structure with all new pages
 * organized in a logical and professional manner.
 * 
 * To apply these updates:
 * 1. Copy the menu items below
 * 2. Replace the corresponding sections in DashboardLayout.tsx
 * 3. Import the new icons if needed
 */

import {
  LayoutDashboard,
  LogOut,
  Users,
  Calendar,
  Scissors,
  UserCog,
  Package,
  BarChart3,
  Settings as SettingsIcon,
  Bell,
  Gift,
  DollarSign,
  TrendingUp,
  Clock,
  ShoppingCart,
  Receipt,
  RefreshCw,
  Plane,
  CalendarCheck,
  Database,
  Building2,
  CreditCard,
  History,
  MessageCircle,
  Send,
  UserCheck,
  Mail,
  MessageSquare,
  // New icons for new pages
  PackageSearch,
  Warehouse,
  TrendingDown,
  Target,
  Award,
  Link as LinkIcon,
  Repeat,
  CreditCard as CardIcon,
  Smartphone,
  Users2,
  Megaphone,
  Star,
  ThumbsUp,
  Tag,
  FileText,
  X,
  Edit,
} from "lucide-react";

// ============================================================================
// MAIN NAVIGATION ITEMS
// ============================================================================

export const mainMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  
  // Booking Section
  { icon: Calendar, label: "Timebok", path: "/appointments" },
  { icon: UserCheck, label: "Walk-in Kø", path: "/walk-in-queue" },
  
  // Sales Section
  { icon: ShoppingCart, label: "Salgssted (POS)", path: "/pos" },
  
  // Customer Management
  { icon: Users, label: "Kunder", path: "/customers" },
  
  // Services & Products
  { icon: Scissors, label: "Tjenester", path: "/services" },
  { icon: Package, label: "Produkter", path: "/products", advancedOnly: true },
  
  // NEW: Inventory Management
  {
    icon: Warehouse,
    label: "Lagerstyring",
    path: "/inventory",
    advancedOnly: true,
    submenu: [
      { icon: PackageSearch, label: "Oversikt", path: "/inventory" },
      { icon: TrendingDown, label: "Lav beholdning", path: "/inventory/low-stock" },
      { icon: Users2, label: "Leverandører", path: "/inventory/suppliers" },
      { icon: FileText, label: "Innkjøpsordre", path: "/inventory/purchase-orders" },
    ]
  },
  
  // Employee Management
  { icon: UserCog, label: "Ansatte", path: "/employees" },
  
  // NEW: Commission Management
  {
    icon: Award,
    label: "Provisjon",
    path: "/commission",
    advancedOnly: true,
    submenu: [
      { icon: Award, label: "Oversikt", path: "/commission" },
      { icon: Target, label: "Mål", path: "/commission/targets" },
      { icon: BarChart3, label: "Rapporter", path: "/commission/reports" },
    ]
  },
  
  // Time Tracking
  {
    icon: Clock,
    label: "Timeregistrering",
    path: "/timeclock",
    submenu: [
      { icon: Clock, label: "Innstemplingsterminal", path: "/timeclock" },
      { icon: UserCog, label: "Administrer vakter", path: "/timeclock-admin", adminOnly: true },
      { icon: BarChart3, label: "Timeregistreringsrapport", path: "/attendance" },
    ]
  },
  
  // NEW: CRM & Marketing
  {
    icon: Megaphone,
    label: "Markedsføring & CRM",
    path: "/marketing",
    advancedOnly: true,
    submenu: [
      { icon: Users2, label: "Kundesegmenter", path: "/marketing/segments" },
      { icon: Send, label: "Kampanjer", path: "/marketing/campaigns" },
      { icon: Gift, label: "Gavekort", path: "/marketing/gift-cards" },
      { icon: Tag, label: "Kampanjekoder", path: "/marketing/promo-codes" },
      { icon: Users2, label: "Henvisningsprogram", path: "/marketing/referrals" },
      { icon: Star, label: "Tilbakemeldinger", path: "/marketing/feedback" },
      { icon: ThumbsUp, label: "NPS", path: "/marketing/nps" },
    ]
  },
  
  // Notifications & Loyalty
  { icon: Bell, label: "Varsler", path: "/notifications", advancedOnly: true },
  { icon: Gift, label: "Lojalitet", path: "/loyalty", advancedOnly: true },
  
  // Communications
  {
    icon: MessageCircle,
    label: "Kommunikasjon",
    path: "/communications",
    advancedOnly: true,
    submenu: [
      { icon: MessageCircle, label: "Innstillinger", path: "/communications" },
      { icon: Send, label: "Masseutsendelse", path: "/bulk-messaging" },
      { icon: TrendingUp, label: "Kampanjeanalyse", path: "/campaign-analytics" },
      { icon: Mail, label: "E-postmaler", path: "/email-templates" },
      { icon: MessageSquare, label: "SMS Pakker", path: "/sms-packages" },
      { icon: BarChart3, label: "SMS Forbruk", path: "/sms-usage" },
    ]
  },
  
  // Admin Section
  { icon: Database, label: "Sikkerhetskopier", path: "/backups", adminOnly: true, advancedOnly: true },
  
  // NEW: Accounting Integrations
  {
    icon: Building2,
    label: "Regnskapsintegrasjoner",
    path: "/accounting",
    adminOnly: true,
    advancedOnly: true,
    submenu: [
      { icon: Receipt, label: "Fiken", path: "/fiken" },
      { icon: Building2, label: "Unimicro", path: "/unimicro" },
      { icon: Building2, label: "DNB Regnskap", path: "/dnb-regnskap" },
      { icon: Building2, label: "Tripletex", path: "/tripletex" },
      { icon: Building2, label: "Visma eAccounting", path: "/visma-eaccounting" },
      { icon: Building2, label: "Sparebank1 Regnskap", path: "/sparebank1-regnskap" },
    ]
  },
  
  { icon: CreditCard, label: "Betalingsterminaler", path: "/payment-providers", adminOnly: true, advancedOnly: true },
  { icon: DollarSign, label: "Billing Admin", path: "/billing-admin", adminOnly: true, advancedOnly: true },
  { icon: SettingsIcon, label: "Innstillinger", path: "/settings" },
];

// ============================================================================
// PAYMENTS MENU ITEMS
// ============================================================================

export const paymentsMenuItems = [
  { icon: CreditCard, label: "Kasse (Betaling)", path: "/pos-payment", advancedOnly: true },
  { icon: Receipt, label: "Ordrehistorikk", path: "/orders", advancedOnly: true },
  { icon: History, label: "Betalingshistorikk", path: "/payment-history", advancedOnly: true },
  { icon: RefreshCw, label: "Refusjoner", path: "/refunds", advancedOnly: true },
  { icon: RefreshCw, label: "Refusjonsstyring", path: "/refund-management", advancedOnly: true },
  
  // NEW: Payment Extensions
  { icon: LinkIcon, label: "Betalingslenker", path: "/payment-links", advancedOnly: true },
  { icon: Repeat, label: "Abonnementer", path: "/subscriptions", advancedOnly: true },
  { icon: CardIcon, label: "Avdragsplaner", path: "/installment-plans", advancedOnly: true },
];

// ============================================================================
// REPORTS MENU ITEMS
// ============================================================================

export const reportsMenuItems = [
  { icon: BarChart3, label: "Rapporter", path: "/reports", advancedOnly: true },
  
  // NEW: Comprehensive Reports
  { icon: BarChart3, label: "Omfattende rapporter", path: "/comprehensive-reports", advancedOnly: true },
  
  { icon: DollarSign, label: "Økonomi", path: "/financial", advancedOnly: true },
  { icon: TrendingUp, label: "Analyse", path: "/analytics", advancedOnly: true },
  { icon: TrendingUp, label: "Avanserte rapporter", path: "/advanced-reports", advancedOnly: true },
  { icon: DollarSign, label: "POS Rapporter", path: "/pos-reports", advancedOnly: true },
];

// ============================================================================
// VACATION MENU ITEMS
// ============================================================================

export const vacationMenuItems = [
  { icon: Plane, label: "Mine Ferier", path: "/my-leaves", advancedOnly: true },
  { icon: CalendarCheck, label: "Feriegodkjenninger", path: "/leave-approvals", adminOnly: true, advancedOnly: true },
  { icon: Calendar, label: "Helligdager", path: "/holidays", adminOnly: true, advancedOnly: true },
];

// ============================================================================
// PUBLIC BOOKING PAGES (Not in sidebar, but need routes)
// ============================================================================

export const publicBookingPages = [
  { path: "/cancel-booking", component: "CancelBooking" },
  { path: "/modify-booking", component: "ModifyBooking" },
];

// ============================================================================
// SUMMARY OF NEW PAGES
// ============================================================================

export const newPagesAdded = {
  inventory: [
    "/inventory",
    "/inventory/low-stock",
    "/inventory/suppliers",
    "/inventory/purchase-orders",
  ],
  commission: [
    "/commission",
    "/commission/targets",
    "/commission/reports",
  ],
  marketing: [
    "/marketing/segments",
    "/marketing/campaigns",
    "/marketing/gift-cards",
    "/marketing/promo-codes",
    "/marketing/referrals",
    "/marketing/feedback",
    "/marketing/nps",
  ],
  accounting: [
    "/dnb-regnskap",
    "/tripletex",
    "/visma-eaccounting",
    "/sparebank1-regnskap",
  ],
  payments: [
    "/payment-links",
    "/subscriptions",
    "/installment-plans",
  ],
  reports: [
    "/comprehensive-reports",
  ],
  publicBooking: [
    "/cancel-booking",
    "/modify-booking",
  ],
};

// ============================================================================
// ICONS TO IMPORT
// ============================================================================

export const newIconsToImport = `
import {
  // ... existing icons
  PackageSearch,
  Warehouse,
  TrendingDown,
  Target,
  Award,
  Link as LinkIcon,
  Repeat,
  CreditCard as CardIcon,
  Smartphone,
  Users2,
  Megaphone,
  Star,
  ThumbsUp,
  Tag,
  FileText,
  X,
  Edit,
} from "lucide-react";
`;

// ============================================================================
// INSTRUCTIONS
// ============================================================================

export const updateInstructions = `
INSTRUCTIONS TO UPDATE DashboardLayout.tsx:

1. Add new icons to the import statement at the top:
   ${newIconsToImport}

2. Replace the mainMenuItems array (around line 56) with the new mainMenuItems from this file

3. Replace the paymentsMenuItems array (around line 87) with the new paymentsMenuItems from this file

4. Replace the reportsMenuItems array (around line 95) with the new reportsMenuItems from this file

5. Keep vacationMenuItems as is (no changes)

6. Add routes in App.tsx for all new pages:
   - Import all new page components
   - Add <Route> elements for each new page

7. Test the navigation to ensure all links work correctly

TOTAL NEW PAGES ADDED: 23 pages
- Inventory Management: 4 pages
- Commission System: 3 pages
- CRM & Marketing: 7 pages
- Accounting Integrations: 4 pages (DNB, Tripletex, Visma, Sparebank1)
- Payment Extensions: 3 pages
- Reports: 1 page
- Public Booking: 2 pages (not in sidebar)
`;
