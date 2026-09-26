import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { LegalSection } from "@/components/LegalSection";
import { TRIAL_DAYS } from "@/lib/plan";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using Grasp: accounts, plans, payments, refunds and AI-generated content.",
  alternates: { canonical: "/legal/terms" },
};

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="26 September 2026"
      intro="These terms are the agreement between you and Grasp when you use the website. By creating an account or using Grasp, you agree to them. If you do not agree, do not use Grasp."
    >
      <LegalSection title="Who can use Grasp">
        <ul>
          <li>You must be at least 13 years old.</li>
          <li>
            If you are under 18, or under the age where you can agree to terms like these yourself
            where you live, a parent or guardian must agree to them for you.
          </li>
          <li>
            An account is for one person. Give accurate details when you sign up, keep your
            password to yourself, and tell us if you think someone else has got into your account.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Plans and limits">
        <p>
          Grasp has two plans, Pro and Max, each with weekly limits on AI features: lecture
          recordings, quizzes, Resource Bank documents, and a weekly amount of AI tokens used by
          explanations, refining, enhancing and generating notes. The current limits are shown on
          the Plans page, and they may change over time.
        </p>
        <p>
          A new account starts with a {TRIAL_DAYS}-day free trial of Pro. A card is taken when you
          start the trial, through Stripe, and is charged automatically when the trial ends unless
          you cancel before then. Choosing Max, or switching to it, is charged straight away. You
          will not be moved onto a different plan or charged anything you have not agreed to.
        </p>
      </LegalSection>

      <LegalSection title="Payments, cancellation and refunds" id="refunds">
        <ul>
          <li>
            <b>Billing.</b> Plans are billed weekly, in advance, at the price shown on the Plans
            page when you subscribe, through Stripe, our payment processor. Grasp never sees or
            stores your full card number. They renew each week until you cancel.
          </li>
          <li>
            <b>Free trial.</b> The free trial is not charged. It ends automatically into a paid
            Pro plan, charged to the card you gave when you started it, unless you cancel before
            then.
          </li>
          <li>
            <b>Cancelling.</b> You can cancel at any time from the Plans page. Your plan keeps
            working until the end of the period you have already paid for, or until your free trial
            ends, and is not renewed after that. You can resume it before then.
          </li>
          <li>
            <b>Switching plans.</b> Switching between Pro and Max works like buying the new
            plan. It takes effect straight away, you are charged a full week of the new plan at
            once, and your weekly billing starts again from that day. Switching during a free trial
            ends the trial. There is no credit or refund for the time left on the plan you switched
            from.
          </li>
          <li>
            <b>Refunds.</b> Payments are not refundable, including for part of a week you did not
            use, except in the cases below.
          </li>
          <li>
            <b>When you will get a refund.</b> If you were charged by mistake or charged twice for
            the same period, or if Grasp was unavailable for most of a billing period because of a
            fault on Grasp&apos;s side, you will get a full refund for that period. You will also get
            a refund wherever the law where you live requires one.
          </li>
          <li>
            <b>How to ask.</b> Email{" "}
            <a
              href="mailto:liamspencer549@gmail.com"
              className="font-semibold text-brand-700 hover:underline"
            >
              liamspencer549@gmail.com
            </a>{" "}
            within 14 days of the charge, from the email address on your account. Approved refunds
            go back to the original payment method, usually within 10 business days.
          </li>
          <li>
            <b>Price changes.</b> If a plan&apos;s price changes, you will be told at least 30 days
            before it applies to you. The new price starts from your next billing period, and you
            can cancel before then.
          </li>
          <li>
            <b>Deleting your account.</b> You need to cancel your plan before you can delete your
            account. Deleting it ends the subscription straight away and does not by itself give a
            refund.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          Your notes, recordings, quizzes and uploaded documents are yours. You give Grasp
          permission to store and process them, including sending them to its AI provider, only so
          it can run the features you use. See the{" "}
          <Link href="/legal/privacy" className="font-semibold text-brand-700 hover:underline">
            Privacy Policy
          </Link>{" "}
          for exactly what is stored and who handles it.
        </p>
        <p>
          Only upload material you have the right to use. You are responsible for what you put
          into Grasp.
        </p>
      </LegalSection>

      <LegalSection title="AI-generated content">
        <p>
          Notes, explanations, quiz questions, marks and feedback written by Grasp are generated by
          AI and can be wrong, incomplete or out of date. Check them against your class materials
          and your teacher&apos;s guidance before relying on them. Quiz marks are practice
          estimates, not official grades.
        </p>
        <p>
          Grasp is a study aid. It is not a replacement for your teachers, and it does not give
          professional advice. If an answer looks wrong, use the flag option next to it.
        </p>
      </LegalSection>

      <LegalSection title="Recording lectures">
        <p>
          Some schools and teachers do not allow lectures or lessons to be recorded, and some
          places have laws about recording people. Before you record, make sure you have
          permission. You are responsible for this; Grasp cannot check it for you.
        </p>
      </LegalSection>

      <LegalSection title="Things you must not do">
        <ul>
          <li>Get around the usage limits, for example with multiple or automated accounts.</li>
          <li>Access another person&apos;s account or data, or try to break Grasp&apos;s security.</li>
          <li>Copy, resell or give others access to Grasp as a service.</li>
          <li>Upload anything illegal, harmful, or that you do not have the right to share.</li>
          <li>Use Grasp to break your school&apos;s rules on academic honesty.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Ending your account">
        <p>
          You can delete your account from Settings once you have cancelled your plan on the Plans
          page. Deleting it removes your account and everything in it. Grasp may suspend or close
          an account that breaks these terms.
        </p>
      </LegalSection>

      <LegalSection title="The service">
        <p>
          Grasp is provided as it is and as available. It may change, have interruptions, or lose
          data despite reasonable care, so keep your own copy of anything you cannot afford to
          lose. Features may be added, changed or removed.
        </p>
      </LegalSection>

      <LegalSection title="Liability">
        <p>
          As far as the law allows, Grasp is not responsible for indirect losses, or for losses
          that come from relying on AI-generated content, such as a result in a test or exam.
          Nothing in these terms limits any rights you have that cannot legally be limited.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p>
          If these terms change, this page will be updated and the date at the top will change.
          Continuing to use Grasp after a change means you accept the new terms.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
