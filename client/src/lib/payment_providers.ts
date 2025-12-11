import Stripe from "stripe";
import axios from "axios";

/**
 * Payment Providers Integration
 * Supports Stripe, Vipps, and MobilePay
 */

// ============================================================================
// STRIPE CLIENT
// ============================================================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
});

export class StripeProvider {
  /**
   * Create a payment intent
   */
  static async createPaymentIntent(params: {
    amount: number; // in smallest currency unit (øre for NOK)
    currency: string;
    customerId?: string;
    metadata?: Record<string, string>;
    description?: string;
    paymentMethodTypes?: string[];
  }) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency.toLowerCase(),
      customer: params.customerId,
      metadata: params.metadata || {},
      description: params.description,
      payment_method_types: params.paymentMethodTypes || ["card"],
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return paymentIntent;
  }

  /**
   * Confirm a payment intent
   */
  static async confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string) {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });

    return paymentIntent;
  }

  /**
   * Create a customer
   */
  static async createCustomer(params: {
    email?: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, string>;
  }) {
    const customer = await stripe.customers.create({
      email: params.email,
      name: params.name,
      phone: params.phone,
      metadata: params.metadata || {},
    });

    return customer;
  }

  /**
   * Save a payment method
   */
  static async attachPaymentMethod(paymentMethodId: string, customerId: string) {
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    return paymentMethod;
  }

  /**
   * Create a subscription
   */
  static async createSubscription(params: {
    customerId: string;
    priceId?: string;
    items?: Array<{ price: string; quantity?: number }>;
    trialPeriodDays?: number;
    metadata?: Record<string, string>;
  }) {
    const subscription = await stripe.subscriptions.create({
      customer: params.customerId,
      items: params.items || [{ price: params.priceId! }],
      trial_period_days: params.trialPeriodDays,
      metadata: params.metadata || {},
    });

    return subscription;
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = false) {
    if (cancelAtPeriodEnd) {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      return subscription;
    } else {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return subscription;
    }
  }

  /**
   * Create a refund
   */
  static async createRefund(params: {
    paymentIntentId: string;
    amount?: number; // Partial refund amount
    reason?: "duplicate" | "fraudulent" | "requested_by_customer";
  }) {
    const refund = await stripe.refunds.create({
      payment_intent: params.paymentIntentId,
      amount: params.amount,
      reason: params.reason,
    });

    return refund;
  }

  /**
   * Create a payment link
   */
  static async createPaymentLink(params: {
    amount: number;
    currency: string;
    description?: string;
    metadata?: Record<string, string>;
  }) {
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: params.currency.toLowerCase(),
            product_data: {
              name: params.description || "Payment",
            },
            unit_amount: params.amount,
          },
          quantity: 1,
        },
      ],
      metadata: params.metadata || {},
    });

    return paymentLink;
  }

  /**
   * Create a setup intent (for saving payment method)
   */
  static async createSetupIntent(customerId: string) {
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
    });

    return setupIntent;
  }

  /**
   * Retrieve payment intent
   */
  static async retrievePaymentIntent(paymentIntentId: string) {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  }

  /**
   * List customer payment methods
   */
  static async listPaymentMethods(customerId: string) {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    return paymentMethods.data;
  }
}

// ============================================================================
// MOBILEPAY CLIENT
// ============================================================================

export class MobilePayProvider {
  private static baseUrl = process.env.MOBILEPAY_API_URL || "https://api.mobilepay.dk";
  private static apiKey = process.env.MOBILEPAY_API_KEY || "";
  private static merchantId = process.env.MOBILEPAY_MERCHANT_ID || "";

