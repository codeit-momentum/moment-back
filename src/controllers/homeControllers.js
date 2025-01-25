import { PrismaClient } from '@prisma/client';
import { startOfWeek, endOfWeek, parseISO } from "date-fns";

const prisma = new PrismaClient();

// 홈 조회
export const getHome = async (req, res) => {
    try {
      // 현재 인증된 사용자 정보 가져오기
      const userID = req.user.userID; // 현재 사용자 ID

      // 현재 사용자 조회
      const currentUser = await prisma.user.findUnique({
        where: { userID },
      });

      if (!currentUser) { 
        console.error("사용자 찾을 수 없음")
        return res.status(404).json({ 
          success: false,
          error: { code: 404, message: '현재 사용자를 찾을 수 없습니다.' }
        });
      }
      
      // 사용자의 moments 조회 
      const moments = await prisma.moment.findMany({
        where: { userID },
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

// 알림 조회 및 새 알림 표시 
export const getNotifications = async (req, res) => {
  try {
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
    }
    
    // 사용자의 알림 조회 
    const notifications = await prisma.notification.findMany({
      where: { userID },
      orderBy: { createdAt: 'desc' },
      select: {
        notificationID: true,
        type: true,
        content: true,
        createdAt: true,
        isRead: true
      }
    });

    // 사용자의 새로운 알림 개수 표시 
    const newNotificationsCount = await prisma.notification.count({
      where: {
        userID,
        isRead: false // 읽지 않은 알림만 조회
      }
    });

    return res.status(200).json({
      success: true,
      messages: "알림 목록을 조회하는데 성공하였습니다.",
      user: currentUser.userID,
      notifications: notifications,
      unreadCount: newNotificationsCount,
    })
  } catch (err) {
    console.error('알림 조회 실패:', err.message);
    res.status(500).json({ 
      success: false,
      error: { code: 500, message: '알림 조회를 하는 데 실패하였습니다.' }
    });
  }
};

// 알림 읽음 처리 
export const markNotificationAsRead = async (req, res) => {
  const userID = req.user.userID; // 인증된 사용자 ID
  const { notificationID } = req.params; 

  try {

    // 알림 조회 
    const notification = await prisma.notification.findUnique({
      where: { notificationID: notificationID }
    });

    // 유저가 본인의 알림인지 확인
    if (notification.userID !== userID) {
      return res.status(403).json({
        success: false,
        error: { code: 403, message: "해당 알림에 대한 권한이 없습니다." }
      });
    }
    
    // 알림이 존재하는지 확인 
    if (!notification) {
      return res.status(404).json({
        success: false,
        error: { code: 404, message: "해당 알림을 찾을 수 없습니다." }
      });
    }
    
    // 알림 읽음으로 업데이트 
    const updatedNotification = await prisma.notification.update({
      where: { notificationID: notificationID },
      data: { isRead: true }
    });

    return res.status(200).json({
      success: true,
      messages: "알림이 성공적으로 읽음 처리되었습니다.",
      notification: updatedNotification
    });

  } catch (err) {
    console.error("알림 읽음 처리 실패:", err.message);
    return res.status(500).json({
      success: false,
      error: { code: 500, message: "서버 내부 오류가 발생했습니다." }
    });
  }
};
  
// 당일 모먼트 완료 조회 
export const getCompletedMomentsByDay = async (req, res) => {
  try {
    const userID = req.user.userID; // 인증된 사용자 ID
    const { date } = req.body;

    // 현재 사용자 조회
    const currentUser = await prisma.user.findUnique({
      where: { userID },
    });

    if (!currentUser) { 
      return res.status(404).json({ 
        success: false,
        error: { code: 404, message: '현재 사용자를 찾을 수 없습니다.' }
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "날짜(date)는 필수 입력값입니다." }
      });
    }

    // 입력된 날짜를 Date 형식으로 변환
    const inputDate = new Date(date);
    if (isNaN(inputDate)) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "유효한 날짜 형식이 아닙니다." },
      });
    }

    // 특정 주에서 데이터 조회
    const completedMoments = await prisma.moment.findMany({
      where: {
        userID, // 현재 사용자만 조회
        date: {
          gte: new Date(inputDate.setHours(0, 0, 0, 0)), // 시작 시간: 자정
          lt: new Date(inputDate.setHours(24, 0, 0, 0)), // 종료 시간: 다음 날 자정
        },
      },
      select: {
        momentID: true,
        title: true,
        description: true,
        date: true,
        status: true,
      }
    });

    return res.status(200).json({
      success: true,
      messages: "해당 날짜의 완료된 데이터를 성공적으로 조회하였습니다.",
      completedMoments: completedMoments
    });

  } catch (err) {
    console.error("당일 완료 데이터 조회 실패:", err.message);
    return res.status(500).json({
      success: false,
      error: { code: 500, message: "서버 내부 오류가 발생했습니다." }
    });
  }
};

// 버킷리스트 달성 현황 