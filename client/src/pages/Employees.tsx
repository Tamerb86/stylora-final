                <div className="space-y-2">
                  <Label htmlFor="create-name">Navn *</Label>
                  <Input
                    id="create-name"
                    required
                    value={createFormData.name}
                    onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-email">E-post</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={createFormData.email}
                    onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-phone">Telefon</Label>
                  <Input
                    id="create-phone"
                    value={createFormData.phone}
                    onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-role">Rolle</Label>
                  <Select value={createFormData.role} onValueChange={(value: any) => setCreateFormData({ ...createFormData, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Behandler</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-commissionType">Provisjonstype</Label>
                    <Select value={createFormData.commissionType} onValueChange={(value: any) => setCreateFormData({ ...createFormData, commissionType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Prosent</SelectItem>
                        <SelectItem value="fixed">Fast beløp</SelectItem>
                        <SelectItem value="tiered">Trinnvis</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-commissionRate">Provisjonssats</Label>
                    <Input
                      id="create-commissionRate"
                      type="number"
                      step="0.01"
                      value={createFormData.commissionRate}
                      onChange={(e) => setCreateFormData({ ...createFormData, commissionRate: e.target.value })}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Avbryt
                  </Button>
                  <Button type="submit" disabled={createEmployee.isPending}>
                    {createEmployee.isPending ? "Oppretter..." : "Opprett ansatt"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>