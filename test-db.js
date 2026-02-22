const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const proposals = await prisma.proposal.findMany({
    select: { id: true, status: true, version: true }
  });
  console.log("PROPOSALS:", proposals);
}
main().catch(console.error).finally(() => prisma.$disconnect());
