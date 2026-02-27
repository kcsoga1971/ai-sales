'use client';
import { useEffect, useState } from 'react';
import { api, type Overview, type Campaign } from '@/lib/api';

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getOverview(), api.getCampaigns()]).then(([ov, cp]) => {
      if (ov.success) setOverview(ov.overview);
      if (cp.success) setCampaigns(cp.campaigns);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold mb-6">銷售漏斗分析</h1>
      {loading ? <p className="text-gray-400">載入中...</p> : !overview ? <p className="text-gray-400">無數據</p> : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <h2 className="font-semibold mb-4">整體漏斗</h2>
            <div className="space-y-3">
              {[
                { label: '觸達聯絡人', value: overview.total_contacts, pct: 100, color: 'bg-indigo-500' },
                { label: '收到回覆', value: overview.total_replied, pct: overview.reply_rate, color: 'bg-blue-500', target: '>15%' },
                { label: 'Demo 預約', value: overview.total_demo, pct: overview.demo_rate, color: 'bg-purple-500', target: '>5%' },
                { label: '成交', value: overview.total_converted, pct: overview.conversion_rate, color: 'bg-emerald-500', target: '>1%' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-4">
                  <div className="w-24 text-right text-sm text-gray-600">{s.label}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                    <div className={`h-full ${s.color} rounded-full transition-all`} style={{ width: `${Math.max(s.pct, 1)}%` }} />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white mix-blend-multiply">
                      {s.value} ({s.pct}%)
                    </span>
                  </div>
                  {s.target && <div className="w-16 text-xs text-gray-400">{s.target}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold">各 Campaign 比較</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Campaign</th>
                  <th className="px-6 py-3 text-right">聯絡人</th>
                  <th className="px-6 py-3 text-right">回覆率</th>
                  <th className="px-6 py-3 text-right">Demo率</th>
                  <th className="px-6 py-3 text-right">成交率</th>
                  <th className="px-6 py-3 text-center">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium">{c.name}</td>
                    <td className="px-6 py-3 text-right">{c.stats?.total || 0}</td>
                    <td className={`px-6 py-3 text-right font-medium ${(c.stats?.reply_rate || 0) >= 15 ? 'text-green-600' : 'text-gray-700'}`}>
                      {c.stats?.reply_rate || 0}%
                    </td>
                    <td className={`px-6 py-3 text-right font-medium ${(c.stats?.demo_rate || 0) >= 5 ? 'text-green-600' : 'text-gray-700'}`}>
                      {c.stats?.demo_rate || 0}%
                    </td>
                    <td className={`px-6 py-3 text-right font-medium ${(c.stats?.conversion_rate || 0) >= 1 ? 'text-emerald-600' : 'text-gray-700'}`}>
                      {c.stats?.conversion_rate || 0}%
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
