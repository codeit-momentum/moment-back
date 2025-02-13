import { PrismaClient } from '@prisma/client';
import moment from 'moment-timezone';

const prisma = new PrismaClient();

// 홈 당일 모멘트 조회
export const getHome = async (req, res) => {
  try {
    // 현재 인증된 사용자 정보 가져오기
    const userID = req.user.userID; // 현재 사용자 ID

    // 현재 사용자 조회
    const currentUser = await prisma.user.findUnique({
      where: { userID },
    });

    if (!currentUser) { 
      return res.status(404).json({ 
        success: false,
        error: { code: 404, message: '현재 사용자를 찾을 수 없습니다.' }
      });
    };
    
    const date = moment().tz("Asia/Seoul");

    // 사용자의 moments 조회 
    const moments = await prisma.moment.findMany({
      where: {
        userID,
        startDate: { lte: date }, 
        endDate: { gte: date }      
      },
      select: {
        momentID: true,
        content: true,
        startDate:true,
        endDate: true, 
        isCompleted: true
      }
    });

    // 당일 모먼트 완료 개수 
    const completedCount = moments.filter(m => m.isCompleted).length;

    return res.status(200).json({
      success: true,
      messages: "성공적으로 조회 완료하였습니다.",
      user: currentUser.userID,
      moments: moments,
      completedCount: completedCount

    })
  } catch (err) {
    console.error('홈 조회 실패:', err.message);
    res.status(500).json({ 
      success: false,
      error: { code: 500, message: '홈 조회를 하는 데 실패하였습니다.' }
    });
  }
};

// 일주일 완료 상태 조회 
export const getCompletedMomentsByWeek = async (req, res) => {
  try {
    const userID = req.user.userID;
    const now = moment().tz("Asia/Seoul"); 
    const startOfWeek = now.clone().startOf('isoWeek'); 
  
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      weekDates.push(startOfWeek.clone().add(i, 'days').toDate());
    }

    const moments = await prisma.moment.findMany({
      where: {
        userID: userID,
        OR: weekDates.map(day => ({
          startDate: { lte: day },
          endDate: { gte: day }
        }))
      },
      select: {
        startDate: true,
        endDate: true,
        isCompleted: true,
        completedAt: true
      }
    });

    const results = weekDates.map(day => {
      const momentsForDate = moments.filter(moment =>
        moment.startDate <= day && moment.endDate >= day
      );

      const isComplete = momentsForDate.some(m =>
        m.isCompleted &&
        m.completedAt &&
        moment.tz(m.completedAt, "Asia/Seoul").tz(moment.tz.guess()).format("YYYY-MM-DD") === 
        moment.tz(day, "Asia/Seoul").tz(moment.tz.guess()).format("YYYY-MM-DD")
      );

      return {
        date: moment.tz(day, "Asia/Seoul").tz(moment.tz.guess()).format("YYYY-MM-DD"),
        isComplete: isComplete
      };
    });

    return res.status(200).json({
      success: true,
      message: "해당 주의 완료된 데이터를 성공적으로 조회하였습니다.",
      startDate: moment.tz(startOfWeek, "Asia/Seoul").tz(moment.tz.guess()).format("YYYY-MM-DD"),
      endDate: moment.tz(weekDates[6], "Asia/Seoul").tz(moment.tz.guess()).format("YYYY-MM-DD"),
      weekStatus: results
    });

  } catch (err) {
    console.error("주간 완료 데이터 조회 실패:", err.message);
    return res.status(500).json({
      success: false,
      error: { code: 500, message: err.message }
    });
  }
};

// 연속적으로 인증한 날짜 조회 (작심 N일)
export const getConsecutiveCompletedDays = async (req, res) => {
  try {
    const userID = req.user.userID; // 인증된 사용자 ID    

    // 현재 사용자 조회
    const currentUser = await prisma.user.findUnique({
      where: { userID }
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        error: { code: 404, message: '현재 사용자를 찾을 수 없습니다.' }
      });
    }
    
    const targetDate = moment().tz("Asia/Seoul");

    // 연속된 isCompleted === true인 날짜 개수를 계산
    let consecutiveDays = 1;
    let checkDate = moment(targetDate).subtract(1, "days"); // 하루 전부터 검사 시작
    console.log(targetDate);
    console.log(checkDate);

    while (true) {
      const moments = await prisma.moment.findMany({
        where: {
          userID: userID,
          startDate: { lte: checkDate },
          endDate: { gte: checkDate }
        },
        select: {
          isCompleted: true,
        }
      });
      console.log(moments);
      const isComplete = moments.length > 0 && moments.some(m => m.isCompleted);

      if (isComplete) {
        consecutiveDays++;
        checkDate = moment(checkDate).subtract(1, "days");
      } else {
        break;
      }
    }

    return res.status(200).json({
      success: true,
      message: "연속 완료된 날짜 개수를 성공적으로 조회하였습니다.",
      consecutiveDays: consecutiveDays
    });
  } catch (err) {
    console.error("연속 완료 날짜 조회 실패:", err.message);
    return res.status(500).json({
      success: false,
      error: { code: 500, message: "서버 내부 오류가 발생했습니다." }
    });
  }
};

// 버킷 달성 확인 
export const getCompletedBucket = async (req, res) => {
  try {
    const userID = req.user.userID; // JWT 인증 후 주입된 userID

    // 전체 버킷 수
    const totalBuckets = await prisma.bucket.count({
        where: { userID },
    });
    
    // 완료된 버킷 수
    const completedBucketsCount = await prisma.bucket.count({
        where: { userID, isCompleted: true },
    });

    const completionRate = totalBuckets === 0
      ? 0
      : (completedBucketsCount / totalBuckets) * 100;


    return res.status(200).json({
      success: true,
      completedBucketsCount: completedBucketsCount,
      completionRate: completionRate.toFixed(2),
    });
  } catch (error) {
    console.error('버킷 달성 현황 조회 실패:', error);
    return res.status(500).json({
      success: false,
      error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
    });
  }
};