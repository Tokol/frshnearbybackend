import { PrismaClient } from '@frsh/database';

async function main() {
  const email = process.argv[2];
  const requestedRole = process.argv[3] ?? 'ADMIN';
  if (!email || !['ADMIN', 'SUPER_ADMIN'].includes(requestedRole)) {
    throw new Error('Usage: npm run admin:grant -- admin@example.com [ADMIN|SUPER_ADMIN]');
  }
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error(`No signed-in FRSH user found for ${email}`);
    const role = requestedRole as 'ADMIN' | 'SUPER_ADMIN';
    if (!user.roles.includes(role)) {
      await prisma.user.update({ where: { id: user.id }, data: { roles: { push: role } } });
    }
    console.log(`Granted ${role} to ${email}`);
  } finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error(error); process.exit(1); });
