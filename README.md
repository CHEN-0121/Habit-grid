# 自律打卡表 設定教學

這是一個網頁 App,手機和電腦都能用。登入後兩邊的資料會自動同步，手機可以加到主畫面，用起來跟一般 App 一樣。

資料存在你自己的 Firebase 專案，免費額度(Spark 方案)對個人使用綽綽有餘，不需要綁信用卡。

## 檔案說明

| 檔案 | 用途 |
|---|---|
| `index.html` | App 本體 |
| `firebase-config.js` | 填入你的 Firebase 設定(第 4 步) |
| `firestore.rules` | 資料庫權限：每個人只能讀寫自己的資料 |
| `firebase.json` | 用 Firebase Hosting 上線時的設定 |
| `manifest.webmanifest`、`sw.js`、`icon-*.png` | 讓手機可以安裝到主畫面、離線也能打開 |

沒填 Firebase 設定也能直接用，只是資料只存在當下那台裝置。

---

## 1. 建立 Firebase 專案

1. 到 https://console.firebase.google.com ,用 Google 帳號登入
2. 「建立專案」,名稱隨意(例如 `habit-grid`)
3. Google Analytics 可以關掉，用不到

## 2. 建立資料庫

1. 左側選單「建構 → Firestore Database」→「建立資料庫」
2. 位置選 `asia-east1 (台灣)`
3. 選「正式版模式」
4. 建好後切到「規則」分頁，把 `firestore.rules` 的內容整份貼上，按「發布」

## 3. 開啟登入功能

1. 左側選單「建構 → Authentication」→「開始使用」
2. 在「登入方式」啟用兩個:
   - **Google**(要選一個專案支援電子郵件，選自己的即可)
   - **電子郵件/密碼**(只開第一個開關，不用開「電子郵件連結」)

## 4. 拿到設定並貼進 `firebase-config.js`

1. 左上齒輪 →「專案設定」→ 往下到「你的應用程式」→ 點網頁圖示 `</>`
2. 暱稱隨意，**不用**勾 Firebase Hosting(第 5 步再處理)
3. 畫面會出現一段 `const firebaseConfig = { ... }`
4. 把裡面六個值複製到 `firebase-config.js` 對應的位置，取代「請填入」

`apiKey` 放在前端是正常的，不是密碼。真正保護資料的是第 2 步的規則。

## 5. 放上網路

兩種方法選一種。

### 方法 A:Firebase Hosting(推薦，登入最穩)

電腦要有 Node.js。在這個資料夾打開終端機：

```bash
npm install -g firebase-tools
firebase login
firebase deploy --project 你的專案ID
```

專案 ID 在「專案設定 → 一般」可以看到。完成後網址是 `https://你的專案ID.web.app`,這個網域已經自動授權，不用另外設定。

之後改了檔案，再跑一次 `firebase deploy --project 你的專案ID` 就會更新。這個指令也會把 `firestore.rules` 一起發布。

### 方法 B:GitHub Pages

1. 開一個新的 GitHub repo,把這個資料夾的檔案全部上傳
2. repo 的「Settings → Pages」,Source 選 `main` 分支、`/ (root)`,存檔
3. 等一兩分鐘，網址會是 `https://你的帳號.github.io/repo名稱/`
4. **回 Firebase**:「Authentication → 設定 → 授權網域」→ 新增 `你的帳號.github.io`

沒做第 4 點的話，登入會出現「這個網址還沒加入 Firebase 的授權網域」。

在 GitHub Pages 上，手機用 Google 登入偶爾會被瀏覽器擋。遇到的話改用 Email 登入，或改用方法 A。

## 6. 手機加到主畫面

- **iPhone**:用 Safari 打開網址 → 下方「分享」→「加入主畫面」
- **Android**:用 Chrome 打開網址 → 右上「⋮」→「安裝應用程式」或「加到主畫面」

手機和電腦用**同一個帳號**登入，資料就會同步。

---

## 使用方式

- **今日打卡**:手機預設畫面，點一下就打勾，左右箭頭可以補前幾天
- **整月表格**:電腦預設畫面，有每日長條圖、每週進度、每個習慣的月達成率
- **編輯習慣**:新增、改名、調整順序、設定月目標天數、刪除
- **匯出 / 匯入備份**:在「編輯習慣」裡，可以存成 `.json` 檔

沒網路時也能打卡，紀錄會先存在手機，連上網路後自動上傳。

第一次登入時，如果雲端還沒有資料，會把目前這台裝置上的習慣和紀錄上傳。之後換裝置登入，會直接讀雲端那份。

## 在自己電腦上測試

在這個資料夾執行:

```bash
python -m http.server 8000
```

然後打開 http://localhost:8000 。`localhost` 預設就在 Firebase 的授權網域裡，可以直接測登入。直接雙擊 `index.html` 也能打開，但登入和離線功能要透過網址開才會正常。
