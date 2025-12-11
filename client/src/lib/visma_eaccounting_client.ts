/**
 * Visma eAccounting API Client
 * 
 * OAuth 2.0 based client for Visma eAccounting API
 * Documentation: https://eaccountingapi.vismaonline.com/v2
 */

const VISMA_API_BASE_URL = "https://eaccountingapi.vismaonline.com/v2";
const VISMA_AUTH_URL = "https://identity.vismaonline.com/connect/token";

export interface VismaEaccountingConfig {
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface VismaCustomer {
  id?: string;
  customerNumber?: string;
  name: string;
  organizationNumber?: string;
  email?: string;
  mobilePhone?: string;
  telephone?: string;
  invoiceAddress?: {
    address1?: string;
    address2?: string;
    city?: string;
    postalCode?: string;
    countryCode?: string;
  };
  deliveryAddress?: {
    address1?: string;
    address2?: string;
    city?: string;
    postalCode?: string;
    countryCode?: string;
  };
  termsOfPaymentId?: string;
  isActive?: boolean;
}

export interface VismaInvoice {
  id?: string;
  invoiceNumber?: number;
  customerId: string;
  invoiceDate: string; // ISO 8601
  dueDate: string; // ISO 8601
  deliveryDate?: string;
  rows: VismaInvoiceRow[];
  totalAmount?: number;
  totalVatAmount?: number;
  status?: string;
  isPaid?: boolean;
}

export interface VismaInvoiceRow {
  articleNumber?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number; // e.g., 25 for 25%
  totalAmount?: number;
  totalVatAmount?: number;
}

export interface VismaPayment {
  amount: number;
  paymentDate: string; // ISO 8601
  paymentMethod?: string;
  description?: string;
}

export interface VismaApiResponse<T> {
  meta: {
    currentPage: number;
    pageSize: number;
    totalNumberOfPages: number;
    totalNumberOfResults: number;
    serverTimeUtc: string;
  };
  data: T[];
}

export class VismaEaccountingClient {
  private config: VismaEaccountingConfig;
  private accessToken?: string;

  constructor(config: VismaEaccountingConfig) {
    this.config = config;
    this.accessToken = config.accessToken;
  }

  /**
   * Authenticate using OAuth 2.0 Client Credentials flow
   */
  async authenticate(): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    const response = await fetch(VISMA_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: "ea:sales ea:sales_readonly",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Visma authentication failed: ${error}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const response = await fetch(VISMA_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh Visma access token");
    }

    const data = await response.json();
    this.accessToken = data.access_token;

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.accessToken) {
      throw new Error("Not authenticated. Call authenticate() first.");
    }

    const response = await fetch(`${VISMA_API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Visma API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // ============================================================================
  // Customer Operations
  // ============================================================================

  async getCustomers(page: number = 1, pageSize: number = 50): Promise<VismaApiResponse<VismaCustomer>> {
    return this.request<VismaApiResponse<VismaCustomer>>(
      `/customers?page=${page}&pageSize=${pageSize}`
    );
  }

  async getCustomer(customerId: string): Promise<VismaCustomer> {
    return this.request<VismaCustomer>(`/customers/${customerId}`);
  }

  async createCustomer(customer: VismaCustomer): Promise<VismaCustomer> {
    return this.request<VismaCustomer>("/customers", {
      method: "POST",
      body: JSON.stringify(customer),
    });
  }

  async updateCustomer(customerId: string, customer: VismaCustomer): Promise<VismaCustomer> {
    return this.request<VismaCustomer>(`/customers/${customerId}`, {
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

  async getInvoices(page: number = 1, pageSize: number = 50): Promise<VismaApiResponse<VismaInvoice>> {
    return this.request<VismaApiResponse<VismaInvoice>>(
      `/customerinvoices?page=${page}&pageSize=${pageSize}`
    );
  }

  async getInvoice(invoiceId: string): Promise<VismaInvoice> {
    return this.request<VismaInvoice>(`/customerinvoices/${invoiceId}`);
  }

  async createInvoice(invoice: VismaInvoice): Promise<VismaInvoice> {
    return this.request<VismaInvoice>("/customerinvoices", {
      method: "POST",
      body: JSON.stringify(invoice),
    });
  }

  async getInvoicePdf(invoiceId: string): Promise<Blob> {
    if (!this.accessToken) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${VISMA_API_BASE_URL}/customerinvoices/${invoiceId}/pdf`, {
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get invoice PDF: ${response.status}`);
    }

    return response.blob();
  }

  async sendInvoiceEmail(invoiceId: string): Promise<void> {
    await this.request<void>(`/customerinvoices/${invoiceId}/email`, {
      method: "POST",
    });
  }

  async sendInvoiceElectronically(invoiceId: string): Promise<void> {
    await this.request<void>(`/customerinvoices/${invoiceId}/einvoice`, {
      method: "POST",
    });
  }

  async voidInvoice(invoiceId: string): Promise<void> {
    await this.request<void>(`/customerinvoices/${invoiceId}/void`, {
      method: "POST",
    });
  }

  // ============================================================================
  // Payment Operations
  // ============================================================================

  async postInvoicePayment(invoiceId: string, payment: VismaPayment): Promise<void> {
    await this.request<void>(`/customerinvoices/${invoiceId}/payment`, {
      method: "POST",
      body: JSON.stringify(payment),
    });
  }

  // ============================================================================
  // Terms of Payment
  // ============================================================================

  async getTermsOfPayment(): Promise<VismaApiResponse<any>> {
    return this.request<VismaApiResponse<any>>("/termsofpayment");
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Test connection to Visma eAccounting
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getCustomers(1, 1);
      return true;
    } catch (error) {
      console.error("Visma connection test failed:", error);
      return false;
    }
  }
}

export default VismaEaccountingClient;
