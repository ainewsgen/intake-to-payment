import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSystemAdmin, apiSuccess, apiError } from '@/lib/api-utils';

/**
 * GET /api/v1/admin/users
 * List all users globally (System Admin only)
 */
export async function GET(req: NextRequest) {
    const result = await requireSystemAdmin(req);
    if (result instanceof NextResponse) return result;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    const users = await prisma.user.findMany({
        where: {
            OR: [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
            ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
            tenant: {
                select: { name: true, slug: true },
            },
        },
    });

    return apiSuccess({ data: users });
}
