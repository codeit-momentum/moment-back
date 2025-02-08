import { PrismaClient } from '@prisma/client';

// Prisma Hook (새로운 알림이 생성될 때 자동 실행)
const prisma = new PrismaClient().$extends({
  query: {
      notification: {
          async create({ args, query }) {
              const result = await query(args); // 실제 DB 저장 실행
              notifyClients(result.userID); // 새로운 알림이 생성되면 클라이언트에게 알림 전송
              return result;
          }
      }
  }
});

// 새 알림 개수 가져오기 
export const getUnreadNotificationsCount = async (userID) => {
  try {
      const count = await prisma.notification.count({
          where: { userID, isRead: false }
      });
      return count;
  } catch (error) {
      console.error('읽지 않은 알림 개수 호출 실패:', error);
      return 0;
  }
};

// Long Polling 요청을 처리하는 엔드포인트
const pendingRequests = new Map();

export const longPollingNotifications = async (req, res) => {
  const userID = req.user.userID;

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

  // 현재 읽지 않은 알림 개수 확인
  const initialCount = await getUnreadNotificationsCount(userID);

  // 클라이언트를 대기열에 추가
  pendingRequests.set(userID, { res, initialCount });

  console.log(`Long polling started for userID: ${userID}`);

  // 주기적으로 새로운 알림 확인 (5초마다 체크)
  const interval = setInterval(async () => {
      const newCount = await getUnreadNotificationsCount(userID);

      if (newCount > initialCount) {
          console.log(`New notification detected for userID: ${userID}`);

          // 클라이언트에게 응답 보내기
          res.json({ type: 'newNotificationCount', count: newCount });

          // 대기열에서 제거 후 인터벌 정리
          pendingRequests.delete(userID);
          clearInterval(interval);
      }
  }, 5000); 

  // 30초 후 타임아웃 처리
  setTimeout(() => {
      if (pendingRequests.has(userID)) {
          console.log(`Long polling timeout for userID: ${userID}`);

          res.json({ type: 'newNotificationCount', count: initialCount });

          pendingRequests.delete(userID);
          clearInterval(interval);
      }
  }, 30000);
};

// 새로운 알림이 생성될 때 대기 중인 클라이언트에게 알림 전송
export const notifyClients = async (userID) => {
  if (pendingRequests.has(userID)) {
      const { res, initialCount } = pendingRequests.get(userID);
      const newCount = await getUnreadNotificationsCount(userID);

      if (newCount > initialCount) {
          console.log(`Notifying client about new notifications for userID: ${userID}`);

          res.json({ type: 'newNotificationCount', count: newCount });

          // 대기열에서 제거
          pendingRequests.delete(userID);
      }
  }
};

// 알림 조회 및 읽음 처리 
export const getAndMarkNotificationsAsRead = async (req, res) => {
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
    
    // 사용자의 알림 조회 (최대 8개)
    const notifications = await prisma.notification.findMany({
      where: { userID },
      orderBy: { createdAt: 'desc' },
      select: {
        notificationID: true,
        type: true,
        content: true,
        createdAt: true,
        isRead: true
      },
      take: 8
    });

    if (notifications.length > 0) {
        // 조회한 알림 중 아직 읽지 않은 항목만 읽음 처리
        const unreadNotificationIds = notifications
          .filter(notification => !notification.isRead)
          .map(notification => notification.notificationID);
  
        if (unreadNotificationIds.length > 0) {
          await prisma.notification.updateMany({
            where: {
              notificationID: { in: unreadNotificationIds }
            },
            data: { isRead: true }
          });
        }
    }

    return res.status(200).json({
      success: true,
      messages: "알림 목록을 조회하고 읽음 처리하였습니다.",
      userID: currentUser.userID,
      notifications: notifications.map(notification => ({
        ...notification,
        isRead: true        // 읽음 상태 반영 
      }))
    })
  } catch (err) {
    console.error('알림 조회 및 읽음 처리 실패:', err.message);
    res.status(500).json({ 
      success: false,
      error: { code: 500, message: '알림 조회 및 읽음 처리에 실패하였습니다.' }
    });
  }
};

// 알림 삭제 
export const deleteNotification = async (req, res) => {
  try {
    const userID = req.user.userID; // 인증된 사용자 ID
    const notificationID = req.params.notificationID;

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

    // 현재 알람 조회
    const currentNotification = await prisma.notification.findUnique({
      where: { notificationID, userID },
    });

    if (!currentNotification) { 
      console.error("현재 알람 찾을 수 없음")
      return res.status(404).json({ 
        success: false,
        error: { code: 404, message: '현재 알람을 찾을 수 없습니다.' }
      });
    }

    const deleteNotification = await prisma.notification.delete({
      where: { notificationID, userID }
    });

    return res.status(200).json({
      success: true,
      message: "해당 알람을 성공적으로 삭제하였습니다.",
      deleteNotification: deleteNotification
    });
  } catch (err) {
    console.error("해당 알람 삭제 실패:", err.message);
    return res.status(500).json({
      success: false,
      error: { code: 500, message: "서버 내부 오류가 발생했습니다." }
    });
  }
};