  /**
   * Create a payment
   */
  static async createPayment(params: {
    amount: number; // in smallest currency unit
    currency: string;
    description: string;
    redirectUrl: string;
    reference?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/payments`,
        {
          amount: params.amount,
          currency: params.currency,
          description: params.description,
          redirectUrl: params.redirectUrl,
          reference: params.reference,
          metadata: params.metadata,
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
      console.error("MobilePay createPayment error:", error.response?.data || error.message);
      throw new Error(`MobilePay payment creation failed: ${error.message}`);
    }
  }

  /**
   * Capture a payment
   */
  static async capturePayment(paymentId: string, amount?: number) {
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
  static async cancelPayment(paymentId: string) {
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
   * Get payment status
   */
  static async getPaymentStatus(paymentId: string) {
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
   * Create a refund
   */
  static async createRefund(params: {
    paymentId: string;
    amount: number;
    reason?: string;
  }) {
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
   * Create a subscription
   */
  static async createSubscription(params: {
    amount: number;
    currency: string;
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    description: string;
    externalId?: string;
  }) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v1/subscriptions`,
        {
          amount: params.amount,
          currency: params.currency,
          frequency: params.frequency,
          description: params.description,
          externalId: params.externalId,
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
  static async cancelSubscription(subscriptionId: string) {
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
}

// ============================================================================
// VIPPS CLIENT (Enhanced)
// ============================================================================

export class VippsProvider {
  private static baseUrl = process.env.VIPPS_API_URL || "https://api.vipps.no";
  private static clientId = process.env.VIPPS_CLIENT_ID || "";
  private static clientSecret = process.env.VIPPS_CLIENT_SECRET || "";
  private static subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY || "";
  private static merchantSerialNumber = process.env.VIPPS_MERCHANT_SERIAL_NUMBER || "";

  private static accessToken: string | null = null;
  private static tokenExpiry: number = 0;

  /**
   * Get access token
   */
  private static async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/accesstoken/get`,
        {},
        {
          headers: {
            "client_id": this.clientId,
            "client_secret": this.clientSecret,
            "Ocp-Apim-Subscription-Key": this.subscriptionKey,
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 min buffer

      return this.accessToken;
    } catch (error: any) {
      console.error("Vipps getAccessToken error:", error.response?.data || error.message);
      throw new Error(`Vipps authentication failed: ${error.message}`);
    }
  }

  /**
   * Create a payment (ePayment)
   */
  static async createPayment(params: {
    amount: number;
    currency: string;
    description: string;
    reference: string;
    returnUrl: string;
    userFlow?: "WEB_REDIRECT" | "NATIVE_REDIRECT";
  }) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/epayment/v1/payments`,
        {
          amount: {
            value: params.amount,
            currency: params.currency,
          },
          paymentMethod: {
            type: "WALLET",
          },
          customer: {
            phoneNumber: "", // Optional
          },
          reference: params.reference,
          userFlow: params.userFlow || "WEB_REDIRECT",
          returnUrl: params.returnUrl,
          paymentDescription: params.description,
        },
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Ocp-Apim-Subscription-Key": this.subscriptionKey,
            "Merchant-Serial-Number": this.merchantSerialNumber,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("Vipps createPayment error:", error.response?.data || error.message);
      throw new Error(`Vipps payment creation failed: ${error.message}`);
    }
  }

  /**
   * Get payment details
   */
  static async getPayment(reference: string) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/epayment/v1/payments/${reference}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Ocp-Apim-Subscription-Key": this.subscriptionKey,
            "Merchant-Serial-Number": this.merchantSerialNumber,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("Vipps getPayment error:", error.response?.data || error.message);
      throw new Error(`Vipps get payment failed: ${error.message}`);
    }
  }

