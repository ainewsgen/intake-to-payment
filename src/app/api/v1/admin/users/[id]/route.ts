import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSystemAdmin, apiSuccess, apiError } from '@/lib/api-utils';

/**
 * GET /api/v1/admin/users/[id]
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requireSystemAdmin(req);
    if (result instanceof NextResponse) return result;

    const { id } = await params;

    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            tenant: true,
        },
    });

    if (!user) return apiError('User not found', 404);

    return apiSuccess({ data: user });
}

/**
 * PATCH /api/v1/admin/users/[id]
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requireSystemAdmin(req);
    if (result instanceof NextResponse) return result;

    const { id } = await params;
    const body = await req.json();
    const { role, isSystemAdmin, isActive, firstName, lastName } = body;

    try {
        const updateData: any = {};
        if (role !== undefined) updateData.role = role;
        if (isSystemAdmin !== undefined) updateData.isSystemAdmin = isSystemAdmin;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;

        const updated = await prisma.user.update({
            where: { id },
            data: updateData,
        });

        return apiSuccess({ data: updated });
    } catch (error: any) {
        return apiError(error.message || 'Server Error', 500);
    }
}

/**
 * DELETE /api/v1/admin/users/[id]
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requireSystemAdmin(req);
    if (result instanceof NextResponse) return result;

    const { id } = await params;

    try {
        // Prevent accidental self-deletion
        if (id === result.userId) {
            return apiError('Cannot delete your own account');
        }

        await prisma.user.delete({
            where: { id },
        });

        return apiSuccess({ message: 'User deleted successfully' });
    } catch (error: any) {
        return apiError(error.message || 'Server Error', 500);
    }
}
