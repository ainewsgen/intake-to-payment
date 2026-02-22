import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSystemAdmin, apiSuccess, apiError } from '@/lib/api-utils';

/**
 * GET /api/v1/admin/tenants/[id]
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requireSystemAdmin(req);
    if (result instanceof NextResponse) return result;

    const { id } = await params;

    const tenant = await prisma.tenant.findUnique({
        where: { id },
        include: {
            _count: {
                select: {
                    users: true,
                    projects: true,
                    clientAccounts: true,
                },
            },
        },
    });

    if (!tenant) return apiError('Tenant not found', 404);

    return apiSuccess({ data: tenant });
}

/**
 * PATCH /api/v1/admin/tenants/[id]
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requireSystemAdmin(req);
    if (result instanceof NextResponse) return result;

    const { id } = await params;
    const body = await req.json();
    const { name, slug, logoUrl, primaryColor, secondaryColor, fontFamily } = body;

    try {
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (slug !== undefined) updateData.slug = slug;
        if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
        if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
        if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
        if (fontFamily !== undefined) updateData.fontFamily = fontFamily;

        const updated = await prisma.tenant.update({
            where: { id },
            data: updateData,
        });

        return apiSuccess({ data: updated });
    } catch (error: any) {
        return apiError(error.message || 'Server Error', 500);
    }
}

/**
 * DELETE /api/v1/admin/tenants/[id]
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requireSystemAdmin(req);
    if (result instanceof NextResponse) return result;

    const { id } = await params;

    try {
        // Enforce safety: don't delete the last tenant or the demo tenant easily
        const tenant = await prisma.tenant.findUnique({ where: { id } });
        if (tenant?.slug === 'demo') {
            return apiError('Cannot delete the demo tenant');
        }

        await prisma.tenant.delete({
            where: { id },
        });

        return apiSuccess({ message: 'Tenant deleted successfully' });
    } catch (error: any) {
        return apiError(error.message || 'Server Error', 500);
    }
}
