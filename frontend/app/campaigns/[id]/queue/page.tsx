'use client';
import { useEffect, useState, use } from 'react';
import { api, type Touchpoint } from '@/lib/api';

const channelIcon: Record<string, string> = { linkedin: '💼', email: '📧', telegram: '✈️' };
const channelLabel: Record<string, string> = { linkedin: 'LinkedIn', email: 'Email', telegram: 'Telegram' };

export default function QueuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [queue, setQueue] = useState<Touchpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState<string | null>(null);

  function load() {
    api.getQueue(id).then(r => { if (r.success) setQueue(r.queue); setLoading(false); });
  }
  useEffect(() => { load(); }, [id]);

  async function handleApprove(tpId: string) {
    await api.approveMessage(id, tpId);
    load();
  }

  async function handleMarkSent(tpId: string) {
    await api.markSent(id, tpId);
    load();
  }

  async function handleCopy(content: string, tpId: string) {
    await navigator.clipboard.writeText(content);
    setCopying(tpId);
    setTimeout(() => setCopying(null), 2000);
  }

  async function handleRespond(ccId: string, action: string) {
    await api.logResponse(id, ccId, { action, sentiment: 'positive' });
    load();
  }

  const pending = queue.filter(t => t.status === 'pending');
  const approved = queue.filter(t => t.status === 'approved');

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <a href={`/campaigns/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">← 返回</a>
          <h1 className="text-xl font-bold mt-1">訊息審核佇列</h1>
          <p className="text-sm text-gray-500 mt-1">Ghost Mode — 審核後複製貼上發送</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-indigo-600">{pending.length}</p>
          <p className="text-xs text-gray-400">待審核</p>
        </div>
      </div>

      {loading ? <p className="text-gray-400">載入中...</p> : queue.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <p className="text-lg mb-2">佇列空了</p>
          <p className="text-sm">先在 Campaign 頁面新增聯絡人並生成訊息</p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...pending, ...approved].map(tp => {
            const contact = tp.campaign_contact?.contact;
            const isLinkedIn = tp.channel === 'linkedin';
            const isApproved = tp.status === 'approved';
            const msgContent = tp.content || '';
            const subject = isLinkedIn ? null : msgContent.split('\n\n')[0]?.replace('Subject: ', '');
            const body = isLinkedIn ? msgContent : msgContent.split('\n\n').slice(1).join('\n\n');

            return (
              <div key={tp.id} className={`bg-white rounded-xl border ${isApproved ? 'border-green-200 bg-green-50' : 'border-gray-200'} p-5`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{channelIcon[tp.channel]}</span>
                      <span className="font-semibold text-sm">{channelLabel[tp.channel]} · Step {tp.step}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${isApproved ? 'bg-green-200 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isApproved ? '已核准' : '待審核'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {contact ? `${contact.name} · ${contact.title || ''} · ${contact.company || ''}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!isApproved && (
                      <button onClick={() => handleApprove(tp.id)} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700">
                        核准
                      </button>
                    )}
                    {isApproved && isLinkedIn && contact?.linkedin_url && (
                      <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700">
                        開啟 LinkedIn ↗
                      </a>
                    )}
                    <button onClick={() => handleCopy(body || msgContent, tp.id)} className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50">
                      {copying === tp.id ? '已複製 ✓' : '複製訊息'}
                    </button>
                    {isApproved && (
                      <button onClick={() => handleMarkSent(tp.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700">
                        已發送 ✓
                      </button>
                    )}
                  </div>
                </div>

                {subject && <div className="bg-gray-100 rounded px-3 py-1.5 text-xs text-gray-600 mb-2 font-medium">主旨: {subject}</div>}
                <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {body || msgContent}
                </div>

                {tp.campaign_contact && (
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">記錄回應：</span>
                    {['replied', 'demo_scheduled', 'won', 'lost'].map(action => (
                      <button key={action} onClick={() => handleRespond(tp.campaign_contact_id, action)}
                        className="text-xs border border-gray-200 px-2 py-1 rounded hover:bg-gray-100 text-gray-600">
                        {action === 'replied' ? '已回覆' : action === 'demo_scheduled' ? 'Demo預約' : action === 'won' ? '成交 🎉' : '未成交'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
