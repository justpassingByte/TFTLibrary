const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.trait.findMany({ where: { name: 'Stargazer' } }).then(t => console.table(t)).finally(()=>prisma.$disconnect());
