import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Settings, 
  Users, 
  FileText, 
  Activity,
  AlertCircle,
  Loader2,
  Building2,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";

export default function Sparebank1RegnskapSettings() {
  const [apiKey, setApiKey] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState(3600);

  // Queries
  const { data: settings, refetch: refetchSettings } = trpc.sparebank1Regnskap.getSettings.useQuery();
  const { data: statistics } = trpc.sparebank1Regnskap.getStatistics.useQuery();
  const { data: syncLogs } = trpc.sparebank1Regnskap.getSyncLogs.useQuery({ limit: 10 });
  const { data: lastSyncStatus } = trpc.sparebank1Regnskap.getLastSyncStatus.useQuery();
  const { data: customerMappings } = trpc.sparebank1Regnskap.getCustomerMappings.useQuery();
  const { data: invoiceMappings } = trpc.sparebank1Regnskap.getInvoiceMappings.useQuery();

  // Mutations
  const saveSettings = trpc.sparebank1Regnskap.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("Innstillinger lagret");
      refetchSettings();
    },
    onError: (error) => {
      toast.error(`Feil: ${error.message}`);
    },
  });

  const testConnection = trpc.sparebank1Regnskap.testConnection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
      refetchSettings();
    },
    onError: (error) => {
      toast.error(`Tilkoblingsfeil: ${error.message}`);
    },
  });

  const toggleActive = trpc.sparebank1Regnskap.toggleActive.useMutation({
    onSuccess: () => {
      toast.success("Status oppdatert");
      refetchSettings();
    },
  });

  const syncAllCustomers = trpc.sparebank1Regnskap.syncAllCustomers.useMutation({
    onSuccess: (data) => {
      toast.success(`Synkronisert: ${data.succeeded} vellykkede, ${data.failed} feilet`);
      refetchSettings();
    },
    onError: (error) => {
      toast.error(`Synkroniseringsfeil: ${error.message}`);
    },
  });

  const performFullSync = trpc.sparebank1Regnskap.performFullSync.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Full synkronisering fullført!\nKunder: ${data.customers.succeeded}/${data.customers.processed}\nFakturaer: ${data.invoices.succeeded}/${data.invoices.processed}`
      );
      refetchSettings();
    },
    onError: (error) => {
      toast.error(`Synkroniseringsfeil: ${error.message}`);
    },
  });

  // Load settings
  React.useEffect(() => {
    if (settings) {
      setCompanyId(settings.companyId || "");
      setBankAccountNumber(settings.bankAccountNumber || "");
      setAutoSync(settings.autoSync || false);
      setSyncInterval(settings.syncInterval || 3600);
    }
  }, [settings]);

  const handleSaveSettings = () => {
    saveSettings.mutate({
      apiKey,
      companyId,
      bankAccountNumber,
      autoSync,
      syncInterval,
    });
  };

  const handleTestConnection = () => {
    testConnection.mutate();
  };

  const handleToggleActive = () => {
    toggleActive.mutate({ isActive: !settings?.isActive });
  };

  const handleSyncAllCustomers = () => {
    syncAllCustomers.mutate();
  };

  const handleFullSync = () => {
    performFullSync.mutate();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-8 h-8 text-red-600" />
            <h1 className="text-3xl font-bold">Sparebank1 Regnskap Integrasjon</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Administrer integrasjon med Sparebank1 Regnskap (basert på Unimicro)
          </p>
        </div>
        {settings && (
          <Badge variant={settings.isActive ? "default" : "secondary"}>
            {settings.isActive ? "Aktiv" : "Inaktiv"}
          </Badge>
        )}
      </div>

      {/* Info Alert */}
      <Alert>
        <Building2 className="h-4 w-4" />
        <AlertDescription>
          Sparebank1 Regnskap er bygget på Unimicro-plattformen og tilbyr sømløs integrasjon med Sparebank1-tjenester.
        </AlertDescription>
      </Alert>

      {/* Status Alert */}
      {settings && !settings.isActive && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Sparebank1 Regnskap integrasjonen er deaktivert. Aktiver den for å starte synkronisering.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Innstillinger
          </TabsTrigger>
          <TabsTrigger value="customers">
            <Users className="w-4 h-4 mr-2" />
            Kunder
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <FileText className="w-4 h-4 mr-2" />
            Fakturaer
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Activity className="w-4 h-4 mr-2" />
            Logg
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Innstillinger</CardTitle>
              <CardDescription>
                Konfigurer tilkobling til Sparebank1 Regnskap
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Din Sparebank1 Regnskap API Key"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyId">Selskaps-ID</Label>
                <Input
                  id="companyId"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  placeholder="Ditt selskaps-ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankAccountNumber">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Sparebank1 Kontonummer (valgfritt)
                  </div>
                </Label>
                <Input
                  id="bankAccountNumber"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="1234.56.78901"
                />
                <p className="text-sm text-muted-foreground">
                  For automatisk bankavstemming
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Automatisk Synkronisering</Label>
                  <p className="text-sm text-muted-foreground">
                    Synkroniser data automatisk med jevne mellomrom
                  </p>
                </div>
                <Switch checked={autoSync} onCheckedChange={setAutoSync} />
              </div>

              {autoSync && (
                <div className="space-y-2">
                  <Label htmlFor="syncInterval">Synkroniseringsintervall (sekunder)</Label>
                  <Input
                    id="syncInterval"
                    type="number"
                    value={syncInterval}
                    onChange={(e) => setSyncInterval(parseInt(e.target.value))}
                    min={300}
                  />
                  <p className="text-sm text-muted-foreground">
                    Minimum: 300 sekunder (5 minutter)
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleSaveSettings}
                  disabled={saveSettings.isLoading}
                >
                  {saveSettings.isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Lagre Innstillinger
                </Button>

                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testConnection.isLoading || !apiKey || !companyId}
                >
                  {testConnection.isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Test Tilkobling
                </Button>

                {settings && (
                  <Button
                    variant={settings.isActive ? "destructive" : "default"}
                    onClick={handleToggleActive}
                  >
                    {settings.isActive ? "Deaktiver" : "Aktiver"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Statistics Card */}
          {statistics && (
            <Card>
              <CardHeader>
                <CardTitle>Statistikk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Kunder</p>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>{statistics.customers.synced} synkronisert</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span>{statistics.customers.failed} feilet</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Fakturaer</p>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span>{statistics.invoices.synced} synkronisert</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      <span>{statistics.invoices.paid} betalt</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sync Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Synkroniseringshandlinger</CardTitle>
              <CardDescription>
                Manuell synkronisering av data til Sparebank1 Regnskap
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {lastSyncStatus && lastSyncStatus.lastSyncAt && (
                <div className="text-sm text-muted-foreground">
                  Sist synkronisert: {new Date(lastSyncStatus.lastSyncAt).toLocaleString("no-NO")}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleSyncAllCustomers}
                  disabled={syncAllCustomers.isLoading || !settings?.isActive}
                  variant="outline"
                >
                  {syncAllCustomers.isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Users className="w-4 h-4 mr-2" />
                  Synkroniser Alle Kunder
                </Button>

                <Button
                  onClick={handleFullSync}
                  disabled={performFullSync.isLoading || !settings?.isActive}
                >
                  {performFullSync.isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Full Synkronisering
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Kundemapping</CardTitle>
              <CardDescription>
                Oversikt over kunder synkronisert med Sparebank1 Regnskap
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {customerMappings && customerMappings.length > 0 ? (
                  customerMappings.map((mapping) => (
                    <div
                      key={mapping.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">Kunde ID: {mapping.localCustomerId}</p>
                        <p className="text-sm text-muted-foreground">
                          Sparebank1 ID: {mapping.sparebank1CustomerId}
                        </p>
                        {mapping.sparebank1CustomerNumber && (
                          <p className="text-sm text-muted-foreground">
                            Kundenummer: {mapping.sparebank1CustomerNumber}
                          </p>
                        )}
                      </div>
                      <Badge variant={mapping.syncStatus === "synced" ? "default" : "destructive"}>
                        {mapping.syncStatus}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Ingen kunder synkronisert ennå
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Fakturamapping</CardTitle>
              <CardDescription>
                Oversikt over fakturaer synkronisert med Sparebank1 Regnskap
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {invoiceMappings && invoiceMappings.length > 0 ? (
                  invoiceMappings.map((mapping) => (
                    <div
                      key={mapping.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          Faktura #{mapping.sparebank1InvoiceNumber || mapping.sparebank1InvoiceId}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Ordre ID: {mapping.localOrderId}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Beløp: {((mapping.totalAmount || 0) / 100).toFixed(2)} kr
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={mapping.isPaid ? "default" : "secondary"}>
                          {mapping.isPaid ? "Betalt" : "Ubetalt"}
                        </Badge>
                        <Badge variant={mapping.syncStatus === "synced" ? "default" : "destructive"}>
                          {mapping.syncStatus}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Ingen fakturaer synkronisert ennå
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Synkroniseringslogg</CardTitle>
              <CardDescription>
                Historikk over synkroniseringer med Sparebank1 Regnskap
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {syncLogs && syncLogs.length > 0 ? (
                  syncLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium capitalize">{log.syncType}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(log.startedAt).toLocaleString("no-NO")}
                        </p>
                        <p className="text-sm">
                          {log.itemsSucceeded}/{log.itemsProcessed} vellykket
                          {log.itemsFailed > 0 && `, ${log.itemsFailed} feilet`}
                        </p>
                      </div>
                      <Badge
                        variant={
                          log.status === "success"
                            ? "default"
                            : log.status === "partial"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {log.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Ingen synkroniseringer ennå
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
