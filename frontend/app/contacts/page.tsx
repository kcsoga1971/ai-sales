'use client';
import { useEffect, useState } from 'react';
import { api, type Contact } from '@/lib/api';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getContacts().then(r => { if (r.success) setContacts(r.contacts); setLoading(false); });
  }, []);

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">聯絡人 CRM</h1>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋姓名或公司..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:border-indigo-500" />
      </div>
      {loading ? <p className="text-gray-400">載入中...</p> : (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-3 border-b border-gray-100 text-xs text-gray-500 font-medium uppercase grid grid-cols-5 gap-4">
            <span>姓名</span><span>職稱</span><span>公司</span><span>Email</span><span>來源</span>
          </div>
          {filtered.length === 0 ? (
            <p className="px-6 py-12 text-center text-gray-400">無聯絡人</p>
          ) : filtered.map(c => (
            <div key={c.id} className="px-6 py-3 border-b border-gray-50 grid grid-cols-5 gap-4 text-sm hover:bg-gray-50">
              <div className="font-medium">
                {c.linkedin_url ? (
                  <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600">{c.name} ↗</a>
                ) : c.name}
              </div>
              <span className="text-gray-500">{c.title || '-'}</span>
              <span className="text-gray-500">{c.company || '-'}</span>
              <span className="text-gray-400 text-xs">{c.email || '-'}</span>
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full w-fit">{c.source || 'manual'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
