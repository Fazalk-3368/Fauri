'use client';

import { useI18n } from '@/lib/i18n/provider';
import { ClosingCta, FeatureGrid, PageHero, UseCases } from '@/components/landing/Sections';

export default function FeaturesPage() {
  const { dict } = useI18n();
  return (
    <>
      <PageHero
        eyebrow={dict.landing.featuresEyebrow}
        title={dict.landing.featuresTitle}
        lede={dict.landing.featuresSub}
      />
      <FeatureGrid />
      <UseCases />
      <ClosingCta />
    </>
  );
}
