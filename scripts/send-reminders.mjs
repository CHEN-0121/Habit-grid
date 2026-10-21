// 定時送推播提醒(GitHub Actions 每 15 分鐘跑一次，見 .github/workflows/reminders.yml)。
// - 讀每位使用者的 fitness.reminders 和 users/{uid}/devices
// - 送出「預定時間在過去 20 分鐘內、今天還沒送過」的提醒(Actions 可能延遲)
// - 已送過的記在 users/{uid}/meta/reminderLog({date, sent:{reminderId: ISO 時間}}),日期不同就重置
// - 通知內容由 fitness-plan.js 產生，和 App 用同一份邏輯
// - token 失效時刪掉那筆 device
// 服務帳戶金鑰只從環境變數 FIREBASE_SERVICE_ACCOUNT 讀，不寫進程式碼，也不印到 log。
import admin from "firebase-admin";
import plan from "../fitness-plan.js";

const WINDOW_MIN = 20;
const INVALID_TOKEN = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument"
]);

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) { console.error("缺少 FIREBASE_SERVICE_ACCOUNT(請在 GitHub repo 的 Secrets 設定)"); process.exit(1); }
let credential;
try { credential = admin.credential.cert(JSON.parse(raw)); }
catch { console.error("FIREBASE_SERVICE_ACCOUNT 不是有效的服務帳戶 JSON"); process.exit(1); }
admin.initializeApp({ credential });
const db = admin.firestore();
const messaging = admin.messaging();

const T = plan.taipeiParts(new Date());
console.log(`台灣時間 ${T.dateKey} ${String(Math.floor(T.minutes / 60)).padStart(2, "0")}:${String(T.minutes % 60).padStart(2, "0")}(星期${plan.DOW[T.dow]})`);

// 這則提醒現在該不該送：今天的星期有勾、預定時間在過去 WINDOW_MIN 分鐘內
function isDue(r) {
  if (!r || !r.enabled || !Array.isArray(r.days) || !r.days.includes(T.dow)) return false;
  const at = plan.timeToMinutes(r.time);
  return at !== null && at <= T.minutes && T.minutes - at < WINDOW_MIN;
}

let usersChecked = 0, sent = 0, failed = 0, removed = 0;
const users = await db.collection("users").get();
for (const userDoc of users.docs) {
  usersChecked++;
  const data = userDoc.data() || {};
  plan.ensureFitness(data);   // 只在記憶體補預設值，不寫回(App 下次開會自己存)
  const due = (data.fitness.reminders || []).filter(isDue);
  if (!due.length) continue;

  const logRef = userDoc.ref.collection("meta").doc("reminderLog");
  const logSnap = await logRef.get();
  let log = logSnap.exists ? logSnap.data() : null;
  if (!log || log.date !== T.dateKey) log = { date: T.dateKey, sent: {} };   // 隔天自動重置
  const todo = due.filter(r => !log.sent[r.id]);
  if (!todo.length) continue;

  const devSnap = await userDoc.ref.collection("devices").get();
  const devices = devSnap.docs.filter(d => typeof d.get("token") === "string");
  if (!devices.length) continue;   // 沒有裝置：先不記錄，之後 20 分鐘內補登記的裝置還收得到

  for (const r of todo) {
    const msg = plan.reminderMessage(data.fitness, r, T.date);
    const res = await messaging.sendEachForMulticast({
      tokens: devices.map(d => d.get("token")),
      // data-only:由 sw.js 的 push 事件顯示通知(沒有 firebase-messaging-sw.js)
      webpush: {
        headers: { Urgency: "high", TTL: String(60 * 60) },
        data: { title: msg.title, body: msg.body, tag: r.id, url: "./?view=today" }
      }
    });
    let allInvalid = res.failureCount > 0;
    for (let i = 0; i < res.responses.length; i++) {
      const rr = res.responses[i];
      if (rr.success) continue;
      const code = rr.error && rr.error.code;
      if (INVALID_TOKEN.has(code)) { await devices[i].ref.delete().catch(() => {}); removed++; }
      else { allInvalid = false; failed++; }
    }
    sent += res.successCount;
    // 至少送到一台，或失敗的全都是失效 token(已刪掉):記成已送，避免下一輪重複
    if (res.successCount > 0 || allInvalid) log.sent[r.id] = new Date().toISOString();
  }
  await logRef.set(log);
}
console.log(`檢查 ${usersChecked} 位使用者：送出 ${sent} 則、失敗 ${failed} 則、移除失效裝置 ${removed} 台`);
