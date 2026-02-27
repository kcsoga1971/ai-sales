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

請為這位聯絡人生成一套個人化外展訊息，包含:
1. LinkedIn 初次聯絡訊息（300字以內，輕鬆、不硬銷售，找共鳴點）
2. Email 第一封（主旨 + 正文，引起興趣，提出一個尖銳問題）
3. Email 第二封（主旨 + 正文，提供具體案例或數據，加深價值）
4. Email 第三封（主旨 + 正文，最後機會，清晰 CTA：15分鐘通話）

原則:
- 用繁體中文，語氣專業但不官僚
- 每封訊息都要個人化，提到對方職稱/產業的具體痛點
- 不要用制式開頭如「您好，我是...」
- LinkedIn 訊息要像朋友之間，不像廣告

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
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
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

${channel === 'email' ? '請以 JSON { "subject": "...", "content": "..." } 格式回覆。' : '請直接回覆訊息文字（不需JSON）。'}
訊息長度：LinkedIn 200字以內，Email 150字以內。繁體中文。`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  if (channel === 'email') {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  }
  return { content: text.trim() };
}
