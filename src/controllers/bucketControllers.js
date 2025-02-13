import { PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { s3Client } from '../config/s3config.js';

const getKoreaNow = () => {
    const now = new Date(); // 현재 UTC 기준 시간
    now.setHours(now.getHours() + 9); // 9시간 추가 (UTC → KST 변환)
    return now;
};

const prisma = new PrismaClient();

//버킷리스트 생성
export const createBucket = async (req, res) => {
    try {
        const userID = req.user.userID;
        const { type, content } = req.body;
        const koreaNow = getKoreaNow();

        if (!type || !content) {
        return res.status(400).json({
            success: false,
            error: { code: 400, message: 'type과 content는 필수입니다.' },
        });
        }

        const newBucket = await prisma.bucket.create({
        data: {
            userID,
            type,
            content,
            createdAt: koreaNow,
        },
        });

        return res.status(201).json({
        success: true,
        message: '버킷리스트가 생성되었습니다.',
        bucket: newBucket,
        });
    } catch (error) {
        console.error('버킷 생성 실패:', error);
        return res.status(500).json({
        success: false,
        error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
        });
    }
};


/**
 * [PATCH] /buckets/:bucketID/achievement-photo
 * - 달성형 버킷에만 적용.
*/
export const uploadAchievementPhoto = async (req, res) => {
    try {
        const userID = req.user.userID;
        const { bucketID } = req.params;
        const koreaNow = getKoreaNow();

        const bucket = await prisma.bucket.findUnique({ where: { bucketID } });
        if (!bucket) {
            return res.status(404).json({
                success: false,
                error: { code: 404, message: '버킷을 찾을 수 없습니다.' },
            });
        }
        if (bucket.userID !== userID) {
            return res.status(403).json({
                success: false,
                error: { code: 403, message: '버킷 수정 권한이 없습니다.' },
            });
        }

        // 달성형인지
        if (bucket.type !== 'ACHIEVEMENT') {
        return res.status(400).json({
            success: false,
            error: { code: 400, message: '이 버킷은 사진 인증으로 완료할 수 없는 타입입니다.(반복형)' },
        });
        }

        // Multer-S3 업로드 결과
        let photoUrl = null;

        if (req.file) {
            const bucketName = process.env.AWS_S3_BUCKET_NAME;
            const key = `bucket/${userID}/${bucketID}/${Date.now()}`;

            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: req.file.buffer, // Multer는 파일 데이터를 buffer로 제공
                ContentType: req.file.mimetype, // 파일의 MIME 타입
            });

            await s3Client.send(command);
            photoUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        }

        const updatedBucket = await prisma.bucket.update({
        where: { bucketID },
        data: {
            photoUrl: photoUrl,
            isCompleted: true,  // 달성 완료
            updatedAt: koreaNow,
        },
        });

        return res.status(200).json({
            success: true,
            message: '달성형 버킷이 인증되어 완료 처리되었습니다.',
            bucket: updatedBucket,
        });
    } catch (error) {
        console.error('달성형 버킷 인증사진 업로드 실패:', error);
        return res.status(500).json({
            success: false,
            error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
        });
    }
};


/**
 * [PATCH] /buckets/:bucketID/challenge
 * - 반복형(REPEAT) 버킷 도전 시작 => isChallenging=true
 * - 동시에 도전 중인 REPEAT 버킷이 3개 이상이면 불가
 */
export const activateBucketChallenge = async (req, res) => {
    try {
        const userID = req.user.userID;
        const { bucketID } = req.params;
        const koreaNow = getKoreaNow();

        const bucket = await prisma.bucket.findUnique({ where: { bucketID } });
        if (!bucket) {
            return res.status(404).json({ success: false, error: { code: 404, message: '버킷 없음' }});
        }
        if (bucket.userID !== userID) {
            return res.status(403).json({ success: false, error: { code: 403, message: '권한 없음' }});
        }
        if (bucket.type !== 'REPEAT') {
            return res.status(400).json({
                success: false,
                error: { code: 400, message: '달성형 버킷은 도전 중으로 설정할 수 없습니다.' },
            });
        }
        if (bucket.isChallenging) {
            return res.status(400).json({
                success: false,
                error: { code: 400, message: '이미 도전 중인 버킷입니다.' },
            });
        }

        // 현재 도전 중인 repeat 버킷 개수
        const countChallenging = await prisma.bucket.count({
            where: { userID, type: 'REPEAT', isChallenging: true },
        });
        if (countChallenging >= 3) {
            return res.status(400).json({
                success: false,
                error: { code: 400, message: '도전 중 버킷은 최대 3개까지 가능합니다.' },
            });
        }

        const updated = await prisma.bucket.update({
            where: { bucketID },
            data: { isChallenging: true, updatedAt: koreaNow },
        });

        const newCount = await prisma.bucket.count({
            where: { userID, type: 'REPEAT', isChallenging: true },
        });

        return res.status(200).json({
            success: true,
            message: '반복형 버킷이 도전 중으로 활성화되었습니다.',
            bucket: updated,
            challengingCount: newCount,
        });
    } catch (error) {
        console.error('도전 상태 활성화 실패:', error);
        return res.status(500).json({
            success: false,
            error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
        });
    }
};


    /**
     * 이건 고려 필요
     * [PATCH] /buckets/:bucketID/un-challenge
     * - 도전 중인 반복형 버킷 해제 => isChallenging=false
     */
