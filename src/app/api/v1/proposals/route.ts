import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError, getClientIp } from '@/lib/api-utils';
import { logAuditEvent, getAuditContext } from '@/lib/audit';

/**
 * GET /api/v1/proposals
 * List proposals for the tenant
 */
export async function GET(req: NextRequest) {
    const result = await requirePermissionApi(req, 'proposals:view');
    if (result instanceof Response) return result;
    const ctx = result;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const status = searchParams.get('status');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { tenantId: ctx.tenantId };
    if (status) where.status = status;

    const [proposals, total] = await Promise.all([
        prisma.proposal.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                request: {
                    select: { id: true, title: true, clientName: true },
                },
                jobs: {
                    select: { id: true, name: true, lineTotal: true },
                },
                _count: { select: { approvals: true } },
            },
        }),
        prisma.proposal.count({ where }),
    ]);

    return apiSuccess({
        data: proposals,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
}

/**
 * POST /api/v1/proposals
 * Create a new proposal from a request
 */
export async function POST(req: NextRequest) {
    const result = await requirePermissionApi(req, 'proposals:create');
    if (result instanceof Response) return result;
    const ctx = result;

    const body = await req.json();
    const { requestId, pricingModel, jobs } = body;

    if (!requestId) {
        return apiError('requestId is required');
    }

    // Verify request belongs to tenant
    const request = await prisma.request.findFirst({
        where: { id: requestId, tenantId: ctx.tenantId },
    });

    if (!request) {
        return apiError('Request not found', 404);
    }

    // Get latest version
    const latestProposal = await prisma.proposal.findFirst({
        where: { requestId },
        orderBy: { version: 'desc' },
    });
    const nextVersion = (latestProposal?.version || 0) + 1;

    // Calculate total
    let totalAmount = 0;
    if (jobs?.length) {
        totalAmount = jobs.reduce(
            (sum: number, j: { lineTotal?: number }) => sum + (j.lineTotal || 0),
            0
        );
    }

    const proposal = await prisma.proposal.create({
        data: {
            tenantId: ctx.tenantId,
            requestId,
            version: nextVersion,
            pricingModel: pricingModel || 'FIXED_PER_JOB',
            totalAmount,
            jobs: jobs?.length
                ? {
                    create: jobs.map(
                        (
                            j: {
                                name: string;
                                scope?: string;
                                assumptions?: string[];
                                deliverables?: string[];
                                lineTotal?: number;
                                estimates?: {
                                    roleName: string;
                                    hours: number;
                                    hourlyRate: number;
                                    lineTotal: number;
                                }[];
                            },
                            index: number
                        ) => ({
                            name: j.name,
                            scope: j.scope || '',
                            assumptions: j.assumptions || [],
                            deliverables: j.deliverables || [],
                            sortOrder: index,
                            lineTotal: j.lineTotal || 0,
                            estimates: j.estimates?.length
                                ? {
                                    create: j.estimates.map((e) => ({
                                        roleName: e.roleName,
                                        hours: e.hours,
                                        hourlyRate: e.hourlyRate,
                                        lineTotal: e.lineTotal,
                                    })),
                                }
                                : undefined,
                        })
                    ),
                }
                : undefined,
        },
        include: {
            jobs: {
                include: { estimates: true },
            },
        },
    });

    // Mark request as having proposal (scoped by tenantId)
    await prisma.request.update({
        where: { id: requestId, tenantId: ctx.tenantId },
        data: { status: 'PROPOSAL_CREATED' },
    });

    // Mark previous versions as superseded (scoped by tenantId)
    if (latestProposal) {
        await prisma.proposal.updateMany({
            where: {
                requestId,
                tenantId: ctx.tenantId,
                id: { not: proposal.id },
                status: { in: ['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL'] },
            },
            data: { status: 'SUPERSEDED' },
        });
    }

    await logAuditEvent(
        getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
        'Proposal',
        proposal.id,
        'CREATE',
        null,
        { ...proposal, version: nextVersion } as unknown as Record<string, unknown>
    );

    return apiSuccess({ data: proposal }, 201);
}
