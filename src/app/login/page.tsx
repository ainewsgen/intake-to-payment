'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [tenantSlug, setTenantSlug] = useState('');
    const [loginType, setLoginType] = useState<'internal' | 'client'>('internal');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const provider =
                loginType === 'internal' ? 'internal-credentials' : 'client-credentials';

            const result = await signIn(provider, {
                email,
                password,
                tenantSlug,
                redirect: false,
            });

            if (result?.error) {
                setError('Invalid email, password, or organization.');
            } else {
                router.push(loginType === 'internal' ? '/dashboard' : '/portal');
                router.refresh();
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.bgGlow} />
            <div className={styles.loginCard}>
                <div className={styles.logoMark}>
                    <span className={styles.logoIcon}>I→P</span>
                </div>
                <h1 className={styles.title}>Welcome back</h1>
                <p className={styles.subtitle}>Sign in to your workspace</p>

                <div className={styles.tabRow}>
                    <button
                        className={`${styles.tab} ${loginType === 'internal' ? styles.tabActive : ''}`}
                        onClick={() => setLoginType('internal')}
                        type="button"
                    >
                        Team
                    </button>
                    <button
                        className={`${styles.tab} ${loginType === 'client' ? styles.tabActive : ''}`}
                        onClick={() => setLoginType('client')}
                        type="button"
                    >
                        Client
                    </button>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className="form-group">
                        <label htmlFor="tenantSlug" className="label">Organization</label>
                        <input
                            id="tenantSlug"
                            type="text"
                            className="input"
                            placeholder="your-org"
                            value={tenantSlug}
                            onChange={(e) => setTenantSlug(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email" className="label">Email</label>
                        <input
                            id="email"
                            type="email"
                            className="input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="label">Password</label>
                        <input
                            id="password"
                            type="password"
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <button
                        type="submit"
                        className={`btn btn-primary btn-lg ${styles.submitBtn}`}
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>
            </div>
        </div>
    );
}
