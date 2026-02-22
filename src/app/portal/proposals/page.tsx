'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './portal-proposals.module.css';

interface ProposalItem {
    id: string;
    version: number;
    status: string;
    totalAmount: number | null;
    createdAt: string;
    request: { title: string };
    jobs: { id: string; name: string; lineTotal: number | null }[];
    approvals: { status: string }[];
}

const STATUS_BADGE: Record<string, string> = {
    PENDING_REVIEW: 'active',
    PENDING_APPROVAL: 'new',
    APPROVED: 'completed',
    REJECTED: 'draft',
    SUPERSEDED: 'draft',
};

export default function PortalProposalsPage() {
    const [proposals, setProposals] = useState<ProposalItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchProposals = useCallback(async () => {
        setLoading(true);
        const res = await fetch('/api/v1/portal/proposals');
        const json = await res.json();
        setProposals(json.data || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchProposals();
    }, [fetchProposals]);

    function formatCurrency(n: number | null) {
        if (!n) return '—';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
    }

    async function handleClientApproval(proposalId: string, status: string) {
        await fetch(`/api/v1/proposals/${proposalId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'CLIENT_APPROVAL', status, termsAccepted: status === 'APPROVED' }),
        });
        fetchProposals();
    }

    if (loading) {
        return <div className="card"><div className="skeleton" style={{ height: 300 }} /></div>;
    }

    return (
        <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
                Proposals
            </h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
                Review and approve proposals for your projects
            </p>

            {proposals.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">📝</div>
                        <div className="empty-state-title">No proposals</div>
                        <div className="empty-state-text">Proposals sent to you will appear here</div>
                    </div>
                </div>
            ) : (
                <div className={styles.proposalList}>
                    {proposals.map((p) => (
                        <div key={p.id} className={styles.proposalCard}>
                            <div
                                className={styles.proposalHeader}
                                onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                            >
                                <div className={styles.proposalInfo}>
                                    <h3>{p.request.title}</h3>
                                    <span className={styles.versionTag}>v{p.version}</span>
                                    <span className={`badge badge-${STATUS_BADGE[p.status] || 'draft'}`}>
                                        {p.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <div className={styles.proposalMeta}>
                                    <span className={styles.proposalAmount}>
                                        {formatCurrency(Number(p.totalAmount))}
                                    </span>
                                    <span className={styles.expandArrow}>
                                        {expandedId === p.id ? '▼' : '▶'}
                                    </span>
                                </div>
                            </div>

                            {expandedId === p.id && (
                                <div className={styles.proposalBody}>
                                    {p.jobs.length > 0 && (
                                        <div className={styles.jobList}>
                                            <h4 className={styles.sectionLabel}>Jobs</h4>
                                            {p.jobs.map((job) => (
                                                <div key={job.id} className={styles.jobItem}>
                                                    <span>{job.name}</span>
                                                    <span className={styles.jobAmount}>
                                                        {formatCurrency(Number(job.lineTotal))}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {p.status === 'PENDING_APPROVAL' && (
                                        <div className={styles.approvalActions}>
                                            <p className={styles.approvalText}>
                                                This proposal is awaiting your approval. Please review the scope and pricing above.
                                            </p>
                                            <div className={styles.approvalButtons}>
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() => handleClientApproval(p.id, 'APPROVED')}
                                                >
                                                    ✓ Approve Proposal
                                                </button>
                                                <button
                                                    className="btn btn-secondary"
                                                    onClick={() => handleClientApproval(p.id, 'REJECTED')}
                                                >
                                                    ✕ Decline
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className={styles.proposalDate}>
                                        Sent {new Date(p.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
