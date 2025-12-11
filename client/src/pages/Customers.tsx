import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Phone, Mail, Calendar, Users, Gift, CalendarPlus, Receipt } from "lucide-react";
import { toast } from "sonner";

function CustomerLoyaltyPoints({ customerId }: { customerId: number }) {
  const { data: loyaltyPoints } = trpc.loyalty.getPoints.useQuery({ customerId });

  if (!loyaltyPoints || loyaltyPoints.currentPoints === 0) return null;

  return (
    <div className="flex items-center gap-2 text-primary">
      <Gift className="h-3 w-3" />
      {loyaltyPoints.currentPoints} lojalitetspoeng
    </div>
  );
}

export default function Customers() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    address: "",
    notes: "",
    marketingSmsConsent: false,
    marketingEmailConsent: false,
  });

  const { data: customers, isLoading, refetch } = trpc.customers.list.useQuery();
  const createCustomer = trpc.customers.create.useMutation({
    onSuccess: () => {
      toast.success("Kunde opprettet!");
      setIsDialogOpen(false);
      refetch();
      setFormData({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        dateOfBirth: "",
        address: "",
        notes: "",
        marketingSmsConsent: false,
        marketingEmailConsent: false,
      });
    },
    onError: (error) => {
      toast.error(`Feil: ${error.message}`);
    },
  });

  const filteredCustomers = customers?.filter((customer) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.firstName.toLowerCase().includes(searchLower) ||
      (customer.lastName?.toLowerCase() || "").includes(searchLower) ||
      customer.phone.includes(searchTerm) ||
      (customer.email?.toLowerCase() || "").includes(searchLower)
    );
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCustomer.mutate(formData);
  };

  return (
    <DashboardLayout
      breadcrumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Kunder" },
      ]}
    >
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-orange-500 bg-clip-text text-transparent">Kunder</h1>
            <p className="text-muted-foreground mt-1">Administrer kunderegisteret</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white shadow-lg">
                <Plus className="mr-2 h-4 w-4" />
                Ny kunde
              </Button>