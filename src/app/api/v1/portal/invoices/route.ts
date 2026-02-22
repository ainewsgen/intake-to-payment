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
 * GET /api/v1/portal/invoices
 */
export async function GET(req: NextRequest) {
    const ctx = await requireClient();
    if (!ctx) return apiError('Unauthorized', 401);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const where = {
        project: {
            tenantId: ctx.tenantId,
            clientAccountId: ctx.clientAccountId,
        },
    };

    const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                project: { select: { name: true } },
                payments: {
                    select: { id: true, amount: true, paidDate: true },
                },
            },
        }),
        prisma.invoice.count({ where }),
    ]);

    return apiSuccess({
        data: invoices,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
}
