import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PERSONAS = [
  { id: 'skeptical_cfo', name: '林財務長', title: 'CFO', company: '台灣精密機械股份有限公司',
    trait: '對新工具非常謹慎，只關心 ROI 和導入成本。預算緊縮，需要很強的數據才會回覆。',
    reply_p: 0.10, demo_p: 0.05, convert_p: 0.02 },
  { id: 'interested_it_director', name: '陳資訊長', title: 'IT Director', company: '宏達電子零組件有限公司',
    trait: '對 AI 工具有興趣，正在評估企業 AI 轉型方案。積極尋找能展示的供應商。',
    reply_p: 0.35, demo_p: 0.20, convert_p: 0.08 },
  { id: 'busy_ceo', name: '王執行長', title: 'CEO', company: '台北智慧科技股份有限公司',
    trait: '超忙，每天 100 封郵件，很少回覆冷接觸。除非主旨非常吸引人才可能開信。',
    reply_p: 0.05, demo_p: 0.03, convert_p: 0.01 },
  { id: 'vp_operations', name: '張營運副總', title: 'VP Operations', company: '南部製造業聯合集團',
    trait: '正在處理業務開發效率問題，對能具體解決問題的工具感興趣。注重實用性。',
    reply_p: 0.25, demo_p: 0.15, convert_p: 0.05 },
  { id: 'digital_manager', name: '黃數位轉型經理', title: 'Digital Transformation Manager', company: '傳統中型製造業',
    trait: '負責推動公司數位化，主動找解決方案。對 AI 有基本了解，容易被好案例說服。',
    reply_p: 0.40, demo_p: 0.25, convert_p: 0.10 },
];

const ROI_FRAMEWORK = `
【核心 ROI 數據（我們自己是第零號客戶）】
- 訊息生成時間：45 分鐘/人 → 2 分鐘/人（省 95%）
- 個人化維度：職稱 × 產業 × 公司規模
- Sequence：LinkedIn + Email ×3（D0/D3/D6/D9）

【強力 Closing（Email 3 必用）】
CTA：「我幫你們公司先跑一次免費 AI-Sales 模擬，不達標不需要繼續談。回覆這封信，三天內給你結果。」
原理：風險在賣方，買方零成本，消除最大障礙。

【職稱對應痛點】
CFO：BD 人力成本 × ROI 可量化
IT Director：技術整合、資安、架構可行性
CEO：競爭優勢、市場速度
VP Operations：流程效率、時間節省量化
數位轉型經理：案例複製性、三步驟落地
`;

function extractSection(text: string, tag: string): string {
  const m = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : '';
}

