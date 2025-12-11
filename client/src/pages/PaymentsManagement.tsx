import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCcw,
  Download,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

export default function PaymentsManagement() {
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  
  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"all" | "cash" | "card" | "vipps" | "stripe">("all");
  const [status, setStatus] = useState<"all" | "pending" | "completed" | "failed" | "refunded">("all");

  // Fetch payments
  const { data: payments, isLoading, refetch } = trpc.payments.list.useQuery({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    paymentMethod,
    status,
    limit: 50,
    offset: 0,
  });

  // Fetch statistics
  const { data: stats } = trpc.payments.getStats.useQuery({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Fullført
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Venter
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Mislyktes
          </Badge>
        );
      case "refunded":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <RefreshCcw className="h-3 w-3 mr-1" />
            Refundert
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    const colors = {
      cash: "bg-green-100 text-green-800",
      card: "bg-blue-100 text-blue-800",
      vipps: "bg-orange-100 text-orange-800",
      stripe: "bg-purple-100 text-purple-800",
    };

    const labels = {
      cash: "Kontant",
      card: "Kort",
      vipps: "Vipps",
      stripe: "Stripe",
    };

    return (
      <Badge variant="outline" className={colors[method as keyof typeof colors] || ""}>
        {labels[method as keyof typeof labels] || method}
      </Badge>
    );
  };

  const handleViewDetails = (payment: any) => {
    setSelectedPayment(payment);
    setIsDetailsOpen(true);
  };

  const handleExportCSV = () => {
    if (!payments || payments.length === 0) {
      return;
    }

    const headers = ["Dato", "Kunde", "Beløp", "Metode", "Status", "Transaksjons-ID"];
    const rows = payments.map(p => [
      format(new Date(p.createdAt), "dd.MM.yyyy HH:mm", { locale: nb }),
      p.customerName || "-",
      `${p.amount} ${p.currency}`,
      p.paymentMethod,
      p.status,
      p.gatewayPaymentId || "-",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `betalinger_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Betalinger</h1>
            <p className="text-gray-600">Administrer og overvåk alle betalingstransaksjoner</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Oppdater
            </Button>
            <Button variant="outline" onClick={handleExportCSV} disabled={!payments || payments.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Eksporter CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Totalt beløp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {stats?.totalAmount.toFixed(2) || "0.00"} kr
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {stats?.totalCount || 0} transaksjoner
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Fullført
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {stats?.byStatus.completed || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                Venter
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">
                {stats?.byStatus.pending || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Mislyktes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">
                {stats?.byStatus.failed || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Method Breakdown */}
        {stats && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Betalingsmetoder</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Kontant</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.byMethod.cash.toFixed(0)} kr
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Kort</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.byMethod.card.toFixed(0)} kr
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Vipps</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.byMethod.vipps.toFixed(0)} kr
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Stripe</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {stats.byMethod.stripe.toFixed(0)} kr
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filtrer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="dateFrom">Fra dato</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="dateTo">Til dato</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="method">Betalingsmetode</Label>
                <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="cash">Kontant</SelectItem>
                    <SelectItem value="card">Kort</SelectItem>
                    <SelectItem value="vipps">Vipps</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="pending">Venter</SelectItem>
                    <SelectItem value="completed">Fullført</SelectItem>
                    <SelectItem value="failed">Mislyktes</SelectItem>
                    <SelectItem value="refunded">Refundert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Transaksjoner</CardTitle>
            <CardDescription>
              Viser {payments?.length || 0} transaksjoner
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Laster...</p>
              </div>
            ) : payments && payments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dato</TableHead>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Beløp</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transaksjons-ID</TableHead>
                    <TableHead className="text-right">Handlinger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.createdAt), "dd.MM.yyyy HH:mm", { locale: nb })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {payment.customerName || "-"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {payment.amount} {payment.currency}
                      </TableCell>
                      <TableCell>{getPaymentMethodBadge(payment.paymentMethod)}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell className="font-mono text-sm text-gray-600">
                        {payment.gatewayPaymentId || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(payment)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">Ingen betalinger funnet</p>
                <p className="text-gray-400 text-sm">
                  Prøv å justere filtrene eller datoområdet
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Betalingsdetaljer</DialogTitle>
              <DialogDescription>
                Fullstendig informasjon om transaksjonen
              </DialogDescription>
            </DialogHeader>

            {selectedPayment && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Betalings-ID</Label>
                    <p className="font-mono text-sm">{selectedPayment.id}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedPayment.status)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Beløp</Label>
                    <p className="text-lg font-semibold">
                      {selectedPayment.amount} {selectedPayment.currency}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Betalingsmetode</Label>
                    <div className="mt-1">{getPaymentMethodBadge(selectedPayment.paymentMethod)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-600">Opprettet</Label>
                    <p className="text-sm">
                      {format(new Date(selectedPayment.createdAt), "dd.MM.yyyy HH:mm:ss", { locale: nb })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-600">Behandlet</Label>
                    <p className="text-sm">
                      {selectedPayment.processedAt
                        ? format(new Date(selectedPayment.processedAt), "dd.MM.yyyy HH:mm:ss", { locale: nb })
                        : "-"}
                    </p>
                  </div>
                </div>

                {selectedPayment.gatewayPaymentId && (
                  <div>
                    <Label className="text-sm text-gray-600">Transaksjons-ID</Label>
                    <p className="font-mono text-sm break-all">{selectedPayment.gatewayPaymentId}</p>
                  </div>
                )}

                {selectedPayment.lastFour && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">Kortnummer (siste 4)</Label>
                      <p className="font-mono text-sm">**** {selectedPayment.lastFour}</p>
                    </div>
                    {selectedPayment.cardBrand && (
                      <div>
                        <Label className="text-sm text-gray-600">Korttype</Label>
                        <p className="text-sm capitalize">{selectedPayment.cardBrand}</p>
                      </div>
                    )}
                  </div>
                )}

                {selectedPayment.errorMessage && (
                  <div>
                    <Label className="text-sm text-red-600">Feilmelding</Label>
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded mt-1">
                      {selectedPayment.errorMessage}
                    </p>
                  </div>
                )}

                {selectedPayment.orderId && (
                  <div>
                    <Label className="text-sm text-gray-600">Ordre-ID</Label>
                    <p className="text-sm">{selectedPayment.orderId}</p>
                  </div>
                )}

                {selectedPayment.appointmentId && (
                  <div>
                    <Label className="text-sm text-gray-600">Avtale-ID</Label>
                    <p className="text-sm">{selectedPayment.appointmentId}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
