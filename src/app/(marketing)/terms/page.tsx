'use client';

import { PageHero, Prose } from '@/components/landing/Sections';
import { LegalNotice } from '@/components/landing/LegalNotice';

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Terms"
        title="What Fauri does, and what it does not."
        lede="The short version: Fauri introduces you to each other and records what was agreed. The work itself is between you."
      />

      <Prose>
        <LegalNotice />

        <h2>What Fauri is</h2>
        <p>
          Fauri is a marketplace. It shows a job to tradesmen who work in that trade and are close
          enough to reach it, carries their offers back, and records what the two sides agree.
        </p>
        <p>
          <strong>Fauri does not employ tradesmen</strong> and does not carry out any work. A
          tradesman on Fauri is working for themselves. The contract for the job is between the
          customer and the tradesman directly.
        </p>

        <h2>Payment</h2>
        <p>
          Customers pay tradesmen in cash, directly, when the work is done. Fauri never handles the
          money and has no payment gateway. The platform share described on the{' '}
          <a href="/pricing">pricing page</a> is recorded against the tradesman&apos;s account and
          settled separately.
        </p>

        <h2>Using it honestly</h2>
        <ul>
          <li>Give a real name and a phone number that reaches you.</li>
          <li>Post jobs you actually want done, at a location you can be reached at.</li>
          <li>Bid prices you intend to honour, and turn up when you have accepted a job.</li>
          <li>
            Do not use another person&apos;s account, and do not try to reach data belonging to jobs
            you are not part of.
          </li>
        </ul>

        <h2>Ratings</h2>
        <p>
          Both sides rate each other after a job completes. Ratings are visible to other signed-in
          users. Tradesmen cannot change their own rating, verification status or platform share:
          those are set by the platform and enforced in the database.
        </p>

        <h2>Safety</h2>
        <p>
          Tradesmen are <strong>not yet verified</strong>. The badge exists in the product but there
          is no identity check behind it today. Use the ratings, agree the price before work starts,
          and take the usual precautions you would with anyone coming to your home. Fauri is not an
          emergency service; if anyone is in danger, call the emergency services.
        </p>

        <h2>Liability</h2>
        <p>
          Fauri does not guarantee that a tradesman will accept a job, arrive, or complete work to
          any particular standard, and it is not a party to the work. Disputes about the job itself
          are between the customer and the tradesman. The job timeline, including the price agreed
          and the amount settled, is available to both sides to help resolve them.
        </p>

        <h2>Ending an account</h2>
        <p>
          You can stop using Fauri at any time and ask for your account to be removed, as described
          on the <a href="/data-deletion">data deletion</a> page. Accounts used to harass people,
          post fake jobs or evade the platform share may be removed.
        </p>
      </Prose>
    </>
  );
}