function safeScore(text: string): { score: number; comment: string } {
  const sm = text.match(/["']?score["']?\s*:\s*(\d+)/);
  const cm = text.match(/["']?comment["']?\s*:\s*["']([^"']{5,})/);
  return {
    score: sm ? parseInt(sm[1]) : 60,
    comment: cm ? cm[1] : text.slice(0, 100).replace(/\n/g, ' '),
  };
}

async function generateMsgs(persona: typeof PERSONAS[0]) {
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 1800,
    messages: [{ role: 'user', content: `為以下聯絡人生成個人化外展訊息：
聯絡人：${persona.name}（${persona.title}，${persona.company}）
個性：${persona.trait}
產品：AI-Sales — B2B 銷售自動化平台，AI 針對每位聯絡人生成個人化訊息序列

${ROI_FRAMEWORK}

用 XML tag 輸出四則繁體中文訊息：
<linkedin>LinkedIn初次訊息，200字，從職稱痛點切入，不提產品名稱</linkedin>
<email1>Email 1：數字開頭的主旨 + 150字正文，提產業具體痛點數據</email1>
<email2>Email 2：ROI案例主旨 + 200字正文，包含「我們自己是第零號客戶」案例 + 量化數據</email2>
<email3>Email 3：最後機會主旨 + 150字正文，必須用「免費模擬 Closing」公式，CTA是「回覆這封信，三天內給你結果」</email3>` }],
  });
  const t = res.content[0].type === 'text' ? res.content[0].text : '';
  return { linkedin: extractSection(t, 'linkedin'), email1: extractSection(t, 'email1'), email2: extractSection(t, 'email2'), email3: extractSection(t, 'email3') };
}

async function evalQuality(persona: typeof PERSONAS[0], msgs: Record<string, string>) {
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001', max_tokens: 200,
    messages: [{ role: 'user', content: `你是 ${persona.name}（${persona.title}，${persona.company}）。個性：${persona.trait}
收到訊息：
LinkedIn: ${msgs.linkedin?.slice(0, 150)}
Email1: ${msgs.email1?.slice(0, 150)}
Email3: ${msgs.email3?.slice(0, 200)}
評估（0-100，越高越想回覆）+一句評語。{"score":<數字>,"comment":"<評語>"}` }],
  });
  const t = res.content[0].type === 'text' ? res.content[0].text : '';
  return safeScore(t);
}

function simulate(persona: typeof PERSONAS[0], quality: number) {
  const m = 0.5 + (quality / 100);
  const replied = Math.random() < persona.reply_p * m;
  const demo = replied && Math.random() < persona.demo_p * m;
  const converted = demo && Math.random() < persona.convert_p * m;
  return { replied, demo, converted, status: converted ? 'converted' : demo ? 'demo_booked' : replied ? 'replied' : 'no_reply' };
}

// POST /api/simulation/run
router.post('/run', async (_req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const results = [];
    for (const p of PERSONAS) {
      const msgs = await generateMsgs(p);
      const { score, comment } = await evalQuality(p, msgs);
      const sim = simulate(p, score);
      results.push({ ...p, score, comment, ...sim, msgs });
    }

    const total = results.length;
    const nReplied = results.filter(r => r.replied).length;
    const nDemo = results.filter(r => r.demo).length;
    const nConverted = results.filter(r => r.converted).length;
    const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / total);
    const reply_rate = Math.round((nReplied / total) * 100);
    const demo_rate = Math.round((nDemo / total) * 100);
    const conversion_rate = Math.round((nConverted / total) * 100);

    // 使用期望值（非隨機骰子）判定 pass，消除 5 persona 樣本的高方差
    const expectedReplyRate = results.reduce((s, r) => {
      const m = 0.5 + (r.score / 100);
      return s + (r as any).reply_p * m;
    }, 0) / total * 100;
    const expectedDemoRate = results.reduce((s, r) => {
      const m = 0.5 + (r.score / 100);
      return s + (r as any).reply_p * (r as any).demo_p * m * m;
    }, 0) / total * 100;
    const expectedConvRate = results.reduce((s, r) => {
      const m = 0.5 + (r.score / 100);
      return s + (r as any).reply_p * (r as any).demo_p * (r as any).convert_p * m * m * m;
    }, 0) / total * 100;
    const pass = expectedReplyRate >= 15 && expectedDemoRate >= 5 && expectedConvRate >= 0.3;
    const verdict = pass ? '🚀 GO' :
      expectedReplyRate >= 15 ? '⚠️ HOLD — 回覆率達標，需優化 Demo/成交 pitch' :
      '🛑 NO-GO — 訊息品質不足';

    const report = {
      run_at: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      product: 'AI-Sales',
      pass,
      verdict,
      total_personas: total,
      avg_quality: avgScore,
      reply_rate, demo_rate, conversion_rate,
      targets: { reply: 15, demo: 5, convert: 0.3 },
      expected: { reply_rate: Math.round(expectedReplyRate * 10) / 10, demo_rate: Math.round(expectedDemoRate * 10) / 10, conv_rate: Math.round(expectedConvRate * 100) / 100 },
      results: results.map(r => ({
        persona_id: r.id, name: r.name, title: r.title, company: r.company,
        score: r.score, comment: r.comment, status: r.status,
        replied: r.replied, demo: r.demo, converted: r.converted,
      })),
    };

    // Save report
    const dir = '/root/Projects/ai-sales/simulation/reports';
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${new Date().toISOString().slice(0, 10)}.json`), JSON.stringify(report, null, 2));

    res.json({ success: true, ...report });
  } catch (err: unknown) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

// GET /api/simulation/latest
router.get('/latest', (_req: Request, res: Response) => {
  try {
    const dir = '/root/Projects/ai-sales/simulation/reports';
    if (!fs.existsSync(dir)) return res.json({ success: true, report: null });
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().reverse();
    if (!files.length) return res.json({ success: true, report: null });
    const report = JSON.parse(fs.readFileSync(path.join(dir, files[0]), 'utf-8'));
    res.json({ success: true, report });
  } catch (err: unknown) {
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

export default router;
