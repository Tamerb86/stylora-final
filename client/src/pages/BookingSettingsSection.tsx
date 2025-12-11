import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function BookingSettingsSection() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.salonSettings.getBookingSettings.useQuery();
  const updateMutation = trpc.salonSettings.updateBookingSettings.useMutation({
    onSuccess: () => {
      utils.salonSettings.getBookingSettings.invalidate();
      toast.success("Bookinginnstillinger lagret!");
    },
    onError: (error) => {
      toast.error(`Feil ved lagring: ${error.message}`);
    },
  });

  const [localState, setLocalState] = useState<{
    requirePrepayment: boolean;
    cancellationWindowHours: number;
  } | null>(null);

  useEffect(() => {
    if (data && !localState) {
      setLocalState({
        requirePrepayment: data.requirePrepayment ?? false,
        cancellationWindowHours: data.cancellationWindowHours ?? 24,
      });
    }
  }, [data, localState]);

  if (isLoading || !localState) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Laster bookinginnstillinger...</span>
          </div>
        </CardContent>
      </Card>
    );
  }
