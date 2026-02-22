import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError, getClientIp } from '@/lib/api-utils';
import { logAuditEvent, getAuditContext } from '@/lib/audit';

/**
 * GET /api/v1/time-entries
 * List time entries for the current user with date range filter
 */
export async function GET(req: NextRequest) {
    const result = await requirePermissionApi(req, 'time:view');
    if (result instanceof Response) return result;
    const ctx = result;

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const projectId = searchParams.get('projectId');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { userId: ctx.userId };

    // Scope by project's tenant
    where.projectJob = { project: { tenantId: ctx.tenantId } };

    if (projectId) {
        where.projectJob = { ...where.projectJob, projectId };
    }

    if (from || to) {
        where.date = {};
        if (from) where.date.gte = new Date(from);
        if (to) where.date.lte = new Date(to);
    }

    const entries = await prisma.timeEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        take: 200,
        include: {
            projectJob: {
                include: {
                    project: { select: { id: true, name: true } },
                    job: { select: { name: true } },
                },
            },
        },
    });

    return apiSuccess({ data: entries });
}

/**
 * POST /api/v1/time-entries
 * Log a new time entry
 */
export async function POST(req: NextRequest) {
    const result = await requirePermissionApi(req, 'time:log');
    if (result instanceof Response) return result;
    const ctx = result;

    const body = await req.json();
    const { projectJobId, date, hours, notes } = body;

    if (!projectJobId || !date || hours === undefined) {
        return apiError('projectJobId, date, and hours are required');
    }

    // Verify project job belongs to tenant
    const pj = await prisma.projectJob.findFirst({
        where: { id: projectJobId, project: { tenantId: ctx.tenantId } },
    });
    if (!pj) return apiError('Project job not found', 404);

    const entry = await prisma.timeEntry.create({
        data: {
            projectJobId,
            userId: ctx.userId,
            date: new Date(date),
            hours: parseFloat(hours),
            source: 'MANUAL',
            notes: notes || null,
        },
        include: {
            projectJob: {
                include: {
                    project: { select: { id: true, name: true } },
                    job: { select: { name: true } },
                },
            },
        },
    });

    await logAuditEvent(
        getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
        'TimeEntry',
        entry.id,
        'CREATE',
        null,
        { projectJobId, hours, date } as Record<string, unknown>
    );

    return apiSuccess({ data: entry }, 201);
}
