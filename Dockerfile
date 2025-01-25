# 베이스 이미지 선택 (Node.js 20 이미지 기반반)
FROM node:20

# 작업 디렉토리 설정
WORKDIR /usr/src/app

# package.json 및 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm install

# 소스 코드 복사
COPY . .

# Prisma Client 생성
RUN npx prisma generate

# 환경 변수 설정 (production 기본값)
ENV NODE_ENV=production

# 애플리케이션 실행 포트 설정
EXPOSE 3000

# 애플리케이션 실행
CMD ["npm", "start"]