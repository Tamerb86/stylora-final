import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Award,
  Calendar,
  Download,
} from "lucide-react";

export default function CommissionDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedPeriod, setSelectedPeriod] = useState("current_month");

  // Mock data - replace with actual TRPC queries
  const commissionStats = {
    totalCommission: 45000,
    paidCommission: 38000,
    pendingCommission: 7000,
    topEarner: "Emma Hansen",
  };

  const employeeCommissions = [
    {
      id: 1,
      name: "Emma Hansen",
      role: "Senior Stylist",
      sales: 85000,
      commission: 12750,
      rate: "15%",
      status: "paid",
    },
    {
      id: 2,
      name: "Lars Olsen",
      role: "Stylist",
      sales: 62000,
      commission: 6200,
      rate: "10%",
      status: "pending",
    },
    {
      id: 3,
      name: "Sofia Berg",
      role: "Junior Stylist",
      sales: 45000,
      commission: 3375,
      rate: "7.5%",
      status: "paid",
    },
  ];

  const commissionRules = [
    {
      id: 1,
      name: "Senior Stylist - Tjenester",
      type: "Prosentandel",
      value: "15%",
      applies: "Alle tjenester",
      active: true,
    },
    {
      id: 2,
      name: "Produktsalg",
      type: "Prosentandel",
      value: "10%",
      applies: "Alle produkter",
      active: true,
    },
    {
      id: 3,
      name: "Bonus - Måned",
      type: "Fast beløp",
      value: "5000 kr",
      applies: "Ved 100k+ salg",
      active: true,
    },
  ];

  const commissionTargets = [
    {
      id: 1,
      employee: "Emma Hansen",
      target: 100000,
      current: 85000,
      progress: 85,
      bonus: 5000,
      daysLeft: 8,
    },
    {
      id: 2,
      employee: "Lars Olsen",
      target: 80000,
      current: 62000,
      progress: 77.5,
      bonus: 4000,
      daysLeft: 8,
    },
    {
      id: 3,
      employee: "Sofia Berg",
      target: 60000,
      current: 45000,
      progress: 75,
      bonus: 3000,
      daysLeft: 8,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Provisjonsstyring</h1>
          <p className="text-gray-600 mt-1">
            Administrer provisjoner, regler og mål
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="current_month">Denne måneden</option>
            <option value="last_month">Forrige måned</option>
            <option value="current_quarter">Dette kvartalet</option>
            <option value="current_year">Dette året</option>
          </select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Eksporter
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total provisjon</CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {commissionStats.totalCommission.toLocaleString()} kr
            </div>
            <p className="text-xs text-gray-500 mt-1">Denne måneden</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Utbetalt</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {commissionStats.paidCommission.toLocaleString()} kr
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {((commissionStats.paidCommission / commissionStats.totalCommission) * 100).toFixed(0)}% av total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Venter</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {commissionStats.pendingCommission.toLocaleString()} kr
            </div>
            <p className="text-xs text-gray-500 mt-1">Til utbetaling</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Topp tjener</CardTitle>
            <Award className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{commissionStats.topEarner}</div>
            <p className="text-xs text-gray-500 mt-1">Denne måneden</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Oversikt</TabsTrigger>
          <TabsTrigger value="employees">Ansatte</TabsTrigger>
          <TabsTrigger value="rules">Regler</TabsTrigger>
          <TabsTrigger value="targets">Mål</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Earners */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Topp tjenere
                </CardTitle>
                <CardDescription>Beste provisjoner denne måneden</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {employeeCommissions
                    .sort((a, b) => b.commission - a.commission)
                    .map((emp, index) => (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                              index === 0
                                ? "bg-yellow-100 text-yellow-700"
                                : index === 1
                                ? "bg-gray-100 text-gray-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{emp.name}</p>
                            <p className="text-sm text-gray-600">{emp.role}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {emp.commission.toLocaleString()} kr
                          </p>
                          <p className="text-sm text-gray-600">
                            {emp.sales.toLocaleString()} kr salg
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Pending Commissions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-500" />
                  Venter utbetaling
                </CardTitle>
                <CardDescription>Provisjoner som skal utbetales</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {employeeCommissions
                    .filter((emp) => emp.status === "pending")
                    .map((emp) => (
                      <div
                        key={emp.id}
                        className="p-3 border rounded-lg bg-orange-50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{emp.name}</p>
                            <p className="text-sm text-gray-600">
                              {emp.sales.toLocaleString()} kr • {emp.rate}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg text-orange-600">
                              {emp.commission.toLocaleString()} kr
                            </p>
                            <Button size="sm" className="mt-2">
                              Marker som betalt
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  {employeeCommissions.filter((emp) => emp.status === "pending")
                    .length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                      Ingen ventende utbetalinger
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Employees Tab */}
        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Provisjoner per ansatt</CardTitle>
              <CardDescription>
                Detaljert oversikt over provisjoner
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Ansatt
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Salg
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Sats
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Provisjon
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
                    {employeeCommissions.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{emp.name}</p>
                            <p className="text-sm text-gray-600">{emp.role}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {emp.sales.toLocaleString()} kr
                        </td>
                        <td className="px-4 py-3 text-gray-600">{emp.rate}</td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-lg">
                            {emp.commission.toLocaleString()} kr
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              emp.status === "paid"
                                ? "bg-green-100 text-green-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {emp.status === "paid" ? "Betalt" : "Venter"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm">
                            Detaljer
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

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Provisjonsregler</CardTitle>
                  <CardDescription>
                    Administrer provisjonsstrukturen
                  </CardDescription>
                </div>
                <Button>Ny regel</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {commissionRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-lg">{rule.name}</p>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              rule.active
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {rule.active ? "Aktiv" : "Inaktiv"}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-600">Type</p>
                            <p className="font-medium">{rule.type}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Verdi</p>
                            <p className="font-medium text-green-600">
                              {rule.value}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Gjelder for</p>
                            <p className="font-medium">{rule.applies}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Rediger
                        </Button>
                        <Button variant="outline" size="sm">
                          {rule.active ? "Deaktiver" : "Aktiver"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Targets Tab */}
        <TabsContent value="targets" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    Salgsmål og bonuser
                  </CardTitle>
                  <CardDescription>
                    Følg fremgang mot månedlige mål
                  </CardDescription>
                </div>
                <Button>Sett nytt mål</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {commissionTargets.map((target) => (
                  <div
                    key={target.id}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-lg">{target.employee}</p>
                        <p className="text-sm text-gray-600">
                          {target.current.toLocaleString()} kr av{" "}
                          {target.target.toLocaleString()} kr
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Bonus ved mål</p>
                        <p className="font-bold text-lg text-green-600">
                          {target.bonus.toLocaleString()} kr
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          {target.progress.toFixed(1)}% fullført
                        </span>
                        <span className="text-gray-600">
                          {target.daysLeft} dager igjen
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${
                            target.progress >= 90
                              ? "bg-green-500"
                              : target.progress >= 70
                              ? "bg-blue-500"
                              : target.progress >= 50
                              ? "bg-yellow-500"
                              : "bg-orange-500"
                          }`}
                          style={{ width: `${Math.min(target.progress, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600">
                        Trenger {(target.target - target.current).toLocaleString()} kr mer
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
