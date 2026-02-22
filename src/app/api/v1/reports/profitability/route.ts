import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess } from '@/lib/api-utils';

/**
 * GET /api/v1/reports/profitability
 * Project profitability — revenue vs cost (hours × contractor rate)
 */
export async function GET(req: NextRequest) {
    const result = await requirePermissionApi(req, 'invoices:view');
    if (result instanceof Response) return result;
    const ctx = result;

    const projects = await prisma.project.findMany({
        where: { tenantId: ctx.tenantId },
        include: {
            clientAccount: { select: { name: true } },
            invoices: {
                select: { amount: true, status: true },
            },
            projectJobs: {
                select: {
                    budgetHours: true,
                    timeEntries: {
                        select: { hours: true },
                    },
                },
            },
        },
    });

    const data = projects.map((p) => {
        const totalInvoiced = p.invoices.reduce((s: number, i) => s + Number(i.amount), 0);
        const totalPaid = p.invoices
            .filter(i => i.status === 'PAID')
            .reduce((s: number, i) => s + Number(i.amount), 0);

        const totalEstimatedHours = p.projectJobs.reduce(
            (s: number, pj) => s + (Number(pj.budgetHours) || 0), 0
        );
        const totalActualHours = p.projectJobs.reduce(
            (s: number, pj) => s + pj.timeEntries.reduce((s2: number, te) => s2 + Number(te.hours), 0), 0
        );

        const hoursVariance = totalEstimatedHours > 0
            ? Math.round(((totalActualHours - totalEstimatedHours) / totalEstimatedHours) * 100)
            : 0;

        // Effective rate = revenue / hours
        const effectiveRate = totalActualHours > 0
            ? Math.round((totalInvoiced / totalActualHours) * 100) / 100
            : 0;

        return {
            id: p.id,
            name: p.name,
            status: p.status,
            client: p.clientAccount.name,
            totalInvoiced,
            totalPaid,
            totalEstimatedHours,
            totalActualHours,
            hoursVariance,
            effectiveRate,
        };
    }).sort((a, b) => b.totalInvoiced - a.totalInvoiced);

    const totals = {
        invoiced: data.reduce((s, d) => s + d.totalInvoiced, 0),
        paid: data.reduce((s, d) => s + d.totalPaid, 0),
        estimatedHours: data.reduce((s, d) => s + d.totalEstimatedHours, 0),
        actualHours: data.reduce((s, d) => s + d.totalActualHours, 0),
    };

    return apiSuccess({ data: { projects: data, totals } });
}
