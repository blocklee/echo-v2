import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '势位之战 | ECHO: Battle of Potential',
  description: 'ECHO Battle of Potential MVP - Qitmeer',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}