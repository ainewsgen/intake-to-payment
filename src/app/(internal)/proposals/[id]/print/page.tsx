import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import PrintButton from '@/components/print-button';

export default async function ProposalPrintPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session?.user) return null;
    const { id } = await params;

    const proposal = await prisma.proposal.findFirst({
        where: { id, tenantId: session.user.tenantId },
        include: {
            request: {
                select: {
                    title: true,
                    clientName: true,
                    clientAccount: { select: { name: true } },
                },
            },
            jobs: {
                include: {
                    estimates: true,
                },
                orderBy: { sortOrder: 'asc' },
            },
            approvals: {
                include: {
                    approvedBy: { select: { firstName: true, lastName: true } },
                },
            },
        },
    });

    if (!proposal) return notFound();

    const tenant = await prisma.tenant.findUnique({
        where: { id: session.user.tenantId },
    });

    const totalAmount = proposal.jobs.reduce(
        (s: number, j) => s + j.estimates.reduce((s2: number, e) => s2 + Number(e.lineTotal), 0), 0
    );
    const totalHours = proposal.jobs.reduce(
        (s: number, j) => s + j.estimates.reduce((s2: number, e) => s2 + Number(e.hours), 0), 0
    );

    function fmt(n: number) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
    }

    return (
        <html>
            <head>
                <title>Proposal — {proposal.request.title}</title>
                <style dangerouslySetInnerHTML={{
                    __html: `
          @page { size: letter; margin: 0.75in; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', 'Helvetica Neue', sans-serif; color: #1a1a2e; font-size: 13px; max-width: 8.5in; margin: 0 auto; padding: 40px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #6366f1; }
          .brand h1 { font-size: 22px; color: #6366f1; margin-bottom: 4px; }
          .brand p { color: #666; font-size: 11px; }
          .prop-meta { text-align: right; }
          .prop-meta h2 { font-size: 24px; color: #1a1a2e; margin-bottom: 8px; }
          .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
          .value { font-size: 13px; margin-bottom: 6px; }
          .client-section { margin-bottom: 30px; }
          .client-section h3 { font-size: 16px; margin-bottom: 6px; }
          .client-section p { color: #555; }
          .job-section { margin-bottom: 24px; page-break-inside: avoid; }
          .job-header { font-size: 14px; font-weight: 700; padding: 8px 12px; background: #f8f8fc; border-radius: 6px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; padding: 6px 12px; border-bottom: 1px solid #e5e5e5; }
          td { padding: 8px 12px; border-bottom: 1px solid #f0f0f0; }
          .text-right { text-align: right; }
          .total-bar { display: flex; justify-content: space-between; padding: 14px 12px; background: #6366f1; color: white; border-radius: 8px; font-weight: 700; font-size: 16px; margin-bottom: 30px; }
          .approvals { margin-top: 30px; }
          .approvals h4 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 8px; }
          .approval-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
          .status { font-weight: 700; }
          .status-approved { color: #059669; }
          .status-pending { color: #d97706; }
          .status-rejected { color: #dc2626; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-size: 11px; color: #888; text-align: center; }
          @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        ` }} />
            </head>
            <body>
                <PrintButton />

                <div className="header">
                    <div className="brand">
                        <h1>{tenant?.name || 'Company'}</h1>
                        <p>{tenant?.slug || ''}</p>
                    </div>
                    <div className="prop-meta">
                        <h2>PROPOSAL</h2>
                        <div className="label">Version</div>
                        <div className="value">v{proposal.version}</div>
                        <div className="label">Created</div>
                        <div className="value">{new Date(proposal.createdAt).toLocaleDateString()}</div>
                        <div className="label">Status</div>
                        <div className="value">{proposal.status.replace(/_/g, ' ')}</div>
                    </div>
                </div>

                <div className="client-section">
                    <h3>{proposal.request.title}</h3>
                    <p>Client: <strong>{proposal.request.clientAccount?.name || proposal.request.clientName || '—'}</strong></p>
                </div>

                {proposal.jobs.map((job) => {
                    const jobTotal = job.estimates.reduce((s: number, e) => s + Number(e.lineTotal), 0);
                    return (
                        <div key={job.id} className="job-section">
                            <div className="job-header">{job.name}</div>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Role</th>
                                        <th className="text-right">Hours</th>
                                        <th className="text-right">Rate</th>
                                        <th className="text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {job.estimates.map((est) => (
                                        <tr key={est.id}>
                                            <td>{est.roleName}</td>
                                            <td className="text-right">{Number(est.hours).toFixed(1)}</td>
                                            <td className="text-right">{fmt(Number(est.hourlyRate))}</td>
                                            <td className="text-right">{fmt(Number(est.lineTotal))}</td>
                                        </tr>
                                    ))}
                                    <tr style={{ fontWeight: 700 }}>
                                        <td>Subtotal</td>
                                        <td colSpan={2}></td>
                                        <td className="text-right">{fmt(jobTotal)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    );
                })}

                <div className="total-bar">
                    <span>Total: {totalHours.toFixed(0)} hours</span>
                    <span>{fmt(totalAmount)}</span>
                </div>

                {proposal.approvals.length > 0 && (
                    <div className="approvals">
                        <h4>Approval Workflow</h4>
                        {proposal.approvals.map((a) => (
                            <div key={a.id} className="approval-row">
                                <span>{a.type}: {a.approvedBy ? `${a.approvedBy.firstName} ${a.approvedBy.lastName}` : 'Pending'}</span>
                                <span className={`status status-${a.status === 'APPROVED' ? 'approved' : a.status === 'REJECTED' ? 'rejected' : 'pending'}`}>
                                    {a.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="footer">
                    <p>This proposal is valid for 30 days from the date issued.</p>
                </div>
            </body>
        </html>
    );
}
