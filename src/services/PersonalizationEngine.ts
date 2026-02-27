import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';
dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ContactProfile {
  name: string;
  title?: string;
  company?: string;
  notes?: string;
}

export interface ProductInfo {
  name: string;
  pitch_headline?: string;
  pitch_body?: string;
  target_segment?: string;
}

export interface MessageSet {
  linkedin: string;
  email1: string;
  email2: string;
  email3: string;
  email_subject1: string;
  email_subject2: string;
  email_subject3: string;
}

// 核心 ROI 數據框架（用自己當案例）
const ROI_FRAMEWORK = `
【我們自己就是第零號客戶的數據】
- 用 AI-Sales 推廣 AI-Sales 本身，這封信就是實例
- 平均訊息生成時間：從 45 分鐘/人 降至 2 分鐘/人（省 95%）
- 個人化程度：針對職稱、產業、公司規模三維度客製
- Sequence 自動化：LinkedIn + Email 三封，間隔 D0/D3/D6/D9

【關鍵轉換機制（針對不同職稱）】
- CFO/財務長：強調可量化 ROI，用成本×時間的公式
- IT Director/CTO：強調技術架構、資安、整合可行性
- CEO/總經理：強調競爭優勢，用「你的競對已在用」框架
- VP Operations：強調流程效率，用具體時間節省量化
- 數位轉型經理：強調案例複製性，用「三步驟落地」框架

【強力 Closing 公式（Email 3 必用）】
不是「15分鐘通話」，而是：
→「我幫你的公司先跑一次 AI-Sales 模擬，免費給你看結果，
   如果數據不達標，我們不需要繼續談。」
這個 closing 的關鍵：風險全在賣方，買方零成本，
消除了「不知道值不值得花時間」的最大障礙。
`;

export async function generateMessageSet(contact: ContactProfile, product: ProductInfo): Promise<MessageSet> {
  const prompt = `你是一個頂尖的 B2B 銷售文案專家，專門服務台灣企業市場。

目標聯絡人:
- 姓名: ${contact.name}
- 職稱: ${contact.title || '未知'}
- 公司: ${contact.company || '未知'}
- 備注: ${contact.notes || '無'}

產品/服務:
- 名稱: ${product.name}
- 核心價值主張: ${product.pitch_headline || ''}
- 詳細說明: ${product.pitch_body || ''}
- 目標客群: ${product.target_segment || ''}

${ROI_FRAMEWORK}

【訊息生成要求】

請為這位聯絡人生成一套個人化外展訊息，必須包含：

1. **LinkedIn 初次訊息**（200字以內）
   - 開頭不用「您好」，直接從對方職稱/公司的具體痛點切入
   - 提一個讓他好奇的尖銳問題
   - 輕鬆語氣，像朋友而非銷售員
   - 不要提產品名稱，只聊痛點

2. **Email 1 主旨+正文**（引起興趣）
   - 主旨：數字開頭 或 問句，禁用「合作」「方案」等詞
   - 正文：150字，提一個對方產業的具體痛點數據，問他們有沒有這個問題

3. **Email 2 主旨+正文**（ROI 案例）
   - 主旨：「[公司名]做到了X，你們做得到嗎？」格式
   - 正文：200字，用數字說話，必須包含：省了多少時間/人力/成本，或增加了多少業績
   - 提「我們自己就是第零號客戶」的案例

4. **Email 3 主旨+正文**（強力 Closing）
   - 主旨：最後機會感，但不煽情
   - 正文：150字，用上面的「免費模擬 Closing」公式
   - CTA 必須是：「我幫你們公司先跑一次免費模擬，不達標不需要繼續談」
   - 附上具體行動：「回覆這封信，我三天內給你結果」

【硬性限制】
- 繁體中文
- 絕對不用「希望」「期待」「不知您是否有空」等被動語氣
- Email 3 不能只是「歡迎預約15分鐘通話」
- 每封訊息都要和對方職稱直接相關，不能通用

請以 JSON 格式回覆:
{
  "linkedin": "...",
  "email_subject1": "...",
  "email1": "...",
  "email_subject2": "...",
  "email2": "...",
  "email_subject3": "...",
  "email3": "..."
}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  // Strip markdown code blocks before parsing
  const cleaned = text.replace(/```(?:json)?\n?([\s\S]*?)```/g, '$1').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Failed to parse message set from Claude');

  return JSON.parse(jsonMatch[0]) as MessageSet;
}

export async function generateSingleMessage(
  contact: ContactProfile,
  product: ProductInfo,
  channel: 'linkedin' | 'email',
  step: number,
  previousContext?: string
): Promise<{ subject?: string; content: string }> {
  const prompt = `生成一則個人化${channel === 'linkedin' ? 'LinkedIn' : 'Email'}訊息。

聯絡人: ${contact.name}（${contact.title || ''}，${contact.company || ''}）
產品: ${product.name} - ${product.pitch_headline || ''}
這是第 ${step} 次接觸。
${previousContext ? `前次互動背景: ${previousContext}` : ''}
${step >= 3 ? '這是最後一封，請用「免費模擬 Closing」：幫對方公司先跑免費模擬，不達標不繼續談。' : ''}

${channel === 'email' ? '請以 JSON { "subject": "...", "content": "..." } 格式回覆。' : '請直接回覆訊息文字（不需JSON）。'}
訊息長度：LinkedIn 200字以內，Email 150字以內。繁體中文。主動語氣。`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  if (channel === 'email') {
    const cleaned = text.replace(/```(?:json)?\n?([\s\S]*?)```/g, '$1').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  }
  return { content: text.trim() };
}
