# ==========================================
# Stage 1: Build
# ==========================================
FROM node:18-alpine AS builder

WORKDIR /app

# 의존성 파일 복사 및 설치
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# 소스 코드 복사
COPY . .

# 환경 변수 설정
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# 애플리케이션 빌드
RUN npm run build

# ==========================================
# Stage 2: Production
# ==========================================
FROM nginx:alpine

# nginx 설정 파일 복사 (Vite 빌드 결과물은 dist 디렉토리)
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx 설정 파일 생성 (SPA 라우팅 지원 + API 프록시)
RUN echo 'server { \
    listen 3000; \
    listen [::]:3000; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

ENV NODE_ENV=production

# nginx 시작
CMD ["nginx", "-g", "daemon off;"]