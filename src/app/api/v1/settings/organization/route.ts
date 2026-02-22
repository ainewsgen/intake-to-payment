import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError, getClientIp } from '@/lib/api-utils';
import { logAuditEvent, getAuditContext } from '@/lib/audit';

/**
 * GET /api/v1/settings/organization
 * Fetch current tenant settings
 */
export async function GET(req: NextRequest) {
    const result = await requirePermissionApi(req, 'tenant:manage');
    if (result instanceof Response) return result;
    const ctx = result;

    const tenant = await prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
    });

    return apiSuccess({ data: tenant });
}

/**
 * PATCH /api/v1/settings/organization
 * Update current tenant settings
 */
export async function PATCH(req: NextRequest) {
    const result = await requirePermissionApi(req, 'tenant:manage');
    if (result instanceof Response) return result;
    const ctx = result;

    const body = await req.json();
    const { name, logoUrl, primaryColor, secondaryColor, fontFamily } = body;

    const existing = await prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
    });

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (fontFamily !== undefined) updateData.fontFamily = fontFamily;

    const updated = await prisma.tenant.update({
        where: { id: ctx.tenantId },
        data: updateData,
    });

    await logAuditEvent(
        getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
        'Tenant',
        ctx.tenantId,
        'UPDATE',
        existing as unknown as Record<string, unknown>,
        updated as unknown as Record<string, unknown>
    );

    return apiSuccess({ data: updated });
}
