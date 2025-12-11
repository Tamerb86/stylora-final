import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Calendar,
  Heart,
  CreditCard,
  Gift,
  Star,
  Clock,
  MapPin,
  Phone,
  Mail,
  Edit,
  LogOut,
} from "lucide-react";

export default function CustomerPortal() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoggedIn, setIsLoggedIn] = useState(true); // Mock - replace with actual auth

  // Mock customer data - replace with actual TRPC queries
  const customer = {
    id: 1,
    name: "Anna Larsen",
    email: "anna.larsen@example.com",
    phone: "+47 123 45 678",
    memberSince: "2023-01-15",
    loyaltyPoints: 450,
    totalBookings: 24,
    totalSpent: 18500,
  };

  const upcomingBookings = [
    {
      id: 1,
      service: "Klipp og farge",
      employee: "Emma Hansen",
      date: "2025-12-15",
      time: "14:00",
      duration: "2 timer",
      price: 1200,
      status: "confirmed",
    },
    {
      id: 2,
      service: "Ansiktsbehandling",
      employee: "Sofia Berg",
      date: "2025-12-20",
      time: "10:30",
      duration: "1 time",
      price: 800,
      status: "confirmed",
    },
  ];

  const pastBookings = [
    {
      id: 3,
      service: "Klipp",
      employee: "Lars Olsen",
      date: "2025-11-28",
      time: "15:00",
      price: 600,
      rating: 5,
    },
    {
      id: 4,
      service: "Farge",
      employee: "Emma Hansen",
      date: "2025-11-10",
      time: "13:00",
      price: 900,
      rating: 5,
    },
  ];

  const favoriteServices = [
    { id: 1, name: "Klipp og farge", price: 1200, timesBooked: 8 },
    { id: 2, name: "Ansiktsbehandling", price: 800, timesBooked: 5 },
    { id: 3, name: "Klipp", price: 600, timesBooked: 11 },
  ];

  const favoriteEmployees = [
    { id: 1, name: "Emma Hansen", role: "Senior Stylist", rating: 5, timesBooked: 12 },
    { id: 2, name: "Lars Olsen", role: "Stylist", rating: 5, timesBooked: 7 },
  ];

  const savedPaymentMethods = [
    {
      id: 1,
      type: "card",
      brand: "Visa",
      last4: "4242",
      expiryMonth: 12,
      expiryYear: 2026,
      isDefault: true,
    },
    {
      id: 2,
      type: "vipps",
      phone: "+47 123 45 678",
      isDefault: false,
    },
  ];

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Logg inn</CardTitle>
            <CardDescription>
              Få tilgang til din kundeportal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">E-post</label>
              <Input type="email" placeholder="din@epost.no" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Passord</label>
              <Input type="password" placeholder="••••••••" className="mt-1" />
            </div>
            <Button className="w-full" onClick={() => setIsLoggedIn(true)}>
              Logg inn
            </Button>
            <div className="text-center space-y-2">
              <Button variant="link" className="text-sm">
                Glemt passord?
              </Button>
              <p className="text-sm text-gray-600">
                Har du ikke konto?{" "}
                <Button variant="link" className="p-0">
                  Registrer deg
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl">
                {customer.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-xl font-bold">{customer.name}</h1>
                <p className="text-sm text-gray-600">Medlem siden {new Date(customer.memberSince).toLocaleDateString("no-NO")}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setIsLoggedIn(false)}>
              <LogOut className="h-4 w-4 mr-2" />
              Logg ut
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Lojalitetspoeng</CardTitle>
              <Gift className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {customer.loyaltyPoints}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                = {customer.loyaltyPoints * 0.1} kr rabatt
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Totale bestillinger</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{customer.totalBookings}</div>
              <p className="text-xs text-gray-500 mt-1">Siden du ble medlem</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Totalt brukt</CardTitle>
              <CreditCard className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {customer.totalSpent.toLocaleString()} kr
              </div>
              <p className="text-xs text-gray-500 mt-1">Livstidsverdi</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white">
            <TabsTrigger value="overview">Oversikt</TabsTrigger>
            <TabsTrigger value="bookings">Mine bestillinger</TabsTrigger>
            <TabsTrigger value="favorites">Favoritter</TabsTrigger>
            <TabsTrigger value="payment">Betalingsmetoder</TabsTrigger>
            <TabsTrigger value="profile">Min profil</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Upcoming Bookings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-500" />
                    Kommende bestillinger
                  </CardTitle>
                  <CardDescription>Dine neste avtaler</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="p-4 border rounded-lg bg-blue-50"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-lg">{booking.service}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              med {booking.employee}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(booking.date).toLocaleDateString("no-NO")}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {booking.time}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{booking.price} kr</p>
                            <div className="flex gap-2 mt-2">
                              <Button size="sm" variant="outline">
                                Endre
                              </Button>
                              <Button size="sm" variant="outline">
                                Avbestill
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full mt-4">
                    Book ny time
                  </Button>
                </CardContent>
              </Card>

              {/* Favorite Services */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Favoritt tjenester
                  </CardTitle>
                  <CardDescription>Dine mest brukte tjenester</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {favoriteServices.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-sm text-gray-600">
                            Bestilt {service.timesBooked} ganger
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{service.price} kr</p>
                          <Button size="sm" className="mt-2">
                            Book nå
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Bestillingshistorikk</CardTitle>
                <CardDescription>Alle dine tidligere bestillinger</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pastBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-lg">{booking.service}</p>
                        <p className="text-sm text-gray-600">med {booking.employee}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(booking.date).toLocaleDateString("no-NO")} kl {booking.time}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{booking.price} kr</p>
                        <div className="flex items-center gap-1 mt-2">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < booking.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <Button size="sm" variant="outline" className="mt-2">
                          Book igjen
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Favorite Employees */}
              <Card>
                <CardHeader>
                  <CardTitle>Favoritt ansatte</CardTitle>
                  <CardDescription>Dine foretrukne stylister</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {favoriteEmployees.map((emp) => (
                      <div
                        key={emp.id}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-lg">{emp.name}</p>
                            <p className="text-sm text-gray-600">{emp.role}</p>
                            <div className="flex items-center gap-1 mt-2">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className="h-4 w-4 fill-yellow-400 text-yellow-400"
                                />
                              ))}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              Bestilt {emp.timesBooked} ganger
                            </p>
                          </div>
                          <Button size="sm">Book time</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Favorite Services */}
              <Card>
                <CardHeader>
                  <CardTitle>Favoritt tjenester</CardTitle>
                  <CardDescription>Hurtigbestilling</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {favoriteServices.map((service) => (
                      <div
                        key={service.id}
                        className="p-4 border rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-lg">{service.name}</p>
                            <p className="text-sm text-gray-600">
                              {service.price} kr
                            </p>
                          </div>
                          <Button size="sm">Book nå</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="payment" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Betalingsmetoder</CardTitle>
                    <CardDescription>
                      Administrer lagrede betalingsmetoder
                    </CardDescription>
                  </div>
                  <Button>Legg til ny</Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {savedPaymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className="p-4 border rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                          <CreditCard className="h-6 w-6 text-gray-600" />
                        </div>
                        <div>
                          {method.type === "card" ? (
                            <>
                              <p className="font-medium">
                                {method.brand} •••• {method.last4}
                              </p>
                              <p className="text-sm text-gray-600">
                                Utløper {method.expiryMonth}/{method.expiryYear}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="font-medium">Vipps</p>
                              <p className="text-sm text-gray-600">{method.phone}</p>
                            </>
                          )}
                          {method.isDefault && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full mt-1 inline-block">
                              Standard
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!method.isDefault && (
                          <Button variant="outline" size="sm">
                            Sett som standard
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          Fjern
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Min profil</CardTitle>
                <CardDescription>
                  Administrer din personlige informasjon
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Navn
                    </label>
                    <Input value={customer.name} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      E-post
                    </label>
                    <Input value={customer.email} type="email" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Telefon
                    </label>
                    <Input value={customer.phone} type="tel" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Adresse
                    </label>
                    <Input placeholder="Din adresse" className="mt-1" />
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button>
                    <Edit className="h-4 w-4 mr-2" />
                    Lagre endringer
                  </Button>
                  <Button variant="outline">Endre passord</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
