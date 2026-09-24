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
      updated="18 September 2026"
      intro="This explains what Grasp collects when you use it, what happens to it, who else handles it, and how to get it deleted. Grasp is a study tool for students, so it collects only what it needs to run your notebooks, and nothing for advertising."
    >
      <LegalSection title="What Grasp stores">
        <ul>
          <li>
            <b>Your account:</b> your name, your email address, and your password. The password is
            stored as a one-way scrypt hash, never as the password itself.
          </li>
          <li>
            <b>Your plan and setup answers:</b> which plan you are on, when your free trial ends,
            when you cancelled your plan if you have, and
            your answers to the three questions asked when you set up your account: your year level,
            how you plan to use Grasp, and what you most want help with.
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
            <b>Usage records:</b> when you generate a quiz or make a recording, with the time, so
            Grasp can apply your plan&apos;s weekly limits.
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
            form of a reference to the card used, so that the same card cannot be used to claim a
            second free trial under a different account. It cannot be turned back into your card
            details.
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
            <b>Visits and sign-up steps:</b> when you open the home, sign-up, log-in or legal pages,
            Grasp records which page it was, the site that linked you there and any campaign tag in
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
        <p>Grasp relies on four services to run:</p>
        <ul>
          <li>
            <b>OpenAI</b> provides the AI features. When you use one, the material it needs is sent
            to OpenAI: your note text, a highlighted passage and your question, lecture audio,
            timetable screenshots, Resource Bank documents, or your quiz answers. Under OpenAI&apos;s
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
            <b>Resend</b> sends the email that confirms your address and any password reset email you
            ask for. It receives your email address, your name and the link, and nothing from your
            study material.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Cookies and local storage">
        <p>
          Grasp sets one cookie, <code>grasp_session</code>, which keeps you logged in. It can only be
          read by Grasp&apos;s server, and it expires after 30 days or when you log out. It is
          strictly necessary for your account to work, which is why Grasp does not show a cookie
          banner asking you to accept it. Grasp&apos;s own staff may also have a{" "}
          <code>grasp_admin</code> cookie, used only for testing; it is never set for students and
          is deleted when the browser closes.
        </p>
        <p>
          Grasp also stores one setting in your browser: whether you have hidden the tip at the
          bottom of the notes editor. It never leaves your device.
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
          described above. It has to, or deleting an account would let the same card claim another
          free trial. What is left behind is that scrambled reference and the date, with your name
          removed from it, so it no longer identifies you.
        </p>
      </LegalSection>

      <LegalSection title="Getting a copy of your information">
        <p>
          Grasp does not have a download or export feature yet. To ask for a copy of your
          information, to correct something, or to ask anything else about your privacy, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand-700 hover:underline">
            {CONTACT_EMAIL}
          </a>
          .
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
          If this policy changes, this page will be updated and the date at the top will change.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
