import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const moments = await prisma.moment.findMany({
    where: { userID: "3889979645", isCompleted: true },
    select: { 
        momentID: true, 
        startDate: true 
    }
});

for (const { momentID, startDate } of moments) {
    await prisma.moment.update({
        where: { momentID },
        data: { completedAt: startDate }
    });
}