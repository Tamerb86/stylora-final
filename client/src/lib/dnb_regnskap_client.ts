import { getDb } from "./db";
import { dnbRegnskapSettings } from "./dnb_regnskap_schema";
import { eq } from "drizzle-orm";

/**
 * DNB Regnskap API Client
 * 
 * This client handles communication with DNB Regnskap API
 * Based on OAuth 2.0 authentication
 */

interface DnbRegnskapConfig {
  clientId: string;
  clientSecret: string;
  companyId: string;
  organizationNumber: string;
  apiBaseUrl: string;
  environment: "production" | "sandbox";
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
}

export class DnbRegnskapClient {
  private config: DnbRegnskapConfig;
  private tenantId: string;

  constructor(config: DnbRegnskapConfig, tenantId: string) {
    this.config = config;
    this.tenantId = tenantId;
  }

  /**
   * Test connection to DNB Regnskap API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.ensureValidToken();
      
      const response = await fetch(`${this.config.apiBaseUrl}/companies/${this.config.companyId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json",
        },
      });

      return response.ok;
    } catch (error) {
      console.error("[DNB Regnskap] Connection test failed:", error);
      return false;
    }
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.config.accessToken || this.isTokenExpired()) {
      await this.refreshAccessToken();
    }
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(): boolean {
    if (!this.config.tokenExpiresAt) return true;
    return new Date() >= this.config.tokenExpiresAt;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<void> {
    if (!this.config.refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/oauth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: this.config.refreshToken,
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh token: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update tokens in config
      this.config.accessToken = data.access_token;
      this.config.refreshToken = data.refresh_token || this.config.refreshToken;
      this.config.tokenExpiresAt = new Date(Date.now() + data.expires_in * 1000);

      // Save tokens to database
      await this.saveTokens();
    } catch (error) {
      console.error("[DNB Regnskap] Token refresh failed:", error);
      throw error;
    }
  }

  /**
   * Save tokens to database
   */
  private async saveTokens(): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(dnbRegnskapSettings)
      .set({
        accessToken: this.config.accessToken,
        refreshToken: this.config.refreshToken,
        tokenExpiresAt: this.config.tokenExpiresAt,
      })
      .where(eq(dnbRegnskapSettings.tenantId, this.tenantId));
  }

  /**
   * Create a customer in DNB Regnskap
   */
  async createCustomer(customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    organizationNumber?: string;
  }): Promise<{ id: string; customerNumber: string }> {
    await this.ensureValidToken();

    const response = await fetch(`${this.config.apiBaseUrl}/companies/${this.config.companyId}/customers`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: {
          street: customer.address,
          postalCode: customer.postalCode,
          city: customer.city,
        },
        organizationNumber: customer.organizationNumber,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create customer: ${error}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      customerNumber: data.customerNumber,
    };
  }

  /**
   * Create an invoice in DNB Regnskap
   */
  async createInvoice(invoice: {
    customerId: string;
    invoiceDate: string;
    dueDate: string;
    lines: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      vatCode: string;
      accountCode: string;
    }>;
    reference?: string;
  }): Promise<{ id: string; invoiceNumber: string }> {
    await this.ensureValidToken();

    const response = await fetch(`${this.config.apiBaseUrl}/companies/${this.config.companyId}/invoices`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerId: invoice.customerId,
        invoiceDate: invoice.invoiceDate,
        dueDate: invoice.dueDate,
        lines: invoice.lines.map(line => ({
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          vatCode: line.vatCode,
          accountCode: line.accountCode,
        })),
        reference: invoice.reference,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create invoice: ${error}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      invoiceNumber: data.invoiceNumber,
    };
  }

  /**
   * Register a payment for an invoice
   */
  async registerPayment(payment: {
    invoiceId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    reference?: string;
  }): Promise<{ id: string }> {
    await this.ensureValidToken();

    const response = await fetch(
      `${this.config.apiBaseUrl}/companies/${this.config.companyId}/invoices/${payment.invoiceId}/payments`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          paymentMethod: payment.paymentMethod,
          reference: payment.reference,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to register payment: ${error}`);
    }

    const data = await response.json();
    return { id: data.id };
  }

  /**
   * Create a credit note (for refunds)
   */
  async createCreditNote(creditNote: {
    invoiceId: string;
    amount: number;
    reason: string;
    creditNoteDate: string;
  }): Promise<{ id: string; creditNoteNumber: string }> {
    await this.ensureValidToken();

    const response = await fetch(
      `${this.config.apiBaseUrl}/companies/${this.config.companyId}/credit-notes`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceId: creditNote.invoiceId,
          amount: creditNote.amount,
          reason: creditNote.reason,
          creditNoteDate: creditNote.creditNoteDate,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create credit note: ${error}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      creditNoteNumber: data.creditNoteNumber,
    };
  }

  /**
   * Get invoice status
   */
  async getInvoiceStatus(invoiceId: string): Promise<{
    status: string;
    isPaid: boolean;
    paidAmount: number;
    remainingAmount: number;
  }> {
    await this.ensureValidToken();

    const response = await fetch(
      `${this.config.apiBaseUrl}/companies/${this.config.companyId}/invoices/${invoiceId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.config.accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get invoice status: ${error}`);
    }

    const data = await response.json();
    return {
      status: data.status,
      isPaid: data.isPaid,
      paidAmount: data.paidAmount,
      remainingAmount: data.remainingAmount,
    };
  }
}

/**
 * Get DNB Regnskap client for a tenant
 */
export async function getDnbRegnskapClient(tenantId: string): Promise<DnbRegnskapClient> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [settings] = await db
    .select()
    .from(dnbRegnskapSettings)
    .where(eq(dnbRegnskapSettings.tenantId, tenantId))
    .limit(1);

  if (!settings || !settings.enabled) {
    throw new Error("DNB Regnskap integration not configured or disabled");
  }

  if (!settings.clientId || !settings.clientSecret || !settings.companyId) {
    throw new Error("DNB Regnskap credentials not configured");
  }

  const config: DnbRegnskapConfig = {
    clientId: settings.clientId,
    clientSecret: settings.clientSecret,
    companyId: settings.companyId,
    organizationNumber: settings.organizationNumber || "",
    apiBaseUrl: settings.apiBaseUrl || "https://api.dnb.no/regnskap/v1",
    environment: settings.environment,
    accessToken: settings.accessToken || undefined,
    refreshToken: settings.refreshToken || undefined,
    tokenExpiresAt: settings.tokenExpiresAt || undefined,
  };

  return new DnbRegnskapClient(config, tenantId);
}
