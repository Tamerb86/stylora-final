import React from "react";
import { Card } from "./ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { trpc } from "../lib/trpc";

interface AttendanceChartProps {
  startDate: string;
  endDate: string;
}

export default function AttendanceChart({ startDate, endDate }: AttendanceChartProps) {
  const { data: employeeTotals = [] } = trpc.attendance.getEmployeeTotals.useQuery({
    startDate,
    endDate,
  });

  // Prepare data for chart
  const chartData = employeeTotals.map((emp: any) => ({
    name: emp.employeeName || "Ukjent",
    timer: parseFloat(emp.totalHours || "0"),
    skift: emp.shiftCount || 0,
  }));

  // Sort by total hours descending
  chartData.sort((a, b) => b.timer - a.timer);

  // Take top 10 employees
  const topEmployees = chartData.slice(0, 10);

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4">Timefordeling per ansatt</h2>
      
      {topEmployees.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Ingen data tilgjengelig for valgt periode</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topEmployees}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={100}
              style={{ fontSize: "12px" }}
            />
            <YAxis 
              label={{ value: "Timer", angle: -90, position: "insideLeft" }}
              style={{ fontSize: "12px" }}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-white p-3 border rounded-lg shadow-lg">
                      <p className="font-semibold">{payload[0].payload.name}</p>
                      <p className="text-sm text-blue-600">
                        Timer: {payload[0].value} timer
                      </p>
                      <p className="text-sm text-orange-600">
                        Skift: {payload[0].payload.skift}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Bar dataKey="timer" fill="#3b82f6" name="Timer" />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Summary */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-900">
          <strong>Totalt:</strong> {chartData.reduce((sum, emp) => sum + emp.timer, 0).toFixed(1)} timer 
          fordelt på {chartData.length} ansatt(e)
        </p>
      </div>
    </Card>
  );
}
