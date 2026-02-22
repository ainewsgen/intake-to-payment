'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './new-request.module.css';

export default function NewRequestPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [source, setSource] = useState('MANUAL');
    const [title, setTitle] = useState('');
    const [clientName, setClientName] = useState('');
    const [notes, setNotes] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Create the request
            const res = await fetch('/api/v1/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ source, title, clientName, notes }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to create request');
            }

            const { data: request } = await res.json();

            // 2. Upload attachments if any
            for (const file of files) {
                // Get presigned URL
                const uploadRes = await fetch('/api/v1/uploads/presigned', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        entityType: 'request',
                        entityId: request.id,
                        fileName: file.name,
                        mimeType: file.type,
                        sizeBytes: file.size,
                    }),
                });

                if (!uploadRes.ok) {
                    console.error('Failed to get upload URL for', file.name);
                    continue;
                }

                const { uploadUrl, s3Key } = await uploadRes.json();

                // Upload to S3
                await fetch(uploadUrl, {
                    method: 'PUT',
                    body: file,
                    headers: { 'Content-Type': file.type },
                });

                // Record the attachment
                await fetch(`/api/v1/requests/${request.id}/attachments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileName: file.name,
                        s3Key,
                        mimeType: file.type,
                        sizeBytes: file.size,
                    }),
                });
            }

            router.push(`/requests/${request.id}`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
        }
    }

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const selected = Array.from(e.target.files || []);
        // Enforce 25MB limit client-side
        const MAX_SIZE = 25 * 1024 * 1024;
        const oversized = selected.filter((f) => f.size > MAX_SIZE);
        if (oversized.length) {
            setError(`Files exceeding 25MB: ${oversized.map((f) => f.name).join(', ')}`);
            return;
        }
        setFiles((prev) => [...prev, ...selected]);
    }

    function removeFile(index: number) {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    }

    const sourceOptions = [
        { value: 'MANUAL', label: 'Manual Entry', icon: '✏️' },
        { value: 'EMAIL', label: 'Email', icon: '✉️' },
        { value: 'PHONE', label: 'Phone Notes', icon: '📞' },
        { value: 'UPLOAD', label: 'Document Upload', icon: '📎' },
    ];

    return (
        <>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">New Request</h1>
                        <p className="page-subtitle">Create a new inbound work request</p>
                    </div>
                </div>
            </div>

            <div className="page-body">
                <div className="card" style={{ maxWidth: 720 }}>
                    <form onSubmit={handleSubmit}>
                        {/* Source Picker */}
                        <div className="form-group">
                            <label className="label">Request Source</label>
                            <div className={styles.sourceGrid}>
                                {sourceOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        className={`${styles.sourceCard} ${source === opt.value ? styles.sourceCardActive : ''
                                            }`}
                                        onClick={() => setSource(opt.value)}
                                    >
                                        <span className={styles.sourceIcon}>{opt.icon}</span>
                                        <span className={styles.sourceLabel}>{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Title */}
                        <div className="form-group">
                            <label htmlFor="title" className="label">Title *</label>
                            <input
                                id="title"
                                type="text"
                                className="input"
                                placeholder="e.g., Website redesign support"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>

                        {/* Client Name */}
                        <div className="form-group">
                            <label htmlFor="clientName" className="label">Client Name</label>
                            <input
                                id="clientName"
                                type="text"
                                className="input"
                                placeholder="e.g., Acme Co"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                            />
                        </div>

                        {/* Notes */}
                        <div className="form-group">
                            <label htmlFor="notes" className="label">
                                {source === 'EMAIL'
                                    ? 'Paste email content'
                                    : source === 'PHONE'
                                        ? 'Phone call notes'
                                        : 'Notes & details'}
                            </label>
                            <textarea
                                id="notes"
                                className="textarea"
                                placeholder={
                                    source === 'EMAIL'
                                        ? 'Paste the client email here...'
                                        : source === 'PHONE'
                                            ? 'Summarize the phone conversation...'
                                            : 'Describe the request...'
                                }
                                rows={6}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>

                        {/* File Upload */}
                        <div className="form-group">
                            <label className="label">Attachments</label>
                            <div
                                className={styles.dropzone}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className={styles.dropzoneIcon}>📂</div>
                                <div className={styles.dropzoneText}>
                                    Click to upload files (PDF, Word, Excel, CSV — max 25MB each)
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp"
                                    onChange={handleFileChange}
                                    style={{ display: 'none' }}
                                />
                            </div>

                            {files.length > 0 && (
                                <div className={styles.fileList}>
                                    {files.map((file, i) => (
                                        <div key={i} className={styles.fileItem}>
                                            <span className={styles.fileName}>📄 {file.name}</span>
                                            <span className={styles.fileSize}>
                                                {(file.size / 1024).toFixed(0)} KB
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => removeFile(i)}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {error && <div className={styles.error}>{error}</div>}

                        <div className={styles.actions}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => router.back()}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={loading || !title}
                            >
                                {loading ? 'Creating...' : 'Create Request'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
