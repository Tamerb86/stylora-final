 * Vipps Payment Gateway Integration
 * 
 * This module provides integration with Vipps eCom API for Norwegian payment processing.
 * 
 * Documentation: https://developer.vippsmobilepay.com/docs/APIs/ecom-api/
 * 
 * Required environment variables:
 * - VIPPS_CLIENT_ID: Your Vipps client ID
 * - VIPPS_CLIENT_SECRET: Your Vipps client secret
 * - VIPPS_SUBSCRIPTION_KEY: Your Vipps subscription key (Ocp-Apim-Subscription-Key)
 * - VIPPS_MERCHANT_SERIAL_NUMBER: Your merchant serial number (MSN)
 * - VIPPS_API_URL: API base URL (https://apitest.vipps.no for test, https://api.vipps.no for production)
 * 
 * Setup instructions:
 * 1. Register for a Vipps merchant account at https://vipps.no/
 * 2. Get your test credentials from the Vipps portal
 * 3. Add the credentials to your environment variables
 * 4. Test with the test environment first
 * 5. Switch to production when ready
 */

import { ENV } from "./_core/env";

// Vipps API response types
interface VippsAccessTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface VippsInitiatePaymentRequest {
  merchantInfo: {
    merchantSerialNumber: string;
    callbackPrefix: string;
    fallBack: string;
  };
  customerInfo?: {
    mobileNumber?: string;
  };
  transaction: {
    orderId: string;
    amount: number; // Amount in øre (1 NOK = 100 øre)
    transactionText: string;
  };
}

interface VippsInitiatePaymentResponse {
  orderId: string;
  url: string; // URL to redirect customer to for payment