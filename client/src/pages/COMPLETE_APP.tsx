import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { useState } from "react";
import {
  Calendar,
  Users,
  Settings,
  Package,
  TrendingUp,
  Gift,
  Tag,
  MessageSquare,
  Star,
  UserCircle,
  FileText,
  CreditCard,
  BarChart3,
  Menu,
  X,
} from "lucide-react";

// Import all pages
import Dashboard from "@/pages/Dashboard";
import Bookings from "@/pages/Bookings";
import Customers from "@/pages/Customers";
import Services from "@/pages/Services";
import Employees from "@/pages/Employees";
import Reports from "@/pages/Reports";
import SettingsPage from "@/pages/Settings";

// New pages
import CancelBooking from "@/pages/CancelBooking";
import ModifyBooking from "@/pages/ModifyBooking";
import ComprehensiveReports from "@/pages/ComprehensiveReports";
import CRMDashboard from "@/pages/CRMDashboard";
import InventoryDashboard from "@/pages/InventoryDashboard";
import CommissionDashboard from "@/pages/CommissionDashboard";
import CustomerPortal from "@/pages/CustomerPortal";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const mainMenuItems = [
    {
      title: "Dashboard",
      href: "/",
      icon: BarChart3,
    },
    {
      title: "Avtaler",
      href: "/bookings",
      icon: Calendar,
    },
    {
      title: "Kunder",
      href: "/customers",
      icon: Users,
    },
    {
      title: "Tjenester",
      href: "/services",
      icon: Package,
    },
    {
      title: "Ansatte",
      href: "/employees",
      icon: Users,
    },
    {
      title: "Rapporter",
      href: "/reports",
      icon: FileText,
      children: [
        { title: "Grunnleggende rapporter", href: "/reports" },
        { title: "Omfattende rapporter", href: "/reports/comprehensive" },
      ],
    },
    {
      title: "Lagerstyring",
      href: "/inventory",
      icon: Package,
    },
    {
      title: "Provisjon",
      href: "/commission",
      icon: TrendingUp,
    },
    {
      title: "Markedsføring & CRM",
      href: "/crm",
      icon: Users,
      children: [
        { title: "Oversikt", href: "/crm" },
        { title: "Kundesegmenter", href: "/crm#segments" },
        { title: "Kampanjer", href: "/crm#campaigns" },
        { title: "Gavekort", href: "/crm#giftcards" },
        { title: "Kampanjekoder", href: "/crm#promocodes" },
        { title: "Tilbakemeldinger", href: "/crm#feedback" },
      ],
    },
    {
      title: "Kundeportal",
      href: "/customer-portal",
      icon: UserCircle,
    },
    {
      title: "Innstillinger",
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "w-64" : "w-20"
          } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}
        >
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
            {sidebarOpen && (
              <h1 className="text-xl font-bold text-purple-600">Stylora</h1>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              {mainMenuItems.map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className="flex items-center gap-3 px-3 py-2 text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors"
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && (
                      <span className="text-sm font-medium">{item.title}</span>
                    )}
                  </Link>
                  {sidebarOpen && item.children && (
                    <ul className="ml-8 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            to={child.href}
                            className="block px-3 py-1.5 text-sm text-gray-600 hover:text-purple-600 rounded-lg hover:bg-purple-50 transition-colors"
                          >
                            {child.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* User info */}
          {sidebarOpen && (
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Admin</p>
                  <p className="text-xs text-gray-500">admin@stylora.no</p>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <Routes>
            {/* Core pages */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/services" element={<Services />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Enhanced booking pages */}
            <Route path="/booking/cancel/:id" element={<CancelBooking />} />
            <Route path="/booking/modify/:id" element={<ModifyBooking />} />

            {/* Reports */}
            <Route path="/reports/comprehensive" element={<ComprehensiveReports />} />

            {/* New systems */}
            <Route path="/crm" element={<CRMDashboard />} />
            <Route path="/inventory" element={<InventoryDashboard />} />
            <Route path="/commission" element={<CommissionDashboard />} />
            <Route path="/customer-portal" element={<CustomerPortal />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
