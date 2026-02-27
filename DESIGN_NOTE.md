# Design Note: AI-Sales Platform

**版本**: 1.0.0  
**日期**: 2026-02-27  
**作者**: Claude Code (claude-sonnet-4-6)  
**狀態**: Production

---

## 1. 系統定位

AI-Sales 是「AI 企業賦能飛輪」的第③環，負責將已開發完成的產品（AI-PM `launch` 階段）推向 B2B 市場，並將轉換數據回報至 AI-PM（推進到 `validate` 階段）。

```
飛輪流程：
① DEMEX（爆款探索）→ ② OpenClaw（快速開發）→ ③ AI-Sales（自動推廣）
→ ④ 外部驗證（客戶買單）→ ⑤ 學習回饋 → 回到①
```

**核心命題**：用 AI-Sales 賣 AI-Sales 本身，過程即案例研究。

---

## 2. 架構設計

### 部署
- **Droplet C** (159.223.72.200), port 3003 (backend) + 3004 (frontend)
- **域名**: https://ai-sales.twcio.com
- **資料庫**: Supabase (fiastlgtmnvbcbcvhhbt，與 DEMEX/ChainReaction 共用)

### 技術棧
| 層 | 技術 |
|---|---|
| Backend | Node.js + Express 5 + TypeScript |
| Frontend | Next.js 15 + Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| AI | Claude claude-sonnet-4-6 (個人化訊息生成) |
| 部署 | PM2 + nginx + Let's Encrypt |

---

## 3. 核心模組

### 3.1 CampaignManager
- 建立/管理行銷活動
- 接收 AI-PM webhook（`launch` 階段觸發）
- Campaign 狀態機：`draft → active → paused → ended`

### 3.2 TargetFinder
- 整合 ChainReaction HeadhunterService 尋找目標聯絡人
- 整合 DEMEX API 讀取 GO 機會卡

### 3.3 PersonalizationEngine
- 呼叫 Claude claude-sonnet-4-6 API
- 依聯絡人職稱/公司/產業痛點，一次生成完整訊息組：
  - LinkedIn 初次訊息（300 字以內）
  - Email 1 主旨+正文（引起興趣）
  - Email 2 主旨+正文（案例+數據）
  - Email 3 主旨+正文（最後 CTA）

### 3.4 SequenceManager
- Day 0: LinkedIn（Ghost Mode）
- Day 3: Email 1
- Day 6: Email 2
- Day 9: Email 3
- 收到回覆即中止後續序列

### 3.5 LinkedIn Ghost Mode（關鍵設計決策）
**問題**：LinkedIn 自動化有帳號封禁風險  
**解法**：人機協作模式
1. 系統生成個人化訊息
2. 使用者審核/微調
3. 點擊「開啟 LinkedIn」→ 新分頁開啟對方 Profile
4. 使用者手動複製貼上發送
5. 點擊「標記已發送」→ 系統繼續排程

### 3.6 AipmBridge（雙向整合）
- **接收**：`POST /api/webhooks/aipm`（AI-PM `launch` 觸發）→ 自動建立 Campaign
- **回報**：成交後 `POST` 到 AI-PM，推進專案到 `validate`

---

## 4. 資料模型

```sql
sales_contacts          -- CRM：聯絡人基本資料
sales_campaigns         -- 行銷活動（對應一個產品）
sales_campaign_contacts -- 活動中聯絡人進度狀態
sales_touchpoints       -- 單次觸達紀錄（含訊息內容）
sales_responses         -- 回覆紀錄（含情感分析）
```

### 聯絡人狀態機
```
pending → in_sequence → replied → demo_booked → converted
                     └→ lost
```

---

## 5. API 端點

| Method | Path | 說明 |
|---|---|---|
| GET | /api/campaigns | 列出所有活動（含 stats） |
| POST | /api/campaigns | 建立活動 |
| GET | /api/campaigns/:id | 活動詳情 |
| POST | /api/campaigns/:id/contacts | 手動新增聯絡人 |
| POST | /api/campaigns/:id/targets | ChainReaction 自動找人 |
| POST | /api/campaigns/:id/personalize | Claude 生成訊息序列 |
| GET | /api/campaigns/:id/queue | 待審訊息佇列 |
| POST | /api/campaigns/:id/queue/:id/approve | 核准訊息 |
| POST | /api/campaigns/:id/queue/:id/sent | 標記 LinkedIn 已發送 |
| POST | /api/campaigns/:id/contacts/:id/respond | 記錄回應（replied/demo/won/lost） |
| GET | /api/analytics/overview | 全平台 KPI |
| GET | /api/demex/go-cards | DEMEX GO 機會卡 |
| POST | /api/demex/create-campaign | 從 GO 卡建立 Campaign |
| POST | /api/webhooks/aipm | AI-PM launch 觸發 |
| POST | /api/webhooks/email-inbound | SendGrid inbound parse |

---

## 6. 整合地圖

```
DEMEX (localhost:3001)         → GET /api/opportunities?verdict=GO
ChainReaction (localhost:5000) → POST /api/headhunter
AI-PM (localhost:3002)         ↔ 雙向 webhook（launch/validate）
tg-claude-bot (178.128.125.69:7210) → POST /seeding（Telegram 群組）
```

---

## 7. 成功指標

| 指標 | 目標門檻 | 達標意義 |
|---|---|---|
| 回覆率 | > 15% | 需求確認（痛點打中） |
| Demo 預約率 | > 5% | 爆款候選 |
| 成交率 | > 1% | 正式爆款 → AI-PM validate |

---

## 8. 已知限制 / 待優化

- [ ] Email 自動發送尚未接入（需 SendGrid API key）
- [ ] LinkedIn Ghost Mode 需手動操作（設計決策，非缺陷）
- [ ] Telegram seeding endpoint 在 tg-claude-bot 尚未建立
- [ ] Email inbound parse webhook 尚未完整配對聯絡人
- [ ] ChainReaction HeadhunterService endpoint 待確認實際路徑

---

## 9. 虛擬客戶模擬器

見 `simulation/` 目錄。模擬器用 Claude API 扮演不同角色的虛擬客戶（懷疑型 CFO、感興趣的 IT 主管、無回應的 CEO），測試個人化訊息品質與轉換率預測。

---

## 10. 部署紀錄

| 日期 | 事件 |
|---|---|
| 2026-02-27 | v1.0.0 初始部署，HTTPS 上線 |
| 2026-02-27 | 加入 portal.twcio.com 監控 |
| 2026-02-27 | AI-PM SERVICES 列表更新 |
