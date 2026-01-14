<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 台灣 50 指數模擬交易平台

專業級台灣 50 指數模擬交易平台，支援 T+2 交割機制、即時行情模擬與 AI 智能分析。

## ✨ 功能特色

- 📈 **即時行情**：同步台灣證券交易所 (TWSE) 實時數據
- 💸 **模擬交易**：支援整股與零股交易，完整模擬真實交易流程
- 💼 **投資組合管理**：即時查看庫存、損益與資產狀況
- 📋 **交易紀錄**：完整的交易歷史與 T+2 交割狀態追蹤
- ⚠️ **違約交割機制**：模擬真實的 T+2 交割與違約處理

## 🚀 快速開始

### 環境需求

- Node.js 18+ 
- npm 或 yarn

### 本地開發

1. **安裝依賴**
   ```bash
   npm install
   ```

2. **啟動開發伺服器**
   ```bash
   npm run dev
   ```
   
   應用程式將在 `http://localhost:3000` 啟動

4. **建置生產版本**
   ```bash
   npm run build
   ```
   
   建置檔案將輸出至 `dist/` 目錄

5. **預覽生產版本**
   ```bash
   npm run preview
   ```

## 📦 部署指南

### Vercel 部署（推薦）

1. **推送程式碼到 GitHub**

2. **在 Vercel 匯入專案**
   - 前往 [Vercel](https://vercel.com)
   - 點擊 "New Project"
   - 選擇你的 GitHub repository
   - Vercel 會自動偵測 Vite 專案設定

3. **完成部署**
   - Vercel 會自動建置並部署
   - 部署完成後會提供一個 URL

### Netlify 部署

1. **推送程式碼到 GitHub**

2. **在 Netlify 匯入專案**
   - 前往 [Netlify](https://www.netlify.com)
   - 點擊 "Add new site" > "Import an existing project"
   - 選擇你的 GitHub repository
   - Netlify 會自動偵測 `netlify.toml` 設定

3. **完成部署**
   - Netlify 會自動建置並部署
   - 部署完成後會提供一個 URL

### 其他部署平台

#### GitHub Pages

1. 安裝 `gh-pages`：
   ```bash
   npm install --save-dev gh-pages
   ```

2. 在 `package.json` 新增部署腳本：
   ```json
   "scripts": {
     "deploy": "npm run build && gh-pages -d dist"
   }
   ```

3. 執行部署：
   ```bash
   npm run deploy
   ```

#### Docker 部署

1. 創建 `Dockerfile`：
   ```dockerfile
   FROM node:18-alpine as builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=builder /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. 建置並執行：
   ```bash
   docker build -t tw50-simulator .
   docker run -p 80:80 tw50-simulator
   ```

## 🔧 技術棧

- **前端框架**：React 19 + TypeScript
- **建置工具**：Vite 6
- **圖表庫**：Recharts
- **樣式**：Tailwind CSS
- **數據來源**：台灣證券交易所 (TWSE) MIS API

## 📝 專案結構

```
taiwan-50-trading-simulator/
├── components/          # React 元件
│   ├── Auth.tsx        # 登入/註冊元件
│   ├── Layout.tsx      # 主要佈局元件
│   └── MarketChart.tsx # 股票圖表元件
├── services/           # 服務層
│   ├── stockService.ts # 股票數據服務
│   └── tradingService.ts # 交易邏輯服務
├── App.tsx             # 主應用程式
├── types.ts            # TypeScript 類型定義
├── constants.ts        # 常數定義
├── vite.config.ts      # Vite 設定
└── package.json        # 專案依賴
```

## ⚙️ 環境變數

目前專案不需要任何環境變數設定。

## 🐛 疑難排解

### 無法取得股票數據

- 檢查網路連線
- 確認台灣證券交易所 API 可正常存取
- 查看瀏覽器控制台錯誤訊息

### 建置失敗

- 確認 Node.js 版本為 18+
- 刪除 `node_modules` 和 `package-lock.json`，重新安裝：
  ```bash
  rm -rf node_modules package-lock.json
  npm install
  ```

## 📄 授權

本專案僅供學習與模擬交易使用，不構成任何投資建議。

## 🤝 貢獻

歡迎提交 Issue 或 Pull Request！

---

**注意**：本平台為模擬交易系統，所有交易均為虛擬操作，不涉及真實金錢。
