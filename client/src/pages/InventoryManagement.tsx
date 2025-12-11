import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  Barcode, 
  Search,
  Plus,
  Download,
  Upload,
  Truck,
  FileText,
  Settings
} from "lucide-react";
import { toast } from "sonner";

export default function InventoryManagement() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeInput, setBarcode Input] = useState("");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lagerstyring</h1>
          <p className="text-muted-foreground">
            Administrer produkter, leverandører og lagerbeveglser
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Eksporter
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Ny Innkjøpsordre
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <QuickStats />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">
            <Package className="h-4 w-4 mr-2" />
            Oversikt
          </TabsTrigger>
          <TabsTrigger value="products">
            <Barcode className="h-4 w-4 mr-2" />
            Produkter
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Varsler
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            <Truck className="h-4 w-4 mr-2" />
            Leverandører
          </TabsTrigger>
          <TabsTrigger value="orders">
            <FileText className="h-4 w-4 mr-2" />
            Innkjøpsordre
          </TabsTrigger>
          <TabsTrigger value="reports">
            <TrendingDown className="h-4 w-4 mr-2" />
            Rapporter
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <OverviewTab />
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <ProductsTab searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <AlertsTab />
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          <SuppliersTab />
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <PurchaseOrdersTab />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <ReportsTab />
        </TabsContent>
      </Tabs>

      {/* Barcode Scanner (Floating) */}
      <BarcodeScanner barcodeInput={barcodeInput} setBarcodeInput={setBarcodeInput} />
    </div>
  );
}

// ============================================================================
// QUICK STATS COMPONENT
// ============================================================================

