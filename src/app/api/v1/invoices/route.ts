import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError, getClientIp } from '@/lib/api-utils';
import { logAuditEvent, getAuditContext } from '@/lib/audit';

/**
 * GET /api/v1/invoices
 * List invoices and drafts for the tenant
 */
export async function GET(req: NextRequest) {
    const result = await requirePermissionApi(req, 'invoices:view');
    if (result instanceof Response) return result;
    const ctx = result;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status');
    const type = searchParams.get('type') || 'invoices'; // 'invoices' | 'drafts'

    if (type === 'drafts') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {
            project: { tenantId: ctx.tenantId },
        };
        if (status) where.status = status;

        const [drafts, total] = await Promise.all([
            prisma.invoiceDraft.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    project: { select: { id: true, name: true, clientAccount: { select: { name: true } } } },
                    createdBy: { select: { firstName: true, lastName: true } },
                    approvedBy: { select: { firstName: true, lastName: true } },
                },
            }),
            prisma.invoiceDraft.count({ where }),
        ]);

        return apiSuccess({
            data: drafts,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
        project: { tenantId: ctx.tenantId },
    };
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                project: { select: { id: true, name: true, clientAccount: { select: { name: true } } } },
                _count: { select: { payments: true } },
            },
        }),
        prisma.invoice.count({ where }),
    ]);

    return apiSuccess({
        data: invoices,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
}

/**
 * POST /api/v1/invoices
 * Create an invoice draft from a project
 */
export async function POST(req: NextRequest) {
    const result = await requirePermissionApi(req, 'invoices:create');
    if (result instanceof Response) return result;
    const ctx = result;

    const body = await req.json();
    const { projectId, lineItems, totalAmount, notes } = body;

    if (!projectId || !lineItems || totalAmount === undefined) {
        return apiError('projectId, lineItems, and totalAmount are required');
    }

    // Verify project belongs to tenant
    const project = await prisma.project.findFirst({
        where: { id: projectId, tenantId: ctx.tenantId },
    });
    if (!project) return apiError('Project not found', 404);

    const draft = await prisma.invoiceDraft.create({
        data: {
            projectId,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            lineItems: lineItems as any,
            totalAmount,
            notes,
            createdById: ctx.userId,
        },
        include: {
            project: { select: { name: true } },
            createdBy: { select: { firstName: true, lastName: true } },
        },
    });

    await logAuditEvent(
        getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
        'InvoiceDraft',
        draft.id,
        'CREATE',
        null,
        { projectId, totalAmount } as Record<string, unknown>
    );

    return apiSuccess({ data: draft }, 201);
}
