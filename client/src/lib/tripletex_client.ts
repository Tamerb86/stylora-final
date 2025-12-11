import { getDb } from "./db";
import { tripletexSettings } from "./tripletex_schema";
import { eq } from "drizzle-orm";

/**
 * Tripletex API Client
 * 
 * Client for interacting with Tripletex API v2
 * Documentation: https://tripletex.no/v2-docs/
 */

export class TripletexClient {
  private baseUrl: string;
  private consumerToken: string;
  private employeeToken: string;
  private sessionToken?: string;
  private companyId: string;

  constructor(config: {
    baseUrl: string;
    consumerToken: string;
    employeeToken: string;
    sessionToken?: string;
    companyId?: string;
  }) {
    this.baseUrl = config.baseUrl;
    this.consumerToken = config.consumerToken;
    this.employeeToken = config.employeeToken;
    this.sessionToken = config.sessionToken;
    this.companyId = config.companyId || "0"; // 0 = current company
  }

  /**
   * Create session token
   */
  async createSession(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/token/session/:create`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        consumerToken: this.consumerToken,
        employeeToken: this.employeeToken,
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 30 days
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create session: ${error}`);
    }

    const data = await response.json();
    this.sessionToken = data.value.token;
    return this.sessionToken;
  }

  /**
   * Make authenticated API request
   */
  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    if (!this.sessionToken) {
      await this.createSession();
    }

    // Create Basic Auth header
    const credentials = `${this.companyId}:${this.sessionToken}`;
    const encodedCredentials = Buffer.from(credentials).toString("base64");

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${encodedCredentials}`,
        ...options.headers,
      },
    });

    // If unauthorized, try to refresh session
    if (response.status === 401) {
      await this.createSession();
      return this.request(endpoint, options);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Test connection to Tripletex API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.request("/company");
      return true;
    } catch (error) {
      console.error("Connection test failed:", error);
      return false;
    }
  }

  /**
   * Create customer in Tripletex
   */
  async createCustomer(customer: {
    name: string;
    email?: string;
    phoneNumber?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    organizationNumber?: string;
  }): Promise<any> {
    const payload = {
      name: customer.name,
      email: customer.email,
      phoneNumber: customer.phoneNumber,
      postalAddress: customer.address
        ? {
            addressLine1: customer.address,
            postalCode: customer.postalCode,
            city: customer.city,
          }
        : undefined,
      organizationNumber: customer.organizationNumber,
      customerAccountNumber: 1500, // Default customer account
      isCustomer: true,
    };

    const response = await this.request("/customer", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return response.value;
  }

  /**
   * Get customer by ID
   */
  async getCustomer(customerId: string): Promise<any> {
    const response = await this.request(`/customer/${customerId}`);
    return response.value;
  }

  /**
   * Create invoice in Tripletex
   */
  async createInvoice(invoice: {
    customerId: string;
    invoiceDate: string; // YYYY-MM-DD
    dueDate: string; // YYYY-MM-DD
    orderLines: Array<{
      description: string;
      quantity: number;
      unitPrice: number; // In currency (not øre)
      vatType?: string;
      productId?: string;
    }>;
    reference?: string;
  }): Promise<any> {
    const payload = {
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      customer: {
        id: parseInt(invoice.customerId),
      },
      orderLines: invoice.orderLines.map((line) => ({
        description: line.description,
        count: line.quantity,
        unitPriceExcludingVatCurrency: line.unitPrice,
        vatType: line.vatType
          ? { id: parseInt(line.vatType) }
          : { id: 3 }, // 3 = 25% MVA
        product: line.productId ? { id: parseInt(line.productId) } : undefined,
      })),
      invoiceRemarks: invoice.reference,
    };

    const response = await this.request("/invoice", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return response.value;
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<any> {
    const response = await this.request(`/invoice/${invoiceId}`);
    return response.value;
  }

  /**
   * Send invoice to customer
   */
  async sendInvoice(invoiceId: string, sendType: string = "EMAIL"): Promise<void> {
    await this.request(`/invoice/${invoiceId}/:send`, {
      method: "PUT",
      body: JSON.stringify({
        sendType, // EMAIL, EHF, VIPPS, etc.
      }),
    });
  }

  /**
   * Register payment on invoice
   */
  async registerPayment(payment: {
    invoiceId: string;
    amount: number; // In currency (not øre)
    paymentDate: string; // YYYY-MM-DD
    paymentType?: string;
    reference?: string;
  }): Promise<any> {
    const payload = {
      invoice: {
        id: parseInt(payment.invoiceId),
      },
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      paymentType: payment.paymentType
        ? { id: parseInt(payment.paymentType) }
        : { id: 1 }, // 1 = Bank payment
      description: payment.reference,
    };

    const response = await this.request(`/invoice/${payment.invoiceId}/:payment`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    return response.value;
  }

  /**
   * Create credit note (for refunds)
   */
  async createCreditNote(creditNote: {
    invoiceId: string;
    creditNoteDate: string; // YYYY-MM-DD
    comment?: string;
  }): Promise<any> {
    const payload = {
      invoice: {
        id: parseInt(creditNote.invoiceId),
      },
      creditNoteDate: creditNote.creditNoteDate,
      comment: creditNote.comment,
    };

    const response = await this.request(`/invoice/${creditNote.invoiceId}/:createCreditNote`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    return response.value;
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
    const invoice = await this.getInvoice(invoiceId);

    return {
      status: invoice.invoiceStatus || "unknown",
      isPaid: invoice.isPaid || false,
      paidAmount: invoice.amountPaid || 0,
      remainingAmount: invoice.amountRemaining || 0,
    };
  }

  /**
   * Create product/service
   */
  async createProduct(product: {
    name: string;
    number?: string;
    description?: string;
    price?: number;
    vatType?: string;
  }): Promise<any> {
    const payload = {
      name: product.name,
      number: product.number,
      description: product.description,
      costExcludingVatCurrency: product.price,
      priceExcludingVatCurrency: product.price,
      vatType: product.vatType
        ? { id: parseInt(product.vatType) }
        : { id: 3 }, // 3 = 25% MVA
      isInactive: false,
    };

    const response = await this.request("/product", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    return response.value;
  }

  /**
   * Get company information
   */
  async getCompany(): Promise<any> {
    const response = await this.request("/company");
    return response.value;
  }

  /**
   * Search customers
   */
  async searchCustomers(query: {
    name?: string;
    email?: string;
    organizationNumber?: string;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (query.name) params.append("name", query.name);
    if (query.email) params.append("email", query.email);
    if (query.organizationNumber) params.append("organizationNumber", query.organizationNumber);

    const response = await this.request(`/customer?${params.toString()}`);
    return response.values || [];
  }

  /**
   * Search invoices
   */
  async searchInvoices(query: {
    customerId?: string;
    invoiceDateFrom?: string;
    invoiceDateTo?: string;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (query.customerId) params.append("customerId", query.customerId);
    if (query.invoiceDateFrom) params.append("invoiceDateFrom", query.invoiceDateFrom);
    if (query.invoiceDateTo) params.append("invoiceDateTo", query.invoiceDateTo);

    const response = await this.request(`/invoice?${params.toString()}`);
    return response.values || [];
  }
}

/**
 * Get Tripletex client for a tenant
 */
export async function getTripletexClient(tenantId: string): Promise<TripletexClient> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [settings] = await db
    .select()
    .from(tripletexSettings)
    .where(eq(tripletexSettings.tenantId, tenantId))
    .limit(1);

  if (!settings) {
    throw new Error("Tripletex settings not found for this tenant");
  }

  if (!settings.isEnabled) {
    throw new Error("Tripletex integration is not enabled");
  }

  return new TripletexClient({
    baseUrl: settings.baseUrl,
    consumerToken: settings.consumerToken,
    employeeToken: settings.employeeToken,
    sessionToken: settings.sessionToken || undefined,
    companyId: settings.companyId || undefined,
  });
}
