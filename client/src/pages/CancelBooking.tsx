import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Textarea component not needed - using native textarea element
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function CancelBooking() {
  const [bookingId, setBookingId] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [step, setStep] = useState<"input" | "confirm" | "success">("input");
  const [bookingDetails, setBookingDetails] = useState<any>(null);

  const getBookingMutation = trpc.publicBooking.getBookingForModification.useMutation({
    onSuccess: (data) => {
      setBookingDetails(data);
      setStep("confirm");
    },
    onError: (error) => {
      toast.error("Feil", {
        description: error.message,
      });
    },
  });

  const cancelBookingMutation = trpc.publicBooking.cancelBooking.useMutation({
    onSuccess: () => {
      setStep("success");
      toast.success("Avbestilling bekreftet", {
        description: "Din time er nå avbestilt.",
      });
    },
    onError: (error) => {
      toast.error("Feil ved avbestilling", {
        description: error.message,
      });
    },
  });

  const handleFindBooking = () => {
    if (!bookingId || !phone) {
      toast.error("Manglende informasjon", {
        description: "Vennligst fyll ut alle felt.",
      });
      return;
    }

    getBookingMutation.mutate({
      bookingId: parseInt(bookingId),
      phone: phone,
    });
  };

  const handleCancelBooking = () => {
    cancelBookingMutation.mutate({
      bookingId: parseInt(bookingId),
      phone: phone,
      reason: reason || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container max-w-2xl py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Avbestill time</h1>
          <p className="text-gray-600">Avbestill din time enkelt og raskt</p>
        </div>

        {step === "input" && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Finn din time</CardTitle>
              <CardDescription>
                Oppgi booking-ID og telefonnummer for å finne din time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bookingId">
                  Booking-ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="bookingId"
                  type="number"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  placeholder="123"
                  className="h-12 text-base"
                />
                <p className="text-xs text-gray-500">
                  Du finner booking-ID i bekreftelsen du mottok
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  Telefonnummer <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="12345678"
                  className="h-12 text-base"
                />
              </div>

              <Button
                onClick={handleFindBooking}
                disabled={getBookingMutation.isLoading}
                className="w-full h-12 text-base"
              >
                {getBookingMutation.isLoading ? "Søker..." : "Finn time"}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "confirm" && bookingDetails && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Bekreft avbestilling
              </CardTitle>
              <CardDescription>
                Er du sikker på at du vil avbestille denne timen?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tjeneste:</span>
                  <span className="font-semibold">{bookingDetails.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Dato:</span>
                  <span className="font-semibold">
                    {new Date(bookingDetails.appointmentDate).toLocaleDateString("nb-NO")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tid:</span>
                  <span className="font-semibold">{bookingDetails.startTime}</span>
                </div>
                {bookingDetails.employeeName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ansatt:</span>
                    <span className="font-semibold">{bookingDetails.employeeName}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Årsak til avbestilling (valgfritt)</Label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Fortell oss hvorfor du avbestiller..."
                  className="w-full min-h-[100px] p-3 text-base border rounded-md resize-y"
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("input")}
                  className="flex-1 h-12"
                >
                  Tilbake
                </Button>
                <Button
                  onClick={handleCancelBooking}
                  disabled={cancelBookingMutation.isLoading}
                  className="flex-1 h-12 bg-red-600 hover:bg-red-700"
                >
                  {cancelBookingMutation.isLoading ? "Avbestiller..." : "Avbestill time"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "success" && (
          <Card className="shadow-lg border-green-200">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="bg-green-100 rounded-full p-4">
                    <CheckCircle2 className="h-12 w-12 text-green-600" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Avbestilling bekreftet
                  </h2>
                  <p className="text-gray-600">
                    Din time er nå avbestilt. Du vil motta en bekreftelse på e-post hvis du oppga e-postadresse.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setStep("input");
                    setBookingId("");
                    setPhone("");
                    setReason("");
                    setBookingDetails(null);
                  }}
                  className="w-full h-12"
                >
                  Avbestill en annen time
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
