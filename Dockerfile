# Node.js 공식 이미지를 사용합니다. 버전은 package.json에 맞춰 최신 LTS 버전을 사용합니다.
FROM node:18

# 작업 디렉토리를 설정합니다.
WORKDIR /app

# package.json과 package-lock.json (있는 경우)을 /app 디렉토리로 복사합니다.
COPY package*.json ./

# package.json에 정의된 모든 필수 패키지를 설치합니다.
RUN npm install

# 나머지 소스 코드를 작업 디렉토리로 복사합니다.
COPY . .

# 애플리케이션 포트를 설정합니다. Express 기본 포트는 3000이지만, 필요에 따라 변경하세요.
EXPOSE 3000

# 환경변수 설정을 위한 dotenv 또는 cross-env 활용
ENV NODE_ENV=development

# 애플리케이션 실행 명령을 정의합니다. 개발 환경이므로 nodemon을 사용합니다.
CMD ["nodemon", "src/server.js"]
