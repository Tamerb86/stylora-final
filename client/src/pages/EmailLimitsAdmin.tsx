/**
 * Email Limits Administration Page
 * 
 * Admin interface to manage email quotas and subscription plans for all tenants
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { 
  Mail, 
  Settings, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  Edit,
  DollarSign,
  Users
} from "lucide-react";
import { toast } from "sonner";

export default function EmailLimitsAdmin() {
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [customLimit, setCustomLimit] = useState("");
  const [customRate, setCustomRate] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");

  // Queries
  const { data: tenantsUsage, refetch: refetchUsage } = trpc.emailLimits.getAllTenantsUsage.useQuery();
  const { data: plans } = trpc.emailLimits.getPlans.useQuery();

  // Mutations
  const updatePlanMutation = trpc.emailLimits.updateTenantPlan.useMutation();
  const updateCustomLimitMutation = trpc.emailLimits.updateCustomLimit.useMutation();

  const handleUpdatePlan = async (tenantId: string, planName: string) => {
    try {
      await updatePlanMutation.mutateAsync({ tenantId, planName });
      toast.success("Abonnementsplan oppdatert");
      refetchUsage();
    } catch (error) {
      toast.error(`Kunne ikke oppdatere plan: ${error instanceof Error ? error.message : "Ukjent feil"}`);
    }
  };

  const handleUpdateCustomLimit = async () => {
    if (!selectedTenant || !customLimit || !customRate) {
      toast.error("Vennligst fyll inn alle felt");
      return;
    }

    try {
      await updateCustomLimitMutation.mutateAsync({
        tenantId: selectedTenant,
        emailMonthlyLimit: parseInt(customLimit),
        emailOverageRate: parseFloat(customRate),
      });
      toast.success("Egendefinert grense oppdatert");
      setEditDialogOpen(false);
      refetchUsage();
    } catch (error) {
      toast.error(`Kunne ikke oppdatere: ${error instanceof Error ? error.message : "Ukjent feil"}`);
    }
  };

  const getUsageColor = (percentUsed: number) => {
    if (percentUsed >= 100) return "text-red-600 dark:text-red-400";
    if (percentUsed >= 80) return "text-orange-600 dark:text-orange-400";
    if (percentUsed >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  const getUsageBadge = (percentUsed: number) => {
    if (percentUsed >= 100) return <Badge variant="destructive">Over grense</Badge>;
    if (percentUsed >= 80) return <Badge variant="outline" className="border-orange-500 text-orange-600">Høy bruk</Badge>;
    return <Badge variant="outline" className="border-green-500 text-green-600">Normal</Badge>;
  };

  // Calculate totals
  const totalTenants = tenantsUsage?.length || 0;
  const totalEmailsSent = tenantsUsage?.reduce((sum, t) => sum + (t.emailsSentThisMonth || 0), 0) || 0;
  const totalOverageCharges = tenantsUsage?.reduce((sum, t) => sum + t.emailOverageCharge, 0) || 0;
  const tenantsOverLimit = tenantsUsage?.filter(t => t.percentUsed >= 100).length || 0;

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">E-postgrenser administrasjon</h1>
        <p className="text-muted-foreground">
          Administrer e-postkvoter og abonnementsplaner for alle salonger
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Totalt salonger
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTenants}</div>
            <p className="text-xs text-muted-foreground">
              Aktive salonger
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              E-poster sendt
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmailsSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Denne måneden
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Over grense
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenantsOverLimit}</div>
            <p className="text-xs text-muted-foreground">
              Salonger over kvote
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Overskridelseskostnader
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOverageCharges.toFixed(2)} kr</div>
            <p className="text-xs text-muted-foreground">
              Denne måneden
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>Salonger og e-postbruk</CardTitle>
          <CardDescription>
            Oversikt over alle salonger og deres e-postforbruk
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Salong</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Bruk</TableHead>
                <TableHead>Prosent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Overskridelse</TableHead>
                <TableHead className="text-right">Handlinger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenantsUsage?.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {tenant.subscriptionPlan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={getUsageColor(tenant.percentUsed)}>
                      {tenant.emailsSentThisMonth || 0} / {tenant.emailMonthlyLimit}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(tenant.percentUsed, 100)} className="w-20" />
                      <span className="text-sm text-muted-foreground">
                        {tenant.percentUsed}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getUsageBadge(tenant.percentUsed)}
                  </TableCell>
                  <TableCell>
                    {tenant.emailOverageCharge > 0 ? (
                      <span className="text-orange-600 dark:text-orange-400 font-medium">
                        {tenant.emailOverageCharge.toFixed(2)} kr
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Select
                        value={tenant.subscriptionPlan || "basic"}
                        onValueChange={(value) => handleUpdatePlan(tenant.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {plans?.map((plan) => (
                            <SelectItem key={plan.planName} value={plan.planName}>
                              {plan.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Dialog open={editDialogOpen && selectedTenant === tenant.id} onOpenChange={setEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedTenant(tenant.id);
                              setCustomLimit(tenant.emailMonthlyLimit?.toString() || "");
                              setCustomRate("0.10");
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Egendefinert grense</DialogTitle>
                            <DialogDescription>
                              Sett en egendefinert e-postgrense for {tenant.name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="customLimit">Månedlig grense</Label>
                              <Input
                                id="customLimit"
                                type="number"
                                value={customLimit}
                                onChange={(e) => setCustomLimit(e.target.value)}
                                placeholder="f.eks. 1000"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="customRate">Overskridelsespris (kr/e-post)</Label>
                              <Input
                                id="customRate"
                                type="number"
                                step="0.01"
                                value={customRate}
                                onChange={(e) => setCustomRate(e.target.value)}
                                placeholder="f.eks. 0.10"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                              Avbryt
                            </Button>
                            <Button onClick={handleUpdateCustomLimit}>
                              Lagre
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Abonnementsplaner</CardTitle>
          <CardDescription>
            Tilgjengelige planer og deres grenser
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {plans?.map((plan) => (
              <Card key={plan.planName} className="border-2">
                <CardHeader>
                  <CardTitle className="capitalize">{plan.displayName}</CardTitle>
                  <CardDescription>
                    {plan.monthlyPrice.toFixed(0)} kr/måned
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">E-poster/måned</span>
                    <span className="font-medium">{plan.emailMonthlyLimit.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Overskridelsespris</span>
                    <span className="font-medium">{plan.emailOverageRate.toFixed(2)} kr</span>
                  </div>
                  {plan.features && typeof plan.features === 'object' && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Funksjoner:</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(plan.features as Record<string, boolean>).map(([key, value]) => 
                          value && (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {key.replace(/_/g, ' ')}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
