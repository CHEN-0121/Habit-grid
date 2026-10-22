# 自律打卡表

個人習慣追蹤網頁 App,部署在 GitHub Pages:https://chen-0121.github.io/habit-grid/

- 純 HTML/CSS/JS,沒有 build 流程。主程式全部在 index.html
- 資料同步用 Firebase(Auth + Firestore),每人一份文件 users/{uid},格式 {habits:[{id,name,goal,days?}], checks:{"YYYY-MM":{habitId:[日期數字]}}, fitness:{...}}
  - habits[].days 可省略：[0-6](0=週日),只在這幾天要做；沒有 days 視為每天
  - fitness 是 30 天健身衝刺計畫(只有計畫與顯示，還沒有每日紀錄)。舊資料沒有 fitness 時，ensureFitness() 會用 DEFAULT_FITNESS 補上並存回去。格式：
    {status:"active", source:"user_confirmed", confirmedAt:"YYYY-MM-DD", name, startDate:"YYYY-MM-DD", lengthDays:30, standardWeek:"2",
     weeklySteps, dailyTask,
     dayTypes:{lift|run|rest:{label,kcal,protein,fat,carbs,steps}},
     schedule:{"0"-"6":sessionKey}  // key 是 getDay()
     sessions:{chest|run|back|legs|rest:{type:"lift"|"run"|"rest", short, brief, title, note?, exercises:[{id,name,sets,reps,rest}]}},
     weeks:{"1"-"4":{reserve:"保留幾下", adjust:[{session, ex:exerciseId, sets?, skip?}]}},
     tips:{lift, dinner:[3 句], sundayCheck, sundayMeasure, weekendMeal}}
  - sessions 只存標準週課表(第 2、4 週),各週差異寫在 weeks[n].adjust,由 fitnessDay() 顯示時套用，不要複製四份課表。第 29–30 天算第 4 週，範圍外照 standardWeek 顯示
  - fitness.reminders:[{id, time:"HH:MM", days:[0-6], type:"morning"|"preworkout"|"dinner"|"night"|"weekly", enabled}],時間固定是 Asia/Taipei
  - fitness.presets:[{id:"brunch", name:"固定早午餐", items:[{id, name, kcal, protein, fat, carbs, source:"label"|"estimate"|"tentative"}]}],目前只用第一個。從 startDate 起每天自動計入，不寫入紀錄(FP.dietDay() 計算)
  - fitness.foods:常吃清單 [{id, name, kcal, protein, fat?, carbs?}],新增食物時自動存(同名更新)
  - 匯入備份要保留 habits/checks 以外的欄位
- 飲食紀錄不放主文件：users/{uid}/logs/{YYYY-MM} = {days:{"DD":{meals:[{id, name, kcal, protein, fat?, carbs?}], brunchSkipped:bool, brunchOff?:[presetItemId]}}}
  - brunchSkipped:那天整份固定早午餐沒吃；brunchOff:只取消其中幾項。都沒寫就代表照常吃
  - 本機快取在 localStorage「habit-grid-v1-logs」= {owner:uid|null, months:{"YYYY-MM":{days}}}。未登入只存本機；登入後第一次拿到伺服器資料時，把雲端沒有的天數補上去(雲端已有的那天以雲端為準；別的帳號留下的不上傳)
  - 匯出備份多一個 logs:{"YYYY-MM":{days}},匯入時拿出來寫回子集合，不能放進主文件
  - meals[] 由 AI 估算加入的會多 source:"AI 估計"、confidence:"高"|"中"|"低"、note(估算依據)
- Firebase JS SDK 統一用 FB_VER(目前 12.19.0),從 gstatic 動態 import;所有模組必須同一版
- App Check:initCloud() 在 initializeApp 之後、使用其他服務之前 initializeAppCheck(ReCaptchaEnterpriseProvider,金鑰 HABIT_RECAPTCHA_ENTERPRISE_KEY)。localhost / 127.0.0.1 自動開 debug token
- 一句話記錄(AI):Firebase AI Logic 的 Gemini Developer API(firebase-ai.js、GoogleAIBackend,不用 Vertex AI / Blaze)。模型名稱在 firebase-config.js 的 HABIT_AI_MODEL
  - responseSchema:{items:[{name, kcal, protein, fat, carb, confidence:"高"|"中"|"低", note}]};和常吃清單 / 固定早午餐同名的項目，前端一律換回清單數字
  - 只送出輸入的那句話和已知食物的營養數字，不送其他個人資料
  - 每天最多 30 次(AI_DAILY_LIMIT),記在 users/{uid}/meta/aiUsage = {date:"YYYY-MM-DD"(台灣), count, updatedAt},呼叫前用交易扣次數
  - 結果先顯示可編輯的預覽，按「加入」才寫進 logs;只有登入後能用，失敗時手動輸入照常可用
- 網址加 ?today=YYYY-MM-DD 會把那天當作今天(測試用),所有「今天」都要用 today0() 取得
- fitness-plan.js:健身計畫的共用邏輯(DEFAULT_FITNESS、ensureFitness、fitnessDay、reminderMessage、taipeiParts),瀏覽器用 window.FitnessPlan,Node 用 import。App 和推播腳本共用，不要在 index.html 另寫一份

## 推播提醒(FCM)
- 前端：index.html 的「健身計畫」設定裡開啟通知，權限一定要由使用者點擊才請求。VAPID 公開金鑰在 firebase-config.js 的 HABIT_FCM_VAPID_KEY
- 不另建 firebase-messaging-sw.js:getToken 傳入現有 sw.js 的 registration,sw.js 處理 push(顯示通知)和 notificationclick(打開 App 並切到今日打卡，網址 ?view=today 或 postMessage "open-today")
- 推播一律送 data-only({webpush:{data:{title, body, tag, url}}}),由 sw.js 顯示；iOS 規定每則推播都要顯示通知
- Firestore:users/{uid}/devices/{tokenId} = {token, platform, createdAt, lastSeen},tokenId 是 token 的 SHA-256(前 40 個 hex);users/{uid}/meta/reminderLog = {date:"YYYY-MM-DD", sent:{reminderId: ISO 時間}}
- 定時發送:.github/workflows/reminders.yml 每 15 分鐘跑 scripts/send-reminders.mjs(firebase-admin,secret FIREBASE_SERVICE_ACCOUNT),送「預定時間在過去 20 分鐘內、今天還沒送過」的提醒，失效 token 刪掉 device。不要把金鑰或 token 寫進程式碼或 log
- .github/workflows/keepalive.yml 每月 1 號由 github-actions[bot] commit .github/keepalive,避免排程因 60 天沒活動被停用。所以 push 前要先 git pull --rebase
- package.json 只給 scripts 用(不要加 "type":"module",fitness-plan.js 要當 CommonJS 給 Node 讀);網站本身仍然不需要 build
- 未登入時資料存在 localStorage
- firebase-config.js 是前端公開設定，不要刪
- sw.js 負責離線快取；新增檔案時要加進 SHELL 清單
- 手機預設「今日打卡」,電腦預設「整月表格」,兩種畫面都要能用
- 介面文字一律用繁體中文
- 修改資料格式時，要相容已經存在 Firestore 的舊資料