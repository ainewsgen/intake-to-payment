'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './projects.module.css';

interface ProjectJobItem {
    id: string;
    status: string;
    job: { name: string };
    _count: { timeEntries: number; milestones: number };
}

interface ProjectItem {
    id: string;
    name: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    createdAt: string;
    clientAccount: { id: string; name: string };
    pmUser: { id: string; firstName: string; lastName: string };
    projectJobs: ProjectJobItem[];
    _count: { documents: number; invoices: number };
}

const STATUS_COLORS: Record<string, string> = {
    ACTIVE: 'completed',
    ON_HOLD: 'active',
    COMPLETED: 'draft',
    CANCELLED: 'draft',
};

const STATUS_DOT: Record<string, string> = {
    ACTIVE: '🟢',
    ON_HOLD: '🟡',
    COMPLETED: '✅',
    CANCELLED: '🔴',
};

export default function ProjectsPage() {
    const [projects, setProjects] = useState<ProjectItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', page.toString());
        if (statusFilter) params.set('status', statusFilter);

        const res = await fetch(`/api/v1/projects?${params}`);
        const json = await res.json();
        setProjects(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setLoading(false);
    }, [page, statusFilter]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    function getCompletedJobs(project: ProjectItem): number {
        return project.projectJobs.filter((pj) => pj.status === 'COMPLETED').length;
    }

    return (
        <>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">Projects</h1>
                        <p className="page-subtitle">Active projects and delivery tracking</p>
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
                        style={{ maxWidth: 180 }}
                    >
                        <option value="">All statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="ON_HOLD">On Hold</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                </div>

                {loading ? (
                    <div className="card">
                        <div className="skeleton" style={{ height: 200 }} />
                    </div>
                ) : projects.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <div className="empty-state-icon">🏗️</div>
                            <div className="empty-state-title">No projects found</div>
                            <div className="empty-state-text">
                                Projects are created automatically when proposals are approved
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={styles.projectGrid}>
                        {projects.map((project) => (
                            <Link
                                key={project.id}
                                href={`/projects/${project.id}`}
                                className={styles.projectCard}
                            >
                                <div className={styles.cardHeader}>
                                    <span
                                        className={`badge badge-${STATUS_COLORS[project.status] || 'draft'}`}
                                    >
                                        {STATUS_DOT[project.status]} {project.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <h3 className={styles.cardTitle}>{project.name}</h3>
                                <p className={styles.client}>{project.clientAccount.name}</p>

                                {/* Progress Bar */}
                                <div className={styles.progressWrapper}>
                                    <div className={styles.progressBar}>
                                        <div
                                            className={styles.progressFill}
                                            style={{
                                                width: `${project.projectJobs.length > 0
                                                        ? (getCompletedJobs(project) / project.projectJobs.length) * 100
                                                        : 0
                                                    }%`,
                                            }}
                                        />
                                    </div>
                                    <span className={styles.progressText}>
                                        {getCompletedJobs(project)}/{project.projectJobs.length} jobs
                                    </span>
                                </div>

                                <div className={styles.cardMeta}>
                                    <div className={styles.metaItem}>
                                        <span className={styles.metaLabel}>PM</span>
                                        <span className={styles.metaValue}>
                                            {project.pmUser.firstName} {project.pmUser.lastName.charAt(0)}.
                                        </span>
                                    </div>
                                    <div className={styles.metaItem}>
                                        <span className={styles.metaLabel}>Invoices</span>
                                        <span className={styles.metaValue}>{project._count.invoices}</span>
                                    </div>
                                    <div className={styles.metaItem}>
                                        <span className={styles.metaLabel}>Docs</span>
                                        <span className={styles.metaValue}>{project._count.documents}</span>
                                    </div>
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
