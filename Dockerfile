# 建置階段
FROM node:18-alpine as builder

WORKDIR /app

# 複製依賴檔案
COPY package*.json ./

# 安裝依賴
RUN npm ci

# 複製專案檔案
COPY . .

# 建置應用程式
RUN npm run build

# 生產階段
FROM nginx:alpine

# 複製建置結果
COPY --from=builder /app/dist /usr/share/nginx/html

# 複製 nginx 設定
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 啟動 nginx
CMD ["nginx", "-g", "daemon off;"]
