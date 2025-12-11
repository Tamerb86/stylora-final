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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  Scissors,
  TrendingUp,
  DollarSign,
  Calendar,
  Pencil,
  Trash2,
  Save,
  X,
  ExternalLink,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

export default function ServiceDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const serviceId = parseInt(params.id || "0");

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    price: "",
    durationMinutes: 30,
  });

  const { data, isLoading, refetch } = trpc.services.getDetails.useQuery(
    { serviceId },
    { enabled: serviceId > 0 }
  );

  const { data: history } = trpc.services.getHistory.useQuery(
    { serviceId, limit: 50 },
    { enabled: serviceId > 0 }
  );

  const updateService = trpc.services.update.useMutation({
    onSuccess: () => {
      toast.success("Tjeneste oppdatert!");
      setIsEditing(false);
      refetch();
    },
    onError: (error: any) => {
      toast.error(`Feil: ${error.message}`);
    },
  });

  const deleteService = trpc.services.delete.useMutation({
    onSuccess: () => {
      toast.success("Tjeneste slettet!");
      setLocation("/services");
    },
    onError: (error: any) => {
      toast.error(`Feil: ${error.message}`);
    },
  });

  const handleEdit = () => {
    if (data?.service) {
      setEditForm({
        name: data.service.name,
        description: data.service.description || "",
        price: data.service.price,
        durationMinutes: data.service.durationMinutes,
      });
      setIsEditing(true);
    }
  };

  const handleSave = () => {
    updateService.mutate({
      id: serviceId,
      name: editForm.name,
      description: editForm.description || undefined,
      price: editForm.price,
      durationMinutes: editForm.durationMinutes,
    });
  };

  const handleDelete = () => {
    deleteService.mutate({ serviceId });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("no-NO");
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: "Venter", className: "bg-yellow-100 text-yellow-800" },
      confirmed: { label: "Bekreftet", className: "bg-blue-100 text-blue-800" },
      completed: { label: "Fullført", className: "bg-green-100 text-green-800" },
      canceled: { label: "Avlyst", className: "bg-red-100 text-red-800" },
      no_show: { label: "Ikke møtt", className: "bg-gray-100 text-gray-800" },
    };
    const config = statusMap[status] || { label: status, className: "bg-gray-100 text-gray-800" };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
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

  if (!data?.service) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Scissors className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Tjeneste ikke funnet</p>
              <Button onClick={() => setLocation("/services")} className="mt-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tilbake til tjenester
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const { service, stats } = data;

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => setLocation("/services")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbake
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{service.name}</h1>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <Clock className="h-4 w-4" />
                <span>{service.durationMinutes} minutter</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)} disabled={updateService.isPending}>
                  <X className="h-4 w-4 mr-2" />
                  Avbryt
                </Button>
                <Button onClick={handleSave} disabled={updateService.isPending}>
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
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSold}</div>
              <p className="text-xs text-muted-foreground">{stats.totalOrders} ordrer</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inntekt</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRevenue.toFixed(2)} kr</div>
              <p className="text-xs text-muted-foreground">Fra POS</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avtaler</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAppointments}</div>
              <p className="text-xs text-muted-foreground">Bookinger</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Snitt</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalOrders > 0 ? (stats.totalRevenue / stats.totalOrders).toFixed(2) : "0.00"} kr
              </div>
              <p className="text-xs text-muted-foreground">Per ordre</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tjenesteinformasjon</CardTitle>
            <CardDescription>Detaljer om tjenesten</CardDescription>
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
                  <Label htmlFor="duration">Varighet (minutter) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="5"
                    step="5"
                    value={editForm.durationMinutes}
                    onChange={(e) => setEditForm({ ...editForm, durationMinutes: parseInt(e.target.value) || 30 })}
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
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Beskrivelse</p>
                  <p className="font-medium">{service.description || "Ingen beskrivelse"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pris</p>
                  <p className="font-medium">{service.price} NOK</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Varighet</p>
                  <p className="font-medium">{service.durationMinutes} minutter</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{service.isActive ? "Aktiv" : "Inaktiv"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historikk</CardTitle>
            <CardDescription>Salg og avtaler for denne tjenesten</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="sales" className="w-full">
              <TabsList>
                <TabsTrigger value="sales">Salg ({history?.sales.length || 0})</TabsTrigger>
                <TabsTrigger value="appointments">Avtaler ({history?.appointments.length || 0})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="sales">
                {history?.sales && history.sales.length > 0 ? (
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
                      {history.sales.map((sale: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            <button onClick={() => setLocation("/orders")} className="text-blue-600 hover:underline flex items-center gap-1">
                              #{sale.orderId}
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          </TableCell>
                          <TableCell>{formatDate(sale.orderDate)}</TableCell>
                          <TableCell>
                            {sale.customer ? (
                              <button onClick={() => setLocation("/customers")} className="text-blue-600 hover:underline">
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
              </TabsContent>

              <TabsContent value="appointments">
                {history?.appointments && history.appointments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Avtale-ID</TableHead>
                        <TableHead>Dato</TableHead>
                        <TableHead>Kunde</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.appointments.map((apt: any) => (
                        <TableRow key={apt.id}>
                          <TableCell className="font-medium">
                            <button onClick={() => setLocation("/appointments")} className="text-blue-600 hover:underline flex items-center gap-1">
                              #{apt.id}
                              <ExternalLink className="h-3 w-3" />
                            </button>
                          </TableCell>
                          <TableCell>{formatDate(apt.appointmentDate)}</TableCell>
                          <TableCell>
                            {apt.customer ? (
                              <button onClick={() => setLocation("/customers")} className="text-blue-600 hover:underline">
                                {`${apt.customer.firstName} ${apt.customer.lastName || ""}`.trim()}
                              </button>
                            ) : (
                              <span className="text-muted-foreground italic">Ukjent</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(apt.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Ingen avtaler ennå</div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Slett tjeneste</DialogTitle>
            <DialogDescription>
              Er du sikker på at du vil slette denne tjenesten? Denne handlingen kan ikke angres.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleteService.isPending}>
              Avbryt
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteService.isPending}>
              Slett
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
