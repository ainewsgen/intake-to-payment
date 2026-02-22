'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './proposals.module.css';

interface ProposalItem {
    id: string;
    version: number;
    status: string;
    pricingModel: string;
    totalAmount: number | null;
    createdAt: string;
    request: { id: string; title: string; clientName: string | null };
    jobs: { id: string; name: string; lineTotal: number | null }[];
    _count: { approvals: number };
}

const STATUS_BADGE: Record<string, string> = {
    DRAFT: 'draft',
    PENDING_REVIEW: 'new',
    PENDING_APPROVAL: 'active',
    APPROVED: 'completed',
    REJECTED: 'draft',
    SUPERSEDED: 'draft',
};

export default function ProposalsPage() {
    const [proposals, setProposals] = useState<ProposalItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchProposals = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', page.toString());
        if (statusFilter) params.set('status', statusFilter);

        const res = await fetch(`/api/v1/proposals?${params}`);
        const json = await res.json();
        setProposals(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setLoading(false);
    }, [page, statusFilter]);

    useEffect(() => {
        fetchProposals();
    }, [fetchProposals]);

    function formatCurrency(amount: number | null) {
        if (!amount) return '—';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    }

    return (
        <>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">Proposals</h1>
                        <p className="page-subtitle">Manage proposals and pricing</p>
                    </div>
                </div>
            </div>

            <div className="page-body">
                {/* Filters */}
                <div className={styles.filters}>
                    <select
                        className="select"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                        style={{ maxWidth: 200 }}
                    >
                        <option value="">All statuses</option>
                        <option value="DRAFT">Draft</option>
                        <option value="PENDING_REVIEW">Pending Review</option>
                        <option value="PENDING_APPROVAL">Pending Approval</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>

                {loading ? (
                    <div className="card">
                        <div className="skeleton" style={{ height: 200 }} />
                    </div>
                ) : proposals.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <div className="empty-state-icon">📋</div>
                            <div className="empty-state-title">No proposals found</div>
                            <div className="empty-state-text">
                                Create a proposal from a request to get started
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={styles.proposalGrid}>
                        {proposals.map((p) => (
                            <Link
                                key={p.id}
                                href={`/proposals/${p.id}`}
                                className={styles.proposalCard}
                            >
                                <div className={styles.cardHeader}>
                                    <span className={`badge badge-${STATUS_BADGE[p.status] || 'draft'}`}>
                                        {p.status.replace(/_/g, ' ')}
                                    </span>
                                    <span className={styles.version}>v{p.version}</span>
                                </div>
                                <h3 className={styles.cardTitle}>{p.request.title}</h3>
                                <p className={styles.client}>
                                    {p.request.clientName || 'No client'}
                                </p>
                                <div className={styles.cardMeta}>
                                    <div className={styles.metaItem}>
                                        <span className={styles.metaLabel}>Jobs</span>
                                        <span className={styles.metaValue}>{p.jobs.length}</span>
                                    </div>
                                    <div className={styles.metaItem}>
                                        <span className={styles.metaLabel}>Total</span>
                                        <span className={styles.metaValue}>
                                            {formatCurrency(p.totalAmount)}
                                        </span>
                                    </div>
                                    <div className={styles.metaItem}>
                                        <span className={styles.metaLabel}>Approvals</span>
                                        <span className={styles.metaValue}>{p._count.approvals}</span>
                                    </div>
                                </div>
                                <div className={styles.cardDate}>
                                    {new Date(p.createdAt).toLocaleDateString()}
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className={styles.pagination}>
                        <button
                            className="btn btn-ghost btn-sm"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            ← Previous
                        </button>
                        <span className={styles.pageInfo}>
                            Page {page} of {totalPages}
                        </span>
                        <button
                            className="btn btn-ghost btn-sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
