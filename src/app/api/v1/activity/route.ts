import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess } from '@/lib/api-utils';

/**
 * GET /api/v1/activity?entityType=Project&entityId=xxx
 * Returns audit events for a specific entity, or recent tenant-wide activity
 */
export async function GET(req: NextRequest) {
    const result = await requirePermissionApi(req, 'requests:view');
    if (result instanceof Response) return result;
    const ctx = result;

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const events = await prisma.auditEvent.findMany({
        where: {
            tenantId: ctx.tenantId,
            ...(entityType ? { entityType } : {}),
            ...(entityId ? { entityId } : {}),
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
    });

    // Resolve user names
    const userIds = [...new Set(events.map(e => e.userId).filter(Boolean))] as string[];
    const users = userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, firstName: true, lastName: true },
        })
        : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    const timeline = events.map((e) => {
        const actionLabels: Record<string, string> = {
            CREATE: 'created',
            UPDATE: 'updated',
            DELETE: 'deleted',
        };
        const verb = actionLabels[e.action] || e.action.toLowerCase();
        const entity = e.entityType.replace(/([A-Z])/g, ' $1').trim();
        const user = e.userId ? userMap.get(e.userId) : null;
        const who = user
            ? `${user.firstName} ${user.lastName}`
            : 'System';

        return {
            id: e.id,
            message: `${who} ${verb} ${entity}`,
            entityType: e.entityType,
            entityId: e.entityId,
            action: e.action,
            timestamp: e.timestamp,
            user,
        };
    });

    return apiSuccess({ data: { timeline } });
}
