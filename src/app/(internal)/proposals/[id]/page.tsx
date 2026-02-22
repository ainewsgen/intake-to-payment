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

    // Job Creation State
    const [showJobForm, setShowJobForm] = useState(false);
    const [newJobForm, setNewJobForm] = useState({ name: '', scope: '', deliverables: '', assumptions: '' });

    // Estimate Creation State
    const [estimateJobId, setEstimateJobId] = useState<string | null>(null);
    const [newEstimateForm, setNewEstimateForm] = useState({ roleName: '', hours: '', hourlyRate: '' });

    async function handleCreateJob(e: React.FormEvent) {
        e.preventDefault();
        setActionLoading(true);
        const { name, scope, deliverables, assumptions } = newJobForm;
        await fetch(`/api/v1/proposals/${params.id}/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                scope,
                deliverables: deliverables.split('\\n').filter(Boolean),
                assumptions: assumptions.split('\\n').filter(Boolean)
            }),
        });
        window.location.reload();
    }

    async function handleCreateEstimate(e: React.FormEvent, jobId: string) {
        e.preventDefault();
        setActionLoading(true);
        await fetch(`/api/v1/jobs/${jobId}/estimates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                roleName: newEstimateForm.roleName,
                hours: Number(newEstimateForm.hours),
                hourlyRate: Number(newEstimateForm.hourlyRate)
            }),
        });
        window.location.reload();
    }

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                                <span className={styles.totalAmount}>
                                    Total: {formatCurrency(proposal.totalAmount)}
                                </span>
                                {proposal.status === 'DRAFT' && (
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => setShowJobForm(!showJobForm)}
                                    >
                                        {showJobForm ? 'Cancel' : '+ Add Job'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {showJobForm && (
                            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                                <h4>New Job</h4>
                                <form onSubmit={handleCreateJob} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                    <div className="form-group">
                                        <label className="form-label">Job Name</label>
                                        <input className="input" value={newJobForm.name} onChange={e => setNewJobForm({ ...newJobForm, name: e.target.value })} required placeholder="e.g. Phase 1 - Discovery" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Scope Description</label>
                                        <textarea className="input" rows={3} value={newJobForm.scope} onChange={e => setNewJobForm({ ...newJobForm, scope: e.target.value })} />
                                    </div>
                                    <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label className="form-label">Deliverables (one per line)</label>
                                            <textarea className="input" rows={4} value={newJobForm.deliverables} onChange={e => setNewJobForm({ ...newJobForm, deliverables: e.target.value })} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label className="form-label">Assumptions (one per line)</label>
                                            <textarea className="input" rows={4} value={newJobForm.assumptions} onChange={e => setNewJobForm({ ...newJobForm, assumptions: e.target.value })} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
                                        <button type="submit" className="btn btn-primary" disabled={actionLoading}>Add Job</button>
                                    </div>
                                </form>
                            </div>
                        )}

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

                                        {proposal.status === 'DRAFT' && estimateJobId !== job.id && (
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                style={{ marginTop: 'var(--space-2)' }}
                                                onClick={() => setEstimateJobId(job.id)}
                                            >
                                                + Add Role Segment
                                            </button>
                                        )}

                                        {estimateJobId === job.id && (
                                            <form
                                                onSubmit={(e) => handleCreateEstimate(e, job.id)}
                                                style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)', alignItems: 'flex-start' }}
                                            >
                                                <input className="input" style={{ flex: 2 }} placeholder="Role (e.g. Designer)" value={newEstimateForm.roleName} onChange={e => setNewEstimateForm({ ...newEstimateForm, roleName: e.target.value })} required />
                                                <input className="input" type="number" style={{ flex: 1 }} step="0.5" min="0" placeholder="Hours" value={newEstimateForm.hours} onChange={e => setNewEstimateForm({ ...newEstimateForm, hours: e.target.value })} required />
                                                <input className="input" type="number" style={{ flex: 1 }} step="0.01" min="0" placeholder="Rate/hr" value={newEstimateForm.hourlyRate} onChange={e => setNewEstimateForm({ ...newEstimateForm, hourlyRate: e.target.value })} required />
                                                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                                    <button type="submit" className="btn btn-primary btn-sm" disabled={actionLoading}>Save</button>
                                                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEstimateJobId(null); setNewEstimateForm({ roleName: '', hours: '', hourlyRate: '' }); }}>Cancel</button>
                                                </div>
                                            </form>
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
