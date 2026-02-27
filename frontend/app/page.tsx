'use client';
import { useEffect, useState } from 'react';
import { api, type Overview, type Campaign } from '@/lib/api';
import Link from 'next/link';

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getOverview(), api.getCampaigns()]).then(([ov, cp]) => {
      if (ov.success) setOverview(ov.overview);
      if (cp.success) setCampaigns(cp.campaigns.slice(0, 5));
      setLoading(false);
    });
  }, []);

  const metrics = overview ? [
    { label: '活躍 Campaigns', value: overview.active_campaigns, sub: `共 ${overview.total_campaigns} 個`, color: 'text-indigo-600' },
    { label: '聯絡人總數', value: overview.total_contacts, sub: `已回覆 ${overview.total_replied}`, color: 'text-blue-600' },
    { label: '回覆率', value: `${overview.reply_rate}%`, sub: '目標 >15%', color: overview.reply_rate >= 15 ? 'text-green-600' : 'text-yellow-600' },
    { label: 'Demo 預約率', value: `${overview.demo_rate}%`, sub: '目標 >5%', color: overview.demo_rate >= 5 ? 'text-green-600' : 'text-yellow-600' },
    { label: '成交率', value: `${overview.conversion_rate}%`, sub: '目標 >1%', color: overview.conversion_rate >= 1 ? 'text-green-600' : 'text-orange-600' },
    { label: '累計成交', value: overview.total_converted, sub: `Demo ${overview.total_demo} 場`, color: 'text-emerald-600' },
  ] : [];

  const statusColor: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600', active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700', ended: 'bg-gray-200 text-gray-500',
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">飛輪儀表板</h1>
          <p className="text-gray-500 text-sm mt-1">探索 → 設計 → 開發 → 上線 → <strong>推廣</strong> → 驗證</p>
        </div>
        <Link href="/campaigns/new" className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          + 新建 Campaign
        </Link>
      </div>

      {loading ? <p className="text-gray-400">載入中...</p> : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {metrics.map(m => (
              <div key={m.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-gray-400 mt-1">{m.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold">最近 Campaigns</h2>
              <Link href="/campaigns" className="text-sm text-indigo-600 hover:underline">查看全部</Link>
            </div>
            {campaigns.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400">
                <p className="text-lg mb-2">尚無 Campaign</p>
                <p className="text-sm mb-4">從 DEMEX GO 卡建立第一個推廣活動</p>
                <Link href="/campaigns/new" className="text-indigo-600 hover:underline text-sm">建立 Campaign →</Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {campaigns.map(c => (
                  <Link key={c.id} href={`/campaigns/${c.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.product_name}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {c.stats && (
                        <span className="text-xs text-gray-500">
                          {c.stats.total} 聯絡人 · 回覆率 {c.stats.reply_rate}%
                        </span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[c.status] || 'bg-gray-100'}`}>
                        {c.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
