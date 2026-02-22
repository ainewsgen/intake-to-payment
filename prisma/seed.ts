import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
    console.log('DEBUG: DATABASE_URL presence:', !!process.env.DATABASE_URL);
    if (!process.env.DATABASE_URL) {
        console.error('ERROR: DATABASE_URL is not defined in the environment.');
    }

    console.log('🌱 Seeding database...');

    // Create tenant
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'demo' },
        update: {},
        create: {
            name: 'Demo Company',
            slug: 'demo',
            primaryColor: '#6366f1',
            secondaryColor: '#a855f7',
            fontFamily: 'Inter',
        },
    });
    console.log('✅ Tenant created:', tenant.slug);

    // Create users
    const passwordHash = await bcryptjs.hash('password123', 10);

    const admin = await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: 'admin@demo.com' } },
        update: {},
        create: {
            tenantId: tenant.id,
            email: 'admin@demo.com',
            passwordHash,
            firstName: 'Admin',
            lastName: 'User',
            role: 'ADMIN',
            isSystemAdmin: true,
        },
    });
    console.log('✅ Admin user:', admin.email);

    const estimator = await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: 'estimator@demo.com' } },
        update: {},
        create: {
            tenantId: tenant.id,
            email: 'estimator@demo.com',
            passwordHash,
            firstName: 'Sarah',
            lastName: 'Estimator',
            role: 'ESTIMATOR',
        },
    });
    console.log('✅ Estimator user:', estimator.email);

    const pm = await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: 'pm@demo.com' } },
        update: {},
        create: {
            tenantId: tenant.id,
            email: 'pm@demo.com',
            passwordHash,
            firstName: 'Mike',
            lastName: 'Manager',
            role: 'PM',
        },
    });
    console.log('✅ PM user:', pm.email);

    const finance = await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: 'finance@demo.com' } },
        update: {},
        create: {
            tenantId: tenant.id,
            email: 'finance@demo.com',
            passwordHash,
            firstName: 'Jane',
            lastName: 'Finance',
            role: 'FINANCE',
        },
    });
    console.log('✅ Finance user:', finance.email);

    const employee = await prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: 'employee@demo.com' } },
        update: {},
        create: {
            tenantId: tenant.id,
            email: 'employee@demo.com',
            passwordHash,
            firstName: 'Alex',
            lastName: 'Developer',
            role: 'EMPLOYEE',
        },
    });
    console.log('✅ Employee user:', employee.email);

    // Create client account
    const clientAccount = await prisma.clientAccount.upsert({
        where: { id: 'client-acme' },
        update: {},
        create: {
            id: 'client-acme',
            tenantId: tenant.id,
            name: 'Acme Corporation',
        },
    });
    console.log('✅ Client account:', clientAccount.name);

    // Create client user
    await prisma.clientUser.upsert({
        where: { clientAccountId_email: { clientAccountId: clientAccount.id, email: 'client@acme.com' } },
        update: {},
        create: {
            clientAccountId: clientAccount.id,
            email: 'client@acme.com',
            passwordHash,
            firstName: 'Bob',
            lastName: 'Client',
        },
    });
    console.log('✅ Client user: client@acme.com');

    // Create rate card
    const rateCard = await prisma.rateCard.upsert({
        where: { id: 'rate-card-v1' },
        update: {},
        create: {
            id: 'rate-card-v1',
            tenantId: tenant.id,
            name: 'Standard Rate Card v1',
            version: 1,
            effectiveDate: new Date('2025-01-01'),
            isActive: true,
            lines: {
                create: [
                    { roleName: 'Senior Developer', hourlyRate: 150, currency: 'USD' },
                    { roleName: 'Junior Developer', hourlyRate: 85, currency: 'USD' },
                    { roleName: 'Designer', hourlyRate: 120, currency: 'USD' },
                    { roleName: 'Project Manager', hourlyRate: 130, currency: 'USD' },
                    { roleName: 'QA Engineer', hourlyRate: 95, currency: 'USD' },
                    { roleName: 'DevOps Engineer', hourlyRate: 140, currency: 'USD' },
                ],
            },
        },
    });
    console.log('✅ Rate card:', rateCard.name);

    // Create contractor pay rates
    await prisma.contractorPayRate.upsert({
        where: { id: 'pay-rate-employee' },
        update: {},
        create: {
            id: 'pay-rate-employee',
            tenantId: tenant.id,
            userId: employee.id,
            hourlyRate: 45,
            currency: 'PHP',
            effectiveDate: new Date('2025-01-01'),
        },
    });
    console.log('✅ Contractor pay rate for', employee.email);

    // Create a sample request
    const request = await prisma.request.upsert({
        where: { id: 'req-sample' },
        update: {},
        create: {
            id: 'req-sample',
            tenantId: tenant.id,
            source: 'EMAIL',
            title: 'Website Redesign for Acme Corp',
            clientName: 'Acme Corporation',
            clientAccountId: clientAccount.id,
            notes: 'Acme Corporation needs a complete website redesign. They want a modern, responsive design with improved UX. Budget is approximately $15,000-$20,000. Deadline is Q2 2026.',
            status: 'NEW',
            createdById: estimator.id,
        },
    });
    console.log('✅ Sample request:', request.title);

    console.log('\n🎉 Seed complete! Login credentials:');
    console.log('   Tenant slug: demo');
    console.log('   All passwords: password123');
    console.log('   Internal users: admin@demo.com, estimator@demo.com, pm@demo.com, finance@demo.com, employee@demo.com');
    console.log('   Client user: client@acme.com');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
