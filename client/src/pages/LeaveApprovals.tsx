import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { toast } from "sonner";

export default function LeaveApprovals() {
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: pendingLeaves, refetch } = trpc.leaves.pending.useQuery();
  const approveLeave = trpc.leaves.approve.useMutation({
    onSuccess: (data) => {
      toast.success(data.approved ? "Ferie godkjent!" : "Ferie avslått");
      setSelectedLeave(null);
      setRejectionReason("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Kunne ikke behandle forespørsel");
    },
  });
