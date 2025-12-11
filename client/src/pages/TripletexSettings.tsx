import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, AlertCircle, ExternalLink } from "lucide-react";

/**
 * Tripletex Settings Component
 * 
 * UI for managing Tripletex integration settings
 */

export default function TripletexSettings() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Form state
  const [consumerToken, setConsumerToken] = useState("");
  const [employeeToken, setEmployeeToken] = useState("");
  const [companyId, setCompanyId] = useState("0");
  const [organizationNumber, setOrganizationNumber] = useState("");
  const [environment, setEnvironment] = useState<"production" | "sandbox">("production");
  
  // Sync settings
  const [syncFrequency, setSyncFrequency] = useState<"manual" | "daily" | "weekly" | "monthly">("daily");
  const [syncTime, setSyncTime] = useState("23:00");
  const [autoSyncCustomers, setAutoSyncCustomers] = useState(true);
  const [autoSyncInvoices, setAutoSyncInvoices] = useState(true);
  const [autoSyncPayments, setAutoSyncPayments] = useState(true);

  // Accounting defaults
  const [defaultVatType, setDefaultVatType] = useState("3");
  const [defaultAccountCode, setDefaultAccountCode] = useState("3000");
  const [defaultPaymentTerms, setDefaultPaymentTerms] = useState(14);

  // Queries
  const { data: settings, refetch: refetchSettings } = trpc.tripletex.getSettings.useQuery();
  const { data: syncLogs } = trpc.tripletex.getSyncLogs.useQuery({ limit: 10 });
  const { data: unsyncedCustomers } = trpc.tripletex.getUnsyncedCustomers.useQuery();
  const { data: unsyncedOrders } = trpc.tripletex.getUnsyncedOrders.useQuery();

  // Mutations
  const updateSettings = trpc.tripletex.updateSettings.useMutation();
  const testConnection = trpc.tripletex.testConnection.useMutation();
  const manualSync = trpc.tripletex.manualSync.useMutation();

  // Load settings
  useEffect(() => {
    if (settings) {
      setIsEnabled(settings.isEnabled);
      setConsumerToken(settings.consumerToken);
      setEmployeeToken(settings.employeeToken);
      setCompanyId(settings.companyId || "0");
      setOrganizationNumber(settings.organizationNumber || "");
      setEnvironment(settings.environment as "production" | "sandbox");
      setSyncFrequency(settings.syncFrequency as any);
      setSyncTime(settings.syncTime || "23:00");
      setAutoSyncCustomers(settings.autoSyncCustomers);
      setAutoSyncInvoices(settings.autoSyncInvoices);
      setAutoSyncPayments(settings.autoSyncPayments);
      setDefaultVatType(settings.defaultVatType || "3");
      setDefaultAccountCode(settings.defaultAccountCode || "3000");
      setDefaultPaymentTerms(settings.defaultPaymentTerms || 14);
    }
  }, [settings]);

  // Save settings
  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync({
        consumerToken,
        employeeToken,
        companyId,
        organizationNumber,
        environment,
        isEnabled,
        syncFrequency,
        syncTime,
        autoSyncCustomers,
        autoSyncInvoices,
        autoSyncPayments,
        defaultVatType,
        defaultAccountCode,
        defaultPaymentTerms,
        baseUrl: "https://tripletex.no/v2",
        defaultCurrency: "NOK",
      });

      toast.success("Innstillinger lagret!");
      refetchSettings();
    } catch (error: any) {
      toast.error("Feil ved lagring: " + error.message);
    }
  };

  // Test connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      await testConnection.mutateAsync();
      toast.success("Tilkobling vellykket!");
    } catch (error: any) {
      toast.error("Tilkobling mislyktes: " + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  // Manual sync
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const result = await manualSync.mutateAsync();
      toast.success(
        `Synkronisering fullført! Kunder: ${result.customers.succeeded}/${result.customers.totalProcessed}, Fakturaer: ${result.orders.succeeded}/${result.orders.totalProcessed}`
      );
      refetchSettings();
    } catch (error: any) {
      toast.error("Synkronisering mislyktes: " + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tripletex Regnskap</h1>
          <p className="text-muted-foreground">
            Integrasjon med Tripletex regnskapssystem
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="enabled">Aktiver integrasjon</Label>
          <Switch
            id="enabled"
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Usynkroniserte kunder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unsyncedCustomers?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Usynkroniserte fakturaer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unsyncedOrders?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Siste synkronisering</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {settings?.lastSyncAt
                ? new Date(settings.lastSyncAt).toLocaleString("no-NO")
                : "Aldri"}
            </div>
            {settings?.lastSyncStatus && (
              <div className="flex items-center gap-1 mt-1">
                {settings.lastSyncStatus === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-xs capitalize">{settings.lastSyncStatus}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Settings Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Connection Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Tilkobling</CardTitle>
            <CardDescription>
              API-tilgang fra Tripletex
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="consumerToken">Consumer Token *</Label>
              <Input
                id="consumerToken"
                type="password"
                value={consumerToken}
                onChange={(e) => setConsumerToken(e.target.value)}
                placeholder="Fra Tripletex registrering"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeToken">Employee Token *</Label>
              <Input
                id="employeeToken"
                type="password"
                value={employeeToken}
                onChange={(e) => setEmployeeToken(e.target.value)}
                placeholder="Fra brukerinnstillinger"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyId">Company ID</Label>
              <Input
                id="companyId"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                placeholder="0 = nåværende selskap"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationNumber">Organisasjonsnummer</Label>
              <Input
                id="organizationNumber"
                value={organizationNumber}
                onChange={(e) => setOrganizationNumber(e.target.value)}
                placeholder="9 siffer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Miljø</Label>
              <select
                id="environment"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="sandbox">Sandbox (Test)</option>
                <option value="production">Production</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleTestConnection}
                disabled={isTesting || !consumerToken || !employeeToken}
                variant="outline"
                className="flex-1"
              >
                {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test tilkobling
              </Button>
              <Button
                onClick={handleSaveSettings}
                disabled={updateSettings.isPending}
                className="flex-1"
              >
                {updateSettings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lagre innstillinger
              </Button>
            </div>

            <div className="pt-2">
              <a
                href="https://tripletex.no"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                Gå til Tripletex
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Sync Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Synkronisering</CardTitle>
            <CardDescription>
              Automatisk synkronisering av data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="syncFrequency">Frekvens</Label>
              <select
                id="syncFrequency"
                value={syncFrequency}
                onChange={(e) => setSyncFrequency(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="manual">Manuell</option>
                <option value="daily">Daglig</option>
                <option value="weekly">Ukentlig</option>
                <option value="monthly">Månedlig</option>
              </select>
            </div>

            {syncFrequency !== "manual" && (
              <div className="space-y-2">
                <Label htmlFor="syncTime">Tidspunkt (HH:mm)</Label>
                <Input
                  id="syncTime"
                  type="time"
                  value={syncTime}
                  onChange={(e) => setSyncTime(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="autoSyncCustomers">Auto-synkroniser kunder</Label>
                <Switch
                  id="autoSyncCustomers"
                  checked={autoSyncCustomers}
                  onCheckedChange={setAutoSyncCustomers}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="autoSyncInvoices">Auto-synkroniser fakturaer</Label>
                <Switch
                  id="autoSyncInvoices"
                  checked={autoSyncInvoices}
                  onCheckedChange={setAutoSyncInvoices}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="autoSyncPayments">Auto-synkroniser betalinger</Label>
                <Switch
                  id="autoSyncPayments"
                  checked={autoSyncPayments}
                  onCheckedChange={setAutoSyncPayments}
                />
              </div>
            </div>

            <Button
              onClick={handleManualSync}
              disabled={isSyncing || !isEnabled}
              className="w-full"
              variant="default"
            >
              {isSyncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Start synkronisering
            </Button>
          </CardContent>
        </Card>

        {/* Accounting Defaults */}
        <Card>
          <CardHeader>
            <CardTitle>Regnskap</CardTitle>
            <CardDescription>
              Standard regnskapsinnstillinger
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultVatType">MVA-kode</Label>
              <select
                id="defaultVatType"
                value={defaultVatType}
                onChange={(e) => setDefaultVatType(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="0">0% (Ingen MVA)</option>
                <option value="1">15% (Redusert)</option>
                <option value="3">25% (Høy)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultAccountCode">Salgskonto</Label>
              <Input
                id="defaultAccountCode"
                value={defaultAccountCode}
                onChange={(e) => setDefaultAccountCode(e.target.value)}
                placeholder="3000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultPaymentTerms">Betalingsfrist (dager)</Label>
              <Input
                id="defaultPaymentTerms"
                type="number"
                value={defaultPaymentTerms}
                onChange={(e) => setDefaultPaymentTerms(parseInt(e.target.value))}
                placeholder="14"
              />
            </div>

            <Button
              onClick={handleSaveSettings}
              disabled={updateSettings.isPending}
              className="w-full"
              variant="outline"
            >
              Lagre innstillinger
            </Button>
          </CardContent>
        </Card>

        {/* Sync Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Logger</CardTitle>
            <CardDescription>
              Siste synkroniseringer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {syncLogs && syncLogs.length > 0 ? (
                syncLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
                  >
                    {log.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                    ) : log.status === "failed" ? (
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{log.operation}</div>
                      <div className="text-xs text-muted-foreground">{log.message}</div>
                      <div className="text-xs text-muted-foreground">
                        {log.recordsSucceeded}/{log.recordsProcessed} vellykket
                        {" • "}
                        {new Date(log.createdAt).toLocaleString("no-NO")}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Ingen logger ennå
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