  /**
   * Cancel a payment
   */
  static async cancelPayment(reference: string) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/epayment/v1/payments/${reference}/cancel`,
        {},
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Ocp-Apim-Subscription-Key": this.subscriptionKey,
            "Merchant-Serial-Number": this.merchantSerialNumber,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("Vipps cancelPayment error:", error.response?.data || error.message);
      throw new Error(`Vipps payment cancellation failed: ${error.message}`);
    }
  }

  /**
   * Create a refund
   */
  static async createRefund(params: {
    reference: string;
    amount: number;
    description?: string;
  }) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/epayment/v1/payments/${params.reference}/refund`,
        {
          amount: {
            value: params.amount,
            currency: "NOK",
          },
          description: params.description,
        },
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Ocp-Apim-Subscription-Key": this.subscriptionKey,
            "Merchant-Serial-Number": this.merchantSerialNumber,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("Vipps createRefund error:", error.response?.data || error.message);
      throw new Error(`Vipps refund creation failed: ${error.message}`);
    }
  }

  /**
   * Create a recurring agreement
   */
  static async createAgreement(params: {
    price: number;
    productName: string;
    productDescription: string;
    interval: "MONTH" | "WEEK" | "DAY";
    intervalCount?: number;
    merchantRedirectUrl: string;
    merchantAgreementUrl: string;
  }) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/recurring/v2/agreements`,
        {
          pricing: {
            type: "LEGACY",
            amount: params.price,
            currency: "NOK",
          },
          interval: {
            unit: params.interval,
            count: params.intervalCount || 1,
          },
          merchantRedirectUrl: params.merchantRedirectUrl,
          merchantAgreementUrl: params.merchantAgreementUrl,
          productName: params.productName,
          productDescription: params.productDescription,
        },
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Ocp-Apim-Subscription-Key": this.subscriptionKey,
            "Merchant-Serial-Number": this.merchantSerialNumber,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("Vipps createAgreement error:", error.response?.data || error.message);
      throw new Error(`Vipps agreement creation failed: ${error.message}`);
    }
  }

  /**
   * Create a charge (recurring payment)
   */
  static async createCharge(params: {
    agreementId: string;
    amount: number;
    description: string;
    dueDate: string; // YYYY-MM-DD
    retryDays?: number;
  }) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/recurring/v2/agreements/${params.agreementId}/charges`,
        {
          amount: params.amount,
          currency: "NOK",
          description: params.description,
          due: params.dueDate,
          retryDays: params.retryDays || 3,
        },
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Ocp-Apim-Subscription-Key": this.subscriptionKey,
            "Merchant-Serial-Number": this.merchantSerialNumber,
            "Content-Type": "application/json",
            "Idempotency-Key": `${params.agreementId}-${params.dueDate}-${Date.now()}`,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error("Vipps createCharge error:", error.response?.data || error.message);
      throw new Error(`Vipps charge creation failed: ${error.message}`);
    }
  }
}

// ============================================================================
// UNIFIED PAYMENT INTERFACE
// ============================================================================

export class PaymentService {
  /**
   * Create a payment with the specified provider
   */
  static async createPayment(params: {
    provider: "stripe" | "vipps" | "mobilepay";
    amount: number;
    currency: string;
    description: string;
    reference?: string;
    returnUrl?: string;
    metadata?: Record<string, any>;
  }) {
    switch (params.provider) {
      case "stripe":
        return await StripeProvider.createPaymentIntent({
          amount: params.amount,
          currency: params.currency,
          description: params.description,
          metadata: params.metadata as Record<string, string>,
        });

      case "vipps":
        return await VippsProvider.createPayment({
          amount: params.amount,
          currency: params.currency,
          description: params.description,
          reference: params.reference || `PAY-${Date.now()}`,
          returnUrl: params.returnUrl || "",
        });

      case "mobilepay":
        return await MobilePayProvider.createPayment({
          amount: params.amount,
          currency: params.currency,
          description: params.description,
          redirectUrl: params.returnUrl || "",
          reference: params.reference,
          metadata: params.metadata,
        });

      default:
        throw new Error(`Unsupported payment provider: ${params.provider}`);
    }
  }

  /**
   * Create a refund with the specified provider
   */
  static async createRefund(params: {
    provider: "stripe" | "vipps" | "mobilepay";
    paymentId: string;
    amount?: number;
    reason?: string;
  }) {
    switch (params.provider) {
      case "stripe":
        return await StripeProvider.createRefund({
          paymentIntentId: params.paymentId,
          amount: params.amount,
          reason: params.reason as any,
        });

      case "vipps":
        return await VippsProvider.createRefund({
          reference: params.paymentId,
          amount: params.amount || 0,
          description: params.reason,
        });

      case "mobilepay":
        return await MobilePayProvider.createRefund({
          paymentId: params.paymentId,
          amount: params.amount || 0,
          reason: params.reason,
        });

      default:
        throw new Error(`Unsupported payment provider: ${params.provider}`);
    }
  }
}
