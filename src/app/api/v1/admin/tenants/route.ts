import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSystemAdmin, apiSuccess, apiError } from '@/lib/api-utils';

/**
 * GET /api/v1/admin/tenants
 * List all tenants (System Admin only)
 */
export async function GET(req: NextRequest) {
    const result = await requireSystemAdmin(req);
    if (result instanceof NextResponse) return result;

    const tenants = await prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            _count: {
                select: {
                    users: true,
                    projects: true,
                },
            },
        },
    });

    return apiSuccess({ data: tenants });
}

/**
 * POST /api/v1/admin/tenants
 * Create a new tenant (System Admin only)
 */
export async function POST(req: NextRequest) {
    const result = await requireSystemAdmin(req);
    if (result instanceof NextResponse) return result;

    try {
        const body = await req.json();
        const { name, slug, primaryColor, secondaryColor, fontFamily } = body;

        if (!name || !slug) {
            return apiError('Name and slug are required');
        }

        // Check for existing slug
        const existing = await prisma.tenant.findUnique({
            where: { slug },
        });

        if (existing) {
            return apiError('Slug already in use');
        }

        const tenant = await prisma.tenant.create({
            data: {
                name,
                slug,
                primaryColor: primaryColor || '#2563eb',
                secondaryColor: secondaryColor || '#1e40af',
                fontFamily: fontFamily || 'Inter',
            },
        });

        return apiSuccess({ data: tenant }, 201);
    } catch (error: any) {
        return apiError(error.message || 'Server Error', 500);
    }
}

import { NextResponse } from 'next/server';
