/**
 * Enhanced Fiken Settings Page
 * 
 * Improved UI with visual dashboard and better UX
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  Settings, 
  Users, 
  FileText,
  AlertCircle,
  ExternalLink,
  TrendingUp,
  Package,
  ShoppingCart,
  Activity,
  Zap
} from "lucide-react";
import { toast } from "sonner";

export default function FikenSettingsEnhanced() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  // Queries
  const { data: settings, refetch: refetchSettings } = trpc.fiken.getSettings.useQuery();
  const { data: syncStatus, refetch: refetchSyncStatus } = trpc.fiken.getSyncStatus.useQuery();
  const { data: syncLogs } = trpc.fiken.getSyncLogs.useQuery({ limit: 20 });

  // Mutations
  const saveCredentialsMutation = trpc.fiken.saveCredentials.useMutation();
  const handleCallbackMutation = trpc.fiken.handleCallback.useMutation();
  const testConnectionMutation = trpc.fiken.testConnection.useMutation();
  const disconnectMutation = trpc.fiken.disconnect.useMutation();
  const syncAllCustomersMutation = trpc.fiken.syncAllCustomers.useMutation();
  const syncAllOrdersMutation = trpc.fiken.syncAllOrders.useMutation();
  const syncAllServicesMutation = trpc.fiken.syncAllServices.useMutation();
  const syncAllProductsMutation = trpc.fiken.syncAllProducts.useMutation();
  const manualFullSyncMutation = trpc.fiken.manualFullSync.useMutation();

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error");

    if (error) {
      toast.error(`Fiken-tilkobling mislyktes: ${error}`);
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (code && state) {
      handleOAuthCallback(code, state);
    }
  }, []);

  const handleOAuthCallback = async (code: string, state: string) => {
    setIsConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/fiken`;
      
      const result = await handleCallbackMutation.mutateAsync({
        code,
        state,
        redirectUri,
      });

      toast.success(`Tilkoblet til Fiken! Koblet til: ${result.companyName}`);
      window.history.replaceState({}, document.title, window.location.pathname);
      
      refetchSettings();
      refetchSyncStatus();
    } catch (error) {
      toast.error(`Kunne ikke koble til Fiken: ${error instanceof Error ? error.message : "Ukjent feil"}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!clientId || !clientSecret) {
      toast.error("Vennligst fyll inn både Client ID og Client Secret");
      return;
    }

    try {
      await saveCredentialsMutation.mutateAsync({
        clientId,
        clientSecret,
      });

      toast.success("OAuth-legitimasjon er lagret. Du kan nå koble til Fiken.");

      refetchSettings();
      setClientId("");
      setClientSecret("");
    } catch (error) {
      toast.error(`Kunne ikke lagre: ${error instanceof Error ? error.message : "Ukjent feil"}`);
    }
  };

  const handleConnect = () => {
    const redirectUri = `${window.location.origin}/fiken`;
    if (!settings?.hasCredentials) {
      toast.error("Vennligst legg til OAuth-legitimasjon først");
      return;
    }
    
    window.location.href = `/api/fiken/auth?redirect_uri=${encodeURIComponent(redirectUri)}`;
  };

  const handleDisconnect = async () => {
    if (!confirm("Er du sikker på at du vil koble fra Fiken?")) {
      return;
    }

    try {
      await disconnectMutation.mutateAsync();
      toast.success("Fiken-integrasjonen er deaktivert");
      refetchSettings();
      refetchSyncStatus();
    } catch (error) {
      toast.error(`Kunne ikke koble fra: ${error instanceof Error ? error.message : "Ukjent feil"}`);
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await testConnectionMutation.mutateAsync();
      
      if (result.success) {
        toast.success(`Tilkobling OK! Koblet til: ${result.companyName}`);
      } else {
        toast.error(`Tilkobling mislyktes: ${result.error}`);
      }
    } catch (error) {
      toast.error(`Kunne ikke teste tilkobling: ${error instanceof Error ? error.message : "Ukjent feil"}`);
    }
  };

  const handleFullSync = async () => {
    try {
      const result = await manualFullSyncMutation.mutateAsync();
      
      const totalSynced = 
        (result.customers?.totalProcessed || 0) + 
        (result.services?.synced || 0) + 
        (result.products?.synced || 0) + 
        (result.orders?.totalProcessed || 0);
      
      const totalFailed = 
        (result.customers?.totalFailed || 0) + 
        (result.services?.failed || 0) + 
        (result.products?.failed || 0) + 
        (result.orders?.totalFailed || 0);

      if (totalFailed === 0) {
        toast.success(`Full synkronisering fullført! ${totalSynced} elementer synkronisert`);
      } else {
        toast.warning(`Synkronisering delvis fullført: ${totalSynced} synkronisert, ${totalFailed} feilet`);
      }

      refetchSyncStatus();
    } catch (error) {
      toast.error(`Synkronisering mislyktes: ${error instanceof Error ? error.message : "Ukjent feil"}`);
    }
  };

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Kobler til Fiken...</p>
        </div>
      </div>
    );
  }

  // Calculate sync progress
  const totalItems = (syncStatus?.unsyncedCustomers || 0) + (syncStatus?.unsyncedOrders || 0);
  const syncProgress = totalItems > 0 ? 0 : 100;

  return (
    <div className="container max-w-7xl py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Fiken-integrasjon</h1>
          <p className="text-muted-foreground">
            Automatisk synkronisering av regnskap og fakturaer
          </p>
        </div>
        {settings?.isConnected && (
          <Badge variant="default" className="flex items-center gap-2 px-4 py-2">
            <Activity className="h-4 w-4" />
            Tilkoblet
          </Badge>
        )}
      </div>

      {/* Visual Dashboard - Only show when connected */}
      {settings?.isConnected && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Usynkroniserte kunder
              </CardTitle>
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                {syncStatus?.unsyncedCustomers || 0}
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Venter på synkronisering
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Usynkroniserte ordrer
              </CardTitle>
              <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                {syncStatus?.unsyncedOrders || 0}
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Fakturaer i kø
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Siste synkronisering
              </CardTitle>
              <RefreshCw className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold text-purple-700 dark:text-purple-300">
                {settings.lastSyncAt 
                  ? new Date(settings.lastSyncAt).toLocaleString("no-NO", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })
                  : "Aldri"}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                {settings.lastSyncStatus === "success" ? "✓ Vellykket" :
                 settings.lastSyncStatus === "failed" ? "✗ Feilet" :
                 "○ Delvis"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Synkroniseringsstatus
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-700 dark:text-orange-300">
                {syncProgress}%
              </div>
              <Progress value={syncProgress} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Oversikt</TabsTrigger>
          <TabsTrigger value="sync">Synkronisering</TabsTrigger>
          <TabsTrigger value="logs">Logg</TabsTrigger>
          <TabsTrigger value="settings">Innstillinger</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Tilkoblingsstatus
              </CardTitle>
              <CardDescription>
                Status for Fiken-integrasjonen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings?.isConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Tilkoblet til Fiken</span>
                  </div>
                  
                  {settings.companyName && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <Label className="text-muted-foreground text-sm">Firma</Label>
                        <p className="font-medium mt-1">{settings.companyName}</p>
                      </div>

                      {settings.organizationNumber && (
                        <div className="p-4 border rounded-lg">
                          <Label className="text-muted-foreground text-sm">Org.nr</Label>
                          <p className="font-medium mt-1">{settings.organizationNumber}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleTestConnection} 
                      disabled={testConnectionMutation.isPending}
                      variant="outline"
                      className="flex-1"
                    >
                      {testConnectionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Activity className="mr-2 h-4 w-4" />
                      Test tilkobling
                    </Button>
                    <Button 
                      onClick={handleDisconnect} 
                      disabled={disconnectMutation.isPending}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Koble fra
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                    <span>Ikke tilkoblet</span>
                  </div>

                  {!settings?.hasCredentials ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Du må først legge til OAuth-legitimasjon i Innstillinger-fanen
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Button onClick={handleConnect} className="w-full" size="lg">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Koble til Fiken
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Tab */}
        <TabsContent value="sync" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Manuell synkronisering
              </CardTitle>
              <CardDescription>
                Synkroniser kunder og ordrer til Fiken
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!settings?.isConnected ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Du må koble til Fiken før du kan synkronisere
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="grid gap-4">
                    {/* Quick Sync Cards */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <Card className="border-2 hover:border-primary transition-colors">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <Users className="h-8 w-8 text-blue-500" />
                            <Badge variant="secondary">
                              {syncStatus?.unsyncedCustomers || 0}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg">Kunder</CardTitle>
                          <CardDescription>Synkroniser kundedata</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            onClick={async () => {
                              try {
                                const result = await syncAllCustomersMutation.mutateAsync();
                                if (result.success) {
                                  toast.success(`${result.totalProcessed} kunder synkronisert`);
                                }
                                refetchSyncStatus();
                              } catch (error) {
                                toast.error("Synkronisering feilet");
                              }
                            }}
                            disabled={syncAllCustomersMutation.isPending}
                            className="w-full"
                          >
                            {syncAllCustomersMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Synkroniser
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="border-2 hover:border-primary transition-colors">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <FileText className="h-8 w-8 text-green-500" />
                            <Badge variant="secondary">
                              {syncStatus?.unsyncedOrders || 0}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg">Ordrer</CardTitle>
                          <CardDescription>Synkroniser fakturaer</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            onClick={async () => {
                              try {
                                const result = await syncAllOrdersMutation.mutateAsync();
                                if (result.success) {
                                  toast.success(`${result.totalProcessed} ordrer synkronisert`);
                                }
                                refetchSyncStatus();
                              } catch (error) {
                                toast.error("Synkronisering feilet");
                              }
                            }}
                            disabled={syncAllOrdersMutation.isPending}
                            className="w-full"
                          >
                            {syncAllOrdersMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Synkroniser
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="border-2 hover:border-primary transition-colors">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <Package className="h-8 w-8 text-purple-500" />
                          </div>
                          <CardTitle className="text-lg">Tjenester</CardTitle>
                          <CardDescription>Synkroniser tjenester som produkter</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            onClick={async () => {
                              try {
                                const result = await syncAllServicesMutation.mutateAsync();
                                if (result.success) {
                                  toast.success(`${result.synced} tjenester synkronisert`);
                                }
                                refetchSyncStatus();
                              } catch (error) {
                                toast.error("Synkronisering feilet");
                              }
                            }}
                            disabled={syncAllServicesMutation.isPending}
                            className="w-full"
                          >
                            {syncAllServicesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Synkroniser
                          </Button>
                        </CardContent>
                      </Card>

                      <Card className="border-2 hover:border-primary transition-colors">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <ShoppingCart className="h-8 w-8 text-orange-500" />
                          </div>
                          <CardTitle className="text-lg">Produkter</CardTitle>
                          <CardDescription>Synkroniser fysiske produkter</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            onClick={async () => {
                              try {
                                const result = await syncAllProductsMutation.mutateAsync();
                                if (result.success) {
                                  toast.success(`${result.synced} produkter synkronisert`);
                                }
                                refetchSyncStatus();
                              } catch (error) {
                                toast.error("Synkronisering feilet");
                              }
                            }}
                            disabled={syncAllProductsMutation.isPending}
                            className="w-full"
                          >
                            {syncAllProductsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Synkroniser
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Full Sync */}
                    <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary rounded-lg">
                            <Zap className="h-6 w-6 text-primary-foreground" />
                          </div>
                          <div>
                            <CardTitle>Full synkronisering</CardTitle>
                            <CardDescription>
                              Synkroniser alt: kunder, tjenester, produkter og ordrer
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          onClick={handleFullSync}
                          disabled={manualFullSyncMutation.isPending}
                          size="lg"
                          className="w-full"
                        >
                          {manualFullSyncMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {manualFullSyncMutation.isPending ? "Synkroniserer..." : "Start full synkronisering"}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Synkroniseringslogg</CardTitle>
              <CardDescription>
                Historikk over synkroniseringer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!syncLogs || syncLogs.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Ingen loggoppføringer ennå</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {syncLogs.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="mt-0.5">
                        {log.status === "success" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : log.status === "failed" ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">
                            {log.operation.replace("_", " ")}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString("no-NO")}
                          </span>
                        </div>
                        {log.itemsProcessed > 0 && (
                          <p className="text-sm text-muted-foreground">
                            {log.itemsProcessed} behandlet, {log.itemsFailed} feilet
                          </p>
                        )}
                        {log.errorMessage && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {log.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>OAuth-legitimasjon</CardTitle>
              <CardDescription>
                Konfigurer Fiken OAuth-tilgang
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <strong className="text-blue-700 dark:text-blue-300">Hvordan få OAuth-legitimasjon:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-blue-600 dark:text-blue-400">
                    <li>Logg inn på Fiken.no</li>
                    <li>Gå til Rediger konto → Profil → Andre innstillinger</li>
                    <li>Aktiver "Jeg er utvikler"</li>
                    <li>Gå til "API"-fanen og opprett en ny app</li>
                    <li>Kopier Client ID og Client Secret hit</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Din Fiken OAuth Client ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Din Fiken OAuth Client Secret"
                />
              </div>

              <Button 
                onClick={handleSaveCredentials}
                disabled={saveCredentialsMutation.isPending}
                className="w-full"
                size="lg"
              >
                {saveCredentialsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lagre legitimasjon
              </Button>

              {settings?.hasCredentials && (
                <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    OAuth-legitimasjon er lagret. Du kan nå koble til Fiken fra Oversikt-fanen.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
