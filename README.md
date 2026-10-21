# 自律打卡表 設定教學

這是一個網頁 App,手機和電腦都能用。登入後兩邊的資料會自動同步，手機可以加到主畫面，用起來跟一般 App 一樣。

資料存在你自己的 Firebase 專案，免費額度(Spark 方案)對個人使用綽綽有餘，不需要綁信用卡。

## 檔案說明

| 檔案 | 用途 |
|---|---|
| `index.html` | App 本體 |
| `fitness-plan.js` | 30 天健身衝刺的課表與通知內容(App 和推播腳本共用) |
| `firebase-config.js` | 填入你的 Firebase 設定(第 4 步)和推播的 VAPID 公開金鑰(第 7 步) |
| `firestore.rules` | 資料庫權限：每個人只能讀寫自己的資料 |
| `firebase.json` | 用 Firebase Hosting 上線時的設定 |
| `manifest.webmanifest`、`sw.js`、`icon-*.png` | 讓手機可以安裝到主畫面、離線也能打開；`sw.js` 也負責顯示推播 |
| `scripts/send-reminders.mjs`、`package.json`、`.github/workflows/reminders.yml` | 定時送推播提醒(第 7 步),在 GitHub Actions 上跑，網站本身不需要 build |

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

## 7. 推播提醒(選用)

### 架構

```
手機(App)─ 開啟通知 → 取得 FCM token → 存到 users/{uid}/devices/{tokenId}
                                    ↑ 讀
GitHub Actions(每 15 分鐘)─ scripts/send-reminders.mjs ─ firebase-admin ─→ FCM ─→ 手機的 sw.js 顯示通知
     讀 fitness.reminders,依 fitness-plan.js 產生內容，寫 users/{uid}/meta/reminderLog 避免重複
```

- 提醒時間固定是台灣時間。GitHub 的排程常會晚幾分鐘，腳本會補送「預定時間在過去 20 分鐘內、今天還沒送過」的提醒
- 通知內容和 App 的課表用同一份 `fitness-plan.js`,衝刺開始前會顯示倒數、結束後顯示「衝刺已結束」
- 點通知會打開 App 並切到「今日打卡」

### 設定步驟

1. **VAPID 金鑰**:Firebase「專案設定 → Cloud Messaging」,確認「Firebase Cloud Messaging API (V1)」是啟用的；在「網路設定 → 網路推播憑證」產生金鑰組，把**公開金鑰**貼到 `firebase-config.js` 的 `HABIT_FCM_VAPID_KEY`
2. **服務帳戶金鑰**:「專案設定 → 服務帳戶」→「產生新的私密金鑰」,會下載一個 JSON 檔。**這個檔案是密碼，不要放進 repo**
3. **放進 GitHub Secrets**:repo 的「Settings → Secrets and variables → Actions → New repository secret」,名稱填 `FIREBASE_SERVICE_ACCOUNT`,內容貼上 JSON 檔的全部文字。存好後把下載的 JSON 檔刪掉
4. **發布新的資料庫規則**:`firestore.rules` 多了子集合(devices、meta)的權限，要重新發布一次(做法同第 2 步第 4 點，或用 `firebase deploy --only firestore:rules --project 你的專案ID`)
5. **手動測試排程**:repo 的「Actions → 推播提醒 → Run workflow」,看 log 最後一行「送出 N 則」
6. **手機開啟通知**:
   - **iPhone**(iOS 16.4 以上):一定要先用 Safari「分享 → 加入主畫面」,**從主畫面的圖示**打開 App,登入後到「健身計畫 → 推播提醒 → 開啟通知」
   - **Android**:用 Chrome 打開(建議也加到主畫面),登入後一樣按「開啟通知」
   - 「傳送測試通知」會直接在這台裝置顯示一則通知，用來確認權限和顯示正常(不經過 GitHub Actions)

### 注意

- 公開 repo 的 GitHub Actions 免費。repo 超過 60 天沒有活動，GitHub 會停用排程；`.github/workflows/keepalive.yml` 每月 1 號會自動 commit 一次 `.github/keepalive`(只有日期)避免這件事。萬一還是被停用，到 Actions 分頁重新啟用即可
- 因為每月有一筆 bot 的 commit,在本機改完要推之前先 `git pull --rebase`
- 手機換了 token 或解除安裝，腳本送不到時會自動刪掉那筆裝置
- 推播只送 data-only 訊息，由 `sw.js` 顯示通知；不需要 `firebase-messaging-sw.js`

---

## 使用方式

- **今日打卡**:手機預設畫面，點一下就打勾，左右箭頭可以補前幾天
- **整月表格**:電腦預設畫面，有每日長條圖、每週進度、每個習慣的月達成率
- **編輯習慣**:新增、改名、調整順序、設定月目標天數、刪除
- **匯出 / 匯入備份**:在「編輯習慣」裡，可以存成 `.json` 檔
- **健身計畫**:今日打卡旁邊的課表卡片、整月表格的課表列；「健身計畫」設定可以改開始日期、開關推播、編輯提醒時間和星期

沒網路時也能打卡，紀錄會先存在手機，連上網路後自動上傳。

第一次登入時，如果雲端還沒有資料，會把目前這台裝置上的習慣和紀錄上傳。之後換裝置登入，會直接讀雲端那份。

## 在自己電腦上測試

在這個資料夾執行:

```bash
python -m http.server 8000
```

然後打開 http://localhost:8000 。`localhost` 預設就在 Firebase 的授權網域裡，可以直接測登入。直接雙擊 `index.html` 也能打開，但登入和離線功能要透過網址開才會正常。
