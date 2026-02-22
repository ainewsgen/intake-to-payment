import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError, getClientIp } from '@/lib/api-utils';
import { logAuditEvent, getAuditContext } from '@/lib/audit';

/**
 * PATCH /api/v1/users/[id]
 * Update a user (role, active status, etc.)
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requirePermissionApi(req, 'users:manage');
    if (result instanceof Response) return result;
    const ctx = result;
    const { id } = await params;

    const existing = await prisma.user.findFirst({
        where: { id, tenantId: ctx.tenantId },
    });
    if (!existing) return apiError('User not found', 404);

    const body = await req.json();
    const { role, isActive, firstName, lastName, customPermissions } = body;

    const validRoles = ['ADMIN', 'ESTIMATOR', 'PM', 'FINANCE', 'EMPLOYEE'];
    if (role && !validRoles.includes(role)) {
        return apiError(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (customPermissions !== undefined) data.customPermissions = customPermissions;

    const user = await prisma.user.update({
        where: { id, tenantId: ctx.tenantId },
        data,
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            customPermissions: true,
        },
    });

    await logAuditEvent(
        getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
        'User',
        user.id,
        'UPDATE',
        { role: existing.role, isActive: existing.isActive } as Record<string, unknown>,
        data as Record<string, unknown>
    );

    return apiSuccess({ data: user });
}
