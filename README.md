# ✨ 프로젝트명: 모멘텀 (Momentum)
![image](https://github.com/user-attachments/assets/f7d41c75-b81f-4cf0-8116-336280b95f33)

**서비스 소개:**  
모멘텀은 사용자가 신년 계획을 포함한 다양한 목표를 효과적으로 관리하고 성취하도록 돕는 목표 관리 및 성취 지원 서비스입니다. 현실적인 목표 설정과 꾸준한 실행을 통해 성공 경험을 쌓을 수 있도록 설계되었습니다.


---

## 📌 기술 스택 (Tech Stack)

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=Node.js&logoColor=white)  
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=Express&logoColor=white)  
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=Prisma&logoColor=white)  
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=MongoDB&logoColor=white)  
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white)

- **언어**: Node.js (ES6+)
- **프레임워크**: Express.js
- **DB ORM**: Prisma
- **데이터베이스**: MongoDB
- **인증**: JWT, Kakao OAuth
- **기타**: 환경 변수 관리 (`dotenv`)

\n

---

## 📌 주요 기능 (Key Features)

### 1️⃣ 목표 세분화 관리 기능 📆

- **기능 설명:** 사용자가 올해의 버킷리스트를 하루 또는 주 단위로 나누어 관리할 수 있도록 돕는 기능으로, 목표를 세부적으로 분해하여 진행 상황을 체크리스트로 관리하도록 합니다.
- **주요 특징:**
  - 목표를 세분화하여 작은 단위로 설정 가능 (인공지능이 자동으로 or 사용자가 수동으로)
  - 1일에 1번, 2일에 1번, 1주에 1번, 1달에 1번의 총 4개의 단위로 나누고 사용자가 희망하는 만큼 반복 설정 가능
\n

### 2️⃣ 피드 공유 기능 🏙️

- **기능 설명:** 일종의 목표 달성 기록 및 성과 공유를 위한 기능입니다. 사용자가 목표를 달성한 후 이를 사진, 텍스트 등으로 기록하고 친구들과 공유할 수 있습니다.
- **주요 특징:**
  - 목표 달성 후 기록 작성 가능 (사진 포함)
  - 친구와 성과를 공유하고 타임라인으로 확인 가능 (단, 1주일마다 리셋)
\n

### 3️⃣ 친구 추가 및 관리 기능 👥

- **기능 설명:** 피드 공유 기능을 활용하기 위해 친구를 추가하고 삭제할 수 있습니다.
- **주요 특징:**
  - 랜덤으로 부여되는 친구 코드를 통해 친구 추가 가능
  - 친구 추가 및 삭제 기능 제공
\n  

### 4️⃣ 버킷리스트 작성 기능 📜

- **기능 설명:** 사용자가 올해 이룰 신년 계획을 '버킷리스트'로 작성하며, 이를 쪼개어 작은 단위의 '모멘트'로 구성할 수 있습니다. 버킷리스트 작성은 모멘트 생성의 전제 조건입니다.
- **주요 특징:**
  - 반복형과 달성형으로 나뉘어 버킷리스트를 추가 가능
  - 반복형: 꾸준히 이루고자 하는 목표 (예: 매일 운동)
  - 달성형: 한 번의 달성으로 끝나는 목표 (예: 자격증 취득)
  - 버킷리스트 생성, 수정, 삭제 가능
  - 반복형은 바로 달성 인증 불가, 달성형은 바로 인증 가능
\n

---

## 📂 프로젝트 구조 (간략화)

```
│── src
│   ├── controllers/   # 비즈니스 로직
│   ├── routes/        # API 라우팅
│   ├── middlewares/   # 인증 및 기타 미들웨어
│   ├── config/        # 환경 설정
│   ├── prisma/        # Prisma 관련 설정 및 연결
│   └── app.js         # Express 설정
│── .env               # 환경 변수 파일
│── package.json       # 프로젝트 의존성 및 설정
```


## 🌐 배포 및 데모 (Deployment & Demo)

- **전체 배포 주소**: [https://codeit-momentum.vecel.app](https://codeit-momentum.vecel.app)
- **BackEnd 배포 주소**: [https://codeit-momentum.shop](https://codeit-momentum.shop)
- **데모 영상**: 

---

## 📞 연락처 (Contact)

- **Email:**
- **GitHub:**


---


