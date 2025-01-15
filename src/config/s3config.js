import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

// S3 클라이언트 설정
export const s3Client = new S3Client({
  region: process.env.AWS_REGION, // S3 버킷의 리전
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID, // AWS 액세스 키 ID
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // AWS 비밀 액세스 키
  },
});

// S3 연결 확인
export const checkS3Connection = async () => {
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME
    const command = new HeadBucketCommand({ Bucket: bucketName });
    await s3Client.send(command);
    console.log(`S3 버킷 "${bucketName}" 연결 성공`);
  } catch (error) {
    console.error(`S3 버킷 "${bucketName}" 연결 실패:`, error.message);
  }
};
