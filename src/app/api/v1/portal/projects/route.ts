import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/api-utils';

async function requireClient() {
    const session = await auth();
    if (!session?.user || session.user.userType !== 'CLIENT' || !session.user.clientAccountId) {
        return null;
    }
    return {
        userId: session.user.id,
        tenantId: session.user.tenantId,
        clientAccountId: session.user.clientAccountId,
    };
}

/**
 * GET /api/v1/portal/projects
 */
export async function GET(req: NextRequest) {
    const ctx = await requireClient();
    if (!ctx) return apiError('Unauthorized', 401);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where = {
        tenantId: ctx.tenantId,
        clientAccountId: ctx.clientAccountId,
    };

    const [projects, total] = await Promise.all([
        prisma.project.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                pmUser: { select: { firstName: true, lastName: true } },
                projectJobs: {
                    include: {
                        job: { select: { name: true } },
                        milestones: {
                            select: { id: true, name: true, status: true, dueDate: true },
                            orderBy: { sortOrder: 'asc' },
                        },
                    },
                },
            },
        }),
        prisma.project.count({ where }),
    ]);

    return apiSuccess({
        data: projects,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
}
