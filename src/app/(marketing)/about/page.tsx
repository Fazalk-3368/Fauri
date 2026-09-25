'use client';

import { ClosingCta, PageHero, Prose } from '@/components/landing/Sections';

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title="Built for the hours nobody else covers."
        lede="Fauri exists because the gap between a shop closing and a problem starting is where people get stuck."
      />

      <Prose>
        <p>
          In most Pakistani cities the hardware shops and repair stalls shut around nine. Pipes,
          fuses, locks and air conditioning do not keep those hours. What usually happens next is a
          round of phone calls to whoever someone in the family has a number for, at whatever price
          that person decides to name, with no way to compare.
        </p>
        <p>
          Fauri turns that into one post. You describe the problem, drop a pin, and every tradesman
          who does that work and is close enough to reach you hears about it at the same moment.
          They send a price. You choose. Cash changes hands at the door, exactly as it would have
          anyway.
        </p>

        <h2>Why cash</h2>
        <p>
          Because that is how the work is actually paid for. Requiring a card would exclude most of
          the people on both sides of the transaction. Fauri never touches the money: the customer
          pays the tradesman directly, and the platform share is recorded as something the tradesman
          settles afterwards.
        </p>

        <h2>Why the tradesman sets the price</h2>
        <p>
          A fixed rate card cannot know whether a job is a ten minute fix or a three hour one, at
          midnight, in the rain, twelve kilometres away. Letting tradesmen bid and letting customers
          compare produces a fairer number than either side guessing, and it gives the customer
          something they rarely have in an emergency: a choice.
        </p>

        <h2>Where it is up to</h2>
        <p>
          This is a final year project, currently running against a live database with a working
          matcher, bidding, chat, completion and ratings. It has not been through a public pilot.
          Verification of tradesmen, push notifications when the app is closed, and settlement of
          the platform share are all designed but not built.
        </p>
      </Prose>

      <ClosingCta />
    </>
  );
}
