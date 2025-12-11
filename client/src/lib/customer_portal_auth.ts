/**
 * Customer Portal Authentication
 * 
 * Handles customer authentication, session management, and security
 */

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

// ============================================================================
// PASSWORD HASHING
// ============================================================================

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================================================
// TOKEN GENERATION
// ============================================================================

export function generateToken(length: number = 32): string {
  return randomBytes(length).toString("hex");
}

export function generateSessionToken(): string {
  return generateToken(32);
}

export function generateVerificationToken(): string {
  return generateToken(32);
}

export function generateResetToken(): string {
  return generateToken(32);
}

// ============================================================================
// TOKEN EXPIRY
// ============================================================================

export function getVerificationTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24); // 24 hours
  return expiry;
}

export function getResetTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1); // 1 hour
  return expiry;
}

export function getSessionExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30); // 30 days
  return expiry;
}

// ============================================================================
// PASSWORD VALIDATION
// ============================================================================

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Passordet må være minst 8 tegn langt");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Passordet må inneholde minst én stor bokstav");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Passordet må inneholde minst én liten bokstav");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Passordet må inneholde minst ett tall");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ============================================================================
// PHONE VALIDATION
// ============================================================================

export function validatePhone(phone: string): boolean {
  // Norwegian phone number format: +47 followed by 8 digits
  const phoneRegex = /^\+47\d{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
}

export function normalizePhone(phone: string): string {
  // Remove all spaces and ensure +47 prefix
  const cleaned = phone.replace(/\s/g, "");
  if (cleaned.startsWith("47")) {
    return "+" + cleaned;
  }
  if (cleaned.startsWith("+47")) {
    return cleaned;
  }
  return "+47" + cleaned;
}

// ============================================================================
// ACCOUNT LOCKOUT
// ============================================================================

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

export function shouldLockAccount(loginAttempts: number): boolean {
  return loginAttempts >= MAX_LOGIN_ATTEMPTS;
}

export function getLockoutExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + LOCKOUT_DURATION_MINUTES);
  return expiry;
}

export function isAccountLocked(lockedUntil: Date | null): boolean {
  if (!lockedUntil) return false;
  return new Date() < new Date(lockedUntil);
}

// ============================================================================
// SESSION VALIDATION
// ============================================================================

export function isSessionExpired(expiresAt: Date): boolean {
  return new Date() > new Date(expiresAt);
}

// ============================================================================
// DEVICE INFO EXTRACTION
// ============================================================================

export interface DeviceInfo {
  browser: string;
  os: string;
  device: string;
}

export function extractDeviceInfo(userAgent: string): DeviceInfo {
  const info: DeviceInfo = {
    browser: "Unknown",
    os: "Unknown",
    device: "Unknown",
  };

  // Browser detection
  if (userAgent.includes("Chrome")) info.browser = "Chrome";
  else if (userAgent.includes("Firefox")) info.browser = "Firefox";
  else if (userAgent.includes("Safari")) info.browser = "Safari";
  else if (userAgent.includes("Edge")) info.browser = "Edge";

  // OS detection
  if (userAgent.includes("Windows")) info.os = "Windows";
  else if (userAgent.includes("Mac")) info.os = "macOS";
  else if (userAgent.includes("Linux")) info.os = "Linux";
  else if (userAgent.includes("Android")) info.os = "Android";
  else if (userAgent.includes("iOS")) info.os = "iOS";

  // Device detection
  if (userAgent.includes("Mobile")) info.device = "Mobile";
  else if (userAgent.includes("Tablet")) info.device = "Tablet";
  else info.device = "Desktop";

  return info;
}

// ============================================================================
// ACTIVITY LOG HELPERS
// ============================================================================

export const ActivityTypes = {
  // Authentication
  LOGIN: "login",
  LOGOUT: "logout",
  REGISTER: "register",
  EMAIL_VERIFIED: "email_verified",
  PASSWORD_RESET_REQUESTED: "password_reset_requested",
  PASSWORD_RESET_COMPLETED: "password_reset_completed",
  
  // Bookings
  BOOKING_CREATED: "booking_created",
  BOOKING_CANCELLED: "booking_cancelled",
  BOOKING_MODIFIED: "booking_modified",
  BOOKING_VIEWED: "booking_viewed",
  
  // Favorites
  SERVICE_FAVORITED: "service_favorited",
  SERVICE_UNFAVORITED: "service_unfavorited",
  EMPLOYEE_FAVORITED: "employee_favorited",
  EMPLOYEE_UNFAVORITED: "employee_unfavorited",
  
  // Payment Methods
  PAYMENT_METHOD_ADDED: "payment_method_added",
  PAYMENT_METHOD_REMOVED: "payment_method_removed",
  PAYMENT_METHOD_UPDATED: "payment_method_updated",
  
  // Profile
  PROFILE_UPDATED: "profile_updated",
  PREFERENCES_UPDATED: "preferences_updated",
  
  // Security
  FAILED_LOGIN_ATTEMPT: "failed_login_attempt",
  ACCOUNT_LOCKED: "account_locked",
  ACCOUNT_UNLOCKED: "account_unlocked",
} as const;

export type ActivityType = typeof ActivityTypes[keyof typeof ActivityTypes];
