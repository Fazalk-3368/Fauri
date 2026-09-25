import { MarketingFooter, MarketingNav } from '@/components/landing/MarketingChrome';

/** Public pages: landing, features, pricing, about, contact and the legal set. */
export default function MarketingLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-full flex-col">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
