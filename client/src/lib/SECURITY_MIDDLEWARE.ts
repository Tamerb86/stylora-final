// ==========================================
// SECURITY MIDDLEWARE FOR STYLORA
// ==========================================

import { TRPCError } from "@trpc/server";
import { db } from "./db";
import * as schema from "./schema";
import { eq } from "drizzle-orm";
import { middleware, publicProcedure } from "./trpc";

// ==========================================
// 1. SESSION VERIFICATION MIDDLEWARE
// ==========================================

export const isAuthenticated = middleware(async ({ ctx, next }) => {
  const sessionToken = ctx.req?.headers?.authorization?.replace("Bearer ", "");
  
  if (!sessionToken) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "No session token provided",
    });
  }

  // Verify session in database
  const [session] = await db.select()
    .from(schema.userSessions)
    .where(eq(schema.userSessions.sessionToken, sessionToken));

  if (!session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid session token",
    });
  }

  // Check if session expired
  if (new Date() > session.expiresAt) {
    // Delete expired session
    await db.delete(schema.userSessions)
      .where(eq(schema.userSessions.id, session.id));
    
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Session expired",
    });
  }

  // Get user details
  const [user] = await db.select()
    .from(schema.tenantUsers)
    .where(eq(schema.tenantUsers.id, session.userId));

  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "User not found",
    });
  }

  // Pass user and session to context
  return next({
    ctx: {
      ...ctx,
      user,
      session,
      tenantId: user.tenantId,
    },
  });
});

// Protected procedure with authentication
export const protectedProcedure = publicProcedure.use(isAuthenticated);

// ==========================================
// 2. TENANT ISOLATION MIDDLEWARE
// ==========================================

export const checkTenantAccess = middleware(async ({ ctx, input, next }) => {
  // @ts-ignore - input will have tenantId
  const requestedTenantId = input?.tenantId;
  const userTenantId = ctx.tenantId;

  if (!requestedTenantId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "tenantId is required",
    });
  }

  if (requestedTenantId !== userTenantId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Access denied to this tenant's data",
    });
  }

  return next();
});

// Protected procedure with tenant isolation
export const tenantProcedure = protectedProcedure.use(checkTenantAccess);

// ==========================================
// 3. ROLE-BASED ACCESS CONTROL (RBAC)
// ==========================================

export const requireRole = (allowedRoles: string[]) => {
  return middleware(async ({ ctx, next }) => {
    const userRole = ctx.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `Access denied. Required roles: ${allowedRoles.join(", ")}`,
      });
    }

    return next();
  });
};

// Admin-only procedure
export const adminProcedure = protectedProcedure.use(
  requireRole(["super_admin", "admin"])
);

// Owner/Manager procedure
export const managerProcedure = protectedProcedure.use(
  requireRole(["super_admin", "admin", "owner", "manager"])
);

// ==========================================
// 4. RATE LIMITING MIDDLEWARE
// ==========================================

// In-memory rate limiter (for production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export const rateLimit = (maxRequests: number, windowMs: number) => {
  return middleware(async ({ ctx, next }) => {
    const identifier = ctx.user?.id?.toString() || ctx.req?.ip || "anonymous";
    const now = Date.now();
    
    const record = rateLimitMap.get(identifier);
    
    if (record) {
      if (now < record.resetAt) {
        if (record.count >= maxRequests) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Rate limit exceeded. Please try again later.",
          });
        }
        record.count++;
      } else {
        // Reset window
        rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
      }
    } else {
      rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    }

    return next();
  });
};

// Apply rate limiting (100 requests per 15 minutes)
export const rateLimitedProcedure = protectedProcedure.use(
  rateLimit(100, 15 * 60 * 1000)
);

// ==========================================
// 5. INPUT VALIDATION MIDDLEWARE
// ==========================================

export const sanitizeInput = middleware(async ({ input, next }) => {
  // Sanitize string inputs to prevent XSS
  const sanitized = JSON.parse(JSON.stringify(input), (key, value) => {
    if (typeof value === "string") {
      // Remove potential XSS patterns
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+\s*=/gi, "");
    }
    return value;
  });

  return next({
    // @ts-ignore
    input: sanitized,
  });
});

// Protected procedure with input sanitization
export const safeProcedure = protectedProcedure.use(sanitizeInput);

// ==========================================
// 6. AUDIT LOGGING MIDDLEWARE
// ==========================================