export const deactivateBucketChallenge = async (req, res) => {
    try {
        const userID = req.user.userID;
        const { bucketID } = req.params;
        const koreaNow = getKoreaNow();

        const bucket = await prisma.bucket.findUnique({ where: { bucketID } });
        if (!bucket) {
            return res.status(404).json({ success: false, error: { code: 404, message: '버킷 없음' }});
        }
        if (bucket.userID !== userID) {
            return res.status(403).json({ success: false, error: { code: 403, message: '권한 없음' }});
        }
        if (bucket.type !== 'REPEAT') {
            return res.status(400).json({
                success: false,
                error: { code: 400, message: '달성형 버킷은 도전 안함으로 설정할 수 없습니다.' },
            });
        }
        if (!bucket.isChallenging) {
            return res.status(400).json({
                success: false,
                error: { code: 400, message: '이미 도전 중이 아닌 버킷입니다.' },
            });
        }

        const updated = await prisma.bucket.update({
            where: { bucketID },
            data: { isChallenging: false, updatedAt: koreaNow },
        });

        const newCount = await prisma.bucket.count({
            where: { userID, type: 'REPEAT', isChallenging: true },
        });

        // 자리가 비었는지(= 3개에서 2개 이하가 되었는지) 확인
        const freedSlot = (newCount < 3);

        return res.status(200).json({
            success: true,
            message: '해당 버킷이 도전 중에서 해제되었습니다.',
            bucket: updated,
            challengingCount: newCount,
            freeSlot: freedSlot,
        });
    } catch (error) {
        console.error('도전 상태 해제 실패:', error);
        return res.status(500).json({
            success: false,
            error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
        });
    }
};


// 버킷 상세 조회
export const getBucketDetail = async (req, res) => {
    try {
        const userID = req.user.userID;
        const { bucketID } = req.params;
        const koreaNow = getKoreaNow();

        const result = await prisma.$transaction(async (tx) => {
            // 버킷 + 모멘트 가져오기
            const bucket = await tx.bucket.findUnique({
                where: { bucketID },
                include: { moments: true },
            });

            if (!bucket) {
                throw new Error('버킷을 찾을 수 없습니다.');
            }

            // 소유자 체크
            if (bucket.userID !== userID) {
                throw new Error('버킷 조회 권한이 없습니다.');
            }
            // "모든 모멘트 완료" 상태 업데이트
            const momentsCount = bucket.moments.length;
            const completedMomentsCount = bucket.moments.filter((moment) => moment.isCompleted === true).length;

            
            if (completedMomentsCount === momentsCount && !bucket.isCompleted && momentsCount !== 0) {
                await tx.bucket.update({
                    where: { bucketID },
                    data: { isCompleted: true, updatedAt: koreaNow },
                });
            }

            return { bucket, momentsCount, completedMomentsCount };
        });

        return res.status(200).json({
            success: true,
            bucket: result.bucket,
            momentsCount: result.momentsCount,
            completedMomentsCount: result.completedMomentsCount,
        });
    } catch (error) {
        console.error('버킷 상세 조회 실패:', error.message);
        return res.status(500).json({
            success: false,
            error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
        });
    }
};

