import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// 모멘트 생성 API (예외처리 완료)
export const createMoments = async (req, res) => {
    try {
        const userID = req.user.userID; 
        const { bucketID } = req.params; 
        const { moments } = req.body;

        //요청 유효성 체크
        if (!Array.isArray(moments) || moments.length === 0) {
            return res.status(400).json({
            success: false,
            error: { code: 400, message: 'moments 배열이 비어있거나 잘못되었습니다.' },
            });
        }
    
        //버킷 조회
        const bucket = await prisma.bucket.findUnique({
            where: { bucketID },
        });
        if (!bucket) {
            return res.status(404).json({
            success: false,
            error: { code: 404, message: '해당 버킷을 찾을 수 없습니다.' },
            });
        }
    
        //버킷 소유자 권한 체크
        if (bucket.userID !== userID) {
            return res.status(403).json({
            success: false,
            error: { code: 403, message: '이 버킷에 대한 권한이 없습니다.' },
            });
        }
    
        //버킷 상태 체크: 반복형 + 도전 중
        if (bucket.type !== 'RECURRING' || !bucket.isChallenging) {
            return res.status(400).json({
            success: false,
            error: {
                code: 400,
                message: '모멘트를 추가할 수 없는 버킷입니다. (반복형 + 도전 중이어야 함)',
            },
            });
        }
    
        //여러 모멘트 생성
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
    
        //버킷 조회
        const bucket = await prisma.bucket.findUnique({
            where: { bucketID },
        });
        if (!bucket) {
            return res.status(404).json({
            success: false,
            error: { code: 404, message: '해당 버킷을 찾을 수 없습니다.' },
            });
        }


        //모멘트 목록 조회
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


// 모멘트 달성 (예외처리 완료)
export const updateMoment = async (req, res) => {
    try {
        const userID = req.user.userID;
        const { momentID } = req.params;
        const { content, photoUrl } = req.body;
    
        //기존 모멘트 + 버킷 조회
        const existingMoment = await prisma.moment.findUnique({
            where: { momentID },
            include: { bucket: true },
        });
        if (!existingMoment) {
            return res.status(404).json({
            success: false,
            error: { code: 404, message: '모멘트를 찾을 수 없습니다.' },
            });
        }
    
        //소유자 체크
        if (existingMoment.bucket.userID !== userID) {
            return res.status(403).json({
            success: false,
            error: { code: 403, message: '모멘트를 수정할 권한이 없습니다.' },
            });
        }
    
        //버킷이 아직 도전 중인지 확인 (이미 끝난 버킷이면 사진 추가 불가)
        if (!existingMoment.bucket.isChallenging) {
            return res.status(400).json({
            success: false,
            error: { code: 400, message: '이미 도전이 끝난 버킷입니다. 수정할 수 없습니다.' },
            });
        }
    
        // (추가) 도전 기간 체크 예시
        // if (existingMoment.bucket.endDate && new Date() > existingMoment.bucket.endDate) {
        //   return res.status(400).json({
        //     success: false,
        //     error: { code: 400, message: '도전 기간이 이미 지났습니다.' },
        //   });
        // }
    
        //인증 사진 추가 시 => isCompleted = true
        let newIsCompleted = existingMoment.isCompleted;
        if (photoUrl && photoUrl.trim() !== '') {
            newIsCompleted = true;
        }
        // (content만 수정할 수도 있으므로 content도 반영)
        const updatedMoment = await prisma.moment.update({
            where: { momentID },
            data: {
            content: content ?? existingMoment.content,
            photoUrl: photoUrl ?? existingMoment.photoUrl,
            isCompleted: newIsCompleted,
            },
        });
    
        return res.status(200).json({
            success: true,
            message: '모멘트를 달성하였습니다.',
            moment: updatedMoment,
        });
        } catch (err) {
        console.error('모멘트 수정 실패:', err);
        return res.status(500).json({
            success: false,
            error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
        });
    }
};