'use client';

import { AlertTriangle, Mail, MapPin, Wrench } from 'lucide-react';
import { Card } from '@/components/ui';
import { PageHero, Prose } from '@/components/landing/Sections';

/**
 * Deliberately no contact form: there is no backend route to receive one, and
 * a form that silently discards what people type is worse than an address.
 */
export default function ContactPage() {
  const routes = [
    {
      icon: Mail,
      title: 'General and support',
      body: 'Questions about an account, a job that went wrong, or anything else.',
      // Placeholder: replace with the real address before this is public.
      value: 'hello@fauri.pk',
      href: 'mailto:hello@fauri.pk',
    },
    {
      icon: Wrench,
      title: 'Joining as a tradesman',
      body: 'Trades covered, how the share works, how to get verified once that exists.',
      value: 'tradesmen@fauri.pk',
      href: 'mailto:tradesmen@fauri.pk',
    },
    {
      icon: MapPin,
      title: 'Where we are',
      body: 'Currently operating around Lahore while the service is tested.',
      value: 'Lahore, Pakistan',
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Talk to a person."
        lede="No ticket numbers and no chatbot. Pick whichever of these fits and you will reach someone."
      />

      <section className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {routes.map(({ icon: Icon, title, body, value, href }) => (
            <Card key={title} className="p-5 sm:p-6" dir="ltr">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-soft-fg">
                <Icon className="size-5" />
              </span>
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
              {href ? (
                <a
                  href={href}
                  className="mt-3 inline-block break-all text-sm font-medium text-brand-ink hover:underline"
                >
                  {value}
                </a>
              ) : (
                <p className="mt-3 text-sm font-medium text-fg">{value}</p>
              )}
            </Card>
          ))}
        </div>
      </section>

      <Prose>
        <div className="flex items-start gap-3 rounded-2xl border border-urgent/30 bg-urgent-soft p-4 text-urgent-soft-fg">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <p className="text-sm">
            <strong className="text-urgent-soft-fg">Fauri is not an emergency service.</strong> If
            there is a fire, a gas leak you can smell strongly, or anyone is in danger, call the
            emergency services first. Rescue 1122 covers most of Pakistan.
          </p>
        </div>

        <h2>Reporting a problem with a job</h2>
        <p>
          Every job keeps a timeline of what happened and when, including the price agreed and the
          amount actually settled. Quote the job from your dashboard when you get in touch and that
          history can be checked.
        </p>
      </Prose>
    </>
  );
}
