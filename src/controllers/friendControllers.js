import { PrismaClient } from '@prisma/client';
import moment from 'moment';
import cron from 'node-cron';

const prisma = new PrismaClient();


// 사용자 친구 목록 조회
export const getFriends = async (req, res) => {
  const userID = req.user.userID;

  try {
    // 친구 목록 조회
    const friends = await prisma.friend.findMany({
      where: {
          userID: userID, // 사용자가 친구 관계의 주체인 경우
      },
      include: {
        friendUser: {
          select: {
            userID: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: [
        { isFixed: 'desc' }, // 고정된 친구가 먼저 오도록 정렬
        { fixedAt: 'asc' }, // 고정된 친구들 내에서 고정된 시각 기준 오름차순 정렬
        { createdAt: 'asc' }, // 나머지는 생성된 시각 기준 오름차순 정렬
      ],
    });

    // 친구 목록 응답 데이터 변환
    const friendList = friends.map((friend) => ({
      userID: friend.friendUser.userID,
      nickname: friend.friendUser.nickname,
      profileImageUrl: friend.friendUser.profileImageUrl,
      isFixed: friend.isFixed,
      isKnock: friend.isKnock,
      fixedAt: friend.fixedAt,
      createdAt: friend.createdAt,
    }));

    res.status(200).json({
      message: '친구 목록 조회 성공',
      friends: friendList,
    });
  } catch (err) {
    console.error('친구 목록 조회 오류:', err.message);
    res.status(500).json({ message: '친구 목록 조회 중 오류가 발생했습니다.' });
  }
};


// 친구추가 전 친구 닉네임 GET
export const checkFriendCode = async (req, res) => {
  const { friendCode } = req.body; // 클라이언트로부터 받은 친구 코드

  // 친구코드가 없는 경우 에러 반환
  if (!friendCode) {
    return res.status(400).json({ message: '친구코드가 필요합니다.' });
  }

  try {
    // 친구코드로 사용자 조회
    const user = await prisma.user.findUnique({
      where: { friendCode },
      select: { nickname: true }, // 닉네임만 조회
    });

    // 친구코드가 유효하지 않은 경우
    if (!user) {
      return res.status(404).json({ message: '유효하지 않은 친구코드입니다.' });
    }

    // 닉네임 반환
    res.status(200).json({
      message: '친구코드 확인 성공',
      nickname: user.nickname,
    });
  } catch (err) {
    console.error('친구 코드 확인 오류:', err.message);
    res.status(500).json({ message: '친구코드를 확인하는 중 오류가 발생했습니다.' });
  }
};


// 사용자 친구 추가
export const addFriend = async (req, res) => {
  const { friendCode } = req.body;
  const requesterID = req.user.userID; // 현재 요청을 보낸 사용자 ID

  // 친구코드가 없는 경우 에러 반환
  if (!friendCode) {
    return res.status(400).json({ message: '친구코드가 필요합니다.' });
  }

  try {
    // 친구코드로 상대방 ID 조회
    const receiver = await prisma.user.findUnique({
      where: { friendCode },
    });

    // 친구코드가 유효하지 않은 경우
    if (!receiver) {
      return res.status(404).json({ message: '존재하지 않는 친구코드 입니다.' });
    }

    const receiverID = receiver.userID;

    // 자기 자신에게 친구 요청을 보낼 수 없음
    if (requesterID === receiverID) {
      return res.status(400).json({ message: '자기 자신에게 친구 요청을 보낼 수 없습니다.' });
    }

    // 기존 친구 관계 확인
    const existingFriendship = await prisma.friend.findFirst({
      where: {
        OR: [
          { userID: requesterID, friendUserID: receiverID },
          { userID: receiverID, friendUserID: requesterID },
        ],
      },
    });

    if (existingFriendship) {
      return res.status(409).json({ message: '이미 친구 관계입니다.' });
    }

    // 즉시 친구 관계 생성 (친구 요청 패스)
    await prisma.friend.createMany({
      data: [
        {
          userID: requesterID,
          friendUserID: receiverID,
        },
        {
          userID: receiverID,
          friendUserID: requesterID,
        },
      ],
    });
    
    // 친구 요청한 유저 
    const user = await prisma.user.findUnique({
      where: { userID : requesterID }
    });

    // 친구 요청 받은 유저 
    const friend = await prisma.user.findUnique({
      where: { userID : receiverID }
    });

    
    // 친구 생성 알림 추가 
    await prisma.notification.createMany({
      data: [
        {
          userID: requesterID,
          type: 'FRIEND',
          content: `${friend.nickname}님과 친구가 되었어요!`,
        },
        {
          userID: receiverID,
          type: 'FRIEND',
          content: `${user.nickname}님과 친구가 되었어요!`,
        },
      ]
    });

    res.status(201).json({
      message: '친구 추가 성공',
      friend: {
        requesterID,
        requesterNickname: req.user.nickname, // 요청자 닉네임
        receiverID,
        receiverNickname: receiver.nickname, // 수신자 닉네임
      },
    });
  } catch (err) {
    console.error('친구 추가 오류:', err.message);
    res.status(500).json({ message: '친구 추가 중 오류가 발생했습니다.' });
  }
};

// 친구 삭제
export const deleteFriend = async (req, res) => {
  const userID = req.user.userID; // 현재 사용자 ID
  const { friendUserID } = req.body; // 삭제할 친구의 사용자 ID

  if (!friendUserID) {
    return res.status(400).json({ message: '삭제할 친구의 사용자 ID가 필요합니다.' });
  }
  
  try {
    // 친구 관계 확인
    const friendRelation = await prisma.friend.findMany({
      where: {
        OR: [
          { userID, friendUserID },
          { userID: friendUserID, friendUserID: userID },
        ],
      },
    });

    if (friendRelation.length === 0) {
      return res.status(404).json({ message: '친구 관계가 존재하지 않습니다.' });
    }

    // Friend 관계 삭제 
    await prisma.friend.deleteMany({
      where: {
        OR: [
          { userID, friendUserID },
          { userID: friendUserID, friendUserID: userID },
        ],
      },
    });

    // FriendFeed 데이터 삭제
    await prisma.friendFeed.deleteMany({
      where: {
        OR: [
          { userID: userID, moment: { userID: friendUserID } },  // 내가 친구의 모멘트를 본 기록 삭제
          { userID: friendUserID, moment: { userID: userID } },  // 친구가 내 모멘트를 본 기록 삭제
        ],
      },
    });

    res.status(200).json({ message: '친구 관계를 성공적으로 삭제하였습니다.' });
  } catch (err) {
    console.error('친구 삭제 오류:', err.message);
    res.status(500).json({ message: '친구 삭제 중 오류가 발생했습니다.' });
  }
};

cron.schedule('0 0 * * 1', async () => {
  console.log('Resetting knockedAt for all friends...');
  await prisma.friend.updateMany({
    data: {
      knockedAt: null,
      isKnock: false
    }
  });
  console.log('All knockedAt fields have been reset.');
});

//친구에게 노크하기
export const knockFriend = async (req, res) => {
  const userID = req.user.userID; // 현재 사용자 ID
  const { friendUserID } = req.body; // 노크할 친구의 사용자 ID

  try {
    // 친구 관계 및 최근 피드(모멘트) 정보 검색
    const friendRelation = await prisma.friend.findUnique({
      where: {
        userID_friendUserID: {
          userID,
          friendUserID
        }
      },
      include: {
        friendUser: {
          include: {
            moments: true  // 피드(모멘트) 정보 목록록 포함
          },
        },
      }
    });

    if (!friendRelation) {
      return res.status(404).json({ status: "failed", message: "해당 친구를 찾을 수 없습니다." });
    }

    // 친구가 최근 7일 이내에 피드(모멘트)를 올렸는지 확인  -> 내부 확인용
    const sevenDaysAgo = moment().subtract(7, 'days'); // 현재 날짜 기준 7일 전

    const hasRecentCompletedMoment = friendRelation.friendUser.moments.some(momentItem => 
      momentItem.isCompleted === true &&
      momentItem.updatedAt && 
      moment(new Date(momentItem.updatedAt)).isAfter(sevenDaysAgo)
    );

    if (hasRecentCompletedMoment) {
      return res.status(403).json({ status: "failed", message: "해당 친구는 최근 7일 이내에 완료한 피드(모멘트)가 있습니다." });
    }

    // 주별 노크 제한 검사
    const now = new Date();
    const startOfWeek = moment().startOf('isoWeek').toDate();
    if (friendRelation.knockedAt && moment(new Date(friendRelation.knockedAt)).isSameOrAfter(startOfWeek)) {
      return res.status(403).json({ status: "failed", message: "노크는 일주일에 한 번만 가능합니다." });
    }

    // 노크 상태 업데이트
    await prisma.friend.update({
      where: {
        id: friendRelation.id
      },
      data: {
        knockedAt: now,
        isKnock: true
      }
    });
    
    // 노크한 유저 
    const user = await prisma.user.findUnique({
      where: { userID }
    });

    // 친구 노크 알림 추가 
    await prisma.notification.create({
      data: {
        userID: friendUserID,
        type: 'KNOCK',
        content: `${user.nickname}님이 말해요, 피드가 조용해서 심심하대요!`,
      }
    });

    res.status(200).json({ status: "success", message: "노크 알림이 전송되었습니다." });
  } catch (err) {
    console.error('노크 오류:', err.message);
    res.status(500).json({ status: "error", message: "서버에서 문제가 발생했습니다. 잠시 후 다시 시도해주시길 바랍니다." });
  }
};

// 친구에게 응원하기
export const cheerOnFriendFeed = async (req, res) => {
  const userID = req.user.userID; // 인증된 사용자 ID, 토큰에서 추출
  const friendID = req.params.friendId; // URL 파라미터로 받은 친구 ID
  const momentID = req.params.momentId; // URL 파라미터로 받은 피드 ID

  try {
    // 모멘트 확인
    const moment = await prisma.moment.findUnique({
      where: { momentID }
    });

    if (!moment) {
      return res.status(404).json({ message: "해당 모멘트가 존재하지 않습니다." });
    }

    if (moment.userID !== friendID) {
      return res.status(403).json({ message: "이 모멘트는 해당 친구의 것이 아닙니다." });
    }

    // 친구 관계 확인
    const friendRelation = await prisma.friend.findUnique({
      where: {
        userID_friendUserID: {
          userID,
          friendUserID: friendID,
        },
      },
    });

    if (!friendRelation) {
      return res.status(404).json({ message: "해당 사용자와 친구 관계가 아닙니다." });
    }

    // 중복 응원 확인
    const existingCheer = await prisma.friendFeed.findFirst({
      where: {
        userID: userID,
        momentID: momentID,
        cheer: true  // 이미 응원된 상태를 찾습니다.
      }
    });

    if (existingCheer && existingCheer.cheer) {
      return res.status(409).json({ message: "이미 이 피드를 응원했습니다." });
    }

    // 응원 생성
    const cheer = await prisma.friendFeed.create({
      data: {
        userID: userID,
        momentID: momentID,
        cheer: true
      }
    });

    // 친구 모멘트 응원 알림 추가 
    const [friend, user] = await Promise.all([
      prisma.user.findUnique({ where: { userID: friendID } }),
      prisma.user.findUnique({ where: { userID } })
    ]);

    if (friend && user) {
      await prisma.notification.create({
        data: {
          userID: friend.userID,
          type: 'CHEER',
          content: `${user.nickname}님이 ${friend.nickname}님의 "${moment.content}" 달성을 응원한대요!`,
        }
      });
    }

    res.status(200).json({ message: "피드 응원에 성공했습니다.", data: cheer });
  } catch (err) {
    console.error('피드 응원 오류:', err);
    res.status(500).json({ message: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주시길 바랍니다." });
  }
};

// 친구 고정/고정 해제
export const toggleFriendFix = async (req, res) => {
  const userID = req.user.userID; // 현재 사용자 ID
  const { friendUserID } = req.body; // 고정할/고정 해제할 친구의 사용자 ID

  try {
    // 친구 관계 확인
    const friendRelation = await prisma.friend.findUnique({
      where: {
        userID_friendUserID: {
          userID,
          friendUserID,
        },
      },
    });

    if (!friendRelation) {
      return res.status(404).json({ message: '친구 관계가 존재하지 않습니다.' });
    }

    // 현재 고정 상태 반전
    const updatedFriend = await prisma.friend.update({
      where: {
        id: friendRelation.id,
      },
      data: {
        isFixed: !friendRelation.isFixed,
        fixedAt: !friendRelation.isFixed ? new Date() : null, // 고정 시 현재 시각, 해제 시 null
      },
    });

    const message = updatedFriend.isFixed
      ? '친구가 고정되었습니다.'
      : '친구 고정이 해제되었습니다.';

    res.status(200).json({
      message,
      friend: {
        userID: updatedFriend.userID,
        friendUserID: updatedFriend.friendUserID,
        isFixed: updatedFriend.isFixed,
        fixedAt: updatedFriend.fixedAt,
      },
    });
  } catch (err) {
    console.error('친구 고정/고정 해제 오류:', err.message);
    res.status(500).json({ message: '친구 고정/고정 해제 중 오류가 발생했습니다.' });
  }
};