export const updateBucket = async (req, res) => {
    try {
        const userID = req.user.userID; // JWT 인증 후 주입된 값
        const { bucketID } = req.params;
        const { content } = req.body;
        const koreaNow = getKoreaNow();

      // 1) 현재 버킷 조회
        const existingBucket = await prisma.bucket.findUnique({
            where: { bucketID },
        });
        if (!existingBucket) {
            return res.status(404).json({
            success: false,
            error: { code: 404, message: '해당 버킷을 찾을 수 없습니다.' },
            });
        }

      // 2) 소유자 체크
        if (existingBucket.userID !== userID) {
            return res.status(403).json({
            success: false,
            error: { code: 403, message: '버킷 수정 권한이 없습니다.' },
            });
        }
    
      // 3) 업데이트할 데이터 준비
      // 필요한 필드만 골라서 DB에 반영
      // (type 변경 허용 여부는 기획에 따라)
        const updateData = {};
        if (typeof content === 'string') updateData.content = content;

      // 4) DB 업데이트
        const updatedBucket = await prisma.bucket.update({
            where: { bucketID },
            data: {
            ...updateData,
            updatedAt: koreaNow,
            },
        });

        return res.status(200).json({
            success: true,
            message: '버킷리스트가 성공적으로 수정되었습니다.',
            bucket: updatedBucket,
        });
        } catch (error) {
        console.error('버킷 수정 실패:', error);
        return res.status(500).json({
            success: false,
            error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
        });
    }
};

// 완료된 버킷리스트 개수 출력
export const getCompletedBuckets = async (req, res) => {
    try {
        const userID = req.user.userID;
    
        // `isCompleted: true`인 버킷리스트 개수 조회
        const completedCount = await prisma.bucket.count({
            where: {
                userID,
                isCompleted: true,
            },
        });
    
        return res.status(200).json({
            success: true,
            message: '달성된 버킷리스트 개수 조회 성공',
            completedCount,
        });
        } catch (error) {
        console.error('달성된 버킷리스트 개수 조회 실패:', error);
        return res.status(500).json({
            success: false,
            error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
        });
    }
};


export const getRepeatBuckets = async (req, res) => {
    try {
        const userID = req.user.userID;
      // 1) Bucket 중 type=REPEAT 만 조회
        const buckets = await prisma.bucket.findMany({
            where: {
                type: 'REPEAT',
                userID,
            },
            select: {
                bucketID: true,       // PK (필요시)
                content: true,
                isCompleted: true,
                isChallenging: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    
        // 2) 응답
        return res.status(200).json({
            success: true,
            user: userID,
            count: buckets.length,
            type: 'REPEAT 반복형',
            buckets,
        });
        } catch (error) {
        console.error('반복형 버킷 조회 실패:', error);
        return res.status(500).json({
            success: false,
            error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
        });
    }
};

export const getAchievementBuckets = async (req, res) => {
    try {
        const userID = req.user.userID;
    
        // 1) ACHIEVEMENT 타입 && 해당 userID의 버킷 조회
        const buckets = await prisma.bucket.findMany({
            where: {
                userID,
                type: 'ACHIEVEMENT',
            },
            select: {
                bucketID: true,  
                content: true,
                isCompleted: true,
            // isChallenging 필드는 달성형에 의미 없으므로 제외
            },
            orderBy: { createdAt: 'desc' },
        });
    
        return res.status(200).json({
            success: true,
            user: userID,
            count: buckets.length,
            type: 'ACHIEVEMENT 달성형',
            buckets,
        });
        } catch (error) {
        console.error('달성형 버킷 조회 실패:', error);
        return res.status(500).json({
            success: false,
            error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
        });
    }
};


export const deleteBucket = async (req, res) => {
    try {
      const userID = req.user.userID; // JWT 인증 후 주입된 값
        const { bucketID } = req.params;
    
        // 1) 버킷 존재 여부 확인
        const existingBucket = await prisma.bucket.findUnique({
            where: { bucketID },
        });
        if (!existingBucket) {
            return res.status(404).json({
            success: false,
            error: { code: 404, message: '해당 버킷을 찾을 수 없습니다.' },
            });
        }
    
        // 2) 소유자 체크
        if (existingBucket.userID !== userID) {
            return res.status(403).json({
            success: false,
            error: { code: 403, message: '버킷 삭제 권한이 없습니다.' },
            });
        }
    
        // 3) 연쇄 삭제 (모멘트 → 버킷)
        await prisma.$transaction(async (tx) => {
            // 3-1) 버킷에 속한 모멘트들 전부 삭제
            await tx.moment.deleteMany({
                where: { bucketID },
            });
    
            // 3-2) 버킷 삭제
            await tx.bucket.delete({
                where: { bucketID },
            });
        });
        return res.status(200).json({
            success: true,
            message: '버킷리스트가 성공적으로 삭제되었습니다.',
            type: existingBucket.type,
            bucketID,
        });
        } catch (error) {
        console.error('버킷 삭제 실패:', error);
        return res.status(500).json({
            success: false,
            error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
        });
    }
};
