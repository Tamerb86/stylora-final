/**
 * Sparebank1 Regnskap API Client
 * 
 * Based on Unimicro platform (white-label version for Sparebank1)
 * Uses similar API structure to Unimicro with Sparebank1 branding
 */

const SPAREBANK1_API_BASE_URL = "https://regnskap.sparebank1.no/api/v1";

export interface Sparebank1RegnskapConfig {
  apiKey: string;
  companyId: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface Sparebank1Customer {
  id?: string;
  customerNumber?: string;
  name: string;
  organizationNumber?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    postalCode?: string;
    city?: string;
    country?: string;
  };
  isActive?: boolean;
}

export interface Sparebank1Invoice {
  id?: string;
  invoiceNumber?: string;
  customerId: string;
  invoiceDate: string; // ISO 8601
  dueDate: string; // ISO 8601
  lines: Sparebank1InvoiceLine[];
  totalAmount?: number;
  vatAmount?: number;
  status?: string;
  isPaid?: boolean;
}

export interface Sparebank1InvoiceLine {
  productCode?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number; // e.g., 25 for 25%
  amount?: number;
}

export interface Sparebank1Payment {
  amount: number;
  paymentDate: string; // ISO 8601
  paymentMethod?: string;
  reference?: string;
}

export class Sparebank1RegnskapClient {
  private config: Sparebank1RegnskapConfig;
  private accessToken?: string;

  constructor(config: Sparebank1RegnskapConfig) {
    this.config = config;
    this.accessToken = config.accessToken;
  }

  /**
   * Authenticate using API Key
   */
  async authenticate(): Promise<{ accessToken: string; expiresIn: number }> {
    const response = await fetch(`${SPAREBANK1_API_BASE_URL}/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey: this.config.apiKey,
        companyId: this.config.companyId,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sparebank1 authentication failed: ${error}`);
    }

    const data = await response.json();
    this.accessToken = data.accessToken;

    return {
      accessToken: data.accessToken,
      expiresIn: data.expiresIn || 3600,
    };
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.accessToken) {
      throw new Error("Not authenticated. Call authenticate() first.");
    }

    const response = await fetch(`${SPAREBANK1_API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "X-Company-Id": this.config.companyId,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sparebank1 API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // ============================================================================
  // Customer Operations
  // ============================================================================

  async getCustomers(): Promise<Sparebank1Customer[]> {
    return this.request<Sparebank1Customer[]>("/customers");
  }

  async getCustomer(customerId: string): Promise<Sparebank1Customer> {
    return this.request<Sparebank1Customer>(`/customers/${customerId}`);
  }

  async createCustomer(customer: Sparebank1Customer): Promise<Sparebank1Customer> {
    return this.request<Sparebank1Customer>("/customers", {
      method: "POST",
      body: JSON.stringify(customer),
    });
  }

  async updateCustomer(customerId: string, customer: Sparebank1Customer): Promise<Sparebank1Customer> {
    return this.request<Sparebank1Customer>(`/customers/${customerId}`, {
      method: "PUT",
      body: JSON.stringify(customer),
    });
  }

  async deleteCustomer(customerId: string): Promise<void> {
    await this.request<void>(`/customers/${customerId}`, {
      method: "DELETE",
    });
  }

  // ============================================================================
  // Invoice Operations
  // ============================================================================

  async getInvoices(): Promise<Sparebank1Invoice[]> {
    return this.request<Sparebank1Invoice[]>("/invoices");
  }

  async getInvoice(invoiceId: string): Promise<Sparebank1Invoice> {
    return this.request<Sparebank1Invoice>(`/invoices/${invoiceId}`);
  }

  async createInvoice(invoice: Sparebank1Invoice): Promise<Sparebank1Invoice> {
    return this.request<Sparebank1Invoice>("/invoices", {
      method: "POST",
      body: JSON.stringify(invoice),
    });
  }

  async sendInvoice(invoiceId: string, email: string): Promise<void> {
    await this.request<void>(`/invoices/${invoiceId}/send`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async getInvoicePdf(invoiceId: string): Promise<Blob> {
    if (!this.accessToken) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${SPAREBANK1_API_BASE_URL}/invoices/${invoiceId}/pdf`, {
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "X-Company-Id": this.config.companyId,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get invoice PDF: ${response.status}`);
    }

    return response.blob();
  }

  // ============================================================================
  // Payment Operations
  // ============================================================================

  async registerPayment(invoiceId: string, payment: Sparebank1Payment): Promise<void> {
    await this.request<void>(`/invoices/${invoiceId}/payments`, {
      method: "POST",
      body: JSON.stringify(payment),
    });
  }

  async getPayments(invoiceId: string): Promise<Sparebank1Payment[]> {
    return this.request<Sparebank1Payment[]>(`/invoices/${invoiceId}/payments`);
  }

  // ============================================================================
  // Credit Note Operations
  // ============================================================================

  async createCreditNote(invoiceId: string, amount: number, reason: string): Promise<any> {
    return this.request<any>(`/invoices/${invoiceId}/creditnote`, {
      method: "POST",
      body: JSON.stringify({ amount, reason }),
    });
  }

  // ============================================================================
  // Bank Integration (Sparebank1 Specific)
  // ============================================================================

  async getBankTransactions(accountNumber: string, fromDate: string, toDate: string): Promise<any[]> {
    return this.request<any[]>(
      `/bank/transactions?accountNumber=${accountNumber}&fromDate=${fromDate}&toDate=${toDate}`
    );
  }

  async reconcilePayment(transactionId: string, invoiceId: string): Promise<void> {
    await this.request<void>("/bank/reconcile", {
      method: "POST",
      body: JSON.stringify({ transactionId, invoiceId }),
    });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Test connection to Sparebank1 Regnskap
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getCustomers();
      return true;
    } catch (error) {
      console.error("Sparebank1 connection test failed:", error);
      return false;
    }
  }

  /**
   * Get company information
   */
  async getCompanyInfo(): Promise<any> {
    return this.request<any>("/company");
  }
}

export default Sparebank1RegnskapClient;
