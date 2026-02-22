'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './requests.module.css';

interface RequestItem {
    id: string;
    source: string;
    title: string;
    clientName: string | null;
    status: string;
    createdAt: string;
    createdBy: { firstName: string; lastName: string };
    clientAccount?: { name: string } | null;
    _count: { attachments: number; proposals: number };
}

const STATUS_BADGE: Record<string, string> = {
    NEW: 'new',
    IN_PROGRESS: 'active',
    PROPOSAL_CREATED: 'completed',
    CLOSED: 'draft',
};

const SOURCE_ICONS: Record<string, string> = {
    EMAIL: '✉️',
    PHONE: '📞',
    UPLOAD: '📎',
    MANUAL: '✏️',
};

export default function RequestsPage() {
    const [requests, setRequests] = useState<RequestItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', page.toString());
        if (statusFilter) params.set('status', statusFilter);
        if (search) params.set('search', search);

        const res = await fetch(`/api/v1/requests?${params}`);
        const json = await res.json();
        setRequests(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setLoading(false);
    }, [page, statusFilter, search]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    return (
        <>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">Requests</h1>
                        <p className="page-subtitle">Inbound work requests from clients</p>
                    </div>
                    <Link href="/requests/new" className="btn btn-primary">
                        + New Request
                    </Link>
                </div>
            </div>

            <div className="page-body">
                {/* Filters */}
                <div className={styles.filters}>
                    <input
                        type="search"
                        className="input"
                        placeholder="Search requests..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        style={{ maxWidth: 300 }}
                    />
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
                        <option value="NEW">New</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="PROPOSAL_CREATED">Proposal Created</option>
                        <option value="CLOSED">Closed</option>
                    </select>
                </div>

                {/* Request List */}
                {loading ? (
                    <div className="card">
                        <div className="skeleton" style={{ height: 200 }} />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <div className="empty-state-icon">📥</div>
                            <div className="empty-state-title">No requests found</div>
                            <div className="empty-state-text">
                                {search || statusFilter
                                    ? 'Try adjusting your filters'
                                    : 'Create your first request to get started'}
                            </div>
                            {!search && !statusFilter && (
                                <Link href="/requests/new" className="btn btn-primary">
                                    Create Request
                                </Link>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Source</th>
                                    <th>Title</th>
                                    <th>Client</th>
                                    <th>Created By</th>
                                    <th>Status</th>
                                    <th>Proposals</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((req) => (
                                    <tr key={req.id}>
                                        <td>
                                            <span title={req.source}>
                                                {SOURCE_ICONS[req.source] || '📄'}
                                            </span>
                                        </td>
                                        <td>
                                            <Link href={`/requests/${req.id}`} className={styles.titleLink}>
                                                {req.title}
                                            </Link>
                                        </td>
                                        <td>{req.clientAccount?.name || req.clientName || '—'}</td>
                                        <td>
                                            {req.createdBy.firstName} {req.createdBy.lastName}
                                        </td>
                                        <td>
                                            <span className={`badge badge-${STATUS_BADGE[req.status] || 'draft'}`}>
                                                {req.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td>{req._count.proposals}</td>
                                        <td className={styles.date}>
                                            {new Date(req.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
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
