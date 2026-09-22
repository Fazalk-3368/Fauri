import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Noto_Nastaliq_Urdu } from 'next/font/google';
import { I18nProvider } from '@/lib/i18n/provider';
import { ToastProvider } from '@/components/ui/toast';
import { getLocale } from '@/lib/i18n/server';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const notoUrdu = Noto_Nastaliq_Urdu({
  variable: '--font-noto-urdu',
  subsets: ['arabic'],
  weight: ['400', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Labeeb — Emergency tradesmen, after hours',
  description:
    'Find electricians, plumbers and technicians working near you right now, even after the shops close.',
  applicationName: 'Labeeb',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfdfa' },
    { media: '(prefers-color-scheme: dark)', color: '#15201c' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      dir={locale === 'ur' ? 'rtl' : 'ltr'}
      className={`${geistSans.variable} ${geistMono.variable} ${notoUrdu.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-bg text-fg">
        <I18nProvider locale={locale}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
