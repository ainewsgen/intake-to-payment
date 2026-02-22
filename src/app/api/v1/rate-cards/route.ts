import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError, getClientIp } from '@/lib/api-utils';
import { logAuditEvent, getAuditContext } from '@/lib/audit';

/**
 * GET /api/v1/rate-cards
 */
export async function GET(req: NextRequest) {
    const result = await requirePermissionApi(req, 'rate-cards:view');
    if (result instanceof Response) return result;
    const ctx = result;

    const rateCards = await prisma.rateCard.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { effectiveDate: 'desc' },
        include: {
            lines: { orderBy: { roleName: 'asc' } },
        },
    });

    return apiSuccess({ data: rateCards });
}

/**
 * POST /api/v1/rate-cards
 */
export async function POST(req: NextRequest) {
    const result = await requirePermissionApi(req, 'rate-cards:manage');
    if (result instanceof Response) return result;
    const ctx = result;

    const body = await req.json();
    const { name, effectiveDate, lines } = body;

    if (!name || !effectiveDate || !lines?.length) {
        return apiError('name, effectiveDate, and at least one line are required');
    }

    // Get latest version
    const latest = await prisma.rateCard.findFirst({
        where: { tenantId: ctx.tenantId },
        orderBy: { version: 'desc' },
    });
    const nextVersion = (latest?.version || 0) + 1;

    // Deactivate previous active rate cards
    await prisma.rateCard.updateMany({
        where: { tenantId: ctx.tenantId, isActive: true },
        data: { isActive: false },
    });

    const rateCard = await prisma.rateCard.create({
        data: {
            tenantId: ctx.tenantId,
            name,
            version: nextVersion,
            effectiveDate: new Date(effectiveDate),
            isActive: true,
            lines: {
                create: lines.map(
                    (l: { roleName: string; hourlyRate: number; currency?: string; employeeId?: string }) => ({
                        roleName: l.roleName,
                        hourlyRate: l.hourlyRate,
                        currency: l.currency || 'USD',
                        employeeId: l.employeeId,
                    })
                ),
            },
        },
        include: { lines: true },
    });

    await logAuditEvent(
        getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
        'RateCard',
        rateCard.id,
        'CREATE',
        null,
        rateCard as unknown as Record<string, unknown>
    );

    return apiSuccess({ data: rateCard }, 201);
}
