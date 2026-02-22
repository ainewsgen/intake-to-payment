'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './project-detail.module.css';

interface MilestoneItem {
    id: string;
    name: string;
    description: string | null;
    dueDate: string | null;
    status: string;
    completedDate: string | null;
    invoicePct: number | null;
}

interface AssignmentItem {
    id: string;
    type: string;
    user: { id: string; firstName: string; lastName: string; role: string };
}

interface ProjectJobItem {
    id: string;
    status: string;
    budgetAmount: number | null;
    budgetHours: number | null;
    actualHours: number;
    burnPct: number | null;
    job: { name: string; scope: string | null; deliverables: string[] };
    milestones: MilestoneItem[];
    assignments: AssignmentItem[];
    _count: { timeEntries: number };
}

interface ProjectDetail {
    id: string;
    name: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
    clientAccount: { id: string; name: string };
    pmUser: { id: string; firstName: string; lastName: string };
    proposal: { id: string; version: number; totalAmount: number | null };
    projectJobs: ProjectJobItem[];
    documents: { id: string; fileName: string; type: string; createdAt: string }[];
    invoices: {
        id: string;
        invoiceNumber: string | null;
        amount: number;
        status: string;
        _count: { payments: number };
    }[];
}

const JOB_STATUS_ICON: Record<string, string> = {
    NOT_STARTED: '⬜',
    IN_PROGRESS: '🔵',
    COMPLETED: '✅',
    ON_HOLD: '⏸️',
};

const MILESTONE_STATUS_ICON: Record<string, string> = {
    PENDING: '○',
    IN_PROGRESS: '◐',
    COMPLETED: '●',
    OVERDUE: '⚠️',
};

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'jobs' | 'documents' | 'invoices'>('jobs');

    useEffect(() => {
        async function load() {
            const res = await fetch(`/api/v1/projects/${params.id}`);
            if (!res.ok) { router.push('/projects'); return; }
            const json = await res.json();
            setProject(json.data);
            setLoading(false);
        }
        load();
    }, [params.id, router]);

    function formatCurrency(n: number | null) {
        if (!n) return '—';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
    }

    if (loading) {
        return (
            <div className="page-body">
                <div className="card"><div className="skeleton" style={{ height: 400 }} /></div>
            </div>
        );
    }

    if (!project) return null;

    const totalBudget = project.projectJobs.reduce(
        (s, pj) => s + (Number(pj.budgetAmount) || 0), 0
    );
    const totalHours = project.projectJobs.reduce(
        (s, pj) => s + pj.actualHours, 0
    );
    const completedJobs = project.projectJobs.filter(
        (pj) => pj.status === 'COMPLETED'
    ).length;

    return (
        <>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <div className={styles.breadcrumb}>
                            <Link href="/projects">Projects</Link>
                            <span>/</span>
                            <span>{project.name}</span>
                        </div>
                        <h1 className="page-title">{project.name}</h1>
                        <p className="page-subtitle">
                            {project.clientAccount.name} • PM: {project.pmUser.firstName}{' '}
                            {project.pmUser.lastName}
                        </p>
                    </div>
                </div>
            </div>

            <div className="page-body">
                {/* Stats */}
                <div className={styles.statsGrid}>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>{formatCurrency(totalBudget)}</span>
                        <span className={styles.statLabel}>Total Budget</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>{totalHours.toFixed(1)}h</span>
                        <span className={styles.statLabel}>Hours Logged</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>
                            {completedJobs}/{project.projectJobs.length}
                        </span>
                        <span className={styles.statLabel}>Jobs Complete</span>
                    </div>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>{project.invoices.length}</span>
                        <span className={styles.statLabel}>Invoices</span>
                    </div>
                </div>

                {/* Tabs */}
                <div className={styles.tabs}>
                    {(['jobs', 'documents', 'invoices'] as const).map((tab) => (
                        <button
                            key={tab}
                            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            <span className={styles.tabCount}>
                                {tab === 'jobs'
                                    ? project.projectJobs.length
                                    : tab === 'documents'
                                        ? project.documents.length
                                        : project.invoices.length}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Jobs Tab */}
                {activeTab === 'jobs' && (
                    <div className={styles.jobsList}>
                        {project.projectJobs.map((pj) => (
                            <div key={pj.id} className={styles.jobCard}>
                                <div className={styles.jobHeader}>
                                    <div className={styles.jobTitle}>
                                        <span>{JOB_STATUS_ICON[pj.status]}</span>
                                        <h3>{pj.job.name}</h3>
                                    </div>
                                    <span className={`badge badge-${pj.status === 'COMPLETED' ? 'completed' : pj.status === 'IN_PROGRESS' ? 'active' : 'draft'}`}>
                                        {pj.status.replace(/_/g, ' ')}
                                    </span>
                                </div>

                                {/* Burn indicator */}
                                <div className={styles.burnRow}>
                                    <div className={styles.burnBar}>
                                        <div
                                            className={`${styles.burnFill} ${(pj.burnPct || 0) > 90
                                                    ? styles.burnDanger
                                                    : (pj.burnPct || 0) > 70
                                                        ? styles.burnWarning
                                                        : ''
                                                }`}
                                            style={{ width: `${Math.min(pj.burnPct || 0, 100)}%` }}
                                        />
                                    </div>
                                    <span className={styles.burnText}>
                                        {pj.actualHours.toFixed(1)}h / {pj.budgetHours || '∞'}h
                                        {pj.burnPct !== null && ` (${pj.burnPct}%)`}
                                    </span>
                                </div>

                                {/* Milestones */}
                                {pj.milestones.length > 0 && (
                                    <div className={styles.milestones}>
                                        <h4 className={styles.subTitle}>Milestones</h4>
                                        {pj.milestones.map((m) => (
                                            <div key={m.id} className={styles.milestoneItem}>
                                                <span>{MILESTONE_STATUS_ICON[m.status]} {m.name}</span>
                                                {m.dueDate && (
                                                    <span className={styles.dueDate}>
                                                        Due {new Date(m.dueDate).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Assignments */}
                                {pj.assignments.length > 0 && (
                                    <div className={styles.assignments}>
                                        <h4 className={styles.subTitle}>Team</h4>
                                        <div className={styles.avatarRow}>
                                            {pj.assignments.map((a) => (
                                                <span key={a.id} className={styles.avatar} title={`${a.user.firstName} ${a.user.lastName}`}>
                                                    {a.user.firstName.charAt(0)}{a.user.lastName.charAt(0)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                    <div className="card">
                        {project.documents.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📁</div>
                                <div className="empty-state-title">No documents yet</div>
                            </div>
                        ) : (
                            <div className={styles.docList}>
                                {project.documents.map((doc) => (
                                    <div key={doc.id} className={styles.docItem}>
                                        <span>📄 {doc.fileName}</span>
                                        <span className={styles.docMeta}>
                                            {doc.type} • {new Date(doc.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Invoices Tab */}
                {activeTab === 'invoices' && (
                    <div className="card">
                        {project.invoices.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">🧾</div>
                                <div className="empty-state-title">No invoices yet</div>
                            </div>
                        ) : (
                            <div className="table-wrapper">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Invoice #</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Payments</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {project.invoices.map((inv) => (
                                            <tr key={inv.id}>
                                                <td>{inv.invoiceNumber || inv.id.slice(-8)}</td>
                                                <td>{formatCurrency(inv.amount)}</td>
                                                <td>
                                                    <span className={`badge badge-${inv.status === 'PAID' ? 'completed' : 'active'}`}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                                <td>{inv._count.payments}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
