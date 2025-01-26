import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 홈 조회
export const getHome = async (req, res) => {
    try {
      // 현재 인증된 사용자 정보 가져오기
      const userID = req.user.userID; // 현재 사용자 ID

      // 현재 사용자 조회
      const currentUser = await prisma.user.findUnique({
        where: { userID: req.user.userID },
      });

      if (!currentUser) { 
        return res.status(404).json({ 
          success: false,
          error: { code: 404, message: '현재 사용자를 찾을 수 없습니다.' }
        });
      }
      
      // 사용자의 moments 조회 
      const moments = await prisma.moment.findMany({
        where: { userID: req.user.userID },
        orderBy: { date: 'desc' },
        select: {
          momentID: true,
          title: true, 
          description: true,
          status: true,
          date: true
        }
      });

      return res.status(200).json({
        success: true,
        messages: "성공적으로 조회 완료하였습니다.",
        user: currentUser.userID,
        moments: moments

      })
    } catch (err) {
      console.error('홈 조회 실패:', err.message);
      res.status(500).json({ 
        success: false,
        error: { code: 500, message: '홈 조회를 하는 데 실패하였습니다.' }
      });
    }
  };
  
// 당일 모먼트 완료 조회 
export const getCompletedMomentsByDay = async (req, res) => {
  try {
    const userID = req.user.userID; // 인증된 사용자 ID
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "날짜(date)는 필수 입력값입니다." }
      });
    }

    // 해당 날짜가 포함된 주의 시작(월요일)과 끝(일요일) 계산
    const startDate = startOfWeek(parseISO(date), { weekStartsOn: 1 }); // 월요일 기준 시작
    const endDate = endOfWeek(parseISO(date), { weekStartsOn: 1 }); // 일요일 기준 끝

    // 특정 주에서 데이터 조회
    const completedMoments = await prisma.moment.findMany({
      where: {
        userID: userID, // 현재 사용자만 조회
        date: {
          gte: startDate,
          lte: endDate
        },
      },
      orderBy: { date: "asc" },
      select: {
        date: true,
        complete: true,
      }
    });

    // date 별 complete 확인 
    const allCompletedMoments = completedMoments.reduce((acc, current) => {
      if (!acc.find(item => item.date.getTime() === current.date.getTime())) {
        acc.push({
          date: new Date(current.date),
          complete: current.complete
        });
      }
      return acc;
    }, []);

    return res.status(200).json({
      success: true,
      messages: "해당 주의 완료된 데이터를 성공적으로 조회하였습니다.",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      allCompletedMoments: allCompletedMoments
    });

  } catch (err) {
    console.error("주간 완료 데이터 조회 실패:", err.message);
    return res.status(500).json({
      success: false,
      error: { code: 500, message: "서버 내부 오류가 발생했습니다." }
    });
  }
};