export const auditLog = middleware(async ({ ctx, input, next, path }) => {
  const startTime = Date.now();
  
  try {
    const result = await next();
    
    // Log successful operation
    await db.insert(schema.auditLog).values({
      tenantId: ctx.tenantId,
      userId: ctx.user?.id,
      action: path,
      entityType: path.split(".")[0],
      // @ts-ignore
      entityId: input?.id || null,
      changes: { input },
      ipAddress: ctx.req?.ip,
      userAgent: ctx.req?.headers?.["user-agent"],
      duration: Date.now() - startTime,
      createdAt: new Date(),
    });

    return result;
  } catch (error) {
    // Log failed operation
    await db.insert(schema.auditLog).values({
      tenantId: ctx.tenantId,
      userId: ctx.user?.id,
      action: path,
      entityType: path.split(".")[0],
      changes: { input, error: error.message },
      ipAddress: ctx.req?.ip,
      userAgent: ctx.req?.headers?.["user-agent"],
      duration: Date.now() - startTime,
      createdAt: new Date(),
    });

    throw error;
  }
});

// Protected procedure with audit logging
export const auditedProcedure = protectedProcedure.use(auditLog);

// ==========================================
// 7. SECURITY EVENT LOGGING
// ==========================================

export const logSecurityEvent = async (event: {
  type: string;
  userId?: number;
  tenantId?: string;
  ip?: string;
  userAgent?: string;
  details?: any;
  severity: "low" | "medium" | "high" | "critical";
}) => {
  await db.insert(schema.securityLog).values({
    eventType: event.type,
    userId: event.userId,
    tenantId: event.tenantId,
    ipAddress: event.ip,
    userAgent: event.userAgent,
    details: event.details,
    severity: event.severity,
    createdAt: new Date(),
  });

  // Send alert if critical
  if (event.severity === "critical") {
    // TODO: Send email/SMS to admins
    console.error("CRITICAL SECURITY EVENT:", event);
  }
};

// ==========================================
// 8. USAGE EXAMPLES
// ==========================================

/*
// Example 1: Protected endpoint with tenant isolation
router({
  getCustomers: tenantProcedure
    .input(z.object({ tenantId: z.string() }))
    .query(async ({ input, ctx }) => {
      // ctx.user and ctx.tenantId are available
      // tenantId is already verified
      return await db.select().from(schema.customers)
        .where(eq(schema.customers.tenantId, input.tenantId));
    }),

  // Example 2: Admin-only endpoint
  deleteUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      return await db.delete(schema.tenantUsers)
        .where(eq(schema.tenantUsers.id, input.userId));
    }),

  // Example 3: Rate-limited endpoint
  sendEmail: rateLimitedProcedure
    .input(z.object({ to: z.string(), subject: z.string() }))
    .mutation(async ({ input }) => {
      // Send email
    }),

  // Example 4: Audited endpoint
  updateCustomer: auditedProcedure
    .input(z.object({ id: z.number(), name: z.string() }))
    .mutation(async ({ input }) => {
      return await db.update(schema.customers)
        .set({ name: input.name })
        .where(eq(schema.customers.id, input.id));
    }),
});
*/

// ==========================================
// 9. SECURITY BEST PRACTICES
// ==========================================

/*
✅ DO:
1. Always use protectedProcedure for authenticated endpoints
2. Always use tenantProcedure for multi-tenant data
3. Always validate input with Zod schemas
4. Always log security events
5. Always use HTTPS in production
6. Always hash passwords with bcrypt (10+ rounds)
7. Always use parameterized queries (ORM)
8. Always sanitize user input
9. Always implement rate limiting
10. Always audit sensitive operations

❌ DON'T:
1. Don't use publicProcedure for sensitive data
2. Don't trust client-provided tenantId without verification
3. Don't hardcode secrets in code
4. Don't log sensitive data (passwords, tokens)
5. Don't use raw SQL queries
6. Don't skip input validation
7. Don't ignore security warnings
8. Don't disable CORS in production
9. Don't expose stack traces to users
10. Don't forget to rotate session tokens
*/

export default {
  isAuthenticated,
  protectedProcedure,
  tenantProcedure,
  adminProcedure,
  managerProcedure,
  rateLimitedProcedure,
  safeProcedure,
  auditedProcedure,
  logSecurityEvent,
};
