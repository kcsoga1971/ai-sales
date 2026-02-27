'use client';
import { useEffect, useState } from 'react';
import { api, type Campaign } from '@/lib/api';
import Link from 'next/link';

const statusColor: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700', ended: 'bg-gray-200 text-gray-500',
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCampaigns().then(r => { if (r.success) setCampaigns(r.campaigns); setLoading(false); });
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">行銷活動</h1>
        <Link href="/campaigns/new" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          + 新建 Campaign
        </Link>
      </div>
      {loading ? <p className="text-gray-400">載入中...</p> : campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <p className="text-lg mb-4">尚無 Campaign</p>
          <Link href="/campaigns/new" className="text-indigo-600 hover:underline">建立第一個 Campaign →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <Link href={`/campaigns/${c.id}`} className="font-semibold hover:text-indigo-600">{c.name}</Link>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[c.status] || 'bg-gray-100'}`}>{c.status}</span>
                  </div>
                  <p className="text-sm text-gray-500">{c.product_name}</p>
                  {c.pitch_headline && <p className="text-sm text-gray-400 mt-1 truncate max-w-lg">{c.pitch_headline}</p>}
                </div>
                {c.stats && (
                  <div className="flex gap-6 text-center ml-8">
                    <div><p className="text-lg font-bold">{c.stats.total}</p><p className="text-xs text-gray-400">聯絡人</p></div>
                    <div><p className={`text-lg font-bold ${c.stats.reply_rate >= 15 ? 'text-green-600' : 'text-gray-700'}`}>{c.stats.reply_rate}%</p><p className="text-xs text-gray-400">回覆率</p></div>
                    <div><p className={`text-lg font-bold ${c.stats.demo_rate >= 5 ? 'text-green-600' : 'text-gray-700'}`}>{c.stats.demo_rate}%</p><p className="text-xs text-gray-400">Demo率</p></div>
                    <div><p className={`text-lg font-bold ${c.stats.conversion_rate >= 1 ? 'text-emerald-600' : 'text-gray-700'}`}>{c.stats.conversion_rate}%</p><p className="text-xs text-gray-400">成交率</p></div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 mt-4">
                <Link href={`/campaigns/${c.id}`} className="text-sm text-indigo-600 hover:underline">詳情</Link>
                <Link href={`/campaigns/${c.id}/queue`} className="text-sm text-indigo-600 hover:underline">訊息佇列</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
