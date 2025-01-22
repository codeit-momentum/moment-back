const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 모멘트 생성 API (예외처리 완료)
export const createMoments = async (req, res) => {
    try {
        const userID = req.user.userID; // JWT 인증을 가정
        const { bucketID } = req.params; // URL 파라미터
        const { moments } = req.body;    // 배열 형태

        // 1) 요청 유효성 체크
        if (!Array.isArray(moments) || moments.length === 0) {
            return res.status(400).json({
            success: false,
            error: { code: 400, message: 'moments 배열이 비어있거나 잘못되었습니다.' },
            });
        }
    
        // 2) 버킷 조회
        const bucket = await prisma.bucket.findUnique({
            where: { bucketID },
        });
        if (!bucket) {
            return res.status(404).json({
            success: false,
            error: { code: 404, message: '해당 버킷을 찾을 수 없습니다.' },
            });
        }
    
        // 3) 버킷 소유자 권한 체크
        if (bucket.userID !== userID) {
            return res.status(403).json({
            success: false,
            error: { code: 403, message: '이 버킷에 대한 권한이 없습니다.' },
            });
        }
    
        // 4) 버킷 상태 체크: 반복형 + 도전 중
        if (bucket.type !== 'REPEAT' || !bucket.isChallenging) {
            return res.status(400).json({
            success: false,
            error: {
                code: 400,
                message: '모멘트를 추가할 수 없는 버킷입니다. (반복형 + 도전 중이어야 함)',
            },
            });
        }
    
        // 5) 여러 모멘트 생성 (Promise.all + transaction)
        //    - 생성된 각 모멘트 레코드를 반환받아야 하면 createMany 대신 create()를 반복
        //    - transaction으로 감싸면, 중간 실패 시 전체 롤백
        const createdMoments = await prisma.$transaction(async (tx) => {
            return Promise.all(
            moments.map((momentItem) => {
                return tx.moment.create({
                data: {
                    content: momentItem.content,
                    photoUrl: momentItem.photoUrl ?? null,
                    userID: userID,
                    bucketID: bucketID,
                },
                });
            })
            );
        });
    
        // createdMoments는 생성된 모멘트 배열
        return res.status(201).json({
            success: true,
            message: '여러 모멘트가 성공적으로 생성되었습니다.',
            moments: createdMoments,
        });
        } catch (error) {
        console.error('여러 모멘트 생성 실패:', error);
        return res.status(500).json({
            success: false,
            error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
        });
    }
};

// 모멘트 조회
export const getMomentsByBucket = async (req, res) => {
    try {
        const userID = req.user.userID;
        const { bucketID } = req.params;
    
        // 1) 버킷 조회
        const bucket = await prisma.bucket.findUnique({
            where: { bucketID },
        });
        if (!bucket) {
            return res.status(404).json({
            success: false,
            error: { code: 404, message: '해당 버킷을 찾을 수 없습니다.' },
            });
        }
        

        // 3) 모멘트 목록 조회
        const moments = await prisma.moment.findMany({
            where: { bucketID },
            orderBy: { createdAt: 'asc' }, // 정렬 기준
        });
    
        return res.status(200).json({
            success: true,
            moments,
        });
        } catch (error) {
        console.error('모멘트 목록 조회 실패:', error);
        return res.status(500).json({
            success: false,
            error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
        });
    }
};