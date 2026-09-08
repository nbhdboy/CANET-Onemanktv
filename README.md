# K歌 +1

一個人想唱 KTV？找另一個也只有一個人的人。**兩個人，剛剛好。**

這是依 MVP PRD 建立的 Mobile-first PWA：註冊、Profile、發需求、申請、接受鎖定一人、第一次免費／之後 NT$50、付款狀態機、媒合後才解鎖聯絡方式、官方訂位導流、互評、檢舉／封鎖、通知與 Admin。

## 本機啟動

```bash
npm install
npm run dev
```

瀏覽器打開 [http://localhost:3000](http://localhost:3000)。

## 測試完整媒合流程

1. 用兩個不同 Email 各註冊一個帳號（建議兩個瀏覽器或無痕視窗）。
2. 第一個帳號用 `admin@kplus1.local` 註冊會自動成為 Admin。
3. 完成暱稱、18+ 與至少一種聯絡方式。
4. A 發起唱歌需求 → 出現在首頁 Feed。
5. B 點「我也想唱 🎤」。
6. A 在「媒合」接受。Request 會進入 `MATCH_PENDING`，其他人無法再被接受。
7. 第一次媒合雙方 NT$0；從第二次起，後台設定的服務費（預設 NT$50）需完成 MOCK 付款。
8. 雙方條件完成後才會 `MATCHED`，此時才看得到對方 LINE / IG / Threads。
9. 前往該品牌官方訂位頁（URL 存在資料庫，Admin 可改）。
10. 活動結束後雙方互評。

## 重要原則

- 公開 Profile **不會**包含真實姓名或聯絡方式。
- 聯絡方式只在 Server Action `unlockContactsAction` 於 MATCHED／COMPLETED 且付款完成後回傳。
- 付款成功不能由前端改狀態；MOCK 也走伺服器驗證。LIVE 請打 `/api/payments/webhook`。
- 同一 Request 只能有一位 +1，接受在 SQLite transaction 內鎖定。
- 付款逾時（預設 15 分鐘）會把名額釋放回 OPEN，且不消耗第一次免費額度。
- 服務費、免費次數、逾時分鐘、Booking URL 都在 Admin／`platform_config`，不寫死在元件裡。

## 技術

- Next.js + React + TypeScript + Tailwind CSS
- 本機資料庫：SQLite（`data/kplus1.db`）
- 時區：DB 存 UTC，畫面顯示 `Asia/Taipei`
- 上線可套用 `supabase/migrations/00001_init.sql` 的 PostgreSQL + RLS

## 環境變數

複製 `.env.example` 為 `.env.local`。
