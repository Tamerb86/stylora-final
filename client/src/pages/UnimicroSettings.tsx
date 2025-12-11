import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  RefreshCw, 
  Settings, 
  Database,
  Clock,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";

export default function UnimicroSettings() {
  const utils = trpc.useUtils();

  // Fetch settings
  const { data: settings, isLoading: settingsLoading } = trpc.unimicro.getSettings.useQuery();
  