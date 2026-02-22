import prisma from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { notFound } from 'next/navigation';
import PrintButton from '@/components/print-button';

export default async function InvoicePrintPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const session = await auth();
    if (!session?.user) return null;
    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
        where: { id, project: { tenantId: session.user.tenantId } },
        include: {
            project: {
                include: {
                    clientAccount: true,
                    pmUser: { select: { firstName: true, lastName: true } },
                    projectJobs: {
                        include: {
                            job: { select: { name: true } },
                            timeEntries: { select: { hours: true } },
                        },
                    },
                },
            },
            payments: true,
        },
    });

    if (!invoice) return notFound();

    const tenant = await prisma.tenant.findUnique({
        where: { id: session.user.tenantId },
    });

    const cur = invoice.currency;
    const totalPaid = invoice.payments.reduce((s, p) => s + Number(p.amount), 0);
    const amountDue = Number(invoice.amount) - totalPaid;

    function fmt(n: number) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(n);
    }

    return (
        <html>
            <head>
                <title>Invoice {invoice.invoiceNumber || invoice.id}</title>
                <style dangerouslySetInnerHTML={{
                    __html: `
          @page { size: letter; margin: 0.75in; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', 'Helvetica Neue', sans-serif; color: #1a1a2e; font-size: 13px; max-width: 8.5in; margin: 0 auto; padding: 40px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #6366f1; }
          .brand h1 { font-size: 22px; color: #6366f1; margin-bottom: 4px; }
          .brand p { color: #666; font-size: 11px; }
          .inv-meta { text-align: right; }
          .inv-meta h2 { font-size: 28px; color: #1a1a2e; margin-bottom: 8px; }
          .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; }
          .value { font-size: 13px; margin-bottom: 6px; }
          .addresses { display: flex; gap: 60px; margin-bottom: 30px; }
          .addr-block h4 { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
          .addr-block p { line-height: 1.5; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #888; padding: 8px 12px; border-bottom: 1px solid #e5e5e5; }
          td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
          .text-right { text-align: right; }
          .total-row { background: #f8f8fc; }
          .total-row td { font-weight: 700; font-size: 15px; padding: 12px; }
          .due-row td { color: #6366f1; font-weight: 700; font-size: 16px; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; }
          .badge-paid { background: #d1fae5; color: #065f46; }
          .badge-pending { background: #fef3c7; color: #92400e; }
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
                    <div className="inv-meta">
                        <h2>INVOICE</h2>
                        <div className="label">Invoice No.</div>
                        <div className="value">{invoice.invoiceNumber || '—'}</div>
                        <div className="label">Date</div>
                        <div className="value">{invoice.issuedDate ? new Date(invoice.issuedDate).toLocaleDateString() : '—'}</div>
                        <div className="label">Due Date</div>
                        <div className="value">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}</div>
                    </div>
                </div>

                <div className="addresses">
                    <div className="addr-block">
                        <h4>Bill To</h4>
                        <p><strong>{invoice.project.clientAccount.name}</strong></p>
                    </div>
                    <div className="addr-block">
                        <h4>Project</h4>
                        <p><strong>{invoice.project.name}</strong></p>
                        <p>PM: {invoice.project.pmUser.firstName} {invoice.project.pmUser.lastName}</p>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th className="text-right">Hours</th>
                            <th className="text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.project.projectJobs.map((pj) => {
                            const hours = pj.timeEntries.reduce((s, te) => s + Number(te.hours), 0);
                            return (
                                <tr key={pj.id}>
                                    <td>{pj.job.name}</td>
                                    <td className="text-right">{hours.toFixed(1)}</td>
                                    <td className="text-right">—</td>
                                </tr>
                            );
                        })}
                        <tr className="total-row">
                            <td colSpan={2}>Total</td>
                            <td className="text-right">{fmt(Number(invoice.amount))}</td>
                        </tr>
                        {totalPaid > 0 && (
                            <tr>
                                <td colSpan={2}>Payments Received</td>
                                <td className="text-right">({fmt(totalPaid)})</td>
                            </tr>
                        )}
                        <tr className="total-row due-row">
                            <td colSpan={2}>
                                Amount Due {'  '}
                                <span className={`badge badge-${amountDue <= 0 ? 'paid' : 'pending'}`}>
                                    {amountDue <= 0 ? 'PAID' : invoice.status}
                                </span>
                            </td>
                            <td className="text-right">{fmt(amountDue)}</td>
                        </tr>
                    </tbody>
                </table>

                <div className="footer">
                    <p>Thank you for your business.</p>
                </div>
            </body>
        </html>
    );
}
