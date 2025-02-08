import { PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { s3Client } from '../config/s3config.js';

const prisma = new PrismaClient();

// 모멘트 생성 API (예외처리 완료)
export const createMoments = async (req, res) => {
    try {
        const userID = req.user.userID;
        const { bucketID } = req.params;
        const { startDate, endDate, moments, frequency } = req.body;

        // 1) 요청 검증
        if (!Array.isArray(moments) || moments.length === 0) {
            return res.status(400).json({
                success: false,
                error: { code: 400, message: 'moments 배열이 비어 있습니다.' },
            });
        }
        
        // 2) 버킷 조회
        const bucket = await prisma.bucket.findUnique({ where: { bucketID } });
        if (!bucket) {
            return res.status(404).json({
                success: false,
                error: { code: 404, message: '해당 버킷을 찾을 수 없습니다.' },
            });
        }
        // 소유자 체크
        if (bucket.userID !== userID) {
            return res.status(403).json({
                success: false,
                error: { code: 403, message: '버킷 소유자가 아닙니다.' },
            });
        }
    
        //버킷 상태 체크: 반복형 + 도전 중
        if (bucket.type !== 'REPEAT' || !bucket.isChallenging) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 400,
                    message: '모멘트를 추가할 수 없는 버킷입니다. (반복형 + 도전 중이어야 함)',
                },
            });
        }
        const toStartOfDay = (dateStr) => {
            // dateStr 예: "2024-01-20"
            const d = new Date(`${dateStr}T00:00:00`); // 날짜를 0시 0분 0초로
            // 아래 setHours로 더 정확히 0,0,0,0 설정
            d.setHours(0, 0, 0, 0);
            return d;
        };
        const toEndOfDay = (dateStr) => {
            const d = new Date(`${dateStr}T00:00:00`); 
            // 날짜를 23:59:59.999로
            d.setHours(23, 59, 59, 999);
            return d;
        };

          // 버킷의 startDate, endDate 변환
          let bucketStart = bucket.startDate; // 기존 값
          let bucketEnd = bucket.endDate;     // 기존 값

        if (startDate) {
            bucketStart = toStartOfDay(startDate);
        }
        if (endDate) {
            bucketEnd = toEndOfDay(endDate);
        }

        
        // 3) 트랜잭션
        const result = await prisma.$transaction(async (tx) => {
        
            //  여러 모멘트 생성
            const createdMoments = [];

            for (const m of moments) {
                // m.startDate, m.endDate (YYYY-MM-DD) → 실제 Date로 변환
                const mStart = toStartOfDay(m.startDate);
                const mEnd = toEndOfDay(m.endDate);

                const momentCreated = await tx.moment.create({
                data: {
                    content: m.content || '',
                    photoUrl: null,
                    isCompleted: false,
                    startDate: mStart,
                    endDate: mEnd,
                    bucketID: bucketID,
                    userID: userID,
                },
            });
            createdMoments.push(momentCreated);
        }
            //  버킷의 startDate, endDate 업데이트
            //      (이미 값이 있다면 덮어쓰기, 없으면 새로 세팅)
            const updatedBucket = await tx.bucket.update({
                where: { bucketID },
                data: {
                    startDate: startDate ? new Date(startDate) : bucket.startDate,
                    endDate: endDate ? new Date(endDate) : bucket.endDate,
                    updatedAt: new Date(),
                    frequency,
                },
            });
            
            return { updatedBucket, createdMoments };
        });
        
        return res.status(201).json({
            success: true,
            message: '버킷 기간이 설정되고, 모멘트들이 생성되었습니다.',
            bucket: result.updatedBucket,
            moments: result.createdMoments,
        });
    } catch (error) {
        console.error('버킷 날짜 & 모멘트 벌크 생성 실패:', error);
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
        

        // 버킷리스트 ENDDATE 확인(지났을 경우 FALSE 처리)
        await prisma.bucket.updateMany({
            where: {
                userID,
                isChallenging: true,
                endDate: { not: null, lt: now },
            },
            data: {
                isChallenging: false,
            },
        });
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

        // 소유자 체크
        if (bucket.userID !== userID) {
            return res.status(403).json({
                success: false,
                error: { code: 403, message: '버킷 소유자가 아닙니다.' },
            });
        }

        // 버킷 타입 체크 (ACHIEVEMENT이면 조회 불가)
        if (bucket.type === 'ACHIEVEMENT') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 400,
                    message: '이 버킷은 반복형(REPEAT) 버킷만 조회할 수 있습니다.',
                },
            });
        }

        //모멘트 목록 조회
        const moments = await prisma.moment.findMany({
            where: { bucketID },
            orderBy: { createdAt: 'asc' }, // 정렬 기준
        });
        const totalMomentCount = moments.length;
    
        return res.status(200).json({
            success: true,
            moments,
            momentsCount: totalMomentCount,
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
        // 모멘트+버킷 조회
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
        if (existingMoment.bucket.userID !== userID) {
            return res.status(403).json({
                success: false,
                error: { code: 403, message: '모멘트 수정 권한이 없습니다.' },
            });
        }
    
        // 버킷이 도전 중인지 확인
        if (!existingMoment.bucket.isChallenging) {
            return res.status(400).json({
                success: false,
                error: { code: 400, message: '이미 도전이 끝난 버킷입니다. 수정할 수 없습니다.' },
            });
        }
    
        // S3 이미지 업로드 처리
        let newPhotoUrl = null;
        if (req.file) {
            try {
                const bucketName = process.env.AWS_S3_BUCKET_NAME;
                const key = `moment/${userID}/${momentID}/${Date.now()}`;
            
                const command = new PutObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                    Body: req.file.buffer,
                    ContentType: req.file.mimetype,
                });
            
                await s3Client.send(command);
                newPhotoUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
                console.log('S3 업로드 성공:', newPhotoUrl);
            } catch (uploadErr) {
                console.error('S3 업로드 실패:', uploadErr);
                return res.status(500).json({
                    success: false,
                    error: { code: 500, message: 'S3 업로드에 실패했습니다.' },
                });
            }
        }
            
            // 트랜잭션
        const result = await prisma.$transaction(async (tx) => {
                // 1) 모멘트 업데이트
            const updatedMoment = await tx.moment.update({
                where: { momentID },
                data: {
                    photoUrl: newPhotoUrl,
                    isCompleted: true,
                    updatedAt: new Date(),
                },
            });
        
                
                // 2) 버킷 아래 모든 모멘트 완료 여부 확인
            const bucketID = existingMoment.bucket.bucketID;
    
                // 전체 모멘트 개수
            const totalMoments = await tx.moment.count({
                where: { bucketID },
            });
    
            // 완료된 모멘트 개수
            const completedMoments = await tx.moment.count({
                where: { bucketID, isCompleted: true },
            });
    
            let updatedBucket = null;
                // 모든 모멘트가 완료되었으면 버킷도 완료 상태로 업데이트
            if (totalMoments > 0 && totalMoments === completedMoments) {
                updatedBucket = await tx.bucket.update({
                    where: { bucketID },
                    data: { isCompleted: true, isChallenging: false, updatedAt: new Date() },
                });
            }
    
            return { updatedMoment, updatedBucket, totalMoments, completedMoments };
        });
    
        return res.status(200).json({
            success: true,
            message: '모멘트를 업데이트했습니다.',
            result,
        });
    } catch (error) {
        console.error('모멘트 수정 실패:', error);
        return res.status(500).json({
            success: false,
            error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
        });
    }
};

