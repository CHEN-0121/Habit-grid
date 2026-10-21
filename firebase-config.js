// 把 Firebase 後台給你的設定貼在這裡(設定教學第 4 步)。
// 沒填的話，App 照樣能用，只是資料只存在目前這台裝置，不會同步。
window.HABIT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAmR7FRtV8KWb7iyxNI1pSMX42PimvpDqw",
  authDomain: "focus-b53ca.firebaseapp.com",
  projectId: "focus-b53ca",
  storageBucket: "focus-b53ca.firebasestorage.app",
  messagingSenderId: "712165700333",
  appId: "1:712165700333:web:af7fb3c99767afa66352e4",
};

// 推播用的 VAPID 公開金鑰(Firebase 專案設定 → Cloud Messaging → 網路推播憑證)。這是公開金鑰，放在前端沒問題。
window.HABIT_FCM_VAPID_KEY = "BLfS_eqE-zrEY01vfVWAibO6XmsO-NGcn3HZHnv9t_n-rww-YVzkSgclsPvXuefflhiyBojNb3xDbOPHFvOY7DI";
