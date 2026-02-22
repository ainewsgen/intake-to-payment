import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess } from '@/lib/api-utils';

/**
 * GET /api/v1/search?q=...
 * Cross-entity search across requests, proposals, projects, invoices, and users
 */
export async function GET(req: NextRequest) {
    const result = await requirePermissionApi(req, 'requests:view');
    if (result instanceof Response) return result;
    const ctx = result;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim();
    if (!q || q.length < 2) {
        return apiSuccess({ data: { results: [] } });
    }

    const contains = q;

    // Run parallel searches
    const [requests, proposals, projects, users] = await Promise.all([
        prisma.request.findMany({
            where: {
                tenantId: ctx.tenantId,
                OR: [
                    { title: { contains, mode: 'insensitive' } },
                    { clientName: { contains, mode: 'insensitive' } },
                ],
            },
            take: 5,
            select: { id: true, title: true, clientName: true, status: true },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.proposal.findMany({
            where: {
                tenantId: ctx.tenantId,
                request: {
                    OR: [
                        { title: { contains, mode: 'insensitive' } },
                        { clientName: { contains, mode: 'insensitive' } },
                    ],
                },
            },
            take: 5,
            select: { id: true, version: true, status: true, request: { select: { title: true } } },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.project.findMany({
            where: {
                tenantId: ctx.tenantId,
                OR: [
                    { name: { contains, mode: 'insensitive' } },
                    { clientAccount: { name: { contains, mode: 'insensitive' } } },
                ],
            },
            take: 5,
            select: { id: true, name: true, status: true, clientAccount: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.user.findMany({
            where: {
                tenantId: ctx.tenantId,
                OR: [
                    { firstName: { contains, mode: 'insensitive' } },
                    { lastName: { contains, mode: 'insensitive' } },
                    { email: { contains, mode: 'insensitive' } },
                ],
            },
            take: 5,
            select: { id: true, firstName: true, lastName: true, email: true, role: true },
        }),
    ]);

    const results = [
        ...requests.map(r => ({
            type: 'Request' as const,
            icon: '📥',
            id: r.id,
            title: r.title,
            subtitle: r.clientName || '',
            status: r.status,
            href: `/requests/${r.id}`,
        })),
        ...proposals.map(p => ({
            type: 'Proposal' as const,
            icon: '📄',
            id: p.id,
            title: p.request.title,
            subtitle: `v${p.version}`,
            status: p.status,
            href: `/proposals/${p.id}`,
        })),
        ...projects.map(p => ({
            type: 'Project' as const,
            icon: '📁',
            id: p.id,
            title: p.name,
            subtitle: p.clientAccount.name,
            status: p.status,
            href: `/projects/${p.id}`,
        })),
        ...users.map(u => ({
            type: 'User' as const,
            icon: '👤',
            id: u.id,
            title: `${u.firstName} ${u.lastName}`,
            subtitle: u.email,
            status: u.role,
            href: `/settings/users`,
        })),
    ];

    return apiSuccess({ data: { results, query: q } });
}
