import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  DollarSign,
  Calendar,
  Settings,
  Search,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";

export default function SaasAdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");

  // Mock data - replace with actual TRPC queries
  const stats = {
    totalTenants: 247,
    activeTenants: 231,
    trialTenants: 42,
    suspendedTenants: 16,
    monthlyRevenue: 185400,
    yearlyRevenue: 2224800,
    avgRevenuePerTenant: 750,
    churnRate: 3.2,
  };

  const recentTenants = [
    {
      id: 1,
      name: "Bella Salong",
      email: "post@bellasalong.no",
      plan: "professional",
      status: "active",
      mrr: 999,
      createdAt: "2025-12-08",
      trialEndsAt: null,
    },
    {
      id: 2,
      name: "Glamour Studio",
      email: "info@glamour.no",
      plan: "basic",
      status: "trial",
      mrr: 0,
      createdAt: "2025-12-10",
      trialEndsAt: "2025-12-24",
    },
    {
      id: 3,
      name: "Nordic Spa",
      email: "kontakt@nordicspa.no",
      plan: "enterprise",
      status: "active",
      mrr: 1999,
      createdAt: "2025-11-15",
      trialEndsAt: null,
    },
  ];

  const subscriptionPlans = [
    {
      id: 1,
      name: "Free",
      slug: "free",
      monthlyPrice: 0,
      yearlyPrice: 0,
      activeSubscriptions: 42,
      features: ["1 ansatt", "50 bookinger/måned", "Grunnleggende rapporter"],
    },
    {
      id: 2,
      name: "Basic",
      slug: "basic",
      monthlyPrice: 499,
      yearlyPrice: 4990,
      activeSubscriptions: 89,
      features: ["5 ansatte", "Ubegrenset bookinger", "Alle rapporter", "SMS-varsler"],
    },
    {
      id: 3,
      name: "Professional",
      slug: "professional",
      monthlyPrice: 999,
      yearlyPrice: 9990,
      activeSubscriptions: 94,
      features: ["Ubegrenset ansatte", "CRM & Markedsføring", "Lagerstyring", "API-tilgang"],
    },
    {
      id: 4,
      name: "Enterprise",
      slug: "enterprise",
      monthlyPrice: 1999,
      yearlyPrice: 19990,
      activeSubscriptions: 22,
      features: ["Alt i Professional", "Prioritert support", "Dedikert konsulent", "Egendefinerte integrasjoner"],
    },
  ];

  const recentInvoices = [
    {
      id: 1,
      tenantName: "Bella Salong",
      invoiceNumber: "INV-2025-001234",
      amount: 999,
      status: "paid",
      dueDate: "2025-12-01",
      paidAt: "2025-11-28",
    },
    {
      id: 2,
      tenantName: "Nordic Spa",
      invoiceNumber: "INV-2025-001235",
      amount: 1999,
      status: "paid",
      dueDate: "2025-12-05",
      paidAt: "2025-12-04",
    },
    {
      id: 3,
      tenantName: "Style House",
      invoiceNumber: "INV-2025-001236",
      amount: 499,
      status: "overdue",
      dueDate: "2025-12-08",
      paidAt: null,
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles = {
      active: "bg-green-100 text-green-700",
      trial: "bg-blue-100 text-blue-700",
      suspended: "bg-red-100 text-red-700",
      cancelled: "bg-gray-100 text-gray-700",
    };
    
    const labels = {
      active: "Aktiv",
      trial: "Prøveperiode",
      suspended: "Suspendert",
      cancelled: "Kansellert",
    };

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || styles.active}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getInvoiceStatusBadge = (status: string) => {
    const config = {
      paid: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100", label: "Betalt" },
      pending: { icon: AlertCircle, color: "text-yellow-600", bg: "bg-yellow-100", label: "Venter" },
      overdue: { icon: XCircle, color: "text-red-600", bg: "bg-red-100", label: "Forfalt" },
    };

    const { icon: Icon, color, bg, label } = config[status] || config.pending;

    return (
      <span className={`flex items-center gap-1 px-2 py-1 text-xs rounded-full ${bg} ${color}`}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SaaS Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Administrer alle kunder og abonnementer
          </p>
        </div>
        <Button>
          <Settings className="h-4 w-4 mr-2" />
          Systeminnstillinger
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Totalt kunder</CardTitle>
            <Building2 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTenants}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.activeTenants} aktive • {stats.trialTenants} prøveperiode
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Månedlig inntekt</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.monthlyRevenue.toLocaleString()} kr
            </div>
            <p className="text-xs text-gray-500 mt-1">
              MRR • {stats.avgRevenuePerTenant} kr per kunde
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Årlig inntekt</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.yearlyRevenue.toLocaleString()} kr
            </div>
            <p className="text-xs text-gray-500 mt-1">ARR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Churn rate</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.churnRate}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Siste 30 dager</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Oversikt</TabsTrigger>
          <TabsTrigger value="tenants">Kunder</TabsTrigger>
          <TabsTrigger value="plans">Abonnementsplaner</TabsTrigger>
          <TabsTrigger value="invoices">Fakturaer</TabsTrigger>
          <TabsTrigger value="analytics">Analyser</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Tenants */}
            <Card>
              <CardHeader>
                <CardTitle>Nyeste kunder</CardTitle>
                <CardDescription>Siste registreringer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentTenants.map((tenant) => (
                    <div
                      key={tenant.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-gray-600">{tenant.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Registrert: {new Date(tenant.createdAt).toLocaleDateString("no-NO")}
                        </p>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(tenant.status)}
                        <p className="text-sm font-bold mt-2">
                          {tenant.mrr > 0 ? `${tenant.mrr} kr/mnd` : "Gratis"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Invoices */}
            <Card>
              <CardHeader>
                <CardTitle>Nyeste fakturaer</CardTitle>
                <CardDescription>Siste betalinger</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{invoice.tenantName}</p>
                        <p className="text-sm text-gray-600">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Forfaller: {new Date(invoice.dueDate).toLocaleDateString("no-NO")}
                        </p>
                      </div>
                      <div className="text-right">
                        {getInvoiceStatusBadge(invoice.status)}
                        <p className="text-sm font-bold mt-2">
                          {invoice.amount.toLocaleString()} kr
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tenants Tab */}
        <TabsContent value="tenants" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Alle kunder</CardTitle>
                  <CardDescription>
                    {stats.totalTenants} totalt kunder
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Søk kunder..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button>Legg til kunde</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Kunde
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Plan
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        MRR
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Registrert
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Handlinger
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentTenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{tenant.name}</p>
                            <p className="text-sm text-gray-600">{tenant.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="capitalize">{tenant.plan}</span>
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(tenant.status)}</td>
                        <td className="px-4 py-3 font-medium">
                          {tenant.mrr > 0 ? `${tenant.mrr} kr` : "Gratis"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(tenant.createdAt).toLocaleDateString("no-NO")}
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {subscriptionPlans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    {plan.activeSubscriptions} aktive abonnementer
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-3xl font-bold">
                        {plan.monthlyPrice.toLocaleString()} kr
                      </p>
                      <p className="text-sm text-gray-600">per måned</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {plan.yearlyPrice.toLocaleString()} kr/år
                      </p>
                    </div>
                    <div className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full">
                      Rediger plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fakturaer</CardTitle>
              <CardDescription>Alle fakturaer og betalinger</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Fakturanr.
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Kunde
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Beløp
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Forfallsdato
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Handlinger
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentInvoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-sm">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="px-4 py-3">{invoice.tenantName}</td>
                        <td className="px-4 py-3 font-medium">
                          {invoice.amount.toLocaleString()} kr
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(invoice.dueDate).toLocaleDateString("no-NO")}
                        </td>
                        <td className="px-4 py-3">
                          {getInvoiceStatusBadge(invoice.status)}
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm">
                            Vis detaljer
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analyser og statistikk</CardTitle>
              <CardDescription>Detaljert innsikt i virksomheten</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p>Analyser kommer snart...</p>
                <p className="text-sm mt-2">
                  Her vil du kunne se detaljerte grafer og statistikk
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
