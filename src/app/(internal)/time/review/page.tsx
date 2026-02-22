'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './review.module.css';

interface TimeEntryReview {
    id: string;
    date: string;
    hours: number;
    notes: string | null;
    source: string;
    user: { id: string; firstName: string; lastName: string };
    projectJob: {
        project: { id: string; name: string };
        job: { name: string };
    };
}

export default function TimeReviewPage() {
    const [entries, setEntries] = useState<TimeEntryReview[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const fetchEntries = useCallback(async () => {
        setLoading(true);
        const res = await fetch('/api/v1/time-entries/review');
        if (res.ok) {
            const json = await res.json();
            setEntries(json.data?.entries || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchEntries(); }, [fetchEntries]);

    function toggleSelect(id: string) {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    function toggleAll() {
        if (selected.size === entries.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(entries.map(e => e.id)));
        }
    }

    async function handleAction(action: 'approve' | 'reject') {
        if (selected.size === 0) return;
        setProcessing(true);
        await fetch('/api/v1/time-entries/review', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: Array.from(selected), action }),
        });
        setSelected(new Set());
        await fetchEntries();
        setProcessing(false);
    }

    const totalHours = entries
        .filter(e => selected.has(e.id))
        .reduce((s, e) => s + Number(e.hours), 0);

    return (
        <>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">Time Entry Review</h1>
                        <p className="page-subtitle">
                            {entries.length} pending {entries.length === 1 ? 'entry' : 'entries'}
                        </p>
                    </div>
                    <div className={styles.actions}>
                        <span className={styles.selectedInfo}>
                            {selected.size > 0 ? `${selected.size} selected (${totalHours.toFixed(1)}h)` : ''}
                        </span>
                        <button
                            className="btn btn-danger btn-sm"
                            disabled={selected.size === 0 || processing}
                            onClick={() => handleAction('reject')}
                        >
                            ✕ Reject
                        </button>
                        <button
                            className="btn btn-primary btn-sm"
                            disabled={selected.size === 0 || processing}
                            onClick={() => handleAction('approve')}
                        >
                            ✓ Approve{selected.size > 0 ? ` (${selected.size})` : ''}
                        </button>
                    </div>
                </div>
            </div>

            <div className="page-body">
                {loading ? (
                    <div className="card">
                        <div className="skeleton" style={{ height: 300 }} />
                    </div>
                ) : entries.length === 0 ? (
                    <div className="card">
                        <div className="empty-state">
                            <div className="empty-state-icon">✅</div>
                            <div className="empty-state-title">All caught up</div>
                            <div className="empty-state-text">No pending time entries to review</div>
                        </div>
                    </div>
                ) : (
                    <div className="table-wrapper">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: 40 }}>
                                        <input
                                            type="checkbox"
                                            checked={selected.size === entries.length}
                                            onChange={toggleAll}
                                        />
                                    </th>
                                    <th>Team Member</th>
                                    <th>Project</th>
                                    <th>Job</th>
                                    <th>Date</th>
                                    <th style={{ textAlign: 'right' }}>Hours</th>
                                    <th>Source</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((e) => (
                                    <tr
                                        key={e.id}
                                        className={selected.has(e.id) ? styles.selectedRow : ''}
                                    >
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selected.has(e.id)}
                                                onChange={() => toggleSelect(e.id)}
                                            />
                                        </td>
                                        <td className={styles.nameCell}>
                                            {e.user.firstName} {e.user.lastName}
                                        </td>
                                        <td>{e.projectJob.project.name}</td>
                                        <td>{e.projectJob.job.name}</td>
                                        <td className={styles.dateCell}>
                                            {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </td>
                                        <td className={styles.hoursCell}>{Number(e.hours).toFixed(1)}</td>
                                        <td>
                                            <span className={`badge badge-${e.source === 'MANUAL' ? 'draft' : 'active'}`}>
                                                {e.source}
                                            </span>
                                        </td>
                                        <td className={styles.notesCell}>{e.notes || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
