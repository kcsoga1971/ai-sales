'use client';
import { useEffect, useState, use } from 'react';
import { api, type Campaign, type CampaignContact, type Stats } from '@/lib/api';
import Link from 'next/link';

const statusColor: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-500', in_sequence: 'bg-blue-100 text-blue-700',
  replied: 'bg-yellow-100 text-yellow-700', demo_booked: 'bg-purple-100 text-purple-700',
  converted: 'bg-green-100 text-green-700', lost: 'bg-red-100 text-red-600',
};

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contacts, setContacts] = useState<CampaignContact[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [addForm, setAddForm] = useState({ name: '', title: '', company: '', linkedin_url: '', email: '' });
  const [adding, setAdding] = useState(false);
  const [personalizing, setPersonalizing] = useState(false);
  const [activating, setActivating] = useState(false);

  function load() {
    api.getCampaign(id).then(r => {
      if (r.success) { setCampaign(r.campaign); setContacts(r.contacts); setStats(r.stats); }
      setLoading(false);
    });
  }
  useEffect(() => { load(); }, [id]);

  async function handleAddContact() {
    if (!addForm.name) return;
    setAdding(true);
    await api.addContact(id, addForm);
    setAddForm({ name: '', title: '', company: '', linkedin_url: '', email: '' });
    setAdding(false);
    load();
  }

  async function handlePersonalize() {
    setPersonalizing(true);
    await api.personalizeCampaign(id);
    setPersonalizing(false);
    load();
  }

  async function handleActivate() {
    setActivating(true);
    await api.updateCampaign(id, { status: 'active' });
    setActivating(false);
    load();
  }

  if (loading) return <div className="p-8 text-gray-400">載入中...</div>;
  if (!campaign) return <div className="p-8 text-red-500">Campaign 不存在</div>;

  const pendingCount = contacts.filter(c => c.status === 'pending').length;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/campaigns" className="text-gray-400 hover:text-gray-600 text-sm">← 返回</Link>
            <h1 className="text-xl font-bold">{campaign.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[campaign.status] || 'bg-gray-100 text-gray-600'}`}>{campaign.status}</span>
          </div>
          <p className="text-gray-500 text-sm">{campaign.product_name}</p>
          {campaign.pitch_headline && <p className="text-sm text-gray-400 mt-1">{campaign.pitch_headline}</p>}
        </div>
        <div className="flex gap-2">
          {campaign.status === 'draft' && contacts.length > 0 && pendingCount > 0 && (
            <button onClick={handlePersonalize} disabled={personalizing} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {personalizing ? '生成中...' : `✨ 生成訊息 (${pendingCount}人)`}
            </button>
          )}
          {campaign.status === 'draft' && contacts.length > 0 && (
            <button onClick={handleActivate} disabled={activating} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {activating ? '啟動中...' : '▶ 啟動'}
            </button>
          )}
          <Link href={`/campaigns/${id}/queue`} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            訊息佇列
          </Link>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: '聯絡人', v: stats.total },
            { label: '回覆率', v: `${stats.reply_rate}%`, good: stats.reply_rate >= 15 },
            { label: 'Demo率', v: `${stats.demo_rate}%`, good: stats.demo_rate >= 5 },
            { label: '成交率', v: `${stats.conversion_rate}%`, good: stats.conversion_rate >= 1 },
          ].map(m => (
            <div key={m.label} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
              <p className={`text-2xl font-bold ${m.good ? 'text-green-600' : 'text-gray-800'}`}>{m.v}</p>
              <p className="text-xs text-gray-400">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-sm">聯絡人 ({contacts.length})</h2>
            </div>
            {contacts.length === 0 ? (
              <p className="px-5 py-8 text-center text-gray-400 text-sm">先新增聯絡人，再生成個人化訊息</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {contacts.map(cc => (
                  <div key={cc.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{cc.contact?.name}</p>
                      <p className="text-xs text-gray-400">{cc.contact?.title} · {cc.contact?.company}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[cc.status] || 'bg-gray-100 text-gray-500'}`}>{cc.status}</span>
                      {cc.contact?.linkedin_url && (
                        <a href={cc.contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">LinkedIn</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-sm mb-4">新增聯絡人</h2>
            <div className="space-y-2">
              {[
                { key: 'name', placeholder: '姓名 *' },
                { key: 'title', placeholder: '職稱' },
                { key: 'company', placeholder: '公司' },
                { key: 'linkedin_url', placeholder: 'LinkedIn URL' },
                { key: 'email', placeholder: 'Email' },
              ].map(f => (
                <input key={f.key} value={addForm[f.key as keyof typeof addForm]}
                  onChange={e => setAddForm({ ...addForm, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500" />
              ))}
              <button onClick={handleAddContact} disabled={!addForm.name || adding} className="w-full bg-indigo-600 text-white py-2 rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50">
                {adding ? '新增中...' : '新增'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
