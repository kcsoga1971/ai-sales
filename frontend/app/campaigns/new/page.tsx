'use client';
import { useState, useEffect } from 'react';
import { api, type DemexCard } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function NewCampaignPage() {
  const router = useRouter();
  const [goCards, setGoCards] = useState<DemexCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<string>('');
  const [form, setForm] = useState({ name: '', product_name: '', pitch_headline: '', pitch_body: '', target_segment: '' });
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'demex' | 'manual'>('demex');

  useEffect(() => {
    api.getGoCards().then(r => { if (r.success) setGoCards(r.cards); });
  }, []);

  async function handleDemexCreate() {
    if (!selectedCard) return;
    setLoading(true);
    const r = await api.createFromCard(selectedCard);
    if (r.success) router.push(`/campaigns/${r.campaign.id}`);
    setLoading(false);
  }

  async function handleManualCreate() {
    if (!form.name || !form.product_name) return;
    setLoading(true);
    const r = await api.createCampaign(form);
    if (r.success) router.push(`/campaigns/${r.campaign.id}`);
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-6">新建 Campaign</h1>

      <div className="flex gap-3 mb-6">
        <button onClick={() => setMode('demex')} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === 'demex' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
          從 DEMEX GO 卡建立
        </button>
        <button onClick={() => setMode('manual')} className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === 'manual' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
          手動建立
        </button>
      </div>

      {mode === 'demex' ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-4">選擇一個 DEMEX GO 機會卡作為推廣標的</p>
          {goCards.length === 0 ? (
            <p className="text-gray-400 text-sm">目前沒有 GO 機會卡。請先在 DEMEX 完成探索。</p>
          ) : (
            <div className="space-y-2 mb-4">
              {goCards.map(card => (
                <label key={card.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedCard === card.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="card" value={card.id} checked={selectedCard === card.id} onChange={() => setSelectedCard(card.id)} className="mt-1" />
                  <div>
                    <p className="font-medium text-sm">{card.domain || card.need}</p>
                    <p className="text-xs text-gray-400">{card.description || ''}</p>
                    {card.opportunity_score && <p className="text-xs text-indigo-600 mt-1">機會分數: {card.opportunity_score.toFixed(1)}</p>}
                  </div>
                </label>
              ))}
            </div>
          )}
          <button onClick={handleDemexCreate} disabled={!selectedCard || loading} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {loading ? '建立中...' : '從此 GO 卡建立 Campaign'}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          {[
            { key: 'name', label: 'Campaign 名稱 *', placeholder: 'e.g. AI-QC 台灣製造業推廣' },
            { key: 'product_name', label: '產品/服務名稱 *', placeholder: 'e.g. AI-QC-ISO 認證管理系統' },
            { key: 'pitch_headline', label: '核心價值主張', placeholder: '一句話說明你的產品解決什麼問題' },
            { key: 'target_segment', label: '目標客群', placeholder: 'e.g. 台灣中小型製造業，50-300人' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
              <input value={form[f.key as keyof typeof form]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.placeholder} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">詳細說明</label>
            <textarea value={form.pitch_body} onChange={e => setForm({ ...form, pitch_body: e.target.value })}
              rows={4} placeholder="產品功能、差異化、案例..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <button onClick={handleManualCreate} disabled={!form.name || !form.product_name || loading} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {loading ? '建立中...' : '建立 Campaign'}
          </button>
        </div>
      )}
    </div>
  );
}
