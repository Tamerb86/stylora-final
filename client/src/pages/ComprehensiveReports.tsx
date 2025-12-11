import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { 
  FileDown, 
  FileSpreadsheet, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  Clock,
  ShoppingBag,
  Award,
  BarChart3
} from "lucide-react";
import { useState } from "react";
import { exportToPDFEnhanced, exportToExcelEnhanced } from "@/lib/exportUtils_v2";
import { toast } from "sonner";

export default function ComprehensiveReports() {
  const [period, setPeriod] = useState("month");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  
  // Calculate date range
  const getDateRange = () => {
    if (customStartDate && customEndDate) {
      return { startDate: customStartDate, endDate: customEndDate };
    }
    
    const end = new Date();
    const start = new Date();
    
    switch (period) {
      case "today":
        start.setHours(0, 0, 0, 0);
        break;
      case "week":
        start.setDate(end.getDate() - 7);
        break;
      case "month":
        start.setDate(end.getDate() - 30);
        break;
      case "quarter":
        start.setDate(end.getDate() - 90);
        break;
      case "year":
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        start.setDate(end.getDate() - 30);
    }
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const dateRange = getDateRange();

  // Fetch data
  const { data: ordersData = [] } = trpc.financialReports.detailedOrdersList.useQuery(dateRange);
  const { data: appointmentsData = [] } = trpc.appointments.list.useQuery();
  const { data: customersData = [] } = trpc.customers.list.useQuery();
  const { data: employeesData = [] } = trpc.employees.list.useQuery();
  const { data: servicesData = [] } = trpc.services.list.useQuery();

  // ============================================================================
  // 1. SALES REPORT
  // ============================================================================
  const handleExportSalesReport = (format: 'pdf' | 'excel') => {
    const data = ordersData.map((order: any) => ({
      date: new Date(order.orderDate),
      orderId: order.id,
      customer: order.customerName || "Walk-in",
      service: order.serviceName || "Diverse",
      employee: order.employeeName || "Ansatt",
      amount: parseFloat(order.total || "0"),
      paymentMethod: order.paymentMethod || "Kontant",
      status: "Fullført",
    }));

    const columns = [
      { header: "Dato", key: "date", type: "date" as const },
      { header: "Ordre ID", key: "orderId", type: "text" as const },
      { header: "Kunde", key: "customer", type: "text" as const },
      { header: "Tjeneste", key: "service", type: "text" as const },
      { header: "Ansatt", key: "employee", type: "text" as const },
      { header: "Beløp", key: "amount", type: "currency" as const },
      { header: "Betaling", key: "paymentMethod", type: "text" as const },
      { header: "Status", key: "status", type: "text" as const },
    ];

    const totalRevenue = data.reduce((sum, order) => sum + order.amount, 0);
    const avgOrderValue = data.length > 0 ? totalRevenue / data.length : 0;
    const totalOrders = data.length;

    const summary = [
      { label: "Totalt antall ordre", value: totalOrders, type: "number" as const },
      { label: "Total omsetning", value: totalRevenue, type: "currency" as const },
      { label: "Gjennomsnittlig ordreværdi", value: avgOrderValue, type: "currency" as const },
    ];

    const chartData = employeesData.map((emp: any) => {
      const empOrders = data.filter(o => o.employee === emp.name);
      const empRevenue = empOrders.reduce((sum, o) => sum + o.amount, 0);
      return { label: emp.name, value: empRevenue };
    }).sort((a, b) => b.value - a.value);

    const options = {
      title: "Salgsrapport",
      subtitle: `Periode: ${dateRange.startDate} til ${dateRange.endDate}`,
      filename: `salgsrapport_${period}_${Date.now()}`,
      data,
      columns,
      summary,
      showChart: true,
      chartData,
    };

    if (format === 'pdf') {
      exportToPDFEnhanced(options);
      toast.success("PDF-rapport lastet ned!");
    } else {
      exportToExcelEnhanced(options);
      toast.success("Excel-rapport lastet ned!");
    }
  };

  // ============================================================================
  // 2. APPOINTMENTS REPORT
  // ============================================================================
  const handleExportAppointmentsReport = (format: 'pdf' | 'excel') => {
    const filteredAppointments = appointmentsData.filter((apt: any) => {
      const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
      return aptDate >= dateRange.startDate && aptDate <= dateRange.endDate;
    });

    const data = filteredAppointments.map((apt: any) => ({
      date: new Date(apt.appointmentDate),
      time: apt.startTime,
      customer: apt.customerName || "Ukjent",
      service: apt.serviceName || "Diverse",
      employee: apt.employeeName || "Ansatt",
      status: getStatusText(apt.status),
      duration: apt.durationMinutes || 0,
    }));

    const columns = [
      { header: "Dato", key: "date", type: "date" as const },
      { header: "Tid", key: "time", type: "text" as const },
      { header: "Kunde", key: "customer", type: "text" as const },
      { header: "Tjeneste", key: "service", type: "text" as const },
      { header: "Ansatt", key: "employee", type: "text" as const },
      { header: "Status", key: "status", type: "text" as const },
      { header: "Varighet (min)", key: "duration", type: "number" as const },
    ];

    const totalAppointments = data.length;
    const completedAppointments = filteredAppointments.filter((a: any) => a.status === "completed").length;
    const canceledAppointments = filteredAppointments.filter((a: any) => a.status === "canceled").length;
    const completionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

    const summary = [
      { label: "Totalt antall avtaler", value: totalAppointments, type: "number" as const },
      { label: "Fullførte avtaler", value: completedAppointments, type: "number" as const },
      { label: "Avbestilte avtaler", value: canceledAppointments, type: "number" as const },
      { label: "Fullføringsrate", value: `${completionRate.toFixed(1)}%`, type: "text" as const },
    ];

    const options = {
      title: "Avtale-rapport",
      subtitle: `Periode: ${dateRange.startDate} til ${dateRange.endDate}`,
      filename: `avtaler_${period}_${Date.now()}`,
      data,
      columns,
      summary,
    };

    if (format === 'pdf') {
      exportToPDFEnhanced(options);
      toast.success("PDF-rapport lastet ned!");
    } else {
      exportToExcelEnhanced(options);
      toast.success("Excel-rapport lastet ned!");
    }
  };

  // ============================================================================
  // 3. CUSTOMER REPORT
  // ============================================================================
  const handleExportCustomersReport = (format: 'pdf' | 'excel') => {
    const data = customersData.map((customer: any) => {
      const customerOrders = ordersData.filter((o: any) => o.customerId === customer.id);
      const totalSpent = customerOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total || "0"), 0);
      const visitCount = customerOrders.length;
      const lastVisit = customerOrders.length > 0 
        ? new Date(Math.max(...customerOrders.map((o: any) => new Date(o.orderDate).getTime())))
        : null;

      return {
        name: `${customer.firstName} ${customer.lastName || ""}`.trim(),
        phone: customer.phone,
        email: customer.email || "Ikke oppgitt",
        visits: visitCount,
        totalSpent,
        avgSpent: visitCount > 0 ? totalSpent / visitCount : 0,
        lastVisit,
        loyaltyPoints: customer.loyaltyPoints || 0,
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);

    const columns = [
      { header: "Navn", key: "name", type: "text" as const },
      { header: "Telefon", key: "phone", type: "text" as const },
      { header: "E-post", key: "email", type: "text" as const },
      { header: "Antall besøk", key: "visits", type: "number" as const },
      { header: "Total brukt", key: "totalSpent", type: "currency" as const },
      { header: "Gjennomsnitt", key: "avgSpent", type: "currency" as const },
      { header: "Siste besøk", key: "lastVisit", type: "date" as const },
      { header: "Lojalitetspoeng", key: "loyaltyPoints", type: "number" as const },
    ];

    const totalCustomers = data.length;
    const activeCustomers = data.filter(c => c.visits > 0).length;
    const totalRevenue = data.reduce((sum, c) => sum + c.totalSpent, 0);
    const avgCustomerValue = activeCustomers > 0 ? totalRevenue / activeCustomers : 0;

    const summary = [
      { label: "Totalt antall kunder", value: totalCustomers, type: "number" as const },
      { label: "Aktive kunder", value: activeCustomers, type: "number" as const },
      { label: "Total omsetning", value: totalRevenue, type: "currency" as const },
      { label: "Gjennomsnittlig kundeverdi", value: avgCustomerValue, type: "currency" as const },
    ];

    const chartData = data.slice(0, 10).map(c => ({
      label: c.name,
      value: c.totalSpent,
    }));

    const options = {
      title: "Kunderapport",
      subtitle: `Generert: ${new Date().toLocaleDateString('no-NO')}`,
      filename: `kunder_${Date.now()}`,
      data,
      columns,
      summary,
      showChart: true,
      chartData,
    };

    if (format === 'pdf') {
      exportToPDFEnhanced(options);
      toast.success("PDF-rapport lastet ned!");
    } else {
      exportToExcelEnhanced(options);
      toast.success("Excel-rapport lastet ned!");
    }
  };

  // ============================================================================
  // 4. EMPLOYEE PERFORMANCE REPORT
  // ============================================================================
  const handleExportEmployeeReport = (format: 'pdf' | 'excel') => {
    const data = employeesData.map((employee: any) => {
      const empOrders = ordersData.filter((o: any) => o.employeeId === employee.id);
      const empAppointments = appointmentsData.filter((a: any) => a.employeeId === employee.id);
      
      const totalRevenue = empOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total || "0"), 0);
      const orderCount = empOrders.length;
      const appointmentCount = empAppointments.length;
      const completedAppointments = empAppointments.filter((a: any) => a.status === "completed").length;
      const completionRate = appointmentCount > 0 ? (completedAppointments / appointmentCount) * 100 : 0;

      return {
        name: employee.name,
        email: employee.email || "Ikke oppgitt",
        phone: employee.phone || "Ikke oppgitt",
        orders: orderCount,
        appointments: appointmentCount,
        completed: completedAppointments,
        completionRate,
        revenue: totalRevenue,
        avgOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const columns = [
      { header: "Navn", key: "name", type: "text" as const },
      { header: "E-post", key: "email", type: "text" as const },
      { header: "Telefon", key: "phone", type: "text" as const },
      { header: "Ordre", key: "orders", type: "number" as const },
      { header: "Avtaler", key: "appointments", type: "number" as const },
      { header: "Fullført", key: "completed", type: "number" as const },
      { header: "Fullføringsrate %", key: "completionRate", type: "number" as const },
      { header: "Omsetning", key: "revenue", type: "currency" as const },
      { header: "Gj.snitt ordre", key: "avgOrderValue", type: "currency" as const },
    ];

    const totalRevenue = data.reduce((sum, e) => sum + e.revenue, 0);
    const totalOrders = data.reduce((sum, e) => sum + e.orders, 0);
    const totalAppointments = data.reduce((sum, e) => sum + e.appointments, 0);

    const summary = [
      { label: "Totalt antall ansatte", value: data.length, type: "number" as const },
      { label: "Total omsetning", value: totalRevenue, type: "currency" as const },
      { label: "Totalt antall ordre", value: totalOrders, type: "number" as const },
      { label: "Totalt antall avtaler", value: totalAppointments, type: "number" as const },
    ];

    const chartData = data.map(e => ({
      label: e.name,
      value: e.revenue,
    }));

    const options = {
      title: "Ansatt-ytelsesrapport",
      subtitle: `Periode: ${dateRange.startDate} til ${dateRange.endDate}`,
      filename: `ansatte_${period}_${Date.now()}`,
      data,
      columns,
      summary,
      showChart: true,
      chartData,
    };

    if (format === 'pdf') {
      exportToPDFEnhanced(options);
      toast.success("PDF-rapport lastet ned!");
    } else {
      exportToExcelEnhanced(options);
      toast.success("Excel-rapport lastet ned!");
    }
  };

  // ============================================================================
  // 5. SERVICES REPORT
  // ============================================================================
  const handleExportServicesReport = (format: 'pdf' | 'excel') => {
    const data = servicesData.map((service: any) => {
      const serviceOrders = ordersData.filter((o: any) => o.serviceId === service.id);
      const serviceAppointments = appointmentsData.filter((a: any) => a.serviceId === service.id);
      
      const totalRevenue = serviceOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total || "0"), 0);
      const bookingCount = serviceAppointments.length;

      return {
        name: service.name,
        description: service.description || "Ingen beskrivelse",
        price: parseFloat(service.price || "0"),
        duration: service.durationMinutes || 0,
        bookings: bookingCount,
        revenue: totalRevenue,
        avgRevenue: bookingCount > 0 ? totalRevenue / bookingCount : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const columns = [
      { header: "Tjeneste", key: "name", type: "text" as const },
      { header: "Beskrivelse", key: "description", type: "text" as const },
      { header: "Pris", key: "price", type: "currency" as const },
      { header: "Varighet (min)", key: "duration", type: "number" as const },
      { header: "Antall bookinger", key: "bookings", type: "number" as const },
      { header: "Total omsetning", key: "revenue", type: "currency" as const },
      { header: "Gj.snitt omsetning", key: "avgRevenue", type: "currency" as const },
    ];

    const totalRevenue = data.reduce((sum, s) => sum + s.revenue, 0);
    const totalBookings = data.reduce((sum, s) => sum + s.bookings, 0);

    const summary = [
      { label: "Totalt antall tjenester", value: data.length, type: "number" as const },
      { label: "Total omsetning", value: totalRevenue, type: "currency" as const },
      { label: "Totalt antall bookinger", value: totalBookings, type: "number" as const },
    ];

    const chartData = data.slice(0, 10).map(s => ({
      label: s.name,
      value: s.revenue,
    }));

    const options = {
      title: "Tjeneste-rapport",
      subtitle: `Periode: ${dateRange.startDate} til ${dateRange.endDate}`,
      filename: `tjenester_${period}_${Date.now()}`,
      data,
      columns,
      summary,
      showChart: true,
      chartData,
    };

    if (format === 'pdf') {
      exportToPDFEnhanced(options);
      toast.success("PDF-rapport lastet ned!");
    } else {
      exportToExcelEnhanced(options);
      toast.success("Excel-rapport lastet ned!");
    }
  };

  // Helper function
  function getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      pending: "Venter",
      confirmed: "Bekreftet",
      completed: "Fullført",
      canceled: "Avbestilt",
      no_show: "Møtte ikke",
    };
    return statusMap[status] || status;
  }

  // ============================================================================
  // UI RENDER
  // ============================================================================
  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent mb-2">
            Omfattende rapporter
          </h1>
          <p className="text-muted-foreground">
            Last ned detaljerte rapporter med fullstendige data og totaler
          </p>
        </div>

        {/* Period Selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Velg periode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">I dag</SelectItem>
                  <SelectItem value="week">Siste 7 dager</SelectItem>
                  <SelectItem value="month">Siste 30 dager</SelectItem>
                  <SelectItem value="quarter">Siste 90 dager</SelectItem>
                  <SelectItem value="year">Siste år</SelectItem>
                </SelectContent>
              </Select>
              
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Fra dato</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Til dato</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Sales Report */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Salgsrapport</CardTitle>
                  <CardDescription>Detaljert salgsdata</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                Omfattende oversikt over alle salg med totaler og analyse
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleExportSalesReport('pdf')}
                  variant="outline" 
                  className="flex-1"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button 
                  onClick={() => handleExportSalesReport('excel')}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Appointments Report */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Avtale-rapport</CardTitle>
                  <CardDescription>Oversikt over avtaler</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                Fullstendig oversikt over alle avtaler med status og statistikk
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleExportAppointmentsReport('pdf')}
                  variant="outline" 
                  className="flex-1"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button 
                  onClick={() => handleExportAppointmentsReport('excel')}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Customer Report */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle>Kunderapport</CardTitle>
                  <CardDescription>Kundeanalyse</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                Detaljert kundeinformasjon med besøkshistorikk og verdier
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleExportCustomersReport('pdf')}
                  variant="outline" 
                  className="flex-1"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button 
                  onClick={() => handleExportCustomersReport('excel')}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Employee Report */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>Ansatt-rapport</CardTitle>
                  <CardDescription>Ytelsesanalyse</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                Omfattende ytelsesdata for alle ansatte med KPIer
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleExportEmployeeReport('pdf')}
                  variant="outline" 
                  className="flex-1"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button 
                  onClick={() => handleExportEmployeeReport('excel')}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Services Report */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-pink-100 rounded-lg">
                  <ShoppingBag className="h-6 w-6 text-pink-600" />
                </div>
                <div>
                  <CardTitle>Tjeneste-rapport</CardTitle>
                  <CardDescription>Tjenesteanalyse</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground mb-4">
                Detaljert oversikt over alle tjenester med popularitet og inntekter
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleExportServicesReport('pdf')}
                  variant="outline" 
                  className="flex-1"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button 
                  onClick={() => handleExportServicesReport('excel')}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Box */}
        <Card className="mt-6 bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <BarChart3 className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Omfattende rapporter</h3>
                <p className="text-sm text-blue-700">
                  Alle rapporter inkluderer detaljerte data, totaler, gjennomsnitt og grafiske fremstillinger. 
                  Excel-filer inneholder formaterte data med formler, mens PDF-filer har profesjonell layout med diagrammer.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
