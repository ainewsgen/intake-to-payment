'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './notification-bell.module.css';

interface Notification {
    id: string;
    title: string;
    entityType: string;
    entityId: string;
    action: string;
    timestamp: string;
    isUnread: boolean;
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const fetchNotifications = useCallback(async () => {
        const lastRead = localStorage.getItem('notif-last-read') || '';
        const params = new URLSearchParams({ limit: '15' });
        if (lastRead) params.set('lastRead', lastRead);
        try {
            const res = await fetch(`/api/v1/notifications?${params}`);
            if (!res.ok) return;
            const json = await res.json();
            setNotifications(json.data?.notifications || []);
            setUnreadCount(json.data?.unreadCount || 0);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // poll every 30s
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function handleOpen() {
        setOpen(!open);
        if (!open) {
            // Mark all as read
            localStorage.setItem('notif-last-read', new Date().toISOString());
            setUnreadCount(0);
            setNotifications(ns => ns.map(n => ({ ...n, isUnread: false })));
        }
    }

    function timeAgo(ts: string) {
        const diff = Date.now() - new Date(ts).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    }

    function getLink(n: Notification) {
        const map: Record<string, string> = {
            Request: `/requests/${n.entityId}`,
            Proposal: `/proposals/${n.entityId}`,
            Project: `/projects/${n.entityId}`,
            Invoice: `/billing`,
            User: `/settings/users`,
            TimeEntry: `/time`,
        };
        return map[n.entityType] || '#';
    }

    const iconMap: Record<string, string> = {
        Request: '📥',
        Proposal: '📄',
        Project: '📁',
        Invoice: '🧾',
        User: '👤',
        TimeEntry: '⏱️',
    };

    return (
        <div className={styles.bellWrapper} ref={ref}>
            <button className={styles.bellBtn} onClick={handleOpen} aria-label="Notifications">
                🔔
                {unreadCount > 0 && (
                    <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {open && (
                <div className={styles.dropdown}>
                    <div className={styles.dropdownHeader}>
                        <span>Notifications</span>
                        {notifications.length > 0 && (
                            <span className={styles.count}>{notifications.length}</span>
                        )}
                    </div>
                    <div className={styles.dropdownBody}>
                        {notifications.length === 0 ? (
                            <div className={styles.empty}>No notifications</div>
                        ) : (
                            notifications.map((n) => (
                                <a key={n.id} href={getLink(n)} className={`${styles.item} ${n.isUnread ? styles.unread : ''}`}>
                                    <span className={styles.itemIcon}>{iconMap[n.entityType] || '📌'}</span>
                                    <div className={styles.itemContent}>
                                        <div className={styles.itemTitle}>{n.title}</div>
                                        <div className={styles.itemTime}>{timeAgo(n.timestamp)}</div>
                                    </div>
                                </a>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
