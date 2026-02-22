import prisma from './prisma';
import { AuditAction } from '@prisma/client';

/**
 * Retention period in years.
 */
const RETENTION_YEARS = 10;

interface AuditContext {
    tenantId: string;
    userId?: string;
    userType?: 'INTERNAL' | 'CLIENT';
    ipAddress?: string;
}

/**
 * Log an audit event. Every create/update/delete should go through here.
 */
export async function logAuditEvent(
    context: AuditContext,
    entityType: string,
    entityId: string,
    action: AuditAction,
    before?: Record<string, unknown> | null,
    after?: Record<string, unknown> | null
): Promise<void> {
    const retainUntil = new Date();
    retainUntil.setFullYear(retainUntil.getFullYear() + RETENTION_YEARS);

    await prisma.auditEvent.create({
        data: {
            tenantId: context.tenantId,
            entityType,
            entityId,
            action,
            userId: context.userId,
            userType: context.userType,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            before: (before ?? undefined) as any,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            after: (after ?? undefined) as any,
            ipAddress: context.ipAddress,
            retainUntil,
        },
    });
}

/**
 * Helper to compute diff between before and after for update events.
 * Only includes fields that actually changed.
 */
export function computeDiff(
    before: Record<string, unknown>,
    after: Record<string, unknown>
): { beforeDiff: Record<string, unknown>; afterDiff: Record<string, unknown> } {
    const beforeDiff: Record<string, unknown> = {};
    const afterDiff: Record<string, unknown> = {};

    for (const key of Object.keys(after)) {
        if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
            beforeDiff[key] = before[key];
            afterDiff[key] = after[key];
        }
    }

    return { beforeDiff, afterDiff };
}

/**
 * Get the audit context from request headers and session.
 */
export function getAuditContext(
    tenantId: string,
    userId?: string,
    userType?: 'INTERNAL' | 'CLIENT',
    ipAddress?: string
): AuditContext {
    return { tenantId, userId, userType, ipAddress };
}
