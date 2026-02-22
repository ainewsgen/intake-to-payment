import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess } from '@/lib/api-utils';

/**
 * GET /api/v1/audit
 * List audit events for the tenant (paginated, filterable)
 */
export async function GET(req: NextRequest) {
    const result = await requirePermissionApi(req, 'audit:view');
    if (result instanceof Response) return result;
    const ctx = result;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const entityType = searchParams.get('entityType');
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { tenantId: ctx.tenantId };
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [events, total] = await Promise.all([
        prisma.auditEvent.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.auditEvent.count({ where }),
    ]);

    return apiSuccess({
        data: events,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
}
