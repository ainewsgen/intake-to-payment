'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './request-detail.module.css';

interface RequestDetail {
    id: string;
    source: string;
    title: string;
    clientName: string | null;
    status: string;
    notes: string | null;
    createdAt: string;
    createdBy: { id: string; firstName: string; lastName: string };
    clientAccount: { id: string; name: string } | null;
    attachments: {
        id: string;
        fileName: string;
        mimeType: string;
        sizeBytes: number;
        createdAt: string;
    }[];
    proposals: {
        id: string;
        version: number;
        status: string;
        totalAmount: number | null;
        _count: { jobs: number };
    }[];
}

const SOURCE_ICONS: Record<string, string> = {
    EMAIL: '✉️',
    PHONE: '📞',
    UPLOAD: '📎',
    MANUAL: '✏️',
};

export default function RequestDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [request, setRequest] = useState<RequestDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        async function load() {
            const res = await fetch(`/api/v1/requests/${params.id}`);
            if (!res.ok) {
                router.push('/requests');
                return;
            }
            const json = await res.json();
            setRequest(json.data);
            setLoading(false);
        }
        load();
    }, [params.id, router]);

    async function handleCreateProposal() {
        if (!request) return;
        setCreating(true);
        try {
            const res = await fetch('/api/v1/proposals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    requestId: request.id,
                    pricingModel: 'FIXED_PER_JOB',
                    jobs: [],
                }),
            });
            if (res.ok) {
                const json = await res.json();
                router.push(`/proposals/${json.data.id}`);
            }
        } finally {
            setCreating(false);
        }
    }

    if (loading) {
        return (
            <div className="page-body">
                <div className="card"><div className="skeleton" style={{ height: 300 }} /></div>
            </div>
        );
    }

    if (!request) return null;

    return (
        <>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <div className={styles.breadcrumb}>
                            <Link href="/requests">Requests</Link>
                            <span>/</span>
                            <span>{request.title}</span>
                        </div>
                        <h1 className="page-title">
                            {SOURCE_ICONS[request.source]} {request.title}
                        </h1>
                        <p className="page-subtitle">
                            Created by {request.createdBy.firstName} {request.createdBy.lastName} on{' '}
                            {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <button
                            className="btn btn-primary"
                            onClick={handleCreateProposal}
                            disabled={creating}
                        >
                            {creating ? 'Creating...' : '+ Create Proposal'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="page-body">
                <div className={styles.detailGrid}>
                    {/* Main Content */}
                    <div className={styles.mainCol}>
                        {/* Notes */}
                        <div className="card">
                            <h3 className={styles.sectionTitle}>Details</h3>
                            {request.notes ? (
                                <div className={styles.notes}>{request.notes}</div>
                            ) : (
                                <p className={styles.emptyText}>No notes provided</p>
                            )}
                        </div>

                        {/* Attachments */}
                        <div className="card">
                            <h3 className={styles.sectionTitle}>
                                Attachments ({request.attachments.length})
                            </h3>
                            {request.attachments.length === 0 ? (
                                <p className={styles.emptyText}>No attachments</p>
                            ) : (
                                <div className={styles.attachmentList}>
                                    {request.attachments.map((att) => (
                                        <div key={att.id} className={styles.attachmentItem}>
                                            <span>📄 {att.fileName}</span>
                                            <span className={styles.fileSize}>
                                                {(att.sizeBytes / 1024).toFixed(0)} KB
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Proposals */}
                        <div className="card">
                            <h3 className={styles.sectionTitle}>
                                Proposals ({request.proposals.length})
                            </h3>
                            {request.proposals.length === 0 ? (
                                <p className={styles.emptyText}>
                                    No proposals yet — create one to start estimating
                                </p>
                            ) : (
                                <div className={styles.proposalList}>
                                    {request.proposals.map((p) => (
                                        <Link
                                            key={p.id}
                                            href={`/proposals/${p.id}`}
                                            className={styles.proposalItem}
                                        >
                                            <div>
                                                <strong>v{p.version}</strong>
                                                <span className={`badge badge-${p.status === 'APPROVED' ? 'completed' : 'draft'}`} style={{ marginLeft: 8 }}>
                                                    {p.status.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                            <div className={styles.proposalMeta}>
                                                {p._count.jobs} jobs •{' '}
                                                {p.totalAmount
                                                    ? `$${Number(p.totalAmount).toLocaleString()}`
                                                    : 'Not priced'}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className={styles.sideCol}>
                        <div className="card">
                            <h3 className={styles.sectionTitle}>Info</h3>
                            <div className={styles.infoList}>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Status</span>
                                    <span className={`badge badge-${request.status === 'NEW' ? 'new' : 'active'}`}>
                                        {request.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Source</span>
                                    <span>{SOURCE_ICONS[request.source]} {request.source}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Client</span>
                                    <span>{request.clientAccount?.name || request.clientName || '—'}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <span className={styles.infoLabel}>Created</span>
                                    <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
