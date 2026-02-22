import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError, getClientIp } from '@/lib/api-utils';
import { logAuditEvent, getAuditContext } from '@/lib/audit';

/**
 * POST /api/v1/proposals/[id]/send
 * Mock sending an approved proposal to the client
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requirePermissionApi(req, 'proposals:edit');
    if (result instanceof Response) return result;
    const ctx = result;
    const { id } = await params;

    const proposal = await prisma.proposal.findFirst({
        where: { id, tenantId: ctx.tenantId },
        include: { request: true },
    });

    if (!proposal) {
        return apiError('Proposal not found', 404);
    }

    if (proposal.status !== 'PENDING_APPROVAL') {
        return apiError('Only PENDING_APPROVAL proposals can be sent to clients', 400);
    }

    // Mock sending email
    console.log(`[EMAIL MOCK] Sending proposal link for ${id} to client: ${proposal.request.clientName}`);

    await logAuditEvent(
        getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
        'Proposal',
        id,
        'UPDATE',
        { action: 'SEND_TO_CLIENT', status: 'before_send' },
        { action: 'SEND_TO_CLIENT', status: 'sent', emailSent: true }
    );

    return apiSuccess({ message: 'Proposal sent to client successfully' });
}
