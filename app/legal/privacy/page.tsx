import type { Metadata } from "next";
import { CONTACT_EMAIL, LegalPage } from "@/components/LegalPage";
import { LegalSection } from "@/components/LegalSection";

export const metadata: Metadata = { title: "Privacy Policy | Grasp" };

// Keep this page true to the code. If what Grasp stores, sends or keeps changes
// (db/schema.sql, lib/openai.ts, anything that sets a cookie), change it here too.

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="11 September 2026"
      intro="This explains what Grasp collects when you use it, what happens to it, who else handles it, and how to get it deleted. Grasp is a study tool for students, so it collects only what it needs to run your notebooks, and nothing for advertising."
    >
      <LegalSection title="What Grasp stores">
        <ul>
          <li>
            <b>Your account:</b> your name, your email address, and your password. The password is
            stored as a one-way scrypt hash, never as the password itself.
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
            <b>Sessions:</b> a record of each device you are logged in on, so you stay logged in.
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
          to apply your plan&apos;s limits, and to look into answers you flag. It is not used to
          advertise to you, and Grasp does not use it to train AI models.
        </p>
      </LegalSection>

      <LegalSection title="Who else handles your information">
        <p>Grasp relies on two services to run:</p>
        <ul>
          <li>
            <b>OpenAI</b> provides the AI features. When you use one, the material it needs is sent
            to OpenAI: your note text, a highlighted passage and your question, lecture audio,
            timetable screenshots, Resource Bank documents, or your quiz answers. Under OpenAI&apos;s
            API terms this is not used to train their models, and it may be kept by OpenAI for up to
            30 days to monitor for abuse before being deleted.
          </li>
          <li>
            <b>Railway</b> hosts the website and the database your account and study material are
            stored in. Like any web host, it handles technical details of each request, such as
            your IP address, to deliver the site and keep it secure.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Cookies and local storage">
        <p>
          Grasp sets one cookie, <code>grasp_session</code>, which keeps you logged in. It can only be
          read by Grasp&apos;s server, and it expires after 30 days or when you log out. It is
          strictly necessary for your account to work, which is why Grasp does not show a cookie
          banner asking you to accept it.
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
          and everything stored with it: study material, usage records, flagged answers and
          sessions. It cannot be undone.
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
