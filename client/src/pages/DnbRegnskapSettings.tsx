import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  Settings, 
  Database,
  Clock,
  AlertCircle,
  ExternalLink,
  Building2,
  Key,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function DnbRegnskapSettings() {
  const utils = trpc.useUtils();
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch settings
  const { data: settings, isLoading: settingsLoading } = trpc.dnbRegnskap.getSettings.useQuery();
  
  // Fetch sync logs
  const { data: syncLogs = [], isLoading: logsLoading } = trpc.dnbRegnskap.getSyncLogs.useQuery({
    limit: 10,
  });

  // Fetch unsynced data
  const { data: unsyncedCustomers = [] } = trpc.dnbRegnskap.getUnsyncedCustomers.useQuery();
  const { data: unsyncedOrders = [] } = trpc.dnbRegnskap.getUnsyncedOrders.useQuery();

  // Mutations
  const updateSettings = trpc.dnbRegnskap.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Innstillinger lagret");
      utils.dnbRegnskap.getSettings.invalidate();
    },
    onError: (error) => {
      toast.error(`Feil: ${error.message}`);
    },
  });

  const testConnection = trpc.dnbRegnskap.testConnection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Tilkobling vellykket!");
      } else {
        toast.error("Tilkobling mislyktes");
      }
      setIsTesting(false);
    },
    onError: (error) => {
      toast.error(`Feil: ${error.message}`);
      setIsTesting(false);
    },
  });

  const manualSync = trpc.dnbRegnskap.manualSync.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.dnbRegnskap.getSyncLogs.invalidate();
      utils.dnbRegnskap.getUnsyncedCustomers.invalidate();
      utils.dnbRegnskap.getUnsyncedOrders.invalidate();
      setIsSyncing(false);
    },
    onError: (error) => {
      toast.error(`Synkronisering mislyktes: ${error.message}`);
      setIsSyncing(false);
    },
  });

  const handleTestConnection = () => {
    setIsTesting(true);
    testConnection.mutate();
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    manualSync.mutate();
  };

  const handleToggleEnabled = (enabled: boolean) => {
    updateSettings.mutate({ enabled });
  };

  const handleSaveBasicSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    updateSettings.mutate({
      clientId: formData.get("clientId") as string,
      clientSecret: formData.get("clientSecret") as string || undefined,
      companyId: formData.get("companyId") as string,
      organizationNumber: formData.get("organizationNumber") as string,
      environment: formData.get("environment") as "production" | "sandbox",
    });
  };

  const handleSaveSyncSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    updateSettings.mutate({
      syncFrequency: formData.get("syncFrequency") as any,
      syncHour: parseInt(formData.get("syncHour") as string),
      syncMinute: parseInt(formData.get("syncMinute") as string),
      autoSyncCustomers: formData.get("autoSyncCustomers") === "on",
      autoSyncInvoices: formData.get("autoSyncInvoices") === "on",
      autoSyncPayments: formData.get("autoSyncPayments") === "on",
    });
  };

  const handleSaveAccountingSettings = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    updateSettings.mutate({
      defaultVatCode: formData.get("defaultVatCode") as string,
      defaultAccountCode: formData.get("defaultAccountCode") as string,
      defaultPaymentTerms: parseInt(formData.get("defaultPaymentTerms") as string),
    });
  };

  if (settingsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
              DNB Regnskap
            </h1>
            <p className="text-muted-foreground">
              Integrasjon med DNB Regnskap regnskapssystem
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant={settings?.enabled ? "default" : "secondary"} className="text-sm">
              {settings?.enabled ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Aktivert
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Deaktivert
                </>
              )}
            </Badge>
            
            <Switch
              checked={settings?.enabled || false}
              onCheckedChange={handleToggleEnabled}
              disabled={updateSettings.isLoading}
            />
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            DNB Regnskap er et moderne regnskapssystem fra DNB. Denne integrasjonen synkroniserer 
            automatisk kunder, fakturaer og betalinger mellom Stylora og DNB Regnskap.
          </AlertDescription>
        </Alert>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4 text-blue-600" />
                Usynkroniserte kunder
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unsyncedCustomers.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Kunder som venter på synkronisering
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4 text-orange-600" />
                Usynkroniserte fakturaer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unsyncedOrders.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Fakturaer som venter på synkronisering
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-600" />
                Siste synkronisering
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {settings?.lastSyncAt 
                  ? new Date(settings.lastSyncAt).toLocaleString('no-NO')
                  : "Aldri"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Status: {settings?.lastSyncStatus || "N/A"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="connection" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="connection">
              <Key className="h-4 w-4 mr-2" />
              Tilkobling
            </TabsTrigger>
            <TabsTrigger value="sync">
              <RefreshCw className="h-4 w-4 mr-2" />
              Synkronisering
            </TabsTrigger>
            <TabsTrigger value="accounting">
              <Building2 className="h-4 w-4 mr-2" />
              Regnskap
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Database className="h-4 w-4 mr-2" />
              Logger
            </TabsTrigger>
          </TabsList>

          {/* Connection Tab */}
          <TabsContent value="connection">
            <Card>
              <CardHeader>
                <CardTitle>Tilkoblingsinnstillinger</CardTitle>
                <CardDescription>
                  Konfigurer tilkobling til DNB Regnskap API
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveBasicSettings} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientId">Client ID *</Label>
                      <Input
                        id="clientId"
                        name="clientId"
                        defaultValue={settings?.clientId || ""}
                        placeholder="Din DNB API Client ID"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clientSecret">Client Secret *</Label>
                      <Input
                        id="clientSecret"
                        name="clientSecret"
                        type="password"
                        placeholder="***"
                        autoComplete="off"
                      />
                      <p className="text-xs text-muted-foreground">
                        La stå tomt for å beholde eksisterende
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyId">Selskaps-ID *</Label>
                      <Input
                        id="companyId"
                        name="companyId"
                        defaultValue={settings?.companyId || ""}
                        placeholder="DNB Selskaps-ID"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="organizationNumber">Organisasjonsnummer</Label>
                      <Input
                        id="organizationNumber"
                        name="organizationNumber"
                        defaultValue={settings?.organizationNumber || ""}
                        placeholder="123456789"
                        maxLength={9}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="environment">Miljø</Label>
                      <Select name="environment" defaultValue={settings?.environment || "sandbox"}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sandbox">Sandbox (Test)</SelectItem>
                          <SelectItem value="production">Production (Live)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" disabled={updateSettings.isLoading}>
                      {updateSettings.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Lagre innstillinger
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={isTesting || !settings?.clientId}
                    >
                      {isTesting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Test tilkobling
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.open("https://www.dnb.no/regnskap", "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      DNB Regnskap
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sync Tab */}
          <TabsContent value="sync">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Synkroniseringsinnstillinger</CardTitle>
                  <CardDescription>
                    Konfigurer automatisk synkronisering
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveSyncSettings} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="syncFrequency">Frekvens</Label>
                        <Select name="syncFrequency" defaultValue={settings?.syncFrequency || "daily"}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manuell</SelectItem>
                            <SelectItem value="daily">Daglig</SelectItem>
                            <SelectItem value="weekly">Ukentlig</SelectItem>
                            <SelectItem value="monthly">Månedlig</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="syncHour">Time (0-23)</Label>
                        <Input
                          id="syncHour"
                          name="syncHour"
                          type="number"
                          min="0"
                          max="23"
                          defaultValue={settings?.syncHour || 23}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="syncMinute">Minutt (0-59)</Label>
                        <Input
                          id="syncMinute"
                          name="syncMinute"
                          type="number"
                          min="0"
                          max="59"
                          defaultValue={settings?.syncMinute || 0}
                        />
                      </div>
                    </div>

                    <div className="space-y-3 pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Auto-synkroniser kunder</Label>
                          <p className="text-sm text-muted-foreground">
                            Synkroniser nye kunder automatisk
                          </p>
                        </div>
                        <Switch
                          name="autoSyncCustomers"
                          defaultChecked={settings?.autoSyncCustomers}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Auto-synkroniser fakturaer</Label>
                          <p className="text-sm text-muted-foreground">
                            Synkroniser nye fakturaer automatisk
                          </p>
                        </div>
                        <Switch
                          name="autoSyncInvoices"
                          defaultChecked={settings?.autoSyncInvoices}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Auto-synkroniser betalinger</Label>
                          <p className="text-sm text-muted-foreground">
                            Synkroniser betalinger automatisk
                          </p>
                        </div>
                        <Switch
                          name="autoSyncPayments"
                          defaultChecked={settings?.autoSyncPayments}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button type="submit" disabled={updateSettings.isLoading}>
                        {updateSettings.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Lagre innstillinger
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Manuell synkronisering</CardTitle>
                  <CardDescription>
                    Synkroniser data manuelt nå
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Alert>
                      <Zap className="h-4 w-4" />
                      <AlertDescription>
                        Dette vil synkronisere alle usynkroniserte kunder og fakturaer til DNB Regnskap.
                      </AlertDescription>
                    </Alert>

                    <Button
                      onClick={handleManualSync}
                      disabled={isSyncing || !settings?.enabled}
                      className="w-full"
                    >
                      {isSyncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Start synkronisering
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Accounting Tab */}
          <TabsContent value="accounting">
            <Card>
              <CardHeader>
                <CardTitle>Regnskapsinnstillinger</CardTitle>
                <CardDescription>
                  Standard kontoer og MVA-koder
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveAccountingSettings} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="defaultVatCode">Standard MVA-kode</Label>
                      <Input
                        id="defaultVatCode"
                        name="defaultVatCode"
                        defaultValue={settings?.defaultVatCode || "3"}
                        placeholder="3"
                      />
                      <p className="text-xs text-muted-foreground">
                        3 = 25% MVA (standard)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="defaultAccountCode">Standard salgskonto</Label>
                      <Input
                        id="defaultAccountCode"
                        name="defaultAccountCode"
                        defaultValue={settings?.defaultAccountCode || "3000"}
                        placeholder="3000"
                      />
                      <p className="text-xs text-muted-foreground">
                        3000 = Salgsinntekt
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="defaultPaymentTerms">Betalingsfrist (dager)</Label>
                      <Input
                        id="defaultPaymentTerms"
                        name="defaultPaymentTerms"
                        type="number"
                        min="0"
                        max="90"
                        defaultValue={settings?.defaultPaymentTerms || 14}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" disabled={updateSettings.isLoading}>
                      {updateSettings.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Lagre innstillinger
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Synkroniseringslogger</CardTitle>
                <CardDescription>
                  Siste 10 synkroniseringer
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : syncLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Ingen logger ennå
                  </div>
                ) : (
                  <div className="space-y-2">
                    {syncLogs.map((log: any) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {log.status === "success" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : log.status === "partial" ? (
                            <AlertCircle className="h-5 w-5 text-orange-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <div>
                            <div className="font-medium">{log.operation}</div>
                            <div className="text-sm text-muted-foreground">
                              {log.message || "Ingen melding"}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            {log.recordsSucceeded}/{log.recordsProcessed}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString('no-NO')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
