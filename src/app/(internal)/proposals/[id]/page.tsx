'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './proposal-detail.module.css';

interface JobEstimate {
    id: string;
    roleName: string;
    hours: number;
    hourlyRate: number;
    lineTotal: number;
}

interface JobItem {
    id: string;
    name: string;
    scope: string | null;
    deliverables: string[];
    assumptions: string[];
    lineTotal: number | null;
    estimates: JobEstimate[];
}

interface ApprovalItem {
    id: string;
    type: string;
    status: string;
    notes: string | null;
    createdAt: string;
    approvedBy: { firstName: string; lastName: string } | null;
}

interface ProposalDetail {
    id: string;
    version: number;
    status: string;
    pricingModel: string;
    totalAmount: number | null;
    notes: string | null;
    createdAt: string;
    request: {
        id: string;
        title: string;
        clientName: string | null;
        source: string;
        clientAccount: { id: string; name: string } | null;
    };
    jobs: JobItem[];
    approvals: ApprovalItem[];
}

const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'draft',
    PENDING_REVIEW: 'new',
    PENDING_APPROVAL: 'active',
    APPROVED: 'completed',
    REJECTED: 'draft',
    SUPERSEDED: 'draft',
};

export default function ProposalDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [proposal, setProposal] = useState<ProposalDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        async function load() {
            const res = await fetch(`/api/v1/proposals/${params.id}`);
            if (!res.ok) { router.push('/proposals'); return; }
            const json = await res.json();
            setProposal(json.data);
            setLoading(false);
        }
        load();
    }, [params.id, router]);

    function formatCurrency(n: number | null) {
        if (!n) return '—';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
    }

    async function handleSubmitForReview() {
        setActionLoading(true);
        await fetch(`/api/v1/proposals/${params.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'PENDING_REVIEW' }),
        });
        window.location.reload();
    }

    async function handleApproval(type: string, status: string) {
        setActionLoading(true);
        await fetch(`/api/v1/proposals/${params.id}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type, status, termsAccepted: true }),
        });
        window.location.reload();
    }

    if (loading) {
        return (
            <div className="page-body">
                <div className="card"><div className="skeleton" style={{ height: 400 }} /></div>
            </div>
        );
    }

    if (!proposal) return null;

    return (
        <>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <div className={styles.breadcrumb}>
                            <Link href="/proposals">Proposals</Link>
                            <span>/</span>
                            <span>v{proposal.version}</span>
                        </div>
                        <h1 className="page-title">
                            {proposal.request.title}
                            <span className={styles.versionBadge}>v{proposal.version}</span>
                        </h1>
                        <p className="page-subtitle">
                            {proposal.request.clientAccount?.name || proposal.request.clientName || 'No client'} •{' '}
                            {proposal.pricingModel.replace(/_/g, ' ')}
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <span className={`badge badge-${STATUS_COLORS[proposal.status]} badge-lg`}>
                            {proposal.status.replace(/_/g, ' ')}
                        </span>
                    </div>
                </div>
            </div>

            <div className="page-body">
                <div className={styles.detailGrid}>
                    {/* Jobs */}
                    <div className={styles.mainCol}>
                        <div className={styles.sectionHeader}>
                            <h3>Jobs ({proposal.jobs.length})</h3>
                            <span className={styles.totalAmount}>
                                Total: {formatCurrency(proposal.totalAmount)}
                            </span>
                        </div>

                        {proposal.jobs.length === 0 ? (
                            <div className="card">
                                <div className="empty-state">
                                    <div className="empty-state-icon">📝</div>
                                    <div className="empty-state-title">No jobs added</div>
                                    <div className="empty-state-text">
                                        Add jobs to build out the proposal structure
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.jobsList}>
                                {proposal.jobs.map((job, idx) => (
                                    <div key={job.id} className={styles.jobCard}>
                                        <div className={styles.jobHeader}>
                                            <div className={styles.jobNumber}>{idx + 1}</div>
                                            <div className={styles.jobInfo}>
                                                <h4>{job.name}</h4>
                                                {job.scope && (
                                                    <p className={styles.jobScope}>{job.scope}</p>
                                                )}
                                            </div>
                                            <span className={styles.jobTotal}>
                                                {formatCurrency(job.lineTotal)}
                                            </span>
                                        </div>

                                        {/* Estimates */}
                                        {job.estimates.length > 0 && (
                                            <div className={styles.estimates}>
                                                <table className={styles.estimateTable}>
                                                    <thead>
                                                        <tr>
                                                            <th>Role</th>
                                                            <th>Hours</th>
                                                            <th>Rate</th>
                                                            <th>Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {job.estimates.map((est) => (
                                                            <tr key={est.id}>
                                                                <td>{est.roleName}</td>
                                                                <td>{Number(est.hours)}</td>
                                                                <td>{formatCurrency(Number(est.hourlyRate))}/hr</td>
                                                                <td>{formatCurrency(Number(est.lineTotal))}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {/* Deliverables & Assumptions */}
                                        {(job.deliverables.length > 0 || job.assumptions.length > 0) && (
                                            <div className={styles.jobDetails}>
                                                {job.deliverables.length > 0 && (
                                                    <div>
                                                        <h5 className={styles.detailLabel}>Deliverables</h5>
                                                        <ul className={styles.detailList}>
                                                            {job.deliverables.map((d, i) => (
                                                                <li key={i}>{d}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {job.assumptions.length > 0 && (
                                                    <div>
                                                        <h5 className={styles.detailLabel}>Assumptions</h5>
                                                        <ul className={styles.detailList}>
                                                            {job.assumptions.map((a, i) => (
                                                                <li key={i}>{a}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className={styles.sideCol}>
                        {/* Actions */}
                        <div className="card">
                            <h3 className={styles.sideTitle}>Actions</h3>
                            <div className={styles.actionsCol}>
                                {proposal.status === 'DRAFT' && (
                                    <button
                                        className="btn btn-primary btn-block"
                                        onClick={handleSubmitForReview}
                                        disabled={actionLoading}
                                    >
                                        Submit for Review
                                    </button>
                                )}
                                {proposal.status === 'PENDING_REVIEW' && (
                                    <>
                                        <button
                                            className="btn btn-primary btn-block"
                                            onClick={() => handleApproval('INTERNAL_REVIEW', 'APPROVED')}
                                            disabled={actionLoading}
                                        >
                                            ✓ Approve (Internal)
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-block"
                                            onClick={() => handleApproval('INTERNAL_REVIEW', 'REJECTED')}
                                            disabled={actionLoading}
                                        >
                                            ✕ Reject
                                        </button>
                                    </>
                                )}
                                {proposal.status === 'PENDING_APPROVAL' && (
                                    <>
                                        <button
                                            className="btn btn-primary btn-block"
                                            onClick={() => handleApproval('CLIENT_APPROVAL', 'APPROVED')}
                                            disabled={actionLoading}
                                        >
                                            ✓ Approve (Client)
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-block"
                                            onClick={() => handleApproval('CLIENT_APPROVAL', 'REJECTED')}
                                            disabled={actionLoading}
                                        >
                                            ✕ Reject
                                        </button>
                                    </>
                                )}
                                {proposal.status === 'APPROVED' && (
                                    <div className={styles.approvedNotice}>
                                        ✅ This proposal has been approved and a project has been created.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Approval History */}
                        <div className="card">
                            <h3 className={styles.sideTitle}>Approval History</h3>
                            {proposal.approvals.length === 0 ? (
                                <p className={styles.emptyText}>No approvals yet</p>
                            ) : (
                                <div className={styles.approvalList}>
                                    {proposal.approvals.map((a) => (
                                        <div key={a.id} className={styles.approvalItem}>
                                            <div className={styles.approvalHeader}>
                                                <span className={`badge badge-${a.status === 'APPROVED' ? 'completed' : 'draft'}`}>
                                                    {a.status}
                                                </span>
                                                <span className={styles.approvalType}>
                                                    {a.type.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                            <div className={styles.approvalMeta}>
                                                {a.approvedBy
                                                    ? `${a.approvedBy.firstName} ${a.approvedBy.lastName}`
                                                    : 'System'}
                                                {' • '}
                                                {new Date(a.createdAt).toLocaleDateString()}
                                            </div>
                                            {a.notes && (
                                                <p className={styles.approvalNotes}>{a.notes}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
