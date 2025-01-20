import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 하루 모멘트 완료 표시
export const prismaMiddleware = prisma.$extends({
  query: {
    moment: {
      async update({ args, query }) {
        // Step 1: 특정 moment 업데이트 실행
        const updatedMoment = await query(args);

        // Step 2: 같은 날짜(date)의 모든 moment 가져오기
        const dateMoments = await prisma.moment.findMany({
          where: { date: updatedMoment.date }
        });

        // Step 3: 모든 moment의 status가 "true"이면 complete를 true로 설정
        const allCompleted = dateMoments.every(moment => moment.status === "true");

        // Step 4: 같은 날짜의 모든 moment의 `complete` 필드 업데이트
        await prisma.moment.updateMany({
          where: { date: updatedMoment.date },
          data: { complete: allCompleted }
        });

        return updatedMoment;
      }
    }
  }
});