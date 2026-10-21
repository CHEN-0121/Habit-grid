# 自律打卡表

個人習慣追蹤網頁 App,部署在 GitHub Pages:https://chen-0121.github.io/habit-grid/

- 純 HTML/CSS/JS,沒有 build 流程。主程式全部在 index.html
- 資料同步用 Firebase(Auth + Firestore),每人一份文件 users/{uid},格式 {habits:[{id,name,goal}], checks:{"YYYY-MM":{habitId:[日期數字]}}}
- 未登入時資料存在 localStorage
- firebase-config.js 是前端公開設定，不要刪
- sw.js 負責離線快取；新增檔案時要加進 SHELL 清單
- 手機預設「今日打卡」,電腦預設「整月表格」,兩種畫面都要能用
- 介面文字一律用繁體中文
- 修改資料格式時，要相容已經存在 Firestore 的舊資料