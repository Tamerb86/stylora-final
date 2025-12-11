import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Award,
  Settings,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

/**
 * Commission Management Component
 * Complete UI for managing employee commissions
 */

export default function CommissionManagement() {
  const [activeTab, setActiveTab] = useState("oversikt");
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod());
  const [selectedEmployee, setSelectedEmployee] = useState<number | undefined>();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Provisjonsstyring</h1>
          <p className="text-muted-foreground">
            Automatisk beregning og administrasjon av provisjoner
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Eksporter Rapport
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="oversikt">
            <TrendingUp className="w-4 h-4 mr-2" />
            Oversikt
          </TabsTrigger>
          <TabsTrigger value="beregninger">
            <DollarSign className="w-4 h-4 mr-2" />
            Beregninger
          </TabsTrigger>
          <TabsTrigger value="utbetalinger">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Utbetalinger
          </TabsTrigger>
          <TabsTrigger value="regler">
            <Settings className="w-4 h-4 mr-2" />
            Regler
          </TabsTrigger>
          <TabsTrigger value="mål">
            <Target className="w-4 h-4 mr-2" />
            Mål
          </TabsTrigger>
          <TabsTrigger value="rapporter">
            <FileText className="w-4 h-4 mr-2" />
            Rapporter
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="oversikt">
          <OverviewTab period={selectedPeriod} employeeId={selectedEmployee} />
        </TabsContent>

        {/* Calculations Tab */}
        <TabsContent value="beregninger">
          <CalculationsTab period={selectedPeriod} employeeId={selectedEmployee} />
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="utbetalinger">
          <PaymentsTab period={selectedPeriod} employeeId={selectedEmployee} />
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="regler">
          <RulesTab />
        </TabsContent>

        {/* Targets Tab */}
        <TabsContent value="mål">
          <TargetsTab />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="rapporter">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab({ period, employeeId }: { period: string; employeeId?: number }) {
  const { data: summary } = trpc.commission.getCommissionSummary.useQuery({
    paymentPeriod: period,
    employeeId,
  });

  const { data: calculations } = trpc.commission.getCommissionCalculations.useQuery({
    paymentPeriod: period,
    employeeId,
    status: "pending",
  });

  const stats = [
    {
      title: "Totalt Salg",
      value: `${summary?.totalSales?.toFixed(2) || "0.00"} kr`,
      icon: DollarSign,
      color: "text-blue-600",
    },
    {
      title: "Total Provisjon",
      value: `${summary?.totalCommission?.toFixed(2) || "0.00"} kr`,
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      title: "Antall Transaksjoner",
      value: summary?.count || 0,
      icon: Calendar,
      color: "text-purple-600",
    },
    {
      title: "Venter Godkjenning",
      value: calculations?.length || 0,
      icon: Clock,
      color: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Calculations */}
      <Card>
        <CardHeader>
          <CardTitle>Siste Beregninger</CardTitle>
        </CardHeader>
        <CardContent>
          {calculations && calculations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dato</TableHead>
                  <TableHead>Ansatt</TableHead>
                  <TableHead>Salg</TableHead>
                  <TableHead>Provisjon</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculations.slice(0, 10).map((calc) => (
                  <TableRow key={calc.id}>
                    <TableCell>{format(new Date(calc.saleDate), "dd.MM.yyyy")}</TableCell>
                    <TableCell>Ansatt #{calc.employeeId}</TableCell>
                    <TableCell>{parseFloat(calc.saleAmount.toString()).toFixed(2)} kr</TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {parseFloat(calc.commissionAmount.toString()).toFixed(2)} kr
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={calc.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Ingen beregninger for denne perioden
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// CALCULATIONS TAB
// ============================================================================

function CalculationsTab({ period, employeeId }: { period: string; employeeId?: number }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: calculations, refetch } = trpc.commission.getCommissionCalculations.useQuery({
    paymentPeriod: period,
    employeeId,
    status: statusFilter === "all" ? undefined : statusFilter as any,
  });

  const approveMutation = trpc.commission.approveCommissions.useMutation({
    onSuccess: () => {
      toast.success("Provisjoner godkjent");
      refetch();
    },
  });

  const handleApprove = () => {
    approveMutation.mutate({
      paymentPeriod: period,
      employeeId,
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  <SelectItem value="pending">Venter</SelectItem>
                  <SelectItem value="approved">Godkjent</SelectItem>
                  <SelectItem value="paid">Betalt</SelectItem>
                  <SelectItem value="cancelled">Kansellert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleApprove} disabled={approveMutation.isLoading}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Godkjenn Alle Ventende
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calculations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Provisjonsberegninger</CardTitle>
        </CardHeader>
        <CardContent>
          {calculations && calculations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Dato</TableHead>
                  <TableHead>Ansatt</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Salg</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Provisjon</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculations.map((calc) => (
                  <TableRow key={calc.id}>
                    <TableCell className="font-mono text-sm">#{calc.id}</TableCell>
                    <TableCell>{format(new Date(calc.saleDate), "dd.MM.yyyy")}</TableCell>
                    <TableCell>Ansatt #{calc.employeeId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{calc.sourceType}</Badge>
                    </TableCell>
                    <TableCell>{parseFloat(calc.saleAmount.toString()).toFixed(2)} kr</TableCell>
                    <TableCell>
                      {calc.commissionRate ? `${calc.commissionRate}%` : "-"}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {parseFloat(calc.commissionAmount.toString()).toFixed(2)} kr
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={calc.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Ingen beregninger funnet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// PAYMENTS TAB
// ============================================================================

function PaymentsTab({ period, employeeId }: { period: string; employeeId?: number }) {
  const { data: payments } = trpc.commission.getCommissionPayments.useQuery({
    paymentPeriod: period,
    employeeId,
  });

  const createPaymentMutation = trpc.commission.createCommissionPayment.useMutation({
    onSuccess: () => {
      toast.success("Utbetaling opprettet");
    },
  });

  return (
    <div className="space-y-4">
      {/* Create Payment Button */}
      <Card>
        <CardContent className="pt-6">
          <Button onClick={() => {
            // Open create payment dialog
            toast.info("Opprett utbetaling dialog");
          }}>
            <DollarSign className="w-4 h-4 mr-2" />
            Opprett Utbetaling
          </Button>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Utbetalinger</CardTitle>
        </CardHeader>
        <CardContent>
          {payments && payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nummer</TableHead>
                  <TableHead>Ansatt</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Totalt Salg</TableHead>
                  <TableHead>Provisjon</TableHead>
                  <TableHead>Fradrag</TableHead>
                  <TableHead>Netto</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono">{payment.paymentNumber}</TableCell>
                    <TableCell>Ansatt #{payment.employeeId}</TableCell>
                    <TableCell>{payment.paymentPeriod}</TableCell>
                    <TableCell>{parseFloat(payment.totalSales.toString()).toFixed(2)} kr</TableCell>
                    <TableCell>{parseFloat(payment.totalCommission.toString()).toFixed(2)} kr</TableCell>
                    <TableCell className="text-red-600">
                      -{parseFloat(payment.deductions.toString()).toFixed(2)} kr
                    </TableCell>
                    <TableCell className="font-bold text-green-600">
                      {parseFloat(payment.netPayment.toString()).toFixed(2)} kr
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={payment.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Ingen utbetalinger funnet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// RULES TAB
// ============================================================================

function RulesTab() {
  const { data: rules } = trpc.commission.getCommissionRules.useQuery({});

  return (
    <div className="space-y-4">
      {/* Create Rule Button */}
      <Card>
        <CardContent className="pt-6">
          <Button>
            <Settings className="w-4 h-4 mr-2" />
            Opprett Ny Regel
          </Button>
        </CardContent>
      </Card>

      {/* Rules List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules?.map((rule) => (
          <Card key={rule.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{rule.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {rule.description}
                  </p>
                </div>
                <Badge variant={rule.isActive ? "default" : "secondary"}>
                  {rule.isActive ? "Aktiv" : "Inaktiv"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{rule.ruleType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gjelder:</span>
                  <span className="font-medium">{rule.appliesTo}</span>
                </div>
                {rule.commissionRate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rate:</span>
                    <span className="font-medium">{rule.commissionRate}%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prioritet:</span>
                  <span className="font-medium">{rule.priority}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// TARGETS TAB
// ============================================================================

function TargetsTab() {
  const { data: targets } = trpc.commission.getCommissionTargets.useQuery({});

  return (
    <div className="space-y-4">
      {/* Create Target Button */}
      <Card>
        <CardContent className="pt-6">
          <Button>
            <Target className="w-4 h-4 mr-2" />
            Opprett Nytt Mål
          </Button>
        </CardContent>
      </Card>

      {/* Targets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {targets?.map((target) => (
          <Card key={target.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{target.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {target.description}
                  </p>
                </div>
                <Badge variant={target.isActive ? "default" : "secondary"}>
                  {target.isActive ? "Aktiv" : "Inaktiv"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Periode:</span>
                  <span className="font-medium">{target.periodType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Målverdi:</span>
                  <span className="font-medium">{target.targetValue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bonus Type:</span>
                  <span className="font-medium">{target.bonusType}</span>
                </div>
                {target.bonusAmount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bonus:</span>
                    <span className="font-medium text-green-600">
                      {target.bonusAmount} kr
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// REPORTS TAB
// ============================================================================

function ReportsTab() {
  const [reportType, setReportType] = useState("employee_summary");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  return (
    <div className="space-y-4">
      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Generer Rapport</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Rapport Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee_summary">Ansatt Sammendrag</SelectItem>
                  <SelectItem value="period_summary">Periode Sammendrag</SelectItem>
                  <SelectItem value="detailed">Detaljert Rapport</SelectItem>
                  <SelectItem value="comparison">Sammenligning</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fra Dato</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Til Dato</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button>
              <FileText className="w-4 h-4 mr-2" />
              Generer Rapport
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Eksporter til Excel
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Eksporter til PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Rapport Forhåndsvisning</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Velg parametere og klikk "Generer Rapport" for å se resultater
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: any; label: string; icon: any }> = {
    pending: { variant: "secondary", label: "Venter", icon: Clock },
    approved: { variant: "default", label: "Godkjent", icon: CheckCircle2 },
    paid: { variant: "default", label: "Betalt", icon: CheckCircle2 },
    cancelled: { variant: "destructive", label: "Kansellert", icon: XCircle },
    draft: { variant: "outline", label: "Utkast", icon: FileText },
  };

  const config = variants[status] || variants.pending;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
