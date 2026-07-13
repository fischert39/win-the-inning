import Link from 'next/link'
import LegalPage, { LegalSection } from '@/components/LegalPage'

export const metadata = { title: 'Terms of Service | Win the Inning' }

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="July 13, 2026">
      <LegalSection heading="The deal">
        <p>Win the Inning is a personal-development habit tracker built around a baseball season. By creating an account you agree to these terms. If you don&apos;t agree, don&apos;t use the app.</p>
      </LegalSection>

      <LegalSection heading="Your content">
        <p>Everything you enter — goals, reflections, tasks — is yours. You give us permission to store and display it back to you (and to teammates, for the things you choose to share) so the app can work. We claim no other rights to it.</p>
      </LegalSection>

      <LegalSection heading="Fair play">
        <p>Don&apos;t use the app to harass others, send abusive nudges, impersonate people, probe or disrupt the service, or break the law. Team features exist to encourage teammates — keep it that way. We may suspend or remove accounts that don&apos;t.</p>
      </LegalSection>

      <LegalSection heading="The service">
        <p>The app is provided as-is, without warranties of any kind. We work hard to keep it fast and reliable, but we can&apos;t promise uninterrupted service or that your data will never be lost — please don&apos;t use the app as the only home of anything irreplaceable. To the maximum extent permitted by law, our liability to you is limited to the amount you&apos;ve paid us to use the app.</p>
      </LegalSection>

      <LegalSection heading="Leaving">
        <p>You can stop using the app anytime, and you can have your account and data deleted by emailing <a href="mailto:fischert39@gmail.com">fischert39@gmail.com</a>.</p>
      </LegalSection>

      <LegalSection heading="Changes">
        <p>If these terms change in a meaningful way, we&apos;ll note the new date at the top of this page. Continued use after a change means you accept the updated terms.</p>
      </LegalSection>

      <p className="text-sm">
        See also our <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  )
}
