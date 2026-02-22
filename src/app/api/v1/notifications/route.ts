import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess } from '@/lib/api-utils';

/**
 * GET /api/v1/notifications
 * Returns recent audit events as notifications for the current user's tenant.
 * Uses lastReadTimestamp (query param) to compute unread count.
 */
export async function GET(req: NextRequest) {
    const result = await requirePermissionApi(req, 'requests:view');
    if (result instanceof Response) return result;
    const ctx = result;

    const { searchParams } = new URL(req.url);
    const lastRead = searchParams.get('lastRead');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const events = await prisma.auditEvent.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { timestamp: 'desc' },
        take: limit,
        select: {
            id: true,
            entityType: true,
            entityId: true,
            action: true,
            timestamp: true,
            userId: true,
        },
    });

    // Map to notification-friendly format
    const notifications = events.map((e) => {
        const actionLabels: Record<string, string> = {
            CREATE: 'created',
            UPDATE: 'updated',
            APPROVE: 'approved',
            REJECT: 'rejected',
            SUBMIT: 'submitted',
        };
        const verb = actionLabels[e.action] || e.action.toLowerCase();
        const entity = e.entityType.replace(/([A-Z])/g, ' $1').trim();

        return {
            id: e.id,
            title: `${entity} ${verb}`,
            entityType: e.entityType,
            entityId: e.entityId,
            action: e.action,
            timestamp: e.timestamp,
            isUnread: lastRead ? new Date(e.timestamp) > new Date(lastRead) : true,
        };
    });

    const unreadCount = notifications.filter(n => n.isUnread).length;

    return apiSuccess({
        data: {
            notifications,
            unreadCount,
        },
    });
}
