      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inntekter</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary?.revenue || 0)}</div>
            <p className="text-xs text-muted-foreground">Fra fullførte avtaler</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utgifter</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary?.expenses || 0)}</div>
            <p className="text-xs text-muted-foreground">Totale utgifter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fortjeneste</CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(summary?.profit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(summary?.profit || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Netto resultat</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margin</CardTitle>
            <PieChart className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(summary?.profitMargin || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {(summary?.profitMargin || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Fortjenestemargin</p>
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Utgifter per kategori</CardTitle>
          <CardDescription>Fordeling av utgifter i valgt periode</CardDescription>
        </CardHeader>
        <CardContent>
          {expensesByCategory && expensesByCategory.length > 0 ? (
            <div className="space-y-4">
              {expensesByCategory.map((item) => {
                const category = EXPENSE_CATEGORIES.find((c) => c.value === item.category);
                const percentage = summary?.expenses ? (parseFloat(item.total) / summary.expenses) * 100 : 0;

                return (
                  <div key={item.category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{category?.label || item.category}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(parseFloat(item.total))} ({percentage.toFixed(1)}%)