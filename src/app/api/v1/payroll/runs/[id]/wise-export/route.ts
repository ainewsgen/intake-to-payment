import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError, getClientIp } from '@/lib/api-utils';
import { logAuditEvent, getAuditContext } from '@/lib/audit';
import { generateWiseBatchCSV, buildWisePaymentLines } from '@/lib/wise-generator';

/**
 * POST /api/v1/payroll/runs/[id]/wise-export
 * Generate a Wise batch CSV for the pay run
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requirePermissionApi(req, 'payroll:manage');
    if (result instanceof Response) return result;
    const ctx = result;
    const { id } = await params;

    const payRun = await prisma.contractorPayRun.findFirst({
        where: { id, tenantId: ctx.tenantId },
        include: {
            lines: {
                include: {
                    user: { select: { firstName: true, lastName: true, email: true } },
                },
            },
        },
    });

    if (!payRun) {
        return apiError('Pay run not found', 404);
    }

    if (payRun.status !== 'APPROVED') {
        return apiError('Pay run must be approved before generating Wise export', 400);
    }

    // Build payment lines
    const wiseLines = buildWisePaymentLines(
        payRun.lines.map((l) => ({
            user: l.user,
            currency: l.currency,
            totalAmount: Number(l.totalAmount),
            payRunId: payRun.id,
        }))
    );

    // Generate CSV
    const csv = generateWiseBatchCSV(wiseLines);

    // In a real implementation, we'd upload to S3 and record in WiseBatchFile.
    // For now, return the CSV content directly.
    await logAuditEvent(
        getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
        'WiseBatchFile',
        id,
        'CREATE',
        null,
        { payRunId: id, format: 'CSV', lineCount: wiseLines.length } as Record<string, unknown>
    );

    // Return as downloadable CSV
    return new Response(csv, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="wise-batch-${id.slice(-8)}.csv"`,
        },
    });
}
