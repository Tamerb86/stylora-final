import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { CheckCircle2, Clock } from "lucide-react";
import { format, addDays } from "date-fns";
import { nb } from "date-fns/locale";
import { toast } from "sonner";

const TENANT_ID = "goeasychargeco@gmail.com";

export default function ModifyBooking() {
  const [bookingId, setBookingId] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"input" | "modify" | "success">("input");
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const getBookingMutation = trpc.publicBooking.getBookingForModification.useMutation({
    onSuccess: (data) => {
      setBookingDetails(data);
      setSelectedDate(new Date(data.appointmentDate));
      setSelectedTime(data.startTime);
      setStep("modify");
    },
    onError: (error) => {
      toast.error("Feil", {
        description: error.message,
      });
    },
  });

  const { data: timeSlots = [], isLoading: timeSlotsLoading } = trpc.publicBooking.getAvailableTimeSlots.useQuery(
    {
      tenantId: TENANT_ID,
      date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : "",
      serviceId: bookingDetails?.serviceId || 0,
      employeeId: bookingDetails?.employeeId || undefined,
    },
    {
      enabled: !!selectedDate && !!bookingDetails?.serviceId && step === "modify",
    }
  );

  const modifyBookingMutation = trpc.publicBooking.modifyBooking.useMutation({
    onSuccess: () => {
      setStep("success");
      toast.success("Endring bekreftet", {
        description: "Din time er nå endret.",
      });
    },
    onError: (error) => {
      toast.error("Feil ved endring", {
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

  const handleModifyBooking = () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Manglende informasjon", {
        description: "Vennligst velg ny dato og tid.",
      });
      return;
    }

    modifyBookingMutation.mutate({
      bookingId: parseInt(bookingId),
      phone: phone,
      newDate: format(selectedDate, "yyyy-MM-dd"),
      newTime: selectedTime,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container max-w-4xl py-8 px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Endre time</h1>
          <p className="text-gray-600">Endre dato eller tid for din time</p>
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

        {step === "modify" && bookingDetails && (
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Nåværende time</CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Velg ny dato og tid</CardTitle>
                <CardDescription>Velg når du ønsker den nye timen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base mb-3 block">Velg dato</Label>
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < new Date() || date < addDays(new Date(), -1)}
                      locale={nb}
                      className="rounded-md border shadow-sm"
                    />
                  </div>
                </div>

                {selectedDate && (
                  <div>
                    <Label className="text-base mb-3 block">Velg tid</Label>
                    {timeSlotsLoading ? (
                      <div className="text-center py-4">
                        <p className="text-gray-500">Laster tilgjengelige tider...</p>
                      </div>
                    ) : timeSlots.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-gray-500">Ingen ledige tider denne dagen</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {timeSlots.map((slot: any) => (
                          <Button
                            key={slot.time}
                            variant={selectedTime === slot.time ? "default" : "outline"}
                            onClick={() => setSelectedTime(slot.time)}
                            className="h-12"
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            {slot.time}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep("input")}
                    className="flex-1 h-12"
                  >
                    Avbryt
                  </Button>
                  <Button
                    onClick={handleModifyBooking}
                    disabled={!selectedDate || !selectedTime || modifyBookingMutation.isLoading}
                    className="flex-1 h-12"
                  >
                    {modifyBookingMutation.isLoading ? "Endrer..." : "Bekreft endring"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
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
                    Endring bekreftet
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Din time er nå endret. Du vil motta en bekreftelse på e-post hvis du oppga e-postadresse.
                  </p>
                  {selectedDate && selectedTime && (
                    <div className="bg-green-50 p-4 rounded-lg space-y-2 max-w-md mx-auto">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ny dato:</span>
                        <span className="font-semibold">
                          {selectedDate.toLocaleDateString("nb-NO")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Ny tid:</span>
                        <span className="font-semibold">{selectedTime}</span>
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => {
                    setStep("input");
                    setBookingId("");
                    setPhone("");
                    setBookingDetails(null);
                    setSelectedDate(undefined);
                    setSelectedTime(null);
                  }}
                  className="w-full h-12"
                >
                  Endre en annen time
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
