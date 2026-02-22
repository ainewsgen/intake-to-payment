import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError, getClientIp } from '@/lib/api-utils';
import { logAuditEvent, getAuditContext } from '@/lib/audit';

/**
 * GET /api/v1/requests
 * List all requests for the tenant (with pagination + filters)
 */
export async function GET(req: NextRequest) {
    const result = await requirePermissionApi(req, 'requests:view');
    if (result instanceof Response) return result;
    const ctx = result;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { tenantId: ctx.tenantId };
    if (status) where.status = status;
    if (search) {
        where.OR = [
            { title: { contains: search, mode: 'insensitive' } },
            { clientName: { contains: search, mode: 'insensitive' } },
            { notes: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [requests, total] = await Promise.all([
        prisma.request.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true } },
                clientAccount: { select: { id: true, name: true } },
                _count: { select: { attachments: true, proposals: true } },
            },
        }),
        prisma.request.count({ where }),
    ]);

    return apiSuccess({
        data: requests,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    });
}

/**
 * POST /api/v1/requests
 * Create a new request
 */
export async function POST(req: NextRequest) {
    const result = await requirePermissionApi(req, 'requests:create');
    if (result instanceof Response) return result;
    const ctx = result;

    const body = await req.json();
    const { source, title, clientName, clientAccountId, notes } = body;

    if (!source || !title) {
        return apiError('source and title are required');
    }

    const validSources = ['EMAIL', 'PHONE', 'UPLOAD', 'MANUAL'];
    if (!validSources.includes(source)) {
        return apiError(`source must be one of: ${validSources.join(', ')}`);
    }

    // Security Hardening: Verify clientAccountId belongs to current tenant
    if (clientAccountId) {
        const ca = await prisma.clientAccount.findFirst({
            where: { id: clientAccountId, tenantId: ctx.tenantId },
        });
        if (!ca) return apiError('Invalid clientAccountId for this tenant', 403);
    }

    const request = await prisma.request.create({
        data: {
            tenantId: ctx.tenantId,
            source,
            title,
            clientName,
            clientAccountId,
            notes,
            status: 'NEW', // Inherent default
            createdById: ctx.userId,
        },
        include: {
            createdBy: { select: { firstName: true, lastName: true } },
        },
    });

    await logAuditEvent(
        getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
        'Request',
        request.id,
        'CREATE',
        null,
        request as unknown as Record<string, unknown>
    );

    return apiSuccess({ data: request }, 201);
}
