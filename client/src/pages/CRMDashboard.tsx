import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Mail,
  Gift,
  Tag,
  MessageSquare,
  TrendingUp,
  UserPlus,
  Star,
} from "lucide-react";

export default function CRMDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // Queries
  const { data: segments } = trpc.crm.getSegments.useQuery();
  const { data: campaigns } = trpc.crm.getCampaigns.useQuery();
  const { data: promoCodes } = trpc.crm.getPromoCodes.useQuery();
  const { data: giftCards } = trpc.crm.getGiftCards.useQuery();
  const { data: feedback } = trpc.crm.getFeedback.useQuery();
  const { data: npsStats } = trpc.crm.getNpsStats.useQuery({});

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">CRM & Markedsføring</h1>
        <p className="text-gray-600 mt-1">
          Administrer kundeforhold og markedsføringskampanjer
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Kundesegmenter</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{segments?.length || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Aktive segmenter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Kampanjer</CardTitle>
            <Mail className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns?.length || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {campaigns?.filter((c) => c.status === "sent").length || 0} sendt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Kampanjekoder</CardTitle>
            <Tag className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{promoCodes?.length || 0}</div>
            <p className="text-xs text-gray-500 mt-1">
              {promoCodes?.filter((p) => p.isActive).length || 0} aktive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">NPS Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {npsStats?.npsScore || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {npsStats?.total || 0} svar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Oversikt</TabsTrigger>
          <TabsTrigger value="segments">Segmenter</TabsTrigger>
          <TabsTrigger value="campaigns">Kampanjer</TabsTrigger>
          <TabsTrigger value="promo">Kampanjekoder</TabsTrigger>
          <TabsTrigger value="giftcards">Gavekort</TabsTrigger>
          <TabsTrigger value="feedback">Tilbakemeldinger</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Campaigns */}
            <Card>
              <CardHeader>
                <CardTitle>Siste kampanjer</CardTitle>
                <CardDescription>Nylig sendte kampanjer</CardDescription>
              </CardHeader>
              <CardContent>
                {campaigns && campaigns.length > 0 ? (
                  <div className="space-y-3">
                    {campaigns.slice(0, 5).map((campaign) => (
                      <div
                        key={campaign.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-sm text-gray-500">
                            {campaign.type === "email" && "📧 E-post"}
                            {campaign.type === "sms" && "📱 SMS"}
                            {campaign.type === "both" && "📧📱 E-post & SMS"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {campaign.sentCount}/{campaign.totalRecipients}
                          </p>
                          <p className="text-xs text-gray-500">
                            {campaign.status === "sent" && "✅ Sendt"}
                            {campaign.status === "sending" && "⏳ Sender"}
                            {campaign.status === "draft" && "📝 Utkast"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Ingen kampanjer ennå
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent Feedback */}
            <Card>
              <CardHeader>
                <CardTitle>Siste tilbakemeldinger</CardTitle>
                <CardDescription>Kundetilbakemeldinger</CardDescription>
              </CardHeader>
              <CardContent>
                {feedback && feedback.length > 0 ? (
                  <div className="space-y-3">
                    {feedback.slice(0, 5).map((item) => (
                      <div
                        key={item.feedback.id}
                        className="flex items-start gap-3 p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{item.customer.name}</p>
                            {item.feedback.rating && (
                              <div className="flex">
                                {[...Array(item.feedback.rating)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className="h-3 w-3 fill-yellow-400 text-yellow-400"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {item.feedback.message?.substring(0, 100)}...
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(item.feedback.createdAt).toLocaleDateString("nb-NO")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Ingen tilbakemeldinger ennå
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* NPS Details */}
          {npsStats && npsStats.total > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>NPS Analyse</CardTitle>
                <CardDescription>Net Promoter Score detaljer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-3xl font-bold text-green-600">
                      {npsStats.npsScore}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">NPS Score</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-3xl font-bold text-green-600">
                      {npsStats.promoters}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Promotere (9-10)</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-3xl font-bold text-yellow-600">
                      {npsStats.passives}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Passive (7-8)</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-3xl font-bold text-red-600">
                      {npsStats.detractors}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">Kritikere (0-6)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Segments Tab */}
        <TabsContent value="segments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Kundesegmenter</CardTitle>
                  <CardDescription>
                    Organiser kunder i segmenter for målrettet markedsføring
                  </CardDescription>
                </div>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Nytt segment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {segments && segments.length > 0 ? (
                <div className="space-y-3">
                  {segments.map((segment) => (
                    <div
                      key={segment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-medium">{segment.name}</p>
                        <p className="text-sm text-gray-600">
                          {segment.description}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {segment.type === "static" && "📌 Statisk"}
                          {segment.type === "dynamic" && "🔄 Dynamisk"}
                          {" • "}
                          {segment.customerCount} kunder
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Vis detaljer
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Ingen segmenter ennå</p>
                  <Button>Opprett ditt første segment</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Markedsføringskampanjer</CardTitle>
                  <CardDescription>
                    Send e-post og SMS kampanjer til kundene dine
                  </CardDescription>
                </div>
                <Button>
                  <Mail className="h-4 w-4 mr-2" />
                  Ny kampanje
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {campaigns && campaigns.length > 0 ? (
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{campaign.name}</p>
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                campaign.status === "sent"
                                  ? "bg-green-100 text-green-700"
                                  : campaign.status === "sending"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {campaign.status === "sent" && "Sendt"}
                              {campaign.status === "sending" && "Sender"}
                              {campaign.status === "draft" && "Utkast"}
                              {campaign.status === "scheduled" && "Planlagt"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {campaign.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>
                              {campaign.type === "email" && "📧 E-post"}
                              {campaign.type === "sms" && "📱 SMS"}
                              {campaign.type === "both" && "📧📱 E-post & SMS"}
                            </span>
                            <span>
                              {campaign.totalRecipients} mottakere
                            </span>
                            {campaign.sentAt && (
                              <span>
                                Sendt:{" "}
                                {new Date(campaign.sentAt).toLocaleDateString("nb-NO")}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Vis detaljer
                        </Button>
                      </div>

                      {/* Campaign Stats */}
                      {campaign.status === "sent" && (
                        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
                          <div className="text-center">
                            <p className="text-2xl font-bold">
                              {campaign.sentCount}
                            </p>
                            <p className="text-xs text-gray-600">Sendt</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">
                              {campaign.deliveredCount}
                            </p>
                            <p className="text-xs text-gray-600">Levert</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">
                              {campaign.openedCount}
                            </p>
                            <p className="text-xs text-gray-600">Åpnet</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold">
                              {campaign.clickedCount}
                            </p>
                            <p className="text-xs text-gray-600">Klikket</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Ingen kampanjer ennå</p>
                  <Button>Opprett din første kampanje</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Promo Codes Tab */}
        <TabsContent value="promo" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Kampanjekoder</CardTitle>
                  <CardDescription>
                    Administrer rabattkoder og kampanjer
                  </CardDescription>
                </div>
                <Button>
                  <Tag className="h-4 w-4 mr-2" />
                  Ny kampanjekode
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {promoCodes && promoCodes.length > 0 ? (
                <div className="space-y-3">
                  {promoCodes.map((code) => (
                    <div
                      key={code.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-mono font-bold text-lg">
                            {code.code}
                          </p>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              code.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {code.isActive ? "Aktiv" : "Inaktiv"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {code.description}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {code.discountType === "percentage" &&
                            `${code.discountValue}% rabatt`}
                          {code.discountType === "fixed_amount" &&
                            `${code.discountValue} kr rabatt`}
                          {code.discountType === "free_service" &&
                            "Gratis tjeneste"}
                          {" • "}
                          Brukt: {code.usageCount}
                          {code.usageLimit && `/${code.usageLimit}`}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Rediger
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Ingen kampanjekoder ennå</p>
                  <Button>Opprett din første kampanjekode</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gift Cards Tab */}
        <TabsContent value="giftcards" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gavekort</CardTitle>
                  <CardDescription>
                    Administrer gavekort og saldo
                  </CardDescription>
                </div>
                <Button>
                  <Gift className="h-4 w-4 mr-2" />
                  Nytt gavekort
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {giftCards && giftCards.length > 0 ? (
                <div className="space-y-3">
                  {giftCards.map((card) => (
                    <div
                      key={card.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-mono font-bold">{card.code}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {card.recipientName && `Til: ${card.recipientName}`}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          Saldo: {card.currentBalance} kr av {card.initialValue} kr
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 text-sm rounded-full ${
                          card.status === "active"
                            ? "bg-green-100 text-green-700"
                            : card.status === "used"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {card.status === "active" && "Aktiv"}
                        {card.status === "used" && "Brukt"}
                        {card.status === "expired" && "Utløpt"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Ingen gavekort ennå</p>
                  <Button>Opprett ditt første gavekort</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kundetilbakemeldinger</CardTitle>
              <CardDescription>
                Administrer og svar på kundetilbakemeldinger
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feedback && feedback.length > 0 ? (
                <div className="space-y-4">
                  {feedback.map((item) => (
                    <div
                      key={item.feedback.id}
                      className="p-4 border rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{item.customer.name}</p>
                            {item.feedback.rating && (
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < item.feedback.rating!
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                            <span
                              className={`px-2 py-1 text-xs rounded-full ${
                                item.feedback.type === "compliment"
                                  ? "bg-green-100 text-green-700"
                                  : item.feedback.type === "complaint"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {item.feedback.type === "review" && "Anmeldelse"}
                              {item.feedback.type === "complaint" && "Klage"}
                              {item.feedback.type === "suggestion" && "Forslag"}
                              {item.feedback.type === "compliment" && "Ros"}
                            </span>
                          </div>
                          {item.feedback.subject && (
                            <p className="font-medium mt-2">
                              {item.feedback.subject}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 mt-1">
                            {item.feedback.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(item.feedback.createdAt).toLocaleDateString(
                              "nb-NO",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        </div>
                        {item.feedback.status === "pending" && (
                          <Button size="sm">Svar</Button>
                        )}
                      </div>

                      {/* Response */}
                      {item.feedback.responseMessage && (
                        <div className="mt-4 pt-4 border-t bg-gray-50 p-3 rounded">
                          <p className="text-sm font-medium mb-1">Svar:</p>
                          <p className="text-sm text-gray-700">
                            {item.feedback.responseMessage}
                          </p>
                          {item.feedback.respondedAt && (
                            <p className="text-xs text-gray-500 mt-2">
                              {new Date(
                                item.feedback.respondedAt
                              ).toLocaleDateString("nb-NO")}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Ingen tilbakemeldinger ennå</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
