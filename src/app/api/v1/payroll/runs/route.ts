import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError, getClientIp } from '@/lib/api-utils';
import { logAuditEvent, getAuditContext } from '@/lib/audit';
import { calculateContractorPay } from '@/lib/pricing';
import { getFxRate } from '@/lib/fx-rates';

/**
 * GET /api/v1/payroll/runs
 */
export async function GET(req: NextRequest) {
    const result = await requirePermissionApi(req, 'payroll:manage');
    if (result instanceof Response) return result;
    const ctx = result;

    const payRuns = await prisma.contractorPayRun.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { createdAt: 'desc' },
        include: {
            createdBy: { select: { firstName: true, lastName: true } },
            approvedBy: { select: { firstName: true, lastName: true } },
            _count: { select: { lines: true, batchFiles: true } },
        },
    });

    return apiSuccess({ data: payRuns });
}

/**
 * POST /api/v1/payroll/runs
 * Create a pay run: calculates pay for all contractors with time entries in the period.
 */
export async function POST(req: NextRequest) {
    const result = await requirePermissionApi(req, 'payroll:manage');
    if (result instanceof Response) return result;
    const ctx = result;

    const body = await req.json();
    const { periodStart, periodEnd } = body;

    if (!periodStart || !periodEnd) {
        return apiError('periodStart and periodEnd are required');
    }

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    // Find all approved time entries in the period for contractors
    const timeEntries = await prisma.timeEntry.findMany({
        where: {
            projectJob: { project: { tenantId: ctx.tenantId } },
            date: { gte: start, lte: end },
            approved: true,
            user: {
                // Only get users who have contractor assignments
                assignments: {
                    some: { type: 'CONTRACTOR' },
                },
            },
        },
        include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
    });

    // Group by user
    const userHours = new Map<string, { userId: string; totalHours: number }>();
    for (const entry of timeEntries) {
        const existing = userHours.get(entry.userId) || { userId: entry.userId, totalHours: 0 };
        existing.totalHours += Number(entry.hours);
        userHours.set(entry.userId, existing);
    }

    // Create pay run
    const payRun = await prisma.contractorPayRun.create({
        data: {
            tenantId: ctx.tenantId,
            periodStart: start,
            periodEnd: end,
            createdById: ctx.userId,
            status: 'DRAFT',
        },
    });

    // Calculate pay for each contractor
    const payLines = [];
    for (const [userId, { totalHours }] of userHours) {
        try {
            const { rate, currency, total } = await calculateContractorPay(
                ctx.tenantId,
                userId,
                totalHours,
                end
            );

            // Get FX rate if needed (convert to their pay currency)
            let fxRate = 1;
            let fxSource = 'identity';
            if (currency !== 'USD') {
                const fx = await getFxRate(ctx.tenantId, 'USD', currency);
                fxRate = fx.rate;
                fxSource = fx.source;
            }

            const payLine = await prisma.contractorPayLine.create({
                data: {
                    payRunId: payRun.id,
                    userId,
                    hours: totalHours,
                    rate,
                    currency,
                    fxRate,
                    fxSource,
                    totalAmount: total,
                },
            });

            payLines.push(payLine);
        } catch (err) {
            console.error(`Failed to calculate pay for user ${userId}:`, err);
        }
    }

    await logAuditEvent(
        getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
        'ContractorPayRun',
        payRun.id,
        'CREATE',
        null,
        { periodStart, periodEnd, lineCount: payLines.length } as Record<string, unknown>
    );

    const fullPayRun = await prisma.contractorPayRun.findUnique({
        where: { id: payRun.id },
        include: {
            lines: {
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true } },
                },
            },
        },
    });

    return apiSuccess({ data: fullPayRun }, 201);
}
