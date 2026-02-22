'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './portal-invoices.module.css';

interface PaymentItem {
    id: string;
    amount: number;
    paidDate: string;
}

interface InvoiceItem {
    id: string;
    invoiceNumber: string | null;
    amount: number;
    currency: string;
    status: string;
    issuedDate: string | null;
    dueDate: string | null;
    project: { name: string };
    payments: PaymentItem[];
}

const STATUS_BADGE: Record<string, string> = {
    PENDING: 'active',
    SENT: 'new',
    PAID: 'completed',
    VOIDED: 'draft',
};

export default function PortalInvoicesPage() {
    const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetch_ = useCallback(async () => {
        setLoading(true);
        const res = await fetch('/api/v1/portal/invoices');
        const json = await res.json();
        setInvoices(json.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetch_(); }, [fetch_]);

    function formatCurrency(n: number) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
    }

    function getDueStatus(dueDate: string | null, status: string) {
        if (status === 'PAID' || status === 'VOIDED' || !dueDate) return '';
        const due = new Date(dueDate);
        const now = new Date();
        const days = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (days < 0) return 'overdue';
        if (days < 7) return 'due-soon';
        return '';
    }

    if (loading) {
        return <div className="card"><div className="skeleton" style={{ height: 300 }} /></div>;
    }

    const totalOutstanding = invoices
        .filter((i) => i.status === 'PENDING' || i.status === 'SENT')
        .reduce((s, i) => s + Number(i.amount), 0);

    return (
        <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
                Invoices
            </h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
                View invoices and payment status
            </p>

            {/* Outstanding total */}
            {totalOutstanding > 0 && (
                <div className={styles.outstandingBanner}>
                    <span>Outstanding Balance</span>
                    <span className={styles.outstandingAmount}>{formatCurrency(totalOutstanding)}</span>
                </div>
            )}

            {invoices.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">🧾</div>
                        <div className="empty-state-title">No invoices</div>
                        <div className="empty-state-text">Invoices will appear here once issued</div>
                    </div>
                </div>
            ) : (
                <div className="card">
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Invoice #</th>
                                    <th>Project</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Issued</th>
                                    <th>Due</th>
                                    <th>Payments</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((inv) => {
                                    const dueStatus = getDueStatus(inv.dueDate, inv.status);
                                    return (
                                        <tr key={inv.id}>
                                            <td className={styles.invoiceNum}>
                                                {inv.invoiceNumber || inv.id.slice(-8)}
                                            </td>
                                            <td>{inv.project.name}</td>
                                            <td className={styles.amount}>{formatCurrency(Number(inv.amount))}</td>
                                            <td>
                                                <span className={`badge badge-${STATUS_BADGE[inv.status] || 'draft'}`}>
                                                    {inv.status}
                                                </span>
                                            </td>
                                            <td>
                                                {inv.issuedDate
                                                    ? new Date(inv.issuedDate).toLocaleDateString()
                                                    : '—'}
                                            </td>
                                            <td>
                                                <span className={dueStatus ? styles[dueStatus] : ''}>
                                                    {inv.dueDate
                                                        ? new Date(inv.dueDate).toLocaleDateString()
                                                        : '—'}
                                                </span>
                                            </td>
                                            <td>
                                                {inv.payments.length > 0 ? (
                                                    <span className={styles.paymentCount}>
                                                        {inv.payments.length} payment{inv.payments.length > 1 ? 's' : ''}
                                                    </span>
                                                ) : (
                                                    <span className={styles.noPay}>—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