function QuickStats() {
  const { data: inventory } = trpc.inventory.getInventoryList.useQuery();
  const { data: alerts } = trpc.inventory.getStockAlerts.useQuery({ status: "active" });

  const totalProducts = inventory?.length || 0;
  const lowStockCount = inventory?.filter(item => 
    item.inventory.currentStock <= item.inventory.minStock
  ).length || 0;
  const outOfStockCount = inventory?.filter(item => 
    item.inventory.currentStock === 0
  ).length || 0;
  const totalValue = inventory?.reduce((sum, item) => {
    const cost = parseFloat(item.inventory.costPrice?.toString() || "0");
    return sum + (cost * item.inventory.currentStock);
  }, 0) || 0;

  const stats = [
    {
      title: "Totale Produkter",
      value: totalProducts,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Lav Beholdning",
      value: lowStockCount,
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
    {
      title: "Tomt Lager",
      value: outOfStockCount,
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      title: "Total Verdi",
      value: `${totalValue.toLocaleString("no-NO", { minimumFractionDigits: 2 })} kr`,
      icon: Package,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab() {
  const { data: lowStockItems } = trpc.inventory.getInventoryList.useQuery({ lowStockOnly: true });
  const { data: recentMovements } = trpc.inventory.getStockMovements.useQuery({ limit: 10 });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Low Stock Products */}
      <Card>
        <CardHeader>
          <CardTitle>Produkter med Lav Beholdning</CardTitle>
          <CardDescription>Produkter som trenger påfyll</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lowStockItems?.slice(0, 5).map((item) => (
              <div key={item.inventory.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.product?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Beholdning: {item.inventory.currentStock} / Min: {item.inventory.minStock}
                  </p>
                </div>
                <Badge variant={item.inventory.currentStock === 0 ? "destructive" : "warning"}>
                  {item.inventory.currentStock === 0 ? "Tomt" : "Lav"}
                </Badge>
              </div>
            ))}
            {(!lowStockItems || lowStockItems.length === 0) && (
              <p className="text-center text-muted-foreground py-4">
                Ingen produkter med lav beholdning
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Movements */}
      <Card>
        <CardHeader>
          <CardTitle>Siste Lagerbevegelser</CardTitle>
          <CardDescription>Nylige inn- og utleveringer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentMovements?.slice(0, 5).map((movement) => (
              <div key={movement.movement.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{movement.product?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {movement.movement.type} • {new Date(movement.movement.performedAt).toLocaleDateString("no-NO")}
                  </p>
                </div>
                <Badge variant={movement.movement.quantityChange > 0 ? "success" : "secondary"}>
                  {movement.movement.quantityChange > 0 ? "+" : ""}{movement.movement.quantityChange}
                </Badge>
              </div>
            ))}
            {(!recentMovements || recentMovements.length === 0) && (
              <p className="text-center text-muted-foreground py-4">
                Ingen lagerbevegelser ennå
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// PRODUCTS TAB
// ============================================================================

function ProductsTab({ searchQuery, setSearchQuery }: { searchQuery: string; setSearchQuery: (q: string) => void }) {
  const { data: inventory, refetch } = trpc.inventory.getInventoryList.useQuery({ search: searchQuery });
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Søk etter produktnavn, strekkode eller SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Filter
        </Button>
      </div>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Produkt</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">SKU/Strekkode</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Beholdning</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Min</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Leverandør</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Kostpris</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {inventory?.map((item) => {
                  const isLowStock = item.inventory.currentStock <= item.inventory.minStock;
                  const isOutOfStock = item.inventory.currentStock === 0;

                  return (
                    <tr key={item.inventory.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{item.product?.name}</p>
                          <p className="text-sm text-muted-foreground">{item.product?.category}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p>{item.inventory.sku || "-"}</p>
                          <p className="text-muted-foreground">{item.inventory.barcode || "-"}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className={`font-medium ${isOutOfStock ? "text-red-600" : isLowStock ? "text-orange-600" : ""}`}>
                          {item.inventory.currentStock}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {item.inventory.minStock}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {item.supplier?.name || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {parseFloat(item.inventory.costPrice?.toString() || "0").toLocaleString("no-NO", { minimumFractionDigits: 2 })} kr
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={isOutOfStock ? "destructive" : isLowStock ? "warning" : "success"}>
                          {isOutOfStock ? "Tomt" : isLowStock ? "Lav" : "OK"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm">
                          Rediger
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {(!inventory || inventory.length === 0) && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Ingen produkter funnet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// ALERTS TAB
// ============================================================================

function AlertsTab() {
  const { data: alerts, refetch } = trpc.inventory.getStockAlerts.useQuery({ status: "active" });
  const acknowledgeMutation = trpc.inventory.acknowledgeAlert.useMutation({
    onSuccess: () => {
      toast.success("Varsel bekreftet");
      refetch();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aktive Lagervarsler</CardTitle>
        <CardDescription>Produkter som krever oppmerksomhet</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts?.map((alert) => (
            <div key={alert.alert.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${
                  alert.alert.alertType === "out_of_stock" ? "bg-red-100" : "bg-orange-100"
                }`}>
                  <AlertTriangle className={`h-5 w-5 ${
                    alert.alert.alertType === "out_of_stock" ? "text-red-600" : "text-orange-600"
                  }`} />
                </div>
                <div>
                  <p className="font-medium">{alert.product?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Beholdning: {alert.alert.currentStock} / Min: {alert.alert.thresholdLevel}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(alert.alert.createdAt).toLocaleString("no-NO")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => acknowledgeMutation.mutate({ id: alert.alert.id })}
                  disabled={acknowledgeMutation.isPending}
                >
                  Bekreft
                </Button>
                <Button size="sm">
                  Bestill
                </Button>
              </div>
            </div>
          ))}
          {(!alerts || alerts.length === 0) && (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Ingen aktive varsler</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// SUPPLIERS TAB
// ============================================================================

function SuppliersTab() {
  const { data: suppliers } = trpc.inventory.getSuppliers.useQuery();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Ny Leverandør
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {suppliers?.map((supplier) => (
          <Card key={supplier.id}>
            <CardHeader>
              <CardTitle className="text-lg">{supplier.name}</CardTitle>
              <CardDescription>{supplier.contactPerson}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>E-post:</strong> {supplier.email || "-"}</p>
                <p><strong>Telefon:</strong> {supplier.phone || "-"}</p>
                <p><strong>Betalingsvilkår:</strong> {supplier.paymentTerms || "-"}</p>
                <div className="flex items-center justify-between mt-4">
                  <Badge variant={supplier.isActive ? "success" : "secondary"}>
                    {supplier.isActive ? "Aktiv" : "Inaktiv"}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    Rediger
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!suppliers || suppliers.length === 0) && (
        <Card>
          <CardContent className="text-center py-12">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Ingen leverandører ennå</p>
            <Button className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Legg til Leverandør
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// PURCHASE ORDERS TAB
// ============================================================================

function PurchaseOrdersTab() {
  const { data: purchaseOrders } = trpc.inventory.getPurchaseOrders.useQuery();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Ny Innkjøpsordre
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Ordrenummer</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Leverandør</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Ordredato</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Forventet Levering</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Total</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Handlinger</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {purchaseOrders?.map((po) => (
                  <tr key={po.purchaseOrder.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium">{po.purchaseOrder.orderNumber}</td>
                    <td className="px-4 py-3">{po.supplier?.name}</td>
                    <td className="px-4 py-3">{new Date(po.purchaseOrder.orderDate).toLocaleDateString("no-NO")}</td>
                    <td className="px-4 py-3">
                      {po.purchaseOrder.expectedDeliveryDate 
                        ? new Date(po.purchaseOrder.expectedDeliveryDate).toLocaleDateString("no-NO")
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {parseFloat(po.purchaseOrder.totalAmount.toString()).toLocaleString("no-NO", { minimumFractionDigits: 2 })} kr
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{po.purchaseOrder.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm">
                        Vis
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!purchaseOrders || purchaseOrders.length === 0) && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Ingen innkjøpsordre ennå</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// REPORTS TAB
// ============================================================================

function ReportsTab() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="cursor-pointer hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>Lagernivårapport</CardTitle>
          <CardDescription>Oversikt over alle produkter og beholdning</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Generer Rapport
          </Button>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>Lagerverdirapport</CardTitle>
          <CardDescription>Total verdi av lagerbeholdning</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Generer Rapport
          </Button>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>Bevegelsesrapport</CardTitle>
          <CardDescription>Inn- og utleveringer over tid</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Generer Rapport
          </Button>
        </CardContent>
      </Card>

      <Card className="cursor-pointer hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle>Lav Beholdning Rapport</CardTitle>
          <CardDescription>Produkter som trenger påfyll</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Generer Rapport
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// BARCODE SCANNER
// ============================================================================

function BarcodeScanner({ barcodeInput, setBarcodeInput }: { barcodeInput: string; setBarcodeInput: (b: string) => void }) {
  const scanMutation = trpc.inventory.scanBarcode.useMutation({
    onSuccess: (data) => {
      if (data) {
        toast.success(`Produkt funnet: ${data.product?.name}`);
      } else {
        toast.error("Ingen produkt funnet med denne strekkoden");
      }
      setBarcodeInput("");
    },
  });

  const handleScan = () => {
    if (barcodeInput.trim()) {
      scanMutation.mutate({ barcode: barcodeInput.trim() });
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className="w-80 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Barcode className="h-4 w-4" />
            Skann Strekkode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            placeholder="Skann eller skriv inn strekkode..."
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
            autoFocus
          />
          <Button 
            className="w-full" 
            onClick={handleScan}
            disabled={!barcodeInput.trim() || scanMutation.isPending}
          >
            {scanMutation.isPending ? "Søker..." : "Søk"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
