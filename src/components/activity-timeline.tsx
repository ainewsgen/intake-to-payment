'use client';

import { useState, useEffect } from 'react';
import styles from './activity-timeline.module.css';

interface TimelineEvent {
    id: string;
    message: string;
    entityType: string;
    entityId: string;
    action: string;
    timestamp: string;
    user: { firstName: string; lastName: string } | null;
}

interface Props {
    entityType?: string;
    entityId?: string;
    limit?: number;
}

const actionIcons: Record<string, string> = {
    CREATE: '🟢',
    UPDATE: '🔵',
    DELETE: '🔴',
};

const entityLinks: Record<string, (id: string) => string> = {
    Request: (id) => `/requests/${id}`,
    Proposal: (id) => `/proposals/${id}`,
    Project: (id) => `/projects/${id}`,
    Invoice: () => `/billing`,
    User: () => `/settings/users`,
    TimeEntry: () => `/time`,
};

export default function ActivityTimeline({ entityType, entityId, limit = 15 }: Props) {
    const [events, setEvents] = useState<TimelineEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const params = new URLSearchParams();
            if (entityType) params.set('entityType', entityType);
            if (entityId) params.set('entityId', entityId);
            params.set('limit', String(limit));
            const res = await fetch(`/api/v1/activity?${params}`);
            if (res.ok) {
                const json = await res.json();
                setEvents(json.data?.timeline || []);
            }
            setLoading(false);
        }
        load();
    }, [entityType, entityId, limit]);

    function timeAgo(ts: string) {
        const diff = Date.now() - new Date(ts).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        if (days < 30) return `${days}d ago`;
        return new Date(ts).toLocaleDateString();
    }

    if (loading) return <div className={styles.wrapper}><div className="skeleton" style={{ height: 120 }} /></div>;

    if (events.length === 0) {
        return (
            <div className={styles.wrapper}>
                <div className={styles.empty}>No activity yet</div>
            </div>
        );
    }

    return (
        <div className={styles.wrapper}>
            {events.map((e, i) => {
                const linkFn = entityLinks[e.entityType];
                const href = linkFn ? linkFn(e.entityId) : undefined;

                return (
                    <div key={e.id} className={styles.event}>
                        <div className={styles.rail}>
                            <span className={styles.dot}>{actionIcons[e.action] || '⚪'}</span>
                            {i < events.length - 1 && <div className={styles.line} />}
                        </div>
                        <div className={styles.content}>
                            <div className={styles.message}>
                                {href ? (
                                    <a href={href} className={styles.link}>{e.message}</a>
                                ) : (
                                    e.message
                                )}
                            </div>
                            <div className={styles.time}>{timeAgo(e.timestamp)}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
