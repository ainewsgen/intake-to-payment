'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import styles from './global-search.module.css';

interface SearchResult {
    type: string;
    icon: string;
    id: string;
    title: string;
    subtitle: string;
    status: string;
    href: string;
}

export default function GlobalSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const search = useCallback(async (q: string) => {
        if (q.length < 2) { setResults([]); return; }
        setLoading(true);
        try {
            const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`);
            if (!res.ok) return;
            const json = await res.json();
            setResults(json.data?.results || []);
        } catch { /* ignore */ }
        setLoading(false);
    }, []);

    function handleChange(value: string) {
        setQuery(value);
        setOpen(true);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(value), 250);
    }

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Keyboard shortcut: Cmd+K
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                const input = ref.current?.querySelector('input');
                input?.focus();
                setOpen(true);
            }
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, []);

    return (
        <div className={styles.wrapper} ref={ref}>
            <div className={styles.inputWrapper}>
                <span className={styles.searchIcon}>🔍</span>
                <input
                    className={styles.input}
                    type="text"
                    placeholder="Search… ⌘K"
                    value={query}
                    onChange={e => handleChange(e.target.value)}
                    onFocus={() => setOpen(true)}
                />
            </div>

            {open && (query.length >= 2 || results.length > 0) && (
                <div className={styles.dropdown}>
                    {loading ? (
                        <div className={styles.empty}>Searching…</div>
                    ) : results.length === 0 ? (
                        <div className={styles.empty}>No results for &quot;{query}&quot;</div>
                    ) : (
                        <>
                            {['Request', 'Proposal', 'Project', 'User'].map(type => {
                                const group = results.filter(r => r.type === type);
                                if (group.length === 0) return null;
                                return (
                                    <div key={type}>
                                        <div className={styles.groupLabel}>{type}s</div>
                                        {group.map(r => (
                                            <a key={r.id} href={r.href} className={styles.result} onClick={() => setOpen(false)}>
                                                <span className={styles.resultIcon}>{r.icon}</span>
                                                <div className={styles.resultContent}>
                                                    <div className={styles.resultTitle}>{r.title}</div>
                                                    <div className={styles.resultSub}>{r.subtitle}</div>
                                                </div>
                                                <span className={styles.resultBadge}>{r.status?.replace(/_/g, ' ')}</span>
                                            </a>
                                        ))}
                                    </div>
                                );
                            })}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
