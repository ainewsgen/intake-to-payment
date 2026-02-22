import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess } from '@/lib/api-utils';

/**
 * GET /api/v1/reports/revenue
 * Revenue breakdown by month, client, and project
 */
export async function GET(req: NextRequest) {
    const result = await requirePermissionApi(req, 'invoices:view');
    if (result instanceof Response) return result;
    const ctx = result;

    const { searchParams } = new URL(req.url);
    const months = parseInt(searchParams.get('months') || '12', 10);

    const since = new Date();
    since.setMonth(since.getMonth() - months);

    // Monthly revenue
    const invoices = await prisma.invoice.findMany({
        where: {
            project: { tenantId: ctx.tenantId },
            issuedDate: { gte: since },
        },
        select: {
            amount: true,
            status: true,
            issuedDate: true,
            project: {
                select: {
                    id: true,
                    name: true,
                    clientAccount: { select: { id: true, name: true } },
                },
            },
        },
        orderBy: { issuedDate: 'asc' },
    });

    // Aggregate by month
    const monthlyMap = new Map<string, { invoiced: number; paid: number; pending: number }>();
    for (const inv of invoices) {
        if (!inv.issuedDate) continue;
        const key = `${inv.issuedDate.getFullYear()}-${String(inv.issuedDate.getMonth() + 1).padStart(2, '0')}`;
        const entry = monthlyMap.get(key) || { invoiced: 0, paid: 0, pending: 0 };
        const amt = Number(inv.amount);
        entry.invoiced += amt;
        if (inv.status === 'PAID') entry.paid += amt;
        else entry.pending += amt;
        monthlyMap.set(key, entry);
    }

    const monthly = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month));

    // By client
    const clientMap = new Map<string, { id: string; name: string; invoiced: number; paid: number }>();
    for (const inv of invoices) {
        const ca = inv.project.clientAccount;
        const key = ca.id;
        const entry = clientMap.get(key) || { id: ca.id, name: ca.name, invoiced: 0, paid: 0 };
        const amt = Number(inv.amount);
        entry.invoiced += amt;
        if (inv.status === 'PAID') entry.paid += amt;
        clientMap.set(key, entry);
    }

    const byClient = Array.from(clientMap.values()).sort((a, b) => b.invoiced - a.invoiced);

    // By project
    const projectMap = new Map<string, { id: string; name: string; client: string; invoiced: number; paid: number }>();
    for (const inv of invoices) {
        const key = inv.project.id;
        const entry = projectMap.get(key) || {
            id: inv.project.id,
            name: inv.project.name,
            client: inv.project.clientAccount.name,
            invoiced: 0,
            paid: 0,
        };
        const amt = Number(inv.amount);
        entry.invoiced += amt;
        if (inv.status === 'PAID') entry.paid += amt;
        projectMap.set(key, entry);
    }

    const byProject = Array.from(projectMap.values()).sort((a, b) => b.invoiced - a.invoiced);

    // Totals
    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.amount), 0);
    const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + Number(i.amount), 0);
    const totalPending = totalInvoiced - totalPaid;

    return apiSuccess({
        data: {
            totals: { invoiced: totalInvoiced, paid: totalPaid, pending: totalPending },
            monthly,
            byClient,
            byProject,
        },
    });
}
