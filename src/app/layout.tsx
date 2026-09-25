import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Newsreader, Noto_Nastaliq_Urdu } from 'next/font/google';
import { I18nProvider } from '@/lib/i18n/provider';
import { ToastProvider } from '@/components/ui/toast';
import { getLocale } from '@/lib/i18n/server';
import { THEME_COLOR } from '@/lib/theme';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  display: 'swap',
});

// Display serif, echoing the sibling product's headline voice without copying
// its face. One weight: Nastaliq is already a heavy download for this market.
// globals.css routes RTL headlines away from this, since it has no Arabic.
const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  weight: ['600'],
  style: ['normal'],
  display: 'swap',
});

// Not preloaded: Nastaliq is the heaviest font here and only renders under
// dir="rtl", so preloading it spent bandwidth on every English page load for
// nothing. Urdu readers pick it up on swap instead.
const notoUrdu = Noto_Nastaliq_Urdu({
  variable: '--font-noto-urdu',
  subsets: ['arabic'],
  weight: ['400', '600'],
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: 'Fauri: emergency tradesmen, always at your service',
  description:
    'Find electricians, plumbers and technicians working near you right now, even after the shops close.',
  applicationName: 'Fauri',
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
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
      className={`${jakarta.variable} ${newsreader.variable} ${notoUrdu.variable} h-full antialiased`}
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
