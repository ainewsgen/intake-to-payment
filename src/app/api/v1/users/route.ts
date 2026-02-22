import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { requirePermissionApi, apiSuccess, apiError, getClientIp } from '@/lib/api-utils';
import { logAuditEvent, getAuditContext } from '@/lib/audit';

/**
 * GET /api/v1/users
 * List users for the tenant
 */
export async function GET(req: NextRequest) {
    const result = await requirePermissionApi(req, 'users:manage');
    if (result instanceof Response) return result;
    const ctx = result;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { tenantId: ctx.tenantId };
    if (role) where.role = role;
    if (search) {
        where.OR = [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        }),
        prisma.user.count({ where }),
    ]);

    return apiSuccess({
        data: users,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
}

/**
 * POST /api/v1/users
 * Create / invite a user
 */
export async function POST(req: NextRequest) {
    const result = await requirePermissionApi(req, 'users:manage');
    if (result instanceof Response) return result;
    const ctx = result;

    const body = await req.json();
    const { email, firstName, lastName, role, password } = body;

    const validRoles = ['ADMIN', 'ESTIMATOR', 'PM', 'FINANCE', 'EMPLOYEE'];
    if (!validRoles.includes(role)) {
        return apiError(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    // Check duplicate
    const existing = await prisma.user.findFirst({
        where: { tenantId: ctx.tenantId, email },
    });
    if (existing) return apiError('A user with this email already exists');

    // Security Hardening: Generate a random 16-char password if not provided
    const crypto = require('crypto');
    const secureDefault = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(password || secureDefault, 12);

    const user = await prisma.user.create({
        data: {
            tenantId: ctx.tenantId,
            email,
            firstName,
            lastName,
            passwordHash: hashedPassword,
            role,
        },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
        },
    });

    await logAuditEvent(
        getAuditContext(ctx.tenantId, ctx.userId, 'INTERNAL', getClientIp(req)),
        'User',
        user.id,
        'CREATE',
        null,
        { email, role } as Record<string, unknown>
    );

    return apiSuccess({ data: user }, 201);
}
