'use client';

import { useState, useEffect } from 'react';
import styles from './integrations.module.css';

interface QBOConfig {
    connected: boolean;
    companyName: string | null;
    realmId: string | null;
    lastSyncAt: string | null;
}

export default function IntegrationsPage() {
    const [qboConfig, setQboConfig] = useState<QBOConfig>({
        connected: false,
        companyName: null,
        realmId: null,
        lastSyncAt: null,
    });
    const [webhookUrl, setWebhookUrl] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        // In a real app, this would fetch from /api/v1/integrations/qbo
        // For now we show the configuration interface
        const stored = localStorage.getItem('qbo_config');
        if (stored) {
            try { setQboConfig(JSON.parse(stored)); } catch { /* noop */ }
        }
        const wh = localStorage.getItem('webhook_url');
        if (wh) setWebhookUrl(wh);
    }, []);

    function handleConnectQBO() {
        // In production: redirect to QBO OAuth flow
        const mockConfig: QBOConfig = {
            connected: true,
            companyName: 'Demo Company Inc.',
            realmId: '1234567890',
            lastSyncAt: new Date().toISOString(),
        };
        setQboConfig(mockConfig);
        localStorage.setItem('qbo_config', JSON.stringify(mockConfig));
    }

    function handleDisconnectQBO() {
        const disconnected: QBOConfig = {
            connected: false,
            companyName: null,
            realmId: null,
            lastSyncAt: null,
        };
        setQboConfig(disconnected);
        localStorage.setItem('qbo_config', JSON.stringify(disconnected));
    }

    function handleSaveWebhook() {
        localStorage.setItem('webhook_url', webhookUrl);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    }

    return (
        <>
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">Integrations</h1>
                        <p className="page-subtitle">Connect external services</p>
                    </div>
                </div>
            </div>

            <div className="page-body">
                {/* QuickBooks Online */}
                <div className={styles.integrationCard}>
                    <div className={styles.integrationHeader}>
                        <div className={styles.integrationIcon}>📗</div>
                        <div>
                            <h3>QuickBooks Online</h3>
                            <p className={styles.integrationDesc}>
                                Sync invoices and payments with QuickBooks Online
                            </p>
                        </div>
                        <span className={`badge badge-${qboConfig.connected ? 'completed' : 'draft'}`}>
                            {qboConfig.connected ? 'Connected' : 'Not Connected'}
                        </span>
                    </div>

                    {qboConfig.connected ? (
                        <div className={styles.connectedDetails}>
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Company</span>
                                <span>{qboConfig.companyName}</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Realm ID</span>
                                <span className={styles.mono}>{qboConfig.realmId}</span>
                            </div>
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Last Sync</span>
                                <span>
                                    {qboConfig.lastSyncAt
                                        ? new Date(qboConfig.lastSyncAt).toLocaleString()
                                        : 'Never'}
                                </span>
                            </div>
                            <div className={styles.integrationActions}>
                                <button className="btn btn-secondary btn-sm">Sync Now</button>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    style={{ color: 'var(--color-error)' }}
                                    onClick={handleDisconnectQBO}
                                >
                                    Disconnect
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.connectSection}>
                            <p className={styles.connectText}>
                                Connect your QuickBooks Online account to automatically sync invoices,
                                payments, and customer records.
                            </p>
                            <button className="btn btn-primary" onClick={handleConnectQBO}>
                                Connect QuickBooks
                            </button>
                        </div>
                    )}
                </div>

                {/* Webhooks */}
                <div className={styles.integrationCard}>
                    <div className={styles.integrationHeader}>
                        <div className={styles.integrationIcon}>🔔</div>
                        <div>
                            <h3>Webhooks</h3>
                            <p className={styles.integrationDesc}>
                                Receive notifications for key events
                            </p>
                        </div>
                    </div>

                    <div className={styles.webhookSection}>
                        <div className="form-group">
                            <label className="form-label">Webhook URL</label>
                            <div className={styles.webhookInput}>
                                <input
                                    className="input"
                                    type="url"
                                    placeholder="https://your-server.com/webhook"
                                    value={webhookUrl}
                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                />
                                <button className="btn btn-primary btn-sm" onClick={handleSaveWebhook}>
                                    {saved ? '✓ Saved' : 'Save'}
                                </button>
                            </div>
                            <p className={styles.webhookHelp}>
                                Events: proposal.approved, invoice.created, payment.received, project.completed
                            </p>
                        </div>
                    </div>
                </div>

                {/* S3 / Storage */}
                <div className={styles.integrationCard}>
                    <div className={styles.integrationHeader}>
                        <div className={styles.integrationIcon}>☁️</div>
                        <div>
                            <h3>File Storage (S3)</h3>
                            <p className={styles.integrationDesc}>
                                Attachments and documents uploaded via presigned URLs
                            </p>
                        </div>
                        <span className="badge badge-completed">Configured</span>
                    </div>
                    <div className={styles.connectedDetails}>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Bucket</span>
                            <span className={styles.mono}>{process.env.NEXT_PUBLIC_S3_BUCKET || 'intake-files'}</span>
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Region</span>
                            <span className={styles.mono}>{process.env.NEXT_PUBLIC_S3_REGION || 'us-east-1'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
