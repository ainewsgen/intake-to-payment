import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { hasPermission, Permission } from '@/lib/rbac';

export interface ApiContext {
    tenantId: string;
    userId: string;
    userType: 'INTERNAL' | 'CLIENT';
    role: string;
    clientAccountId?: string;
}

/**
 * Extract authenticated context from the session.
 * Returns null if not authenticated.
 */
export async function getApiContext(
    _req: NextRequest
): Promise<ApiContext | null> {
    const session = await auth();
    if (!session?.user) return null;

    return {
        tenantId: session.user.tenantId,
        userId: session.user.id,
        userType: session.user.userType,
        role: session.user.role,
        clientAccountId: session.user.clientAccountId,
    };
}

/**
 * Require authentication. Returns 401 if not authenticated.
 */
export async function requireAuth(
    req: NextRequest
): Promise<ApiContext | NextResponse> {
    const ctx = await getApiContext(req);
    if (!ctx) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return ctx;
}

/**
 * Require a specific permission. Returns 403 if the user lacks it.
 */
export async function requirePermissionApi(
    req: NextRequest,
    permission: Permission
): Promise<ApiContext | NextResponse> {
    const result = await requireAuth(req);
    if (result instanceof NextResponse) return result;

    const ctx = result;

    if (ctx.userType === 'CLIENT') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!hasPermission(ctx.role as UserRole, permission)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return ctx;
}

/**
 * Require the user to be a client user.
 */
export async function requireClientAuth(
    req: NextRequest
): Promise<(ApiContext & { clientAccountId: string }) | NextResponse> {
    const result = await requireAuth(req);
    if (result instanceof NextResponse) return result;

    const ctx = result;

    if (ctx.userType !== 'CLIENT' || !ctx.clientAccountId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return ctx as ApiContext & { clientAccountId: string };
}

/**
 * Standard JSON error response.
 */
export function apiError(
    message: string,
    status: number = 400
): NextResponse {
    return NextResponse.json({ error: message }, { status });
}

/**
 * Standard JSON success response.
 */
export function apiSuccess<T>(data: T, status: number = 200): NextResponse {
    return NextResponse.json(data, { status });
}

/**
 * Get the client IP address from the request.
 */
export function getClientIp(req: NextRequest): string {
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'
    );
}
