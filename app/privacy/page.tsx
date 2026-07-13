import Link from 'next/link'
import LegalPage, { LegalSection } from '@/components/LegalPage'

export const metadata = { title: 'Privacy Policy | Win the Inning' }

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 13, 2026">
      <LegalSection heading="What we collect">
        <ul>
          <li><strong>Your Google account basics</strong> — name, email address, and profile photo, used to create and sign in to your account. We never see your Google password.</li>
          <li><strong>What you put in the app</strong> — your daily tasks, goals, reflections, season settings, team name, and anything else you type in.</li>
          <li><strong>Social data you choose to share</strong> — your username, team membership, nudges, and team feed activity.</li>
          <li><strong>Notification data</strong> — if you turn on reminders, we store a push subscription for your device and your timezone so reminders arrive at a sensible hour.</li>
        </ul>
        <p>That&apos;s it. There are no ads, no analytics trackers, and no data brokers.</p>
      </LegalSection>

      <LegalSection heading="How we use it">
        <p>Only to run the app: showing you your season, powering team features you opt into, and sending the notifications you asked for. We do not sell or rent your data to anyone.</p>
      </LegalSection>

      <LegalSection heading="What others can see">
        <p>By default, your data is private to you. Three things are shared only when you choose:</p>
        <ul>
          <li>If you claim a <strong>username</strong>, your public profile page (win/loss record and team name) is visible to anyone with the link.</li>
          <li>If you turn on <strong>&ldquo;Make me findable&rdquo;</strong>, other players can find you by name (and email, if you add one).</li>
          <li>If you join a <strong>team</strong>, teammates see your name, mascot, and daily results in the team feed and scoreboard.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Where it lives">
        <p>Data is stored with Supabase (our database provider) and the app is hosted on Vercel. Sign-in is handled by Google. Each of these providers processes data only to provide their service to us.</p>
      </LegalSection>

      <LegalSection heading="Deleting your data">
        <p>Email <a href="mailto:fischert39@gmail.com">fischert39@gmail.com</a> from your account&apos;s email address and we&apos;ll delete your account and all associated data.</p>
      </LegalSection>

      <LegalSection heading="Age">
        <p>Win the Inning is not directed at children under 13. If you believe a child under 13 has an account, contact us and we&apos;ll remove it.</p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>If this policy changes in a meaningful way, we&apos;ll note the new date at the top of this page. Questions? Email <a href="mailto:fischert39@gmail.com">fischert39@gmail.com</a>.</p>
      </LegalSection>

      <p className="text-sm">
        See also our <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  )
}
