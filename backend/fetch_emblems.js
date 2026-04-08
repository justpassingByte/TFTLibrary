const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.item.findMany({ where: { name: { contains: 'Emblem' } } }).then(i => { console.table(i); console.log('Count:', i.length); }).finally(()=>prisma.$disconnect());
