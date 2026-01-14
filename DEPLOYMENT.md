# 部署指南

本文件提供詳細的部署說明，協助您將台灣 50 模擬交易平台部署到各種平台。

## 📋 部署前準備

### 1. 環境變數設定

目前專案不需要任何環境變數設定。

### 2. 建置測試

在部署前，建議先在本地測試建置：

```bash
npm run build
npm run preview
```

確認建置成功且預覽正常運作後再進行部署。

## 🚀 部署平台

### Vercel（推薦）

Vercel 提供最簡單的部署體驗，自動偵測 Vite 專案。

#### 步驟：

1. **安裝 Vercel CLI**（選填）
   ```bash
   npm i -g vercel
   ```

2. **部署**
   ```bash
   vercel
   ```
   或直接透過 GitHub 整合：
   - 前往 [vercel.com](https://vercel.com)
   - 點擊 "New Project"
   - 連接 GitHub repository
   - 自動偵測設定

3. **完成部署**

#### 優點：
- ✅ 自動 HTTPS
- ✅ 全球 CDN
- ✅ 自動部署（Git push）
- ✅ 免費方案充足

### Netlify

Netlify 也提供優秀的部署體驗。

#### 步驟：

1. **透過 GitHub 部署**
   - 前往 [netlify.com](https://www.netlify.com)
   - 點擊 "Add new site" > "Import an existing project"
   - 選擇 GitHub repository
   - Netlify 會自動讀取 `netlify.toml`

2. **完成部署**

#### 優點：
- ✅ 自動 HTTPS
- ✅ 全球 CDN
- ✅ 自動部署
- ✅ 免費方案充足

### GitHub Pages

適合靜態網站部署。

#### 步驟：

1. **安裝 gh-pages**
   ```bash
   npm install --save-dev gh-pages
   ```

2. **修改 vite.config.ts**
   ```typescript
   export default defineConfig({
     base: '/your-repo-name/', // 改為你的 repository 名稱
     // ... 其他設定
   })
   ```

3. **新增部署腳本到 package.json**
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```

4. **執行部署**
   ```bash
   npm run deploy
   ```

5. **啟用 GitHub Pages**
   - Repository Settings > Pages
   - Source: gh-pages branch
   - 儲存設定

#### 注意：
- ⚠️ 環境變數需在 GitHub Actions 中設定
- ⚠️ 需要手動更新 base URL

### Docker

適合部署到自己的伺服器或雲端平台。

#### 步驟：

1. **創建 Dockerfile**
   ```dockerfile
   FROM node:18-alpine as builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=builder /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. **創建 nginx.conf**
   ```nginx
   server {
     listen 80;
     server_name _;
     root /usr/share/nginx/html;
     index index.html;

     location / {
       try_files $uri $uri/ /index.html;
     }

     location /assets {
       expires 1y;
       add_header Cache-Control "public, immutable";
     }
   }
   ```

3. **建置 Docker 映像**
   ```bash
   docker build -t tw50-simulator .
   ```

4. **執行容器**
   ```bash
   docker run -p 80:80 tw50-simulator
   ```

### 傳統伺服器部署

#### 步驟：

1. **建置專案**
   ```bash
   npm run build
   ```

2. **上傳 dist 目錄**
   將 `dist/` 目錄內容上傳到伺服器的 web 根目錄（如 `/var/www/html`）

3. **設定 Web 伺服器**

   **Nginx 設定範例：**
   ```nginx
   server {
     listen 80;
     server_name your-domain.com;
     root /var/www/html;
     index index.html;

     location / {
       try_files $uri $uri/ /index.html;
     }

     location /assets {
       expires 1y;
       add_header Cache-Control "public, immutable";
     }
   }
   ```

   **Apache 設定範例（.htaccess）：**
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

## 🔒 安全性建議

1. **環境變數**
   - 永遠不要在程式碼中硬編碼 API keys
   - 使用環境變數管理敏感資訊
   - 不要將 `.env` 檔案提交到版本控制

2. **HTTPS**
   - 生產環境務必使用 HTTPS
   - 大多數部署平台（Vercel、Netlify）自動提供 HTTPS

3. **CORS**
   - 本專案使用 CORS proxy 存取 TWSE API
   - 生產環境可考慮使用後端代理

## 📊 效能優化

### 已實作的優化：

- ✅ 程式碼分割（Code Splitting）
- ✅ 資源壓縮（Minification）
- ✅ 靜態資源快取
- ✅ 延遲載入（Lazy Loading）

### 額外建議：

1. **CDN**
   - 使用 CDN 加速靜態資源載入
   - Vercel/Netlify 自動提供 CDN

2. **圖片優化**
   - 使用 WebP 格式
   - 實作響應式圖片

3. **監控**
   - 整合錯誤追蹤（如 Sentry）
   - 效能監控（如 Google Analytics）

## 🐛 常見問題

### Q: 部署後無法載入股票數據？

A: 檢查以下項目：
- 網路連線是否正常
- TWSE API 是否可正常存取
- 瀏覽器控制台是否有錯誤訊息
- CORS proxy 服務是否正常運作


### Q: 路由無法正常運作？

A: 
- 確認已設定正確的 rewrite 規則
- 檢查 base URL 設定
- 確認所有路由都指向 `index.html`

## 📞 支援

如有部署相關問題，請提交 Issue 或查看專案文件。
