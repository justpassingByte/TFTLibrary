const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.trait.findMany({ select: { id: true, name: true, set_prefix: true, icon: true } }).then(t => console.table(t.slice(0, 30))).finally(()=>prisma.$disconnect());
