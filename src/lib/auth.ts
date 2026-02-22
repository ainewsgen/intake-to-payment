import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from './prisma';

declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            tenantId: string;
            role: string;
            userType: 'INTERNAL' | 'CLIENT';
            clientAccountId?: string;
            isSystemAdmin: boolean;
            customPermissions: string[];
        };
    }

    interface User {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        tenantId: string;
        role: string;
        userType: 'INTERNAL' | 'CLIENT';
        clientAccountId?: string;
        isSystemAdmin: boolean;
        customPermissions: string[];
    }
}

declare module 'next-auth' {
    interface JWT {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        tenantId: string;
        role: string;
        userType: 'INTERNAL' | 'CLIENT';
        clientAccountId?: string;
        isSystemAdmin: boolean;
        customPermissions: string[];
    }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        CredentialsProvider({
            id: 'internal-credentials',
            name: 'Internal Login',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
                tenantSlug: { label: 'Tenant', type: 'text' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password || !credentials?.tenantSlug) {
                    return null;
                }

                const tenant = await prisma.tenant.findUnique({
                    where: { slug: credentials.tenantSlug as string },
                });

                if (!tenant) return null;

                const user = await prisma.user.findUnique({
                    where: {
                        tenantId_email: {
                            tenantId: tenant.id,
                            email: credentials.email as string,
                        },
                    },
                });

                if (!user || !user.isActive) return null;

                const isValid = await bcrypt.compare(
                    credentials.password as string,
                    user.passwordHash
                );
                if (!isValid) return null;

                return {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    tenantId: user.tenantId,
                    role: user.role,
                    userType: 'INTERNAL' as const,
                    isSystemAdmin: user.isSystemAdmin,
                    customPermissions: user.customPermissions,
                };
            },
        }),
        CredentialsProvider({
            id: 'client-credentials',
            name: 'Client Login',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
                tenantSlug: { label: 'Tenant', type: 'text' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password || !credentials?.tenantSlug) {
                    return null;
                }

                const tenant = await prisma.tenant.findUnique({
                    where: { slug: credentials.tenantSlug as string },
                });

                if (!tenant) return null;

                // Find client user by email across all client accounts in the tenant
                const clientUser = await prisma.clientUser.findFirst({
                    where: {
                        email: credentials.email as string,
                        clientAccount: { tenantId: tenant.id },
                    },
                    include: { clientAccount: true },
                });

                if (!clientUser || !clientUser.isActive) return null;

                const isValid = await bcrypt.compare(
                    credentials.password as string,
                    clientUser.passwordHash
                );
                if (!isValid) return null;

                return {
                    id: clientUser.id,
                    email: clientUser.email,
                    firstName: clientUser.firstName,
                    lastName: clientUser.lastName,
                    tenantId: tenant.id,
                    role: 'CLIENT',
                    userType: 'CLIENT' as const,
                    clientAccountId: clientUser.clientAccountId,
                    isSystemAdmin: false,
                    customPermissions: [],
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.email = user.email!;
                token.firstName = user.firstName;
                token.lastName = user.lastName;
                token.tenantId = user.tenantId;
                token.role = user.role;
                token.userType = user.userType;
                token.clientAccountId = user.clientAccountId;
                token.isSystemAdmin = user.isSystemAdmin;
                token.customPermissions = user.customPermissions;
            }
            return token;
        },
        async session({ session, token }) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            session.user = {
                id: token.id as string,
                email: token.email as string,
                emailVerified: null,
                firstName: token.firstName as string,
                lastName: token.lastName as string,
                tenantId: token.tenantId as string,
                role: token.role as string,
                userType: token.userType as 'INTERNAL' | 'CLIENT',
                clientAccountId: token.clientAccountId as string | undefined,
                isSystemAdmin: token.isSystemAdmin as boolean,
                customPermissions: token.customPermissions as string[],
            } as any;
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
        maxAge: 8 * 60 * 60, // 8 hours
    },
    secret: process.env.NEXTAUTH_SECRET,
});
