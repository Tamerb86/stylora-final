import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  ShoppingCart,
  Barcode,
  Plus,
  Search,
} from "lucide-react";

export default function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data - replace with actual TRPC queries
  const inventoryStats = {
    totalProducts: 245,
    lowStock: 12,
    outOfStock: 3,
    totalValue: 125000,
  };

  const lowStockItems = [
    { id: 1, name: "Shampoo Professional", sku: "SHP-001", currentStock: 5, minStock: 10, price: 299 },
    { id: 2, name: "Hair Conditioner", sku: "CND-002", currentStock: 3, minStock: 8, price: 249 },
    { id: 3, name: "Hair Color Black", sku: "CLR-003", currentStock: 2, minStock: 5, price: 450 },
  ];

  const recentProducts = [
    { id: 1, name: "Premium Hair Mask", sku: "MSK-004", stock: 25, price: 399, status: "in_stock" },
    { id: 2, name: "Styling Gel", sku: "GEL-005", stock: 15, price: 199, status: "in_stock" },
    { id: 3, name: "Hair Serum", sku: "SRM-006", stock: 0, price: 349, status: "out_of_stock" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lagerstyring</h1>
          <p className="text-gray-600 mt-1">
            Administrer produkter, beholdning og leverandører
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nytt produkt
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Totale produkter</CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryStats.totalProducts}</div>
            <p className="text-xs text-gray-500 mt-1">Aktive produkter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lav beholdning</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {inventoryStats.lowStock}
            </div>
            <p className="text-xs text-gray-500 mt-1">Produkter under minimum</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tomt lager</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {inventoryStats.outOfStock}
            </div>
            <p className="text-xs text-gray-500 mt-1">Produkter uten beholdning</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total verdi</CardTitle>
            <ShoppingCart className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventoryStats.totalValue.toLocaleString()} kr
            </div>
            <p className="text-xs text-gray-500 mt-1">Lagerverdi</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Oversikt</TabsTrigger>
          <TabsTrigger value="products">Produkter</TabsTrigger>
          <TabsTrigger value="low-stock">Lav beholdning</TabsTrigger>
          <TabsTrigger value="suppliers">Leverandører</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Low Stock Alert */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Lav beholdning
                </CardTitle>
                <CardDescription>Produkter som trenger påfyll</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lowStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-orange-50"
                    >
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-600">
                          {item.currentStock} / {item.minStock}
                        </p>
                        <p className="text-xs text-gray-500">
                          Trenger {item.minStock - item.currentStock} mer
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  Se alle varsler
                </Button>
              </CardContent>
            </Card>

            {/* Recent Products */}
            <Card>
              <CardHeader>
                <CardTitle>Siste produkter</CardTitle>
                <CardDescription>Nylig oppdaterte produkter</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{product.price} kr</p>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            product.status === "in_stock"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {product.status === "in_stock"
                            ? `På lager: ${product.stock}`
                            : "Tomt"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Alle produkter</CardTitle>
                  <CardDescription>
                    Administrer produktkataloget ditt
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Søk produkter..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <Button variant="outline">
                    <Barcode className="h-4 w-4 mr-2" />
                    Skann strekkode
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Produkt
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Beholdning
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                        Pris
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
                    {[...lowStockItems, ...recentProducts].map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{product.name}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {product.sku}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-medium ${
                              "currentStock" in product && product.currentStock < ("minStock" in product ? product.minStock : 0)
                                ? "text-orange-600"
                                : "stock" in product && product.stock === 0
                                ? "text-red-600"
                                : "text-green-600"
                            }`}
                          >
                            {"currentStock" in product ? product.currentStock : product.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">{product.price} kr</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              ("currentStock" in product && product.currentStock < ("minStock" in product ? product.minStock : 0))
                                ? "bg-orange-100 text-orange-700"
                                : ("stock" in product && product.stock === 0)
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {("currentStock" in product && product.currentStock < ("minStock" in product ? product.minStock : 0))
                              ? "Lav"
                              : ("stock" in product && product.stock === 0)
                              ? "Tomt"
                              : "OK"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm">
                            Rediger
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

        {/* Low Stock Tab */}
        <TabsContent value="low-stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Produkter med lav beholdning
              </CardTitle>
              <CardDescription>
                Produkter som trenger påfyll snart
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 border rounded-lg bg-orange-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-lg">{item.name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          SKU: {item.sku} • Pris: {item.price} kr
                        </p>
                        <div className="mt-3 flex items-center gap-4">
                          <div>
                            <p className="text-xs text-gray-600">Nåværende</p>
                            <p className="text-xl font-bold text-orange-600">
                              {item.currentStock}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Minimum</p>
                            <p className="text-xl font-bold text-gray-700">
                              {item.minStock}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Trenger</p>
                            <p className="text-xl font-bold text-red-600">
                              +{item.minStock - item.currentStock}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button size="sm">
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Bestill
                        </Button>
                        <Button variant="outline" size="sm">
                          Juster
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Leverandører</CardTitle>
                  <CardDescription>
                    Administrer leverandørforhold
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Ny leverandør
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  {
                    id: 1,
                    name: "Beauty Supply AS",
                    email: "ordre@beautysupply.no",
                    phone: "+47 123 45 678",
                    products: 45,
                    rating: 4.5,
                  },
                  {
                    id: 2,
                    name: "Professional Hair Products",
                    email: "salg@php.no",
                    phone: "+47 987 65 432",
                    products: 32,
                    rating: 4.8,
                  },
                  {
                    id: 3,
                    name: "Nordic Beauty Wholesale",
                    email: "info@nbw.no",
                    phone: "+47 555 12 345",
                    products: 28,
                    rating: 4.2,
                  },
                ].map((supplier) => (
                  <div
                    key={supplier.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-lg">{supplier.name}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        📧 {supplier.email} • 📱 {supplier.phone}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {supplier.products} produkter • ⭐ {supplier.rating}/5
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Se produkter
                      </Button>
                      <Button variant="outline" size="sm">
                        Rediger
                      </Button>
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
