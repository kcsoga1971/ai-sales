import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI-Sales | 智能銷售自動化',
  description: 'Flywheel Ring 3 - Automated B2B Sales Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/" className="font-bold text-indigo-600 text-lg">AI-Sales</a>
            <a href="/campaigns" className="text-sm text-gray-600 hover:text-gray-900">行銷活動</a>
            <a href="/contacts" className="text-sm text-gray-600 hover:text-gray-900">聯絡人</a>
            <a href="/analytics" className="text-sm text-gray-600 hover:text-gray-900">分析</a>
          </div>
          <span className="text-xs text-gray-400">飛輪第③環</span>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
