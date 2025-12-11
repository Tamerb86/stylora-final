import { useState } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Package,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Pencil,
  Trash2,
  Save,
  X,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export default function ProductDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const productId = parseInt(params.id || "0");

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    price: "",
    cost: "",
    barcode: "",
    stockQuantity: 0,
    minStockLevel: 0,
  });

  const { data, isLoading, refetch } = trpc.products.getDetails.useQuery(
    { productId },
    { enabled: productId > 0 }
  );

  const { data: salesHistory } = trpc.products.getSalesHistory.useQuery(
    { productId, limit: 50 },
    { enabled: productId > 0 }
  );

  const updateProduct = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Produkt oppdatert!");
      setIsEditing(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Feil: ${error.message}`);
    },
  });

  const deleteProduct = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Produkt slettet!");
      setLocation("/products");
    },
    onError: (error: any) => {
      toast.error(`Feil: ${error.message}`);
    },
  });

  const handleEdit = () => {
    if (data?.product) {
      setEditForm({
        name: data.product.name,
        description: data.product.description || "",
        price: data.product.price,
        cost: data.product.cost || "",
        barcode: data.product.barcode || "",
        stockQuantity: data.product.stockQuantity ?? 0,
        minStockLevel: data.product.minStockLevel || 0,
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    updateProduct.mutate({
      productId: productId,
      name: editForm.name,
      description: editForm.description || undefined,
      price: editForm.price,
      cost: editForm.cost || undefined,
      barcode: editForm.barcode || undefined,
      stockQuantity: editForm.stockQuantity,
      minStockLevel: editForm.minStockLevel,
    });
  };

  const handleDelete = () => {
    deleteProduct.mutate({ productId });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("no-NO");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-muted rounded w-1/3"></div>
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-muted rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!data?.product) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Produkt ikke funnet</p>
              <Button onClick={() => setLocation("/products")} className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tilbake til produkter
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const { product, stats } = data;
  const profitMargin = stats.totalRevenue > 0 && product.cost
    ? (((parseFloat(product.price) - parseFloat(product.cost)) / parseFloat(product.price)) * 100).toFixed(1)
    : "0";

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setLocation("/products")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbake
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{product.name}</h1>
              {product.barcode && (
                <p className="text-sm text-muted-foreground mt-1">Strekkode: {product.barcode}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)} disabled={updateProduct.isPending}>
                  <X className="h-4 w-4 mr-2" />
                  Avbryt
                </Button>
                <Button onClick={handleSave} disabled={updateProduct.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Lagre
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleEdit}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Rediger
                </Button>
                <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Slett
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totalt solgt</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSold}</div>
              <p className="text-xs text-muted-foreground">{stats.orderCount} ordrer</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inntekt</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRevenue.toFixed(2)} kr</div>
              <p className="text-xs text-muted-foreground">Fra salg</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fortjeneste</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{profitMargin}%</div>
              <p className="text-xs text-muted-foreground">Margin</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lager</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{product.stockQuantity ?? 0}</div>
              <p className="text-xs text-muted-foreground">
                {product.minStockLevel && (product.stockQuantity ?? 0) <= product.minStockLevel
                  ? "⚠️ Lavt lager"
                  : "På lager"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Produktinformasjon</CardTitle>
            <CardDescription>Detaljer om produktet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Navn *</Label>
                  <Input
                    id="name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">Strekkode</Label>
                  <Input
                    id="barcode"
                    value={editForm.barcode}
                    onChange={(e) => setEditForm({ ...editForm, barcode: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Beskrivelse</Label>
                  <Textarea
                    id="description"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Pris (NOK) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost">Kostpris (NOK)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={editForm.cost}
                    onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock">Lager</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={editForm.stockQuantity}
                    onChange={(e) => setEditForm({ ...editForm, stockQuantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minStock">Min. lagernivå</Label>
                  <Input
                    id="minStock"
                    type="number"
                    value={editForm.minStockLevel}
                    onChange={(e) => setEditForm({ ...editForm, minStockLevel: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Beskrivelse</p>
                  <p className="font-medium">{product.description || "Ingen beskrivelse"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pris</p>
                  <p className="font-medium">{product.price} NOK</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kostpris</p>
                  <p className="font-medium">{product.cost ? `${product.cost} NOK` : "Ikke satt"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lager</p>
                  <p className="font-medium">{product.stockQuantity} stk</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Min. lagernivå</p>
                  <p className="font-medium">{product.minStockLevel || 0} stk</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Salgshistorikk</CardTitle>
            <CardDescription>Siste salg av dette produktet</CardDescription>
          </CardHeader>
          <CardContent>
            {salesHistory && salesHistory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordre-ID</TableHead>
                    <TableHead>Dato</TableHead>
                    <TableHead>Kunde</TableHead>
                    <TableHead>Antall</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesHistory.map((sale: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        <button
                          onClick={() => setLocation("/orders")}
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          #{sale.orderId}
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </TableCell>
                      <TableCell>{formatDate(sale.orderDate)}</TableCell>
                      <TableCell>
                        {sale.customer ? (
                          <button
                            onClick={() => setLocation("/customers")}
                            className="text-blue-600 hover:underline"
                          >
                            {`${sale.customer.firstName} ${sale.customer.lastName || ""}`.trim()}
                          </button>
                        ) : (
                          <span className="text-muted-foreground italic">Walk-in</span>
                        )}
                      </TableCell>
                      <TableCell>{sale.quantity}</TableCell>
                      <TableCell className="font-semibold">{sale.lineTotal} kr</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Ingen salgshistorikk ennå</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slett produkt</DialogTitle>
            <DialogDescription>
              Er du sikker på at du vil slette dette produktet? Denne handlingen kan ikke angres.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleteProduct.isPending}>
              Avbryt
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteProduct.isPending}>
              Slett
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
