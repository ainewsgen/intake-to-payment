import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requirePermissionApi, apiSuccess, apiError, getClientIp } from '@/lib/api-utils';
import { logAuditEvent, getAuditContext } from '@/lib/audit';

/**
 * POST /api/v1/invoices/[id]/approve
 * Approve a draft → creates an Invoice record
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const result = await requirePermissionApi(req, 'invoices:approve');
    if (result instanceof Response) return result;
    const ctx = result;
    const { id } = await params;

    const draft = await prisma.invoiceDraft.findFirst({
        where: {
            id,
            project: { tenantId: ctx.tenantId },
        },
        include: { project: true },
    });

    if (!draft) return apiError('Invoice draft not found', 404);
    if (draft.status !== 'PENDING_APPROVAL') {
        return apiError('Draft must be in PENDING_APPROVAL status');
    }

    // Count existing invoices for sequential numbering
    const invoiceCount = await prisma.invoice.count({
        where: { project: { tenantId: ctx.tenantId } },
    });
    const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(5, '0')}`;

    // Approve draft + create invoice in a transaction
    const [, invoice] = await prisma.$transaction([
        prisma.invoiceDraft.update({
            where: { id },
            data: {
                status: 'APPROVED',
                approvedById: ctx.userId,
                approvedAt: new Date(),
            },
        }),
        prisma.invoice.create({
            data: {
                projectId: draft.projectId,
                invoiceDraftId: draft.id,
                invoiceNumber,
                amount: draft.totalAmount,
                issuedDate: new Date(),
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Net 30
            },
        }),
    ]);

    await logAuditEvent(
        getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
        'Invoice',
        invoice.id,
        'CREATE',
        null,
        { invoiceNumber, amount: Number(draft.totalAmount), projectId: draft.projectId }
    );

    return apiSuccess({ data: invoice }, 201);
}
