'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './portal-projects.module.css';

interface MilestoneItem {
    id: string;
    name: string;
    status: string;
    dueDate: string | null;
}

interface ProjectJob {
    job: { name: string };
    milestones: MilestoneItem[];
}

interface ProjectItem {
    id: string;
    name: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
    pmUser: { firstName: string; lastName: string };
    projectJobs: ProjectJob[];
}

const STATUS_BADGE: Record<string, string> = {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    PAUSED: 'draft',
};

const MS_ICON: Record<string, string> = {
    PENDING: '○',
    IN_PROGRESS: '◐',
    COMPLETED: '●',
    OVERDUE: '⚠️',
};

export default function PortalProjectsPage() {
    const [projects, setProjects] = useState<ProjectItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetch_ = useCallback(async () => {
        setLoading(true);
        const res = await fetch('/api/v1/portal/projects');
        const json = await res.json();
        setProjects(json.data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetch_(); }, [fetch_]);

    if (loading) {
        return <div className="card"><div className="skeleton" style={{ height: 300 }} /></div>;
    }

    return (
        <div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-2)' }}>
                Projects
            </h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
                Track progress on your active projects
            </p>

            {projects.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">📁</div>
                        <div className="empty-state-title">No projects yet</div>
                        <div className="empty-state-text">Projects will appear here once proposals are approved</div>
                    </div>
                </div>
            ) : (
                <div className={styles.projectList}>
                    {projects.map((p) => {
                        const totalMs = p.projectJobs.flatMap(j => j.milestones);
                        const completedMs = totalMs.filter(m => m.status === 'COMPLETED').length;
                        const progress = totalMs.length > 0 ? Math.round((completedMs / totalMs.length) * 100) : 0;

                        return (
                            <div key={p.id} className={styles.projectCard}>
                                <div
                                    className={styles.projectHeader}
                                    onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                                >
                                    <div>
                                        <div className={styles.projectTitle}>
                                            <h3>{p.name}</h3>
                                            <span className={`badge badge-${STATUS_BADGE[p.status] || 'draft'}`}>
                                                {p.status}
                                            </span>
                                        </div>
                                        <div className={styles.projectMeta}>
                                            PM: {p.pmUser.firstName} {p.pmUser.lastName}
                                            {p.startDate && <> • Started {new Date(p.startDate).toLocaleDateString()}</>}
                                        </div>
                                    </div>
                                    <div className={styles.projectRight}>
                                        <div className={styles.progressInfo}>
                                            <span className={styles.progressText}>{progress}%</span>
                                            <div className={styles.progressBar}>
                                                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                                            </div>
                                        </div>
                                        <span className={styles.expandArrow}>
                                            {expandedId === p.id ? '▼' : '▶'}
                                        </span>
                                    </div>
                                </div>

                                {expandedId === p.id && (
                                    <div className={styles.projectBody}>
                                        {p.projectJobs.map((pj, idx) => (
                                            <div key={idx} className={styles.jobSection}>
                                                <h4 className={styles.jobName}>{pj.job.name}</h4>
                                                {pj.milestones.length > 0 ? (
                                                    <div className={styles.milestoneList}>
                                                        {pj.milestones.map((ms) => (
                                                            <div key={ms.id} className={styles.milestoneItem}>
                                                                <span>
                                                                    {MS_ICON[ms.status] || '○'} {ms.name}
                                                                </span>
                                                                {ms.dueDate && (
                                                                    <span className={styles.msDue}>
                                                                        {new Date(ms.dueDate).toLocaleDateString()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className={styles.noMilestones}>No milestones defined</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
