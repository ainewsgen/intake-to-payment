import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError, getClientIp } from '@/lib/api-utils';
import { logAuditEvent, getAuditContext } from '@/lib/audit';

/**
 * POST /api/v1/projects/[id]/time-entries
 * Create a manual time entry
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requirePermissionApi(req, 'time:log');
    if (result instanceof Response) return result;
    const ctx = result;
    const { id } = await params;

    const project = await prisma.project.findFirst({
        where: { id, tenantId: ctx.tenantId },
    });
    if (!project) return apiError('Project not found', 404);

    const body = await req.json();
    const { projectJobId, date, hours, notes } = body;

    if (!projectJobId || !date || !hours) {
        return apiError('projectJobId, date, and hours are required');
    }

    // Verify the project job belongs to this project
    const pj = await prisma.projectJob.findFirst({
        where: { id: projectJobId, projectId: id },
    });
    if (!pj) return apiError('ProjectJob not found in this project', 404);

    const entry = await prisma.timeEntry.create({
        data: {
            projectJobId,
            userId: ctx.userId,
            date: new Date(date),
            hours,
            source: 'MANUAL',
            notes,
        },
    });

    await logAuditEvent(
        getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
        'TimeEntry',
        entry.id,
        'CREATE',
        null,
        { projectJobId, date, hours } as Record<string, unknown>
    );

    return apiSuccess({ data: entry }, 201);
}

/**
 * GET /api/v1/projects/[id]/time-entries
 * List time entries for a project
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requirePermissionApi(req, 'time:view');
    if (result instanceof Response) return result;
    const ctx = result;
    const { id } = await params;

    const project = await prisma.project.findFirst({
        where: { id, tenantId: ctx.tenantId },
    });
    if (!project) return apiError('Project not found', 404);

    const { searchParams } = new URL(req.url);
    const projectJobId = searchParams.get('projectJobId');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
        projectJob: { projectId: id },
    };
    if (projectJobId) where.projectJobId = projectJobId;

    const entries = await prisma.timeEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            projectJob: {
                select: { job: { select: { name: true } } },
            },
        },
    });

    return apiSuccess({ data: entries });
}
