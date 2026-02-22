'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './billing.module.css';

interface InvoiceItem {
    id: string;
    invoiceNumber: string | null;
    amount: number;
    currency: string;
    status: string;
    issuedDate: string | null;
    dueDate: string | null;
    createdAt: string;
    project: { id: string; name: string; clientAccount: { name: string } };
    _count: { payments: number };
}

interface DraftItem {
    id: string;
    totalAmount: number;
    status: string;
    notes: string | null;
    createdAt: string;
    project: { id: string; name: string; clientAccount: { name: string } };
    createdBy: { firstName: string; lastName: string };
    approvedBy: { firstName: string; lastName: string } | null;
}

const STATUS_BADGE: Record<string, string> = {
    DRAFT: 'draft',
    PENDING_APPROVAL: 'active',
    APPROVED: 'completed',
    REJECTED: 'draft',
    PENDING: 'active',
    SENT: 'new',
    SYNCED_TO_QBO: 'completed',
    PAID: 'completed',
    VOIDED: 'draft',
};

export default function BillingPage() {
    const [activeTab, setActiveTab] = useState<'invoices' | 'drafts'>('invoices');
    const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
    const [drafts, setDrafts] = useState<DraftItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('type', activeTab);
        if (statusFilter) params.set('status', statusFilter);

        const res = await fetch(`/api/v1/invoices?${params}`);
        const json = await res.json();
        if (activeTab === 'invoices') {
            setInvoices(json.data || []);
        } else {
            setDrafts(json.data || []);
        }
        setTotalPages(json.pagination?.totalPages || 1);
        setLoading(false);
    }, [page, activeTab, statusFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    function formatCurrency(n: number) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
    }

    async function handleSubmitDraft(draftId: string) {
        await fetch(`/api/v1/invoices/${draftId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'PENDING_APPROVAL' }),
        });
        fetchData();
    }

    async function handleApproveDraft(draftId: string) {
        await fetch(`/api/v1/invoices/${draftId}/approve`, { method: 'POST' });
        fetchData();
    }

    return (
        <>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">Billing</h1>
                        <p className="page-subtitle">Invoice drafts and finalized invoices</p>
                    </div>
                </div>
            </div>

            <div className="page-body">
                {/* Tabs */}
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'invoices' ? styles.tabActive : ''}`}
                        onClick={() => { setActiveTab('invoices'); setPage(1); setStatusFilter(''); }}
                    >
                        Invoices
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'drafts' ? styles.tabActive : ''}`}
                        onClick={() => { setActiveTab('drafts'); setPage(1); setStatusFilter(''); }}
                    >
                        Drafts
                    </button>
                </div>

                {/* Filter */}
                <div className={styles.filters}>
                    <select
                        className="select"
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        style={{ maxWidth: 180 }}
                    >
                        <option value="">All statuses</option>
                        {activeTab === 'invoices' ? (
                            <>
                                <option value="PENDING">Pending</option>
                                <option value="SENT">Sent</option>
                                <option value="PAID">Paid</option>
                                <option value="VOIDED">Voided</option>
                            </>
                        ) : (
                            <>
                                <option value="DRAFT">Draft</option>
                                <option value="PENDING_APPROVAL">Pending Approval</option>
                                <option value="APPROVED">Approved</option>
                                <option value="REJECTED">Rejected</option>
                            </>
                        )}
                    </select>
                </div>

                {loading ? (
                    <div className="card"><div className="skeleton" style={{ height: 200 }} /></div>
                ) : activeTab === 'invoices' ? (
                    /* Invoices Table */
                    invoices.length === 0 ? (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-state-icon">🧾</div>
                                <div className="empty-state-title">No invoices yet</div>
                                <div className="empty-state-text">Approve invoice drafts to generate invoices</div>
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
                                            <th>Client</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Due Date</th>
                                            <th>Payments</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.map((inv) => (
                                            <tr key={inv.id}>
                                                <td className={styles.invoiceNum}>
                                                    {inv.invoiceNumber || inv.id.slice(-8)}
                                                </td>
                                                <td>{inv.project.name}</td>
                                                <td>{inv.project.clientAccount.name}</td>
                                                <td className={styles.amount}>{formatCurrency(Number(inv.amount))}</td>
                                                <td>
                                                    <span className={`badge badge-${STATUS_BADGE[inv.status] || 'draft'}`}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    {inv.dueDate
                                                        ? new Date(inv.dueDate).toLocaleDateString()
                                                        : '—'}
                                                </td>
                                                <td>{inv._count.payments}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                ) : (
                    /* Drafts */
                    drafts.length === 0 ? (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-state-icon">📝</div>
                                <div className="empty-state-title">No drafts</div>
                                <div className="empty-state-text">Create invoice drafts from project pages</div>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.draftGrid}>
                            {drafts.map((draft) => (
                                <div key={draft.id} className={styles.draftCard}>
                                    <div className={styles.draftHeader}>
                                        <span className={`badge badge-${STATUS_BADGE[draft.status] || 'draft'}`}>
                                            {draft.status.replace(/_/g, ' ')}
                                        </span>
                                        <span className={styles.draftAmount}>
                                            {formatCurrency(Number(draft.totalAmount))}
                                        </span>
                                    </div>
                                    <h3 className={styles.draftProject}>{draft.project.name}</h3>
                                    <p className={styles.draftClient}>{draft.project.clientAccount.name}</p>
                                    <p className={styles.draftMeta}>
                                        By {draft.createdBy.firstName} {draft.createdBy.lastName} •{' '}
                                        {new Date(draft.createdAt).toLocaleDateString()}
                                    </p>
                                    {draft.notes && (
                                        <p className={styles.draftNotes}>{draft.notes}</p>
                                    )}
                                    <div className={styles.draftActions}>
                                        {draft.status === 'DRAFT' && (
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => handleSubmitDraft(draft.id)}
                                            >
                                                Submit for Approval
                                            </button>
                                        )}
                                        {draft.status === 'PENDING_APPROVAL' && (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => handleApproveDraft(draft.id)}
                                            >
                                                ✓ Approve & Create Invoice
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}

                {totalPages > 1 && (
                    <div className={styles.pagination}>
                        <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
                        <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
                        <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                    </div>
                )}
            </div>
        </>
    );
}
