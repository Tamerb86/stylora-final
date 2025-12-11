import axios from "axios";
import { db } from "./db";
import { paymentProviders } from "./schema";
import { eq, and } from "drizzle-orm";

/**
 * MobilePay Provider
 * 
 * Integrates MobilePay with the existing payment system.
 * Works alongside existing Stripe and Vipps providers.
 */

export interface MobilePayConfig {
  apiKey: string;
  merchantId: string;
  apiUrl?: string;
}

export interface MobilePayPaymentRequest {
  amount: number; // in smallest currency unit (øre for NOK)
  currency: string;
  description: string;
  redirectUrl: string;
  reference?: string;
  metadata?: Record<string, any>;
}

export interface MobilePayPaymentResponse {
  paymentId: string;
  mobilePayUrl: string;
  status: string;
  expiresAt: string;
}

export class MobilePayProvider {
  private apiKey: string;
  private merchantId: string;
  private baseUrl: string;

  constructor(config: MobilePayConfig) {
    this.apiKey = config.apiKey;
    this.merchantId = config.merchantId;
    this.baseUrl = config.apiUrl || "https://api.mobilepay.dk";
  }

  /**
   * Load MobilePay configuration from database
   */
  static async loadFromDatabase(tenantId: string): Promise<MobilePayProvider | null> {
    const [provider] = await db
      .select()
      .from(paymentProviders)
      .where(
        and(
          eq(paymentProviders.tenantId, tenantId),
          eq(paymentProviders.providerType, "mobilepay"),
          eq(paymentProviders.isActive, true)
        )
      )
      .limit(1);

    if (!provider || !provider.config) {
      return null;
    }

    const config = provider.config as any;
    return new MobilePayProvider({
      apiKey: config.apiKey,
      merchantId: config.merchantId,
      apiUrl: config.apiUrl,
    });
  }

