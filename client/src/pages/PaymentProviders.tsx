            className="w-full"
          >
            {addProvider.isPending || updateProvider.isPending ? "Lagrer..." : "Lagre"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>  return (
    <DashboardLayout>
      <div className="container mx-auto py-8 max-w-6xl">    <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Betalingsterminaler
          </h1>
          <p className="text-muted-foreground mt-2">
            Administrer terminaler og betalingsmetoder