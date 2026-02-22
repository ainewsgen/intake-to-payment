'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './audit.module.css';

interface AuditEventItem {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    userId: string | null;
    userType: string | null;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    ipAddress: string | null;
    timestamp: string;
}

const ACTION_ICON: Record<string, string> = {
    CREATE: '🟢',
    UPDATE: '🟡',
    DELETE: '🔴',
};

const ENTITY_TYPES = [
    'Request', 'Proposal', 'Project', 'Invoice', 'InvoiceDraft',
    'TimeEntry', 'ContractorPayRun', 'User',
];

export default function AuditPage() {
    const [events, setEvents] = useState<AuditEventItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [entityFilter, setEntityFilter] = useState('');
    const [actionFilter, setActionFilter] = useState('');
    const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', '30');
        if (entityFilter) params.set('entityType', entityFilter);
        if (actionFilter) params.set('action', actionFilter);

        const res = await fetch(`/api/v1/audit?${params}`);
        const json = await res.json();
        setEvents(json.data || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setLoading(false);
    }, [page, entityFilter, actionFilter]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    function formatTimestamp(ts: string) {
        const d = new Date(ts);
        return d.toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    }

    return (
        <>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">Audit Log</h1>
                        <p className="page-subtitle">Complete system activity trail</p>
                    </div>
                </div>
            </div>

            <div className="page-body">
                <div className={styles.filters}>
                    <select
                        className="select"
                        value={entityFilter}
                        onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
                        style={{ maxWidth: 180 }}
                    >
                        <option value="">All entities</option>
                        {ENTITY_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    <select
                        className="select"
                        value={actionFilter}
                        onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                        style={{ maxWidth: 160 }}
                    >
                        <option value="">All actions</option>
                        <option value="CREATE">Create</option>
                        <option value="UPDATE">Update</option>
                        <option value="DELETE">Delete</option>
                    </select>
                </div>

                {loading ? (
                    <div className="card"><div className="skeleton" style={{ height: 300 }} /></div>
                ) : events.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <div className="empty-state-icon">📜</div>
                            <div className="empty-state-title">No audit events</div>
                            <div className="empty-state-text">System activity will appear here</div>
                        </div>
                    </div>
                ) : (
                    <div className={styles.eventList}>
                        {events.map((event) => (
                            <div
                                key={event.id}
                                className={`${styles.eventRow} ${expandedEvent === event.id ? styles.eventExpanded : ''}`}
                            >
                                <div
                                    className={styles.eventHeader}
                                    onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                                >
                                    <div className={styles.eventLeft}>
                                        <span className={styles.actionIcon}>
                                            {ACTION_ICON[event.action] || '⚪'}
                                        </span>
                                        <span className={styles.eventAction}>{event.action}</span>
                                        <span className={styles.entityType}>{event.entityType}</span>
                                        <span className={styles.entityId}>
                                            {event.entityId.slice(-8)}
                                        </span>
                                    </div>
                                    <div className={styles.eventRight}>
                                        {event.userType && (
                                            <span className={styles.userType}>{event.userType}</span>
                                        )}
                                        {event.ipAddress && (
                                            <span className={styles.ipAddress}>{event.ipAddress}</span>
                                        )}
                                        <span className={styles.timestamp}>
                                            {formatTimestamp(event.timestamp)}
                                        </span>
                                        <span className={styles.expandArrow}>
                                            {expandedEvent === event.id ? '▼' : '▶'}
                                        </span>
                                    </div>
                                </div>

                                {expandedEvent === event.id && (
                                    <div className={styles.eventBody}>
                                        <div className={styles.diffGrid}>
                                            {event.before && (
                                                <div className={styles.diffCol}>
                                                    <h4 className={styles.diffLabel}>Before</h4>
                                                    <pre className={styles.diffContent}>
                                                        {JSON.stringify(event.before, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                            {event.after && (
                                                <div className={styles.diffCol}>
                                                    <h4 className={styles.diffLabel}>After</h4>
                                                    <pre className={styles.diffContent}>
                                                        {JSON.stringify(event.after, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
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
