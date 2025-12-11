import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Login form
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // Register form
  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    businessName: "",
    businessType: "salon",
    phone: "",
  });

  // Reset form
  const [resetEmail, setResetEmail] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await trpc.saas.auth.login.mutate(loginData);
      
      // Store session
      localStorage.setItem("sessionToken", result.sessionToken);
      localStorage.setItem("tenantId", result.tenantId);
      localStorage.setItem("userId", result.userId.toString());
      localStorage.setItem("userRole", result.role);

      toast.success("Velkommen tilbake!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Innlogging mislyktes");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (registerData.password !== registerData.confirmPassword) {
      toast.error("Passordene stemmer ikke overens");
      return;
    }

    if (registerData.password.length < 8) {
      toast.error("Passordet må være minst 8 tegn");
      return;
    }

    setLoading(true);

    try {
      const result = await trpc.saas.auth.register.mutate({
        email: registerData.email,
        password: registerData.password,
        name: registerData.name,
        businessName: registerData.businessName,
        businessType: registerData.businessType,
        phone: registerData.phone,
      });

      // Store session
      localStorage.setItem("sessionToken", result.sessionToken);
      localStorage.setItem("tenantId", result.tenantId);
      localStorage.setItem("userId", result.userId.toString());

      toast.success("Konto opprettet! Du har 14 dagers gratis prøveperiode.");
      navigate("/onboarding");
    } catch (error: any) {
      toast.error(error.message || "Registrering mislyktes");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await trpc.saas.auth.requestPasswordReset.mutate({ email: resetEmail });
      toast.success("Tilbakestillings-e-post sendt! Sjekk innboksen din.");
      setMode("login");
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke sende e-post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-purple-800 p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="text-white space-y-6 hidden lg:block">
          <div className="flex items-center gap-3">
            <Sparkles className="h-12 w-12" />
            <h1 className="text-5xl font-bold">Stylora</h1>
          </div>
          <p className="text-2xl font-light">
            Alt-i-ett salongstyringssystem
          </p>
          <div className="space-y-4 mt-8">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-lg">Timebestilling</h3>
                <p className="text-white/80">Online booking 24/7 for kundene dine</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-lg">Kundeadministrasjon</h3>
                <p className="text-white/80">Hold oversikt over alle kundene dine</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-lg">Rapporter & Analyser</h3>
                <p className="text-white/80">Få innsikt i virksomheten din</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-lg">CRM & Markedsføring</h3>
                <p className="text-white/80">Bygg relasjoner og øk salget</p>
              </div>
            </div>
          </div>
          <div className="pt-8">
            <p className="text-lg font-semibold">🎉 14 dagers gratis prøveperiode</p>
            <p className="text-white/80">Ingen kredittkort påkrevd</p>
          </div>
        </div>

        {/* Right side - Forms */}
        <Card className="w-full shadow-2xl">
          {mode === "login" && (
            <>
              <CardHeader>
                <CardTitle className="text-2xl">Logg inn</CardTitle>
                <CardDescription>
                  Velkommen tilbake til Stylora
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="email">E-post</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="din@epost.no"
                      value={loginData.email}
                      onChange={(e) =>
                        setLoginData({ ...loginData, email: e.target.value })
                      }
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Passord</Label>
                    <div className="relative mt-1">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) =>
                          setLoginData({ ...loginData, password: e.target.value })
                        }
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Logger inn...
                      </>
                    ) : (
                      "Logg inn"
                    )}
                  </Button>
                </form>
                <div className="mt-6 space-y-3 text-center">
                  <Button
                    variant="link"
                    onClick={() => setMode("reset")}
                    className="text-sm"
                  >
                    Glemt passord?
                  </Button>
                  <div className="text-sm text-gray-600">
                    Har du ikke konto?{" "}
                    <Button
                      variant="link"
                      onClick={() => setMode("register")}
                      className="p-0 font-semibold"
                    >
                      Registrer deg gratis
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {mode === "register" && (
            <>
              <CardHeader>
                <CardTitle className="text-2xl">Opprett konto</CardTitle>
                <CardDescription>
                  Start din 14 dagers gratis prøveperiode
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Ditt navn</Label>
                      <Input
                        id="name"
                        placeholder="Ola Nordmann"
                        value={registerData.name}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, name: e.target.value })
                        }
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="businessName">Bedriftsnavn</Label>
                      <Input
                        id="businessName"
                        placeholder="Min Salong"
                        value={registerData.businessName}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            businessName: e.target.value,
                          })
                        }
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="reg-email">E-post</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="din@epost.no"
                      value={registerData.email}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, email: e.target.value })
                      }
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+47 123 45 678"
                      value={registerData.phone}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, phone: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="reg-password">Passord</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="Min. 8 tegn"
                        value={registerData.password}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            password: e.target.value,
                          })
                        }
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirm-password">Bekreft passord</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Gjenta passord"
                        value={registerData.confirmPassword}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            confirmPassword: e.target.value,
                          })
                        }
                        required
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Oppretter konto...
                      </>
                    ) : (
                      "Start gratis prøveperiode"
                    )}
                  </Button>
                </form>
                <div className="mt-6 text-center">
                  <div className="text-sm text-gray-600">
                    Har du allerede konto?{" "}
                    <Button
                      variant="link"
                      onClick={() => setMode("login")}
                      className="p-0 font-semibold"
                    >
                      Logg inn
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {mode === "reset" && (
            <>
              <CardHeader>
                <CardTitle className="text-2xl">Tilbakestill passord</CardTitle>
                <CardDescription>
                  Vi sender deg en e-post med instruksjoner
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div>
                    <Label htmlFor="reset-email">E-post</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="din@epost.no"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className="mt-1"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sender...
                      </>
                    ) : (
                      "Send tilbakestillings-e-post"
                    )}
                  </Button>
                </form>
                <div className="mt-6 text-center">
                  <Button
                    variant="link"
                    onClick={() => setMode("login")}
                    className="text-sm"
                  >
                    Tilbake til innlogging
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
