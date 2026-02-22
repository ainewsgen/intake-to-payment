import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess } from '@/lib/api-utils';

/**
 * GET /api/v1/time-entries/review
 * List pending (unapproved) time entries for PM review
 *
 * PATCH /api/v1/time-entries/review
 * Batch approve/reject time entries
 */
export async function GET(req: NextRequest) {
    const result = await requirePermissionApi(req, 'time:approve');
    if (result instanceof Response) return result;
    const ctx = result;

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || undefined;

    const entries = await prisma.timeEntry.findMany({
        where: {
            approved: false,
            projectJob: {
                project: {
                    tenantId: ctx.tenantId,
                    ...(projectId ? { id: projectId } : {}),
                },
            },
        },
        include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            projectJob: {
                include: {
                    project: { select: { id: true, name: true } },
                    job: { select: { name: true } },
                },
            },
        },
        orderBy: { date: 'desc' },
        take: 100,
    });

    return apiSuccess({ data: { entries, count: entries.length } });
}

export async function PATCH(req: NextRequest) {
    const result = await requirePermissionApi(req, 'time:approve');
    if (result instanceof Response) return result;
    const ctx = result;

    const body = await req.json();
    const { ids, action } = body as { ids: string[]; action: 'approve' | 'reject' };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'ids required' }, { status: 400 });
    }
    if (!['approve', 'reject'].includes(action)) {
        return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
    }

    if (action === 'approve') {
        await prisma.timeEntry.updateMany({
            where: {
                id: { in: ids },
                projectJob: { project: { tenantId: ctx.tenantId } },
            },
            data: { approved: true },
        });
    } else {
        // Reject = delete the entries
        await prisma.timeEntry.deleteMany({
            where: {
                id: { in: ids },
                projectJob: { project: { tenantId: ctx.tenantId } },
            },
        });
    }

    // Audit
    await prisma.auditEvent.create({
        data: {
            tenantId: ctx.tenantId,
            userId: ctx.userId,
            entityType: 'TimeEntry',
            entityId: ids.join(','),
            action: action === 'approve' ? 'UPDATE' : 'DELETE',
            after: { ids, bulkAction: action },
        },
    });

    return apiSuccess({ data: { processed: ids.length, action } });
}
