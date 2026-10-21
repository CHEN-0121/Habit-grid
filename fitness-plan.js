// 30 天健身衝刺計畫的共用邏輯：App(index.html)和推播腳本(scripts/send-reminders.mjs)用同一份。
// 瀏覽器：<script src="fitness-plan.js"> 之後用 window.FitnessPlan;Node.js:import plan from "../fitness-plan.js"
(function(root, factory){
  if(typeof module === "object" && module.exports) module.exports = factory();
  else root.FitnessPlan = factory();
})(typeof self !== "undefined" ? self : this, function(){
  "use strict";
  const pad = n => String(n).padStart(2,"0");
  const DOW = ["日","一","二","三","四","五","六"];
  const parseYMD = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); if(!m) return null; const t = new Date(+m[1], +m[2]-1, +m[3]); return t.getMonth() === +m[2]-1 ? t : null; };
  const ymd = t => `${t.getFullYear()}-${pad(t.getMonth()+1)}-${pad(t.getDate())}`;
  const clone = o => JSON.parse(JSON.stringify(o));

  // 課表只存標準週(第 2、4 週),各週差異寫在 weeks[n].adjust,顯示時才套用
  const DEFAULT_FITNESS = {
    status:"active", source:"user_confirmed", confirmedAt:"2026-10-22",
    name:"30 天健身衝刺", startDate:"2026-10-26", lengthDays:30, standardWeek:"2",
    weeklySteps:"55000–60000",
    dailyTask:"起床上完廁所後量體重",
    dayTypes:{
      lift:{label:"重訓日", kcal:2200, protein:160, fat:60, carbs:255, steps:"6000–7000"},
      run:{label:"跑步日", kcal:2100, protein:160, fat:60, carbs:230, steps:"10000"},
      rest:{label:"休息日", kcal:2000, protein:160, fat:60, carbs:205, steps:"10000 以上"}
    },
    schedule:{"0":"rest","1":"chest","2":"run","3":"back","4":"run","5":"legs","6":"rest"},   // key = getDay()
    sessions:{
      chest:{type:"lift", short:"胸", brief:"胸肩三頭", title:"胸＋肩＋三頭＋腹", note:"順序不可調換，胸一定要先練", exercises:[
        {id:"bench", name:"槓鈴平板臥推", sets:3, reps:"6–8", rest:"2–3 分"},
        {id:"incline-db", name:"上斜啞鈴臥推", sets:3, reps:"8–12", rest:"2 分"},
        {id:"pec-deck", name:"蝴蝶機夾胸", sets:2, reps:"12–15", rest:"90 秒"},
        {id:"lateral", name:"側平舉", sets:3, reps:"12–20", rest:"60 秒"},
        {id:"db-press", name:"啞鈴肩推", sets:2, reps:"8–12", rest:"90 秒"},
        {id:"pushdown", name:"繩索三頭下壓", sets:3, reps:"10–15", rest:"60 秒"},
        {id:"cable-crunch", name:"繩索捲腹", sets:3, reps:"10–15", rest:"60 秒"}]},
      run:{type:"run", short:"跑", brief:"5 km 輕鬆跑", title:"5 km 輕鬆跑", note:"配速約 6:30–7:00/km,以跑的時候能講話為準", exercises:[]},
      back:{type:"lift", short:"背", brief:"背二頭", title:"背＋二頭＋腹", exercises:[
        {id:"pulldown", name:"滑輪下拉", sets:3, reps:"8–12", rest:"2 分"},
        {id:"chest-row", name:"胸靠式划船", sets:3, reps:"8–12", rest:"2 分"},
        {id:"seated-row", name:"坐姿划船", sets:2, reps:"10–12", rest:"90 秒"},
        {id:"reverse-fly", name:"反向飛鳥", sets:2, reps:"12–20", rest:"60 秒"},
        {id:"db-curl", name:"啞鈴彎舉(左右分開)", sets:3, reps:"10–12", rest:"60 秒"},
        {id:"hammer", name:"槌式彎舉", sets:2, reps:"10–15", rest:"60 秒"},
        {id:"knee-raise", name:"懸垂屈膝抬腿", sets:3, reps:"10–15", rest:"60 秒"},
        {id:"cable-crunch", name:"繩索捲腹", sets:2, reps:"10–15", rest:"60 秒"}]},
      legs:{type:"lift", short:"腿胸", brief:"腿胸", title:"下肢＋胸＋腹", exercises:[
        {id:"squat", name:"深蹲", sets:3, reps:"6–10", rest:"2–3 分"},
        {id:"rdl", name:"羅馬尼亞硬舉", sets:3, reps:"8–10", rest:"2 分"},
        {id:"leg-press", name:"腿推", sets:2, reps:"10–12", rest:"2 分"},
        {id:"leg-curl", name:"腿彎舉", sets:2, reps:"10–15", rest:"90 秒"},
        {id:"incline-machine", name:"上斜機械胸推", sets:4, reps:"8–12", rest:"2 分"},
        {id:"ab-wheel", name:"健腹輪", sets:3, reps:"6–12", rest:"60 秒"}]},
      rest:{type:"rest", short:"休", brief:"休息", title:"休息", note:"走路達到步數", exercises:[]}
    },
    weeks:{
      "1":{reserve:"2–3", adjust:[
        {session:"chest", ex:"cable-crunch", sets:2},
        {session:"back", ex:"knee-raise", sets:2}, {session:"back", ex:"cable-crunch", skip:true},
        {session:"legs", ex:"incline-machine", sets:2}, {session:"legs", ex:"ab-wheel", sets:2}]},
      "2":{reserve:"1–2", adjust:[]},
      "3":{reserve:"1–2", adjust:[{session:"chest", ex:"bench", sets:4}, {session:"chest", ex:"pec-deck", sets:3}]},
      "4":{reserve:"1–2", adjust:[]}
    },
    tips:{
      lift:"每一組都做到次數上限，下次槓鈴加 2.5 kg、啞鈴每邊加 1–2 kg。第 1 週先找出每個動作的起始重量",
      dinner:["蛋白質一份要夠，一個手掌大、一根手指厚，雞腿、雞胸、魚或豬里肌，熟重 150–200 g",
              "飯 1–1.5 碗，練腿或跑步日 1.5 碗，休息日 1 碗",
              "蔬菜至少兩樣，選滷、烤、蒸，不選炸"],
      sundayCheck:"週平均體重下降 0.4–0.8 kg 且腰圍變小 → 維持;下降不到 0.3 kg → 每天多走 2000 步;下降超過 1 kg(第 1 週除外)或力量退步 → 每天加 150 kcal",
      sundayMeasure:"早上量腰圍(肚臍那一圈)、拍正面和側面照",
      weekendMeal:"週末其中一餐是放縱餐，不算熱量，吃到七八分飽"
    }
  };

  // ---------- 推播提醒 ----------
  // fitness.reminders:[{id, time:"HH:MM", days:[0-6], type, enabled}],時間一律是台灣時間(Asia/Taipei)
  const TIME_ZONE = "Asia/Taipei";
  const REMINDER_TYPES = {
    morning:"早安量體重", preworkout:"練前補碳水", dinner:"晚餐三件事", night:"睡前檢查", weekly:"每週檢查"
  };
  const EVERY_DAY = [0,1,2,3,4,5,6];
  const DEFAULT_REMINDERS = [
    {id:"r-morning", time:"09:45", days:EVERY_DAY, type:"morning", enabled:true},
    {id:"r-preworkout", time:"17:00", days:[1,3,5], type:"preworkout", enabled:true},
    {id:"r-dinner", time:"18:30", days:EVERY_DAY, type:"dinner", enabled:true},
    {id:"r-night", time:"23:30", days:EVERY_DAY, type:"night", enabled:true},
    {id:"r-weekly", time:"10:00", days:[0], type:"weekly", enabled:true}
  ];

  // ---------- 飲食 ----------
  // fitness.presets:固定餐(目前只有固定早午餐),從 startDate 起每天自動計入，不寫進紀錄
  // fitness.foods:常吃清單 [{id, name, kcal, protein, fat?, carbs?}]
  const FOOD_SOURCES = {label:"包裝標示", estimate:"估計", tentative:"暫估，待確認"};
  const DEFAULT_PRESETS = [{id:"brunch", name:"固定早午餐", items:[
    {id:"burger", name:"益活雞力能量堡", kcal:202, protein:16, fat:4.1, carbs:25.2, source:"label"},
    {id:"egg-whole", name:"茶葉蛋 2 顆(整顆)", kcal:144, protein:12.6, fat:9.6, carbs:1.2, source:"estimate"},
    {id:"egg-white", name:"茶葉蛋 3 顆(只吃蛋白)", kcal:51, protein:10.8, fat:0.3, carbs:0.6, source:"estimate"},
    {id:"milk", name:"蛋白牛奶 1 瓶", kcal:200, protein:20, fat:5, carbs:20, source:"tentative"}
  ]}];

  function defaultFitness(){ return Object.assign(clone(DEFAULT_FITNESS), {reminders: clone(DEFAULT_REMINDERS), presets: clone(DEFAULT_PRESETS), foods: []}); }
  // 舊資料沒有 fitness(或缺 reminders / presets / foods)時補上預設值；回傳 true 代表有補，呼叫端要存檔
  function ensureFitness(s){
    if(!(s.fitness && typeof s.fitness === "object" && s.fitness.sessions)){ s.fitness = defaultFitness(); return true; }
    let added = false;
    if(!Array.isArray(s.fitness.reminders)){ s.fitness.reminders = clone(DEFAULT_REMINDERS); added = true; }
    if(!Array.isArray(s.fitness.presets)){ s.fitness.presets = clone(DEFAULT_PRESETS); added = true; }
    if(!Array.isArray(s.fitness.foods)){ s.fitness.foods = []; added = true; }
    return added;
  }

  // 某一天吃了什麼：固定早午餐(從 startDate 起自動)+ 當天紀錄 log = {meals, brunchSkipped, brunchOff}
  const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const round1 = n => Math.round(n * 10) / 10;
  function dietDay(F, log, date){
    log = log || {};
    const start = F && parseYMD(F.startDate);
    const auto = !!start && Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) >= Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const preset = ((F && F.presets) || [])[0] || null, skipped = !!log.brunchSkipped, off = log.brunchOff || [];
    const items = [];
    if(auto && preset) (preset.items || []).forEach(it=>items.push(Object.assign({}, it, {auto:true, off: skipped || off.includes(it.id)})));
    (log.meals || []).forEach(m=>items.push(Object.assign({}, m, {auto:false, off:false})));
    const totals = {kcal:0, protein:0, fat:0, carbs:0};
    items.forEach(it=>{ if(!it.off) for(const k in totals) totals[k] += num(it[k]); });
    for(const k in totals) totals[k] = round1(totals[k]);
    const f = fitnessDay(F, date), targets = f ? {kcal: num(f.type.kcal), protein: num(f.type.protein)} : null;
    const left = targets ? {kcal: round1(targets.kcal - totals.kcal), protein: round1(targets.protein - totals.protein)} : null;
    return {auto, preset, skipped, items, totals, targets, left, start};
  }

  // 某一天的課表：第幾天/第幾週、類型、營養目標、套用該週調整後的動作。date 用本地時間的年月日
  function fitnessDay(F, date){
    const start = F && parseYMD(F.startDate); if(!start) return null;
    const len = F.lengthDays || 30;
    const day = Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 864e5) + 1;
    const phase = day < 1 ? "before" : day > len ? "after" : "active";
    const week = phase === "active" ? Math.min(4, Math.ceil(day/7)) : null;   // 第 29–30 天算第 4 週
    const wk = (F.weeks || {})[String(week || F.standardWeek)] || {};
    const key = (F.schedule || {})[String(date.getDay())], s = (F.sessions || {})[key]; if(!s) return null;
    const exercises = (s.exercises || []).map(e=>{
      const x = Object.assign({}, e);
      (wk.adjust || []).forEach(a=>{ if(a.session === key && a.ex === e.id){ if(a.skip) x.skip = true; if(a.sets){ x.from = e.sets; x.sets = a.sets; } } });
      return x;
    });
    return {phase, day, len, week, key, s, type: (F.dayTypes || {})[s.type] || {}, exercises, reserve: wk.reserve, dow: date.getDay(), start};
  }
  // 「第 3 天 · 第 1 週」/「衝刺倒數 4 天」/「衝刺已結束」
  const phaseLabel = f => f.phase === "active" ? `第 ${f.day} 天 · 第 ${f.week} 週` : f.phase === "before" ? `衝刺倒數 ${1 - f.day} 天` : "衝刺已結束";

  // 通知內容：依提醒類型和當天課表產生 {title, body}
  function reminderMessage(F, reminder, date){
    const f = fitnessDay(F, date), tips = (F && F.tips) || {};
    if(!f) return {title:"自律打卡表", body:"記得打卡"};
    const T = f.type, where = phaseLabel(f), today = `${T.label || ""}:${f.s.title}`;
    switch(reminder && reminder.type){
      case "morning":
        return {title:`早安，先量體重 · ${where}`, body:`${F.dailyTask || "起床上完廁所後量體重"}。今天${today},${T.kcal} kcal、蛋白質 ${T.protein} g`};
      case "preworkout":
        return {title:`練前吃點碳水 · ${where}`, body:`飯糰或地瓜＋香蕉。今天練：${f.s.title}`};
      case "dinner":
        return {title:`晚餐三件事 · ${where}`, body:(tips.dinner || []).map((t,i)=>`${i+1}. ${t}`).join("\n")};
      case "night":
        return {title:`睡前檢查 · ${where}`, body:`睡前補一份蛋白質、檢查今天步數有沒有到 ${T.steps || "目標"}、1 點前睡`};
      case "weekly":
        return {title:`每週檢查 · ${where}`, body:`${tips.sundayMeasure || "量腰圍、拍照"}。${tips.sundayCheck || ""}`};
      default:
        return {title:`打卡提醒 · ${where}`, body:`今天${today}`};
    }
  }

  // 某個時間點在台灣是幾年幾月幾號、星期幾、幾點幾分(推播腳本在 UTC 的機器上跑也正確)
  function taipeiParts(now){
    const p = {};
    new Intl.DateTimeFormat("en-US", {timeZone:TIME_ZONE, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23", weekday:"short"})
      .formatToParts(now).forEach(x=>{ p[x.type] = x.value; });
    const y = +p.year, m = +p.month, d = +p.day;
    return {y, m, d, dow: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(p.weekday), minutes: (+p.hour % 24) * 60 + +p.minute,
            dateKey: `${y}-${pad(m)}-${pad(d)}`, date: new Date(y, m-1, d)};
  }
  const timeToMinutes = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ""); return m ? +m[1] * 60 + +m[2] : null; };

  return {DOW, parseYMD, ymd, DEFAULT_FITNESS, DEFAULT_REMINDERS, REMINDER_TYPES, TIME_ZONE,
          defaultFitness, ensureFitness, fitnessDay, phaseLabel, reminderMessage, taipeiParts, timeToMinutes,
          FOOD_SOURCES, DEFAULT_PRESETS, dietDay};
});
