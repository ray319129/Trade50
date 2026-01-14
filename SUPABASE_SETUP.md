# 🔄 Supabase 雲端同步設定指南

本指南將協助您設定 Supabase 雲端同步功能，讓您的帳號數據可以在多個裝置間同步。

## 📋 什麼是 Supabase？

Supabase 是一個開源的 Firebase 替代方案，提供：
- ✅ 免費額度充足（500MB 資料庫，2GB 儲存空間）
- ✅ 即時數據同步
- ✅ 用戶認證系統
- ✅ 簡單易用的 API

## 🚀 設定步驟

### 步驟 1：創建 Supabase 專案

1. **前往 Supabase**
   - 打開 https://supabase.com
   - 使用 GitHub 帳號登入（或註冊新帳號）

2. **創建新專案**
   - 點擊 "New Project"
   - 填寫專案資訊：
     - **Name**: `tw50-trading-simulator`（或您喜歡的名稱）
     - **Database Password**: 設定一個強密碼（請記住！）
     - **Region**: 選擇離您最近的區域（如 `Southeast Asia (Singapore)`）
   - 點擊 "Create new project"
   - 等待 1-2 分鐘讓專案建立完成

### 步驟 2：取得 API 金鑰

1. **進入專案設定**
   - 在專案頁面，點擊左側選單的 "Settings"（齒輪圖示）
   - 選擇 "API"

2. **複製 API 資訊**
   - **Project URL**: 複製這個網址（例如：`https://xxxxx.supabase.co`）
   - **anon public key**: 複製這個金鑰（很長的字串）

### 步驟 3：建立資料庫表格

1. **進入 SQL Editor**
   - 點擊左側選單的 "SQL Editor"
   - 點擊 "New query"

2. **執行以下 SQL 語句**

```sql
-- 建立用戶數據表
CREATE TABLE IF NOT EXISTS user_data (
  username TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 啟用 Row Level Security (RLS)
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- 建立政策：用戶只能讀取和更新自己的數據
CREATE POLICY "Users can read own data" ON user_data
  FOR SELECT
  USING (auth.uid()::text = username);

CREATE POLICY "Users can insert own data" ON user_data
  FOR INSERT
  WITH CHECK (auth.uid()::text = username);

CREATE POLICY "Users can update own data" ON user_data
  FOR UPDATE
  USING (auth.uid()::text = username);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_user_data_username ON user_data(username);
CREATE INDEX IF NOT EXISTS idx_user_data_updated_at ON user_data(updated_at);
```

3. **點擊 "Run" 執行 SQL**

### 步驟 4：設定環境變數

#### 本地開發

1. **創建 `.env.local` 檔案**（在專案根目錄）

```env
VITE_SUPABASE_URL=https://你的專案ID.supabase.co
VITE_SUPABASE_ANON_KEY=你的anon_public_key
```

> ⚠️ 將 `你的專案ID` 和 `你的anon_public_key` 替換為步驟 2 中複製的值

2. **重新啟動開發伺服器**
   ```bash
   npm run dev
   ```

#### 生產環境部署

##### Vercel

1. 前往專案設定 → Environment Variables
2. 新增以下變數：
   - `VITE_SUPABASE_URL`: 您的 Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: 您的 anon key
3. 重新部署專案

##### Netlify

1. 前往 Site settings → Environment variables
2. 新增以下變數：
   - `VITE_SUPABASE_URL`: 您的 Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: 您的 anon key
3. 重新部署專案

##### 其他平台

在部署平台的環境變數設定中，新增上述兩個變數即可。

### 步驟 5：測試雲端同步

1. **啟動應用程式**
   ```bash
   npm run dev
   ```

2. **註冊新帳號**
   - 在應用程式中註冊一個新帳號
   - **請使用真實的電子郵件地址**（如：`example@gmail.com` 或 `example@edu.tw`）
   - 系統會自動從電子郵件地址提取用戶名（@ 前面的部分）
   - 應該會看到 "✓ 雲端同步已啟用" 的提示

3. **測試多裝置同步**
   - 在裝置 A 上使用電子郵件地址登入並進行一些交易
   - 在裝置 B 上使用相同的電子郵件地址登入
   - 應該能看到裝置 A 的數據

## ✅ 驗證設定

### 檢查 Supabase 資料庫

1. 前往 Supabase 專案
2. 點擊左側選單的 "Table Editor"
3. 選擇 `user_data` 表格
4. 應該能看到您註冊的用戶數據

### 檢查應用程式

1. 打開瀏覽器開發者工具（F12）
2. 查看 Console，不應該有 Supabase 相關錯誤
3. 登入後，應該看到 "✓ 雲端同步已啟用" 提示

## 🔄 降級模式

如果未設定 Supabase 環境變數，應用程式會自動降級到本地存儲模式：
- ✅ 所有功能正常運作
- ⚠️ 數據只存在本地，無法跨裝置同步
- ⚠️ 清除瀏覽器數據會導致數據遺失

## 🐛 疑難排解

### 問題 1：註冊/登入失敗

**解決方案：**
- **請使用真實的電子郵件地址**（如：`example@gmail.com` 或 `example@edu.tw`）
- 系統不接受虛擬的電子郵件地址（如：`test@tw50.local`）
- 檢查環境變數是否正確設定
- 確認 Supabase 專案狀態正常
- 查看瀏覽器控制台錯誤訊息

### 問題 2：數據無法同步

**解決方案：**
- 確認網路連線正常
- 檢查 Supabase 專案的 API 狀態
- 查看瀏覽器控制台是否有錯誤

### 問題 3：SQL 執行失敗

**解決方案：**
- 確認已正確建立專案
- 檢查 SQL 語法是否正確
- 確認有執行權限

### 問題 4：環境變數未生效

**解決方案：**
- 確認變數名稱正確（`VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`）
- 重新啟動開發伺服器
- 清除瀏覽器快取

## 📊 Supabase 免費額度

Supabase 免費方案包含：
- ✅ 500MB 資料庫空間
- ✅ 2GB 檔案儲存
- ✅ 50,000 每月活躍用戶
- ✅ 2GB 頻寬

對於模擬交易平台來說，免費額度通常足夠使用。

## 🔒 安全性說明

- ✅ 使用 Row Level Security (RLS) 確保用戶只能存取自己的數據
- ✅ API Key 是公開的，但透過 RLS 保護數據安全
- ✅ 密碼使用 Supabase 內建的加密機制
- ⚠️ 請勿將 API Key 提交到公開的版本控制系統

## 📚 相關資源

- [Supabase 官方文件](https://supabase.com/docs)
- [Supabase JavaScript 客戶端](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security 說明](https://supabase.com/docs/guides/auth/row-level-security)

## 🎉 完成！

設定完成後，您的應用程式就支援多裝置同步了！

在任何裝置上登入相同帳號，都能看到相同的交易記錄和資產狀況。