  /**
   * Create a payment
   */
  async createPayment(request: MobilePayPaymentRequest): Promise<MobilePayPaymentResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/payments`,
        {
          amount: request.amount,
          currency: request.currency,
          description: request.description,
          redirectUrl: request.redirectUrl,
          reference: request.reference || `PAY-${Date.now()}`,
          merchantId: this.merchantId,
          metadata: request.metadata,
        },
        {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        paymentId: response.data.paymentId,
        mobilePayUrl: response.data.mobilePayUrl,
        status: response.data.status,
        expiresAt: response.data.expiresAt,
      };
    } catch (error: any) {
      console.error("MobilePay createPayment error:", error.response?.data || error.message);
      throw new Error(`MobilePay payment creation failed: ${error.message}`);
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/payments/${paymentId}`,
        {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("MobilePay getPaymentStatus error:", error.response?.data || error.message);
      throw new Error(`MobilePay get payment status failed: ${error.message}`);
    }
  }

  /**
   * Capture a payment (for two-step payments)
   */
  async capturePayment(paymentId: string, amount?: number): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/payments/${paymentId}/capture`,
        {
          amount,
        },
        {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("MobilePay capturePayment error:", error.response?.data || error.message);
      throw new Error(`MobilePay payment capture failed: ${error.message}`);
    }
  }

  /**
   * Cancel a payment
   */
  async cancelPayment(paymentId: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/payments/${paymentId}/cancel`,
        {},
        {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("MobilePay cancelPayment error:", error.response?.data || error.message);
      throw new Error(`MobilePay payment cancellation failed: ${error.message}`);
    }
  }

  /**
   * Create a refund
   */
  async createRefund(params: {
    paymentId: string;
    amount: number;
    reason?: string;
  }): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/payments/${params.paymentId}/refund`,
        {
          amount: params.amount,
          reason: params.reason,
        },
        {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("MobilePay createRefund error:", error.response?.data || error.message);
      throw new Error(`MobilePay refund creation failed: ${error.message}`);
    }
  }

  /**
   * Create a subscription (recurring payment)
   */
  async createSubscription(params: {
    amount: number;
    currency: string;
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    description: string;
    externalId?: string;
  }): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/subscriptions`,
        {
          amount: params.amount,
          currency: params.currency,
          frequency: params.frequency,
          description: params.description,
          externalId: params.externalId,
          merchantId: this.merchantId,
        },
        {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("MobilePay createSubscription error:", error.response?.data || error.message);
      throw new Error(`MobilePay subscription creation failed: ${error.message}`);
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<any> {
    try {
      const response = await axios.delete(
        `${this.baseUrl}/v1/subscriptions/${subscriptionId}`,
        {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("MobilePay cancelSubscription error:", error.response?.data || error.message);
      throw new Error(`MobilePay subscription cancellation failed: ${error.message}`);
    }
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(subscriptionId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/v1/subscriptions/${subscriptionId}`,
        {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("MobilePay getSubscriptionStatus error:", error.response?.data || error.message);
      throw new Error(`MobilePay get subscription status failed: ${error.message}`);
    }
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to get merchant info as a connection test
      const response = await axios.get(
        `${this.baseUrl}/v1/merchants/${this.merchantId}`,
        {
          headers: {
            "Authorization": `Bearer ${this.apiKey}`,
          },
        }
      );

      return response.status === 200;
    } catch (error: any) {
      console.error("MobilePay testConnection error:", error.response?.data || error.message);
      return false;
    }
  }
}

/**
 * Helper function to create MobilePay payment in existing payment flow
 */
export async function createMobilePayPayment(params: {
  tenantId: string;
  amount: number; // in NOK (will be converted to øre)
  currency: string;
  description: string;
  orderId?: number;
  appointmentId?: number;
  customerId?: number;
  returnUrl: string;
}): Promise<{
  paymentId: string;
  mobilePayUrl: string;
  expiresAt: string;
}> {
  // Load MobilePay provider
  const provider = await MobilePayProvider.loadFromDatabase(params.tenantId);
  
  if (!provider) {
    throw new Error("MobilePay is not configured for this tenant");
  }

  // Convert amount to smallest unit (øre)
  const amountInOre = Math.round(params.amount * 100);

  // Create reference
  const reference = params.orderId 
    ? `ORDER-${params.orderId}`
    : params.appointmentId
    ? `APPT-${params.appointmentId}`
    : `PAY-${Date.now()}`;

  // Create payment
  const payment = await provider.createPayment({
    amount: amountInOre,
    currency: params.currency,
    description: params.description,
    redirectUrl: params.returnUrl,
    reference,
    metadata: {
      tenantId: params.tenantId,
      orderId: params.orderId?.toString(),
      appointmentId: params.appointmentId?.toString(),
      customerId: params.customerId?.toString(),
    },
  });

  return {
    paymentId: payment.paymentId,
    mobilePayUrl: payment.mobilePayUrl,
    expiresAt: payment.expiresAt,
  };
}

/**
 * Helper function to check MobilePay payment status
 */
export async function checkMobilePayPaymentStatus(
  tenantId: string,
  paymentId: string
): Promise<{
  status: string;
  amount?: number;
  currency?: string;
  paidAt?: string;
}> {
  const provider = await MobilePayProvider.loadFromDatabase(tenantId);
  
  if (!provider) {
    throw new Error("MobilePay is not configured for this tenant");
  }

  const status = await provider.getPaymentStatus(paymentId);

  return {
    status: status.status,
    amount: status.amount ? status.amount / 100 : undefined, // Convert from øre to NOK
    currency: status.currency,
    paidAt: status.paidAt,
  };
}

/**
 * Helper function to refund MobilePay payment
 */
export async function refundMobilePayPayment(params: {
  tenantId: string;
  paymentId: string;
  amount?: number; // in NOK (will be converted to øre)
  reason?: string;
}): Promise<any> {
  const provider = await MobilePayProvider.loadFromDatabase(params.tenantId);
  
  if (!provider) {
    throw new Error("MobilePay is not configured for this tenant");
  }

  const amountInOre = params.amount ? Math.round(params.amount * 100) : undefined;

  return await provider.createRefund({
    paymentId: params.paymentId,
    amount: amountInOre!,
    reason: params.reason,
  });
}
