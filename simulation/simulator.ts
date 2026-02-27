import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
dotenv.config({ path: '/root/Projects/ai-sales/.env' });

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function extractSection(text: string, tag: string): string {
  const m = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return m ? m[1].trim() : '';
}

function safeParseScore(text: string): { score: number; comment: string } {
  const scoreM = text.match(/["']?score["']?\s*:\s*(\d+)/);
  const commentM = text.match(/["']?comment["']?\s*:\s*["']([^"']+)["']/);
  return {
    score: scoreM ? parseInt(scoreM[1]) : 60,
    comment: commentM ? commentM[1] : text.slice(0, 80).replace(/\n/g, ' '),
  };
}

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

const PRODUCT = {
  name: 'AI-Sales',
  pitch: 'B2B 銷售自動化平台：AI 針對每位聯絡人職稱和公司痛點生成個人化訊息序列（LinkedIn + Email × 3），Ghost Mode 安全審核後發送，全程追蹤回覆率、Demo率、成交率。',
};

async function generateMessages(persona: typeof PERSONAS[0]) {
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: `為以下聯絡人生成個人化外展訊息：
聯絡人：${persona.name}（${persona.title}，${persona.company}）
個性：${persona.trait}
產品：${PRODUCT.name} — ${PRODUCT.pitch}

請用繁體中文生成以下四則訊息，用 XML tag 包住每個訊息：
<linkedin>LinkedIn初次訊息，150字，輕鬆找共鳴，不硬銷售</linkedin>
<email1>Email第一封，引起興趣，提一個尖銳問題</email1>
<email2>Email第二封，提具體數據或案例，展示ROI</email2>
<email3>Email第三封，最後機會，清晰CTA：15分鐘通話</email3>` }],
  });
  const text = res.content[0].type === 'text' ? res.content[0].text : '';
  return {
    linkedin: extractSection(text, 'linkedin'),
    email1: extractSection(text, 'email1'),
    email2: extractSection(text, 'email2'),
    email3: extractSection(text, 'email3'),
  };
}

async function evaluateQuality(persona: typeof PERSONAS[0], msgs: ReturnType<typeof extractSection> extends string ? never : { linkedin: string; email1: string; email3: string }) {
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [{ role: 'user', content: `你是 ${persona.name}（${persona.title}，${persona.company}）。個性：${persona.trait}

收到訊息：
LinkedIn: ${(msgs as Record<string, string>).linkedin?.slice(0, 150)}
Email1: ${(msgs as Record<string, string>).email1?.slice(0, 150)}

請用純數字給分（0-100，越高越想回覆），再加一句中文評語。
格式：{"score": <數字>, "comment": "<評語>"}` }],
  });
  const text = res.content[0].type === 'text' ? res.content[0].text : '';
  return safeParseScore(text);
}

function simulate(persona: typeof PERSONAS[0], quality: number) {
  const m = 0.5 + (quality / 100);
  const replied = Math.random() < persona.reply_p * m;
  const demo = replied && Math.random() < persona.demo_p * m;
  const converted = demo && Math.random() < persona.convert_p * m;
  return {
    replied, demo, converted,
    status: converted ? 'converted' : demo ? 'demo_booked' : replied ? 'replied' : 'no_reply',
  };
}

async function run() {
  console.log('='.repeat(60));
  console.log('AI-Sales 虛擬客戶模擬器 v1.0');
  console.log(`產品: ${PRODUCT.name}  |  ${new Date().toISOString().slice(0, 10)}`);
  console.log('='.repeat(60));

  const results = [];
  for (const p of PERSONAS) {
    process.stdout.write(`\n[${p.id}] 模擬 ${p.name}... `);
    const msgs = await generateMessages(p);
    const { score, comment } = await evaluateQuality(p, msgs as never);
    const sim = simulate(p, score);
    results.push({ ...p, score, comment, ...sim, msgs });
    console.log(`品質:${score}/100  →  ${sim.status}`);
    console.log(`  評語: ${comment}`);
  }

  const total = results.length;
  const nReplied = results.filter(r => r.replied).length;
  const nDemo = results.filter(r => r.demo).length;
  const nConverted = results.filter(r => r.converted).length;
  const avgScore = Math.round(results.reduce((s, r) => s + r.score, 0) / total);
  const replyRate = Math.round((nReplied / total) * 100);
  const demoRate = Math.round((nDemo / total) * 100);
  const convRate = Math.round((nConverted / total) * 100);

  console.log('\n' + '='.repeat(60));
  console.log('模擬報告');
  console.log('='.repeat(60));
  console.log(`虛擬客戶: ${total}  |  平均訊息品質: ${avgScore}/100`);
  console.log('');
  console.log(`回覆率: ${replyRate}%  (目標 >15%)  ${replyRate >= 15 ? '✅ 達標' : '❌ 未達標'}`);
  console.log(`Demo率: ${demoRate}%  (目標 >5%)   ${demoRate >= 5  ? '✅ 達標' : '❌ 未達標'}`);
  console.log(`成交率: ${convRate}%  (目標 >1%)   ${convRate >= 1  ? '✅ 達標' : '❌ 未達標'}`);
  console.log('');

  for (const r of results) {
    const icon = r.status === 'converted' ? '🎉' : r.status === 'demo_booked' ? '📅' : r.status === 'replied' ? '💬' : '⚪';
    console.log(`  ${icon} ${r.name} (${r.title}): ${r.status} | 品質:${r.score}/100`);
  }

  const verdict =
    replyRate >= 15 && demoRate >= 5 && convRate >= 1 ? '🚀 GO — 訊息品質達到推廣標準' :
    replyRate >= 15 ? '⚠️  HOLD — 回覆率達標，需優化 Demo/成交 pitch' :
    '🛑 NO-GO — 訊息品質不足，需重新設計 pitch';

  console.log('\n' + '='.repeat(60));
  console.log(`總評: ${verdict}`);
  console.log('='.repeat(60));

  const { mkdirSync, writeFileSync } = await import('fs');
  const dir = '/root/Projects/ai-sales/simulation/reports';
  mkdirSync(dir, { recursive: true });
  const path = `${dir}/${new Date().toISOString().slice(0, 10)}.json`;
  writeFileSync(path, JSON.stringify({
    run_at: new Date().toISOString(), product: PRODUCT.name,
    total, avg_quality: avgScore, reply_rate: replyRate, demo_rate: demoRate, conversion_rate: convRate,
    verdict, targets: { reply: 15, demo: 5, convert: 1 }, results,
  }, null, 2));
  console.log(`\n報告存至: ${path}`);
}

run().catch(console.error);
