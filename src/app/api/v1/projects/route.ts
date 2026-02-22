import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError } from '@/lib/api-utils';

/**
 * GET /api/v1/projects
 * List projects for the tenant
 */
export async function GET(req: NextRequest) {
    const result = await requirePermissionApi(req, 'projects:view');
    if (result instanceof Response) return result;
    const ctx = result;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { tenantId: ctx.tenantId };
    if (status) where.status = status;

    const [projects, total] = await Promise.all([
        prisma.project.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                clientAccount: { select: { id: true, name: true } },
                pmUser: { select: { id: true, firstName: true, lastName: true } },
                projectJobs: {
                    include: {
                        job: { select: { name: true } },
                        _count: { select: { timeEntries: true, milestones: true } },
                    },
                },
                _count: { select: { documents: true, invoices: true } },
            },
        }),
        prisma.project.count({ where }),
    ]);

    return apiSuccess({
        data: projects,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
}