export const getDetailMoment = async (req, res) => {
    try {
        const userID = req.user.userID; // 인증된 사용자 ID
        const { momentID } = req.params; // 요청된 momentID

        // 모멘트 조회
        const moment = await prisma.moment.findUnique({
            where: { momentID },
            include: { bucket: true }, // 관련된 버킷 정보를 포함
        });

        // 모멘트가 존재하지 않을 경우 처리
        if (!moment) {
            return res.status(404).json({
                success: false,
                error: { code: 404, message: '모멘트를 찾을 수 없습니다.' },
            });
        }

        // 소유자 확인
        if (moment.userID !== userID) {
            return res.status(403).json({
                success: false,
                error: { code: 403, message: '모멘트 상세 정보를 확인할 권한이 없습니다.' },
            });
        }

        return res.status(200).json({
            success: true,
            moment,
        });
    } catch (err) {
        console.error('모멘트 상세 조회 실패:', error);
        return res.status(500).json({
            success: false,
            error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
        });
    }
}


export const getChallengingBucketsAndMoments = async (req, res) => {
    try {
        const userID = req.user.userID;
        const now = new Date(); // 현재 시각

        // 0) 만료된 버킷 처리 (버킷 ID 찾기)
        const expiredBuckets = await prisma.bucket.findMany({
            where: {
                userID,
                isChallenging: true,
                endDate: { not: null, lt: now },
            },
            select: { bucketID: true },
        });

        const expiredBucketIDs = expiredBuckets.map(b => b.bucketID);

        if (expiredBucketIDs.length > 0) {
            // (A) 만료된 버킷들의 모든 모멘트 삭제
            await prisma.moment.deleteMany({
                where: {
                    bucketID: { in: expiredBucketIDs }
                }
            });

            // (B) 만료된 버킷들의 isChallenging 값 false로 변경
            await prisma.bucket.updateMany({
                where: {
                    bucketID: { in: expiredBucketIDs }
                },
                data: {
                    isChallenging: false,
                },
            });
        }
        // 1) 도전 중인(isChallenging=true) 버킷들 조회
        //    해당 유저의 버킷만
        const buckets = await prisma.bucket.findMany({
            where: {
                userID,
                isChallenging: true,
            },
            include: {
                moments: true, // 모멘트 전부 가져옴, 추후 필터링
            },
        });
    
        // 2) 응답용 데이터 가공
        const responseData = buckets.map((bucket) => {
            // (a) 실시간 계산
            const allMoments = bucket.moments;
            const momentCount = allMoments.length;
            const completedMomentsCount = allMoments.filter((m) => m.isCompleted).length;
    
            // (b) 현재시간(now)이 startDate ≤ now ≤ endDate 인 모멘트만 필터
            const inRangeMoments = allMoments.filter((m) => {
            // startDate, endDate 가 null인 경우 처리 (기획에 따라)
                if (!m.startDate || !m.endDate) return false;
    
                const start = new Date(m.startDate);
                const end = new Date(m.endDate);
        
                return start <= now && now <= end;
            });
    
            // (c) 응답용 모멘트 필드만 추출
            const filteredMoments = inRangeMoments.map((m) => ({
                photoUrl: m.photoUrl || '',
                content: m.content,
                momentID: m.momentID,
                isCompleted: m.isCompleted,
                bucketID: bucket.bucketID, // or m.bucketID, same
            }));
    
            return {
                bucketID: bucket.bucketID,
                content: bucket.content,
                momentCount,
                completedMomentsCount,
                moments: filteredMoments,
            };
        });
    
        return res.status(200).json({
            success: true,
            count: responseData.length,
            data: responseData,
        });
        } catch (error) {
        console.error('도전 중 버킷 및 모멘트 조회 실패:', error);
        return res.status(500).json({
            success: false,
            error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
        });
    }
};