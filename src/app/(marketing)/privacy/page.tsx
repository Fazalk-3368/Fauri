'use client';

import { PageHero, Prose } from '@/components/landing/Sections';
import { LegalNotice } from '@/components/landing/LegalNotice';

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Privacy"
        title="What Fauri stores, and who can see it."
        lede="Written against the actual database rather than from a template, so it describes what the product really does."
      />

      <Prose>
        <LegalNotice />

        <h2>What is collected</h2>
        <ul>
          <li>
            <strong>Your account.</strong> Name, email address, and optionally a phone number and
            city. Your chosen language is stored so the app opens in it.
          </li>
          <li>
            <strong>Jobs you post.</strong> The trade, your description, a map location, the address
            text you type, your budget and whether you marked it urgent.
          </li>
          <li>
            <strong>Tradesman details.</strong> For tradesmen: trades offered, years of experience,
            a short bio, how far you are willing to travel, and your current location while you are
            online.
          </li>
          <li>
            <strong>Activity.</strong> Offers made and accepted, in-job messages, status changes,
            completed amounts and ratings.
          </li>
        </ul>

        <h2>Location</h2>
        <p>
          A job stores the point you drop on the map, because that is how nearby tradesmen are
          found. A tradesman&apos;s position is stored only while they are online, and is updated as
          they move so a customer can watch them approach. Going offline stops the updates.
        </p>
        <p>
          Location is only ever used to match a job to tradesmen who can actually reach it, and to
          show distance and arrival. It is not sold, and it is not used for advertising.
        </p>

        <h2>Who can see what</h2>
        <p>
          Access is enforced in the database itself, not only in the app, so it applies the same way
          to anything talking to the service.
        </p>
        <ul>
          <li>
            <strong>Your phone number</strong> is visible only to the person you are actually
            assigned to on a job. Bidding on a job does not reveal it.
          </li>
          <li>
            <strong>A job&apos;s address</strong> is visible to tradesmen while the job is still
            open and they are being asked to bid. Once you accept someone, it stops being visible to
            everyone else.
          </li>
          <li>
            <strong>In-job messages</strong> are visible only to you and the tradesman you accepted,
            or to a tradesman with a live offer before you have chosen.
          </li>
          <li>
            <strong>Ratings and reviews</strong> are visible to signed-in users, because they are
            the basis on which people decide who to trust.
          </li>
        </ul>

        <h2>Who it is shared with</h2>
        <p>
          Account data and everything above is held in Supabase, which provides the database and
          sign-in. Map tiles are requested from a third-party tile service when you view a map. No
          data is sold, and there are no advertising or analytics trackers in the app.
        </p>

        <h2>How long it is kept</h2>
        <p>
          Job history, messages and ratings are kept while your account exists, because they are
          what a dispute would be settled from. Deleting your account removes them, as described on
          the <a href="/data-deletion">data deletion</a> page.
        </p>

        <h2>Children</h2>
        <p>Fauri is not intended for anyone under 18 and accounts should not be created for them.</p>

        <h2>Changes</h2>
        <p>
          If this changes materially, the change will be reflected here. The service is in
          development and this page will be revised as the product is.
        </p>
      </Prose>
    </>
  );
}
