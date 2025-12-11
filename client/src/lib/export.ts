import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { expenses, appointments, appointmentServices, services as servicesTable, customers } from "../drizzle/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// PDF generation using simple HTML template
async function generateFinancialPDF(data: {
  tenantId: string;
  startDate: string;
  endDate: string;
  summary: { revenue: number; expenses: number; profit: number; profitMargin: number };
  expensesByCategory: Array<{ category: string; total: string }>;
  salonName?: string;
}) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #1e40af; padding-bottom: 20px; }
    .header h1 { margin: 0; color: #1e40af; font-size: 32px; }
    .header p { margin: 5px 0; color: #666; }
    .period { text-align: center; font-size: 14px; color: #666; margin-bottom: 30px; }
    .summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 40px; }
    .summary-card { border: 2px solid #e5e7eb; border-radius: 8px; padding: 20px; }
    .summary-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; text-transform: uppercase; }
    .summary-card .value { font-size: 28px; font-weight: bold; margin: 0; }
    .summary-card .value.positive { color: #16a34a; }
    .summary-card .value.negative { color: #dc2626; }
    .breakdown { margin-top: 40px; }
    .breakdown h2 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; margin-bottom: 20px; }
    .breakdown-item { display: flex; justify-between; padding: 12px; border-bottom: 1px solid #e5e7eb; }
    .breakdown-item:last-child { border-bottom: none; }
    .breakdown-item .category { font-weight: 500; }
    .breakdown-item .amount { color: #dc2626; font-weight: bold; }
    .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #e5e7eb; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.salonName || "BarberTime"}</h1>
    <p>Finansiell rapport</p>
  </div>
  
  <div class="period">
    Periode: ${data.startDate} til ${data.endDate}