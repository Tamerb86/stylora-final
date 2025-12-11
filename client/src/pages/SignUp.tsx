                      </h4>
                      <div className="pl-7 space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Salongnavn:</span> {formData.salonName}</p>
                        <p><span className="text-muted-foreground">Type:</span> {salonTypes.find(t => t.id === formData.salonType)?.label}</p>
                        <p><span className="text-muted-foreground">Adresse:</span> {formData.address}</p>
                        {formData.orgNumber && (
                          <p><span className="text-muted-foreground">Org.nr:</span> {formData.orgNumber}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Kontaktperson
                      </h4>
                      <div className="pl-7 space-y-1 text-sm">
                        <p><span className="text-muted-foreground">Navn:</span> {formData.ownerName}</p>
                        <p><span className="text-muted-foreground">E-post:</span> {formData.ownerEmail}</p>
                        <p><span className="text-muted-foreground">Telefon:</span> {formData.ownerPhone}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        Valgt plan
                      </h4>
                      <div className="pl-7 text-sm">
                        <p>
                          <span className="font-semibold">{plans.find(p => p.id === formData.selectedPlan)?.name}</span>
                          {" - "}
                          <span className="text-muted-foreground">
                            {plans.find(p => p.id === formData.selectedPlan)?.price} kr/mnd
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                          14 dagers gratis prøveperiode
                        </p>
                        <p className="text-blue-700 dark:text-blue-300">
                          Du vil ikke bli belastet før prøveperioden er over. Du kan avslutte når som helst.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex gap-4 pt-4">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={createTenant.isPending}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Tilbake
                  </Button>
                )}
                
                {currentStep < 4 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white"
                  >
                    Neste
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={createTenant.isPending}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600 text-white"
                  >
                    {createTenant.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Oppretter konto...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Opprett konto
                      </>
                    )}
                  </Button>
                )}
              </div>