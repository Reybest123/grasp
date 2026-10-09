import type { Metadata } from "next";
import { CONTACT_EMAIL, LegalPage } from "@/components/LegalPage";
import { LegalSection } from "@/components/LegalSection";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Grasp stores, what it never keeps, who processes it, and how to delete your account.",
  alternates: { canonical: "/legal/privacy" },
};

// Keep this page true to the code. If what Grasp stores, sends or keeps changes
// (db/schema.sql, lib/openai.ts, anything that sets a cookie), change it here too.

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="29 September 2026"
      intro="This explains what Grasp collects when you use it, what happens to it, who else handles it, and how to get it deleted. Grasp is a study tool for students, so it collects only what it needs to run your notebooks, and nothing for advertising."
    >
      <LegalSection title="What Grasp stores">
        <ul>
          <li>
            <b>Your account:</b> your name, your email address, and your password. The password is
            stored as a one-way scrypt hash, never as the password itself.
          </li>
          <li>
            <b>Your plan and setup answers:</b> which plan you are on, when you started the free trial,
            when you cancelled your plan if you have, your answers to the three questions asked
            when you set up your account (your year level, how you plan to use Grasp, and what you
            most want help with), and whether you have used the one-time timetable read.
          </li>
          <li>
            <b>Email confirmation:</b> when you confirmed your email address, and a record of each
            confirmation link sent to you until it is used or expires 24 hours later.
          </li>
          <li>
            <b>Password resets:</b> a record of each password reset link sent to you, kept until it is
            used or expires one hour later.
          </li>
          <li>
            <b>Your study material:</b> your subjects, class times and assessment dates, the notes you
            write or record, your quizzes with your answers and marks, and the text Grasp reads out
            of documents you add to a Resource Bank.
          </li>
          <li>
            <b>Usage records:</b> when you generate or mark a quiz, make a recording (and how long it
            ran), have a Resource Bank document read, or use AI tokens, with the time, so Grasp can
            apply your plan&apos;s weekly limits.
          </li>
          <li>
            <b>Answers you flag:</b> if you mark an AI answer as wrong, a copy of that answer is kept
            so it can be looked into.
          </li>
          <li>
            <b>Payment records:</b> when you start a plan, your card is taken directly by Stripe, our
            payment processor — Grasp never sees or stores your full card number. Grasp keeps
            Stripe&apos;s customer and subscription ids for your account, and the status and renewal
            date of your subscription, so it can show you your plan and apply your weekly limits.
          </li>
          <li>
            <b>Free trial records:</b> when you start a free trial, Grasp keeps a one-way scrambled
            form of your email address, so that the same inbox cannot claim a second free trial,
            including after the account is deleted. Other spellings of one inbox count as the same
            address (capital letters, a &quot;+&quot; tag on providers such as Gmail and Outlook,
            and the dots in a Gmail address). The scrambled form cannot be turned back into your
            address, though someone who already knew your address could check whether it had had a
            trial. Plans started before the free trial existed, when a card was needed, kept a
            scrambled reference to that card in the same way.
          </li>
          <li>
            <b>Sessions:</b> a record of each device you are logged in on, so you stay logged in.
          </li>
          <li>
            <b>Failed sign-in attempts:</b> a count of recent failed attempts to log in, sign up or
            change a password, so that nobody can guess their way into your account. Grasp stores
            only a one-way scrambled form of the email address tried and the network address it came
            from, which cannot be turned back into either, and these counts are deleted
            automatically within 24 hours.
          </li>
          <li>
            <b>Visits and sign-up steps:</b> when you open the home, blog, study planner, sign-up,
            log-in or legal pages, Grasp records which page it was, the site that linked you there and any campaign tag in
            the link. Your network address and browser are combined into a one-way scrambled code
            that changes every day, so visits can be counted without following anyone from one day
            to the next. Grasp also records when you make an account, confirm your email, go to
            checkout and start a plan. The record of making an account carries that day&apos;s
            code, so visits made on the day you sign up can be linked to your account, which is
            how Grasp tells which advert brought you. Visits on other days cannot be. No cookie is used for this and nothing is shared with an
            analytics company. Visit records are deleted after 180 days, and the rest go when your
            account does.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="What Grasp does not keep">
        <p>
          Lecture audio, timetable screenshots and Resource Bank files are sent for processing and
          then discarded as soon as the request finishes. Grasp keeps only the text that comes out
          of them: the transcript and notes, the subjects on your timetable, and the details read
          from a document. The files themselves are never saved.
        </p>
        <p>
          Grasp does not use analytics tools, advertising trackers or third-party cookies, and it
          does not sell your information to anyone.
        </p>
      </LegalSection>

      <LegalSection title="How it is used">
        <p>
          Your information is used to run Grasp for you: to show and save your notebooks, to
          generate notes, explanations and quizzes from your own material, to mark your answers,
          to apply your plan&apos;s limits, and to look into answers you flag. Your setup answers
          help Grasp understand what the students using it need. None of it is used to advertise
          to you, and Grasp does not use it to train AI models.
        </p>
      </LegalSection>

      <LegalSection title="Who else handles your information">
        <p>Grasp relies on five services to run:</p>
        <ul>
          <li>
            <b>OpenAI</b> provides the AI features. When you use one, the material it needs is sent
            to OpenAI: your note text, a highlighted passage and your question, lecture audio,
            timetable screenshots, Resource Bank documents, or your quiz answers, along with your name
            and your subjects&apos; teachers, class times and assessment dates, so it can answer
            questions about them. Under OpenAI&apos;s
            API terms this is not used to train their models, and it may be kept by OpenAI for up to
            30 days to monitor for abuse before being deleted.
          </li>
          <li>
            <b>Stripe</b> handles payment when you start a plan. It receives your card details
            directly — Grasp&apos;s own servers never see or store your full card number — along
            with your email address and name to bill you and send receipts.
          </li>
          <li>
            <b>Railway</b> hosts the website and the database your account and study material are
            stored in. Like any web host, it handles technical details of each request, such as
            your IP address, to deliver the site and keep it secure.
          </li>
          <li>
            <b>Cloudflare</b> sits in front of the website to deliver it quickly and protect it
            from attacks. Every request passes through it, so it handles technical details such as
            your IP address and the country it is from, which Grasp uses to show prices in your
            currency.
          </li>
          <li>
            <b>Resend</b> sends Grasp&apos;s emails: the one that confirms your address, any password
            reset you ask for, and the emails about your plan (when it starts, and a reminder before a
            free trial ends). It receives your email address, your name and what the email says, and
            nothing from your study material.
          </li>
        </ul>
        <p>
          Grasp is run from Australia, but these services are based overseas, mainly in the United
          States, so your information is stored and processed outside Australia. Each of them
          handles it only to provide its service to Grasp.
        </p>
      </LegalSection>

      <LegalSection title="Cookies and local storage">
        <p>
          Grasp sets two cookies. <code>grasp_session</code> keeps you logged in. It can only be
          read by Grasp&apos;s server, and it expires after 30 days, after 7 days with no Grasp activity, or
          when you log out. It is
          strictly necessary for your account to work, which is why Grasp does not show a cookie
          banner asking you to accept it. Grasp&apos;s own staff may also have a{" "}
          <code>grasp_admin</code> cookie, used only for testing; it is never set for students and
          is deleted when the browser closes. The second, <code>grasp_tz</code>, holds your
          device&apos;s time zone (for example &quot;Australia/Brisbane&quot;) so Grasp can show prices in
          your own currency. It holds nothing else and lasts a year.
        </p>
        <p>
          Grasp also stores a few things in your browser that never leave your device: whether you
          have hidden the tip at the bottom of the notes editor; the subjects, dates and settings
          you enter in the free study planner, so your plan is still there when you come back
          (the planner works without an account and sends none of what you type to Grasp, and
          clearing your browser&apos;s site data removes it); and, for as long as a tab stays open,
          the campaign tag of the link you arrived with, so a visit and a later sign-up can be
          credited to the same advert.
        </p>
      </LegalSection>

      <LegalSection title="How long it is kept, and deleting it">
        <p>
          Your information is kept for as long as you have an account. You can delete any note,
          quiz, subject or Resource Bank document at any time, and it is removed straight away.
        </p>
        <p>
          You can delete your whole account from Settings. That immediately removes your account
          and everything stored with it: your plan and setup answers, study material, usage
          records, flagged answers and sessions, and it cancels your subscription with Stripe
          straight away. It cannot be undone. The scrambled sign-in attempt counts described above
          are not tied to your account and are not deleted with it; they expire on their own within
          24 hours.
        </p>
        <p>
          One thing outlives a deleted account, on purpose: the scrambled free trial record
          described above. It has to, or deleting an account would let the same email address or
          card claim another free trial. What is left behind is that scrambled reference and the date, with your name
          removed from it, so it no longer identifies you.
        </p>
      </LegalSection>

      <LegalSection title="Getting a copy of your information">
        <p>Grasp is operated by Reyansh Ahuja, trading as Grasp Study, ABN 25 427 279 360.</p>
        <p>
          Grasp does not have a download or export feature yet. To ask for a copy of your
          information, to correct something, or to ask anything else about your privacy, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand-700 hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <p>
          If you are not happy with how your information has been handled, email first and you
          will get a reply within 30 days. If that does not resolve it, you can complain to the
          Office of the Australian Information Commissioner at oaic.gov.au.
        </p>
      </LegalSection>

      <LegalSection title="If you are in the EU or the UK">
        <p>
          Grasp uses your information on these grounds under the GDPR and the UK GDPR: to provide
          the service you signed up for (your account, study material, plan and billing), for
          Grasp&apos;s legitimate interests in keeping the service secure and understanding how it
          is used (sign-in limits and visit counts), and to meet legal duties such as keeping
          payment records.
        </p>
        <p>
          You have the right to see the information Grasp holds about you, to have it corrected or
          deleted, to receive a copy in a form you can take elsewhere, and to object to or limit how
          it is used. Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand-700 hover:underline">
            {CONTACT_EMAIL}
          </a>{" "}
          to use any of these, and you will get a reply within 30 days. You can also complain to the
          data protection authority where you live.
        </p>
        <p>
          The services listed above process your information outside the EU and the UK, mainly in
          the United States. Where they do, they rely on the safeguards the law recognises for this,
          such as the European Commission&apos;s standard contractual clauses.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          You must be at least 13 years old to use Grasp. Grasp is not meant for children under 13
          and does not knowingly collect their information. If you believe a child under 13 has
          made an account, email us and it will be deleted.
        </p>
        <p>
          If you are under the age where you can agree to this yourself where you live (up to 16 in
          some countries), you need a parent or guardian to agree for you before using Grasp.
        </p>
      </LegalSection>

      <LegalSection title="Keeping it secure">
        <p>
          The site is only served over HTTPS, passwords are hashed, the session cookie cannot be
          read by scripts on the page, and every request for your material is checked against
          your account. No system is perfectly secure, so use a password you do not use anywhere
          else.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          If this policy changes, this page will be updated and the date at the top will change. If
          a change affects how your information is used in a significant way, you will be emailed
          before it applies.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
