import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Download, Trash2, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { toast } from "sonner";

export default function Backups() {
  const [isCreating, setIsCreating] = useState(false);

  const { data: backups, refetch } = trpc.backups.list.useQuery();
  const createBackup = trpc.backups.create.useMutation({
    onSuccess: () => {
      toast.success("Sikkerhetskopi opprettet!");
      setIsCreating(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Kunne ikke opprette sikkerhetskopi");
      setIsCreating(false);
    },
  });

  const deleteBackup = trpc.backups.delete.useMutation({
    onSuccess: () => {
      toast.success("Sikkerhetskopi slettet");
      refetch();
    },