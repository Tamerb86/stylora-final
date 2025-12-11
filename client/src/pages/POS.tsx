import DashboardLayout from "@/components/DashboardLayout";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useStripeTerminal } from "@/contexts/StripeTerminalContext";
import { useThermalPrinter } from "@/contexts/ThermalPrinterContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ShoppingCart,
  Plus,
  Minus,
  X,
  User,
  Calendar,
  CreditCard,
  Banknote,
  CheckCircle2,
  Download,
  Mail,
  Receipt,
  ArrowLeft,
  Printer,
  Loader2,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react";

// Cart item type
type CartItem = {
  id: number;
  itemType: "service" | "product";
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
};

// Cart state type
type CartState = {
  customerId?: number;
  customerName?: string;
  appointmentId?: number;
  employeeId?: number;
  employeeName?: string;
  items: CartItem[];
};

export default function POS() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const stripeTerminal = useStripeTerminal();
  const thermalPrinter = useThermalPrinter();
  const [cart, setCart] = useState<CartState>({ items: [] });
  const [searchQuery, setSearchQuery] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<number | null>(null);
  const [lastTotal, setLastTotal] = useState<number>(0);
  const [lastPaymentMethod, setLastPaymentMethod] = useState<string>("");
  const [lastCustomerEmail, setLastCustomerEmail] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentInstructions, setPaymentInstructions] = useState<string>("");
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load services and products
  const { data: services = [] } = trpc.services.list.useQuery();
  const { data: products = [] } = trpc.products.list.useQuery();
  const { data: customers = [] } = trpc.customers.list.useQuery();
  const { data: employees = [] } = trpc.employees.list.useQuery();
  const { data: printSettings } = trpc.salonSettings.getPrintSettings.useQuery();

  // Auto-focus search field on page load
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Mutations
  const createOrder = trpc.pos.createOrder.useMutation();
  const recordCashPayment = trpc.pos.recordCashPayment.useMutation();
  const recordCardPayment = trpc.pos.recordCardPayment.useMutation();