'use client';

import { PageHero, Prose } from '@/components/landing/Sections';
import { LegalNotice } from '@/components/landing/LegalNotice';

export default function DataDeletionPage() {
  return (
    <>
      <PageHero
        eyebrow="Data deletion"
        title="Removing your account and everything on it."
        lede="What gets deleted, what survives, and how to ask."
      />

      <Prose>
        <LegalNotice />

        <h2>How to ask</h2>
        <p>
          Email <a href="mailto:hello@fauri.pk">hello@fauri.pk</a> from the address on the account,
          with &ldquo;Delete my account&rdquo; as the subject. Sending it from the registered
          address is how the request is verified, so a request from anywhere else will be asked to
          confirm first.
        </p>

        <h2>What is removed</h2>
        <p>
          Deleting the account removes the sign-in record, and everything attached to it goes with
          it. In practice that means:
        </p>
        <ul>
          <li>Your profile: name, email, phone number, city and language.</li>
          <li>
            For tradesmen: your bio, experience, trades offered, travel radius, rating, and your
            stored location.
          </li>
          <li>Jobs you posted, including their descriptions, addresses and map points.</li>
          <li>Offers you made, and the messages you sent on any job.</li>
          <li>Reviews you wrote and reviews written about you.</li>
          <li>Your notifications.</li>
        </ul>

        <h2>What does not disappear straight away</h2>
        <ul>
          <li>
            <strong>Jobs posted by someone else that you worked on.</strong> Deleting your account
            detaches you from them, but the customer&apos;s own record of their job remains theirs.
            Your name stops being attached to it.
          </li>
          <li>
            <strong>Unsettled platform share.</strong> If you have completed jobs with an amount
            still owed, that record is kept until it is settled. It is the only thing retained for a
            commercial reason.
          </li>
          <li>
            <strong>Backups.</strong> Routine database backups roll over on their own schedule, so
            deleted data can persist in a backup for a short window before it ages out.
          </li>
        </ul>

        <h2>How long it takes</h2>
        <p>
          Requests are handled manually while the service is in development, so allow a few days.
          You will get a reply confirming it is done.
        </p>

        <h2>Getting a copy first</h2>
        <p>
          If you want your data before it is deleted, ask in the same email and it will be sent as a
          file. Deletion cannot be undone, so it is worth doing that first if you think you might
          want the job history.
        </p>
      </Prose>
    </>
  );
}
