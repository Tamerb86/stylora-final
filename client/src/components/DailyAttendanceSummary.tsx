import React from "react";
import { Card } from "./ui/card";
import { Clock, Users, TrendingUp, AlertCircle } from "lucide-react";
import { trpc } from "../lib/trpc";

export default function DailyAttendanceSummary() {
  const today = new Date().toISOString().split("T")[0];

  // Fetch today's timesheets
  const { data: todayTimesheets = [] } = trpc.attendance.getAllTimesheets.useQuery({
    startDate: today,
    endDate: today,
  });

  // Fetch today's employee totals
  const { data: todayTotals = [] } = trpc.attendance.getEmployeeTotals.useQuery({
    startDate: today,
    endDate: today,
  });

  // Calculate statistics
  const totalEmployees = todayTotals.length;
  const activeEmployees = todayTimesheets.filter((t: any) => !t.clockOut).length;
  const totalHoursToday = todayTotals.reduce(
    (sum: number, emp: any) => sum + parseFloat(emp.totalHours || "0"),
    0
  );
  const averageHours = totalEmployees > 0 ? totalHoursToday / totalEmployees : 0;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Dagens oppmøte</h2>
        <Clock className="w-5 h-5 text-muted-foreground" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Employees */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-600" />
            <p className="text-sm text-blue-900 font-medium">Totalt ansatte</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">{totalEmployees}</p>
          <p className="text-xs text-blue-700 mt-1">på jobb i dag</p>
        </div>

        {/* Active Employees */}
        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-900 font-medium">Aktive nå</p>
          </div>
          <p className="text-2xl font-bold text-green-600">{activeEmployees}</p>
          <p className="text-xs text-green-700 mt-1">ikke stemplet ut</p>
        </div>

        {/* Total Hours Today */}
        <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <p className="text-sm text-orange-900 font-medium">Totale timer</p>
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {totalHoursToday.toFixed(1)}
          </p>
          <p className="text-xs text-orange-700 mt-1">timer i dag</p>
        </div>

        {/* Average Hours */}
        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            <p className="text-sm text-purple-900 font-medium">Gjennomsnitt</p>
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {averageHours.toFixed(1)}
          </p>
          <p className="text-xs text-purple-700 mt-1">timer per ansatt</p>
        </div>
      </div>

      {/* Active Employees List */}
      {activeEmployees > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium text-yellow-900 mb-2">
            ⚠️ {activeEmployees} ansatt(e) er fortsatt stemplet inn
          </p>
          <div className="space-y-1">
            {todayTimesheets
              .filter((t: any) => !t.clockOut)
              .map((t: any) => (
                <p key={t.id} className="text-xs text-yellow-800">
                  • {t.employeeName} - Stemplet inn:{" "}
                  {new Date(t.clockIn).toLocaleTimeString("no-NO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              ))}
          </div>
        </div>
      )}
    </Card>
  );
}
