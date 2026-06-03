// prisma/seed.cjs
// Same seed data as original finpay-api — alice and bob demo accounts

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('password123', 12);

  // Alice — ZAR 10,000.00 (same as original)
  const alice = await prisma.user.upsert({
    where:  { email: 'alice@finpay.dev' },
    update: {},
    create: {
      email:    'alice@finpay.dev',
      password: hashedPassword,
      name:     'Alice Demo',
      account:  { create: { balance: 1000000 } },  // 10,000 ZAR in cents
    },
  });

  // Bob — ZAR 5,000.00 (same as original)
  const bob = await prisma.user.upsert({
    where:  { email: 'bob@finpay.dev' },
    update: {},
    create: {
      email:    'bob@finpay.dev',
      password: hashedPassword,
      name:     'Bob Demo',
      account:  { create: { balance: 500000 } },   // 5,000 ZAR in cents
    },
  });

  console.log('Seeded:', { alice: alice.email, bob: bob.email });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
