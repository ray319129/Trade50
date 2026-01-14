# 環境變數設定指南

## 📝 環境變數說明

本專案支援兩種模式：

### 1. 本地存儲模式（預設）

不需要任何環境變數，數據只存在本地瀏覽器。

- ✅ 簡單易用，無需設定
- ⚠️ 數據無法跨裝置同步
- ⚠️ 清除瀏覽器數據會導致數據遺失

### 2. 雲端同步模式（推薦）

需要設定 Supabase 環境變數，數據會同步到雲端。

- ✅ 支援多裝置同步
- ✅ 數據安全備份
- ✅ 更好的使用體驗

## 🔑 環境變數列表

### VITE_SUPABASE_URL（選填）

Supabase 專案的 URL。

- **取得方式**：前往 Supabase 專案 → Settings → API → Project URL
- **格式**：`https://xxxxx.supabase.co`
- **是否必填**：否（未設定時使用本地存儲模式）

### VITE_SUPABASE_ANON_KEY（選填）

Supabase 專案的匿名公開金鑰。

- **取得方式**：前往 Supabase 專案 → Settings → API → anon public key
- **格式**：長字串（JWT token）
- **是否必填**：否（未設定時使用本地存儲模式）

## 🚀 設定方式

### 本地開發

1. **創建環境變數檔案**

   在專案根目錄創建 `.env.local` 檔案：

   ```env
   VITE_SUPABASE_URL=https://你的專案ID.supabase.co
   VITE_SUPABASE_ANON_KEY=你的anon_public_key
   ```

2. **重新啟動開發伺服器**

   ```bash
   npm run dev
   ```

### 生產環境部署

#### Vercel

1. 前往專案設定 > Environment Variables
2. 新增變數：
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: 您的 Supabase URL
   - **Name**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: 您的 anon key
3. 選擇環境（Production, Preview, Development）
4. 儲存並重新部署

#### Netlify

1. 前往 Site settings > Environment variables
2. 點擊 "Add variable"
3. 新增變數：
   - **Key**: `VITE_SUPABASE_URL`，**Value**: 您的 Supabase URL
   - **Key**: `VITE_SUPABASE_ANON_KEY`，**Value**: 您的 anon key
4. 儲存並重新部署

#### Docker

在建置時傳入環境變數：

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=your_url \
  --build-arg VITE_SUPABASE_ANON_KEY=your_key \
  -t tw50-simulator .
```

或在 Dockerfile 中使用：

```dockerfile
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
```

#### 傳統伺服器

在伺服器上創建 `.env` 檔案，或在建置時設定：

```bash
VITE_SUPABASE_URL=your_url VITE_SUPABASE_ANON_KEY=your_key npm run build
```

## ⚠️ 重要注意事項

1. **不要提交敏感資訊**
   - `.env`、`.env.local` 等檔案已加入 `.gitignore`
   - 永遠不要將 API keys 提交到版本控制系統

2. **Vite 環境變數規則**
   - 環境變數必須以 `VITE_` 開頭才能在客戶端使用
   - 使用 `import.meta.env.VITE_*` 存取

3. **環境變數優先順序**
   - `.env.local` > `.env` > 系統環境變數
   - `.env.local` 通常用於本地開發，不會被提交到版本控制

## 🔍 驗證設定

在程式碼中檢查環境變數是否正確載入：

```typescript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Cloud sync enabled:', !!import.meta.env.VITE_SUPABASE_URL);
```

或在瀏覽器開發者工具中檢查：

```javascript
console.log(import.meta.env);
```

## 🐛 疑難排解

### 環境變數未生效

1. **確認檔案名稱正確**
   - 本地開發：`.env.local`
   - 生產環境：`.env`

2. **確認變數名稱正確**
   - 必須以 `VITE_` 開頭
   - 大小寫敏感

3. **重新啟動開發伺服器**
   ```bash
   # 停止伺服器 (Ctrl+C)
   npm run dev
   ```

4. **清除快取並重新建置**
   ```bash
   rm -rf node_modules/.vite
   npm run build
   ```

### Supabase 連線失敗

1. 確認 Supabase URL 格式正確
2. 檢查 API Key 是否有效
3. 確認 Supabase 專案狀態正常
4. 查看瀏覽器控制台錯誤訊息

## 📚 相關資源

- [Vite 環境變數文件](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase 設定指南](./SUPABASE_SETUP.md)