import { loadStripeTerminal, Terminal, Reader } from "@stripe/terminal-js";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface StripeTerminalContextType {
  terminal: Terminal | null;
  connectedReader: Reader | null;
  isInitialized: boolean;
  isConnecting: boolean;
  discoverReaders: () => Promise<Reader[]>;
  connectReader: (reader: Reader) => Promise<void>;
  disconnectReader: () => Promise<void>;
  processPayment: (amount: number, currency?: string) => Promise<{ 
    success: boolean; 
    paymentIntentId?: string; 
    cardBrand?: string;
    lastFour?: string;
    error?: string 
  }>;
}

const StripeTerminalContext = createContext<StripeTerminalContextType | undefined>(undefined);

export function StripeTerminalProvider({ 
  children,
  providerId 
}: { 
  children: ReactNode;
  providerId?: number;
}) {
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const [connectedReader, setConnectedReader] = useState<Reader | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const createConnectionTokenMutation = trpc.stripeTerminal.createConnectionToken.useMutation();
  const createPaymentIntentMutation = trpc.stripeTerminal.createPaymentIntent.useMutation();

  // Initialize Stripe Terminal SDK
  useEffect(() => {
    const initTerminal = async () => {
      try {
        const StripeTerminal = await loadStripeTerminal();
        
        if (!StripeTerminal) {
          throw new Error("Failed to load Stripe Terminal SDK");
        }
        
        const terminalInstance = StripeTerminal.create({