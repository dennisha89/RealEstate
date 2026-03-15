import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Xuan",
  description: "How Xuan collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-surface text-content-primary">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-surface/80 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-gold-light text-lg font-serif">&#x7384;</span>
            <span className="font-display font-bold text-white tracking-wider text-sm">XUAN</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm hidden sm:inline-flex">Log in</Link>
            <Link href="/signup" className="btn-primary btn-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* ── CONTENT ── */}
      <main className="pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">

          <header className="mb-16">
            <p className="text-accent-light text-xs font-semibold tracking-[0.12em] uppercase mb-3">Legal</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
              Privacy Policy
            </h1>
            <p className="text-content-secondary text-sm">
              Last updated: March 15, 2026
            </p>
          </header>

          <div className="space-y-12 text-sm text-content-secondary leading-relaxed">

            <p>
              Xuan Intelligence, Inc. (&ldquo;Xuan,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the Xuan real estate intelligence platform (the &ldquo;Service&rdquo;). This Privacy Policy describes how we collect, use, disclose, and protect your personal information when you access or use our Service, including our website, applications, and related services.
            </p>
            <p>
              By accessing or using the Service, you acknowledge that you have read, understood, and agree to the practices described in this Privacy Policy. If you do not agree with this policy, please do not use the Service.
            </p>

            {/* 1 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Information We Collect</h2>

              <h3 className="text-base font-semibold text-content-primary mb-2">1.1 Account Information</h3>
              <p className="mb-4">
                When you create an account, we collect information you provide directly, including your name, email address, password (stored in hashed form), and any optional profile details such as your investment experience level, geographic focus, or investment goals. If you subscribe to a paid plan, our third-party payment processor collects your billing information; we do not store full credit card numbers on our servers.
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">1.2 Property and Portfolio Data</h3>
              <p className="mb-4">
                When you use the Service to analyze properties, we collect and process the property addresses, financial inputs (purchase price, down payment, rental income estimates, expense assumptions), and any portfolio data you enter. This data is used exclusively to provide you with analysis results and to improve the accuracy of our analytical models.
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">1.3 Usage Data</h3>
              <p className="mb-4">
                We automatically collect information about how you interact with the Service, including pages viewed, features used, search queries entered, analyses generated, time spent on various sections, and the actions you take within the platform. This data helps us understand how the Service is used and how we can improve it.
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">1.4 Device and Technical Information</h3>
              <p>
                We automatically collect technical information when you access the Service, including your IP address, browser type and version, operating system, device type, screen resolution, referring URL, and general geographic location (city/region level, derived from IP address). We do not collect precise geolocation data unless you explicitly grant permission.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. How We Use Your Information</h2>

              <h3 className="text-base font-semibold text-content-primary mb-2">2.1 Providing and Operating the Service</h3>
              <p className="mb-4">
                We use your information to operate the platform, generate property analyses, produce scoring and verdicts, maintain your portfolio records, and deliver the features you request. Your property data is processed through our analytical engines to produce investment insights, risk assessments, and market intelligence.
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">2.2 Improving Analysis Accuracy</h3>
              <p className="mb-4">
                We use aggregated, de-identified usage patterns to improve the accuracy and relevance of our analytical models. For example, understanding which data points investors find most useful helps us prioritize data quality improvements. Individual user data is never used to train models in a way that could expose personal information.
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">2.3 Aggregate Anonymous Signals</h3>
              <p className="mb-4">
                We generate anonymized, aggregate market intelligence signals from the collective behavior of our user base. For example, we may report that &ldquo;investor interest in ZIP code 78701 increased 40% this month&rdquo; without identifying any individual user. These community signals are available to all users as part of the platform&rsquo;s market intelligence features. You may opt out of contributing to community signals at any time (see Section 5).
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">2.4 Communications</h3>
              <p>
                We use your email address to send transactional communications (account verification, password resets, analysis completion notifications), service announcements, and, if you opt in, marketing communications about new features or educational content. You may unsubscribe from non-transactional emails at any time using the link provided in each email.
              </p>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. Information Sharing and Disclosure</h2>

              <h3 className="text-base font-semibold text-content-primary mb-2">3.1 We Do Not Sell Personal Data</h3>
              <p className="mb-4">
                We do not sell, rent, or trade your personal information to third parties for their marketing purposes. We have never sold personal data and have no plans to do so.
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">3.2 Aggregate and De-identified Data</h3>
              <p className="mb-4">
                We may share aggregated, anonymized, and de-identified data that cannot reasonably be used to identify you. This includes market trends, aggregate usage statistics, and community intelligence signals. This data is used to enhance the platform experience for all users and may be shared in public reports or with research partners.
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">3.3 Service Providers</h3>
              <p className="mb-4">
                We share information with third-party service providers who assist us in operating the Service, including cloud infrastructure providers (Supabase, Vercel), payment processors (Stripe), email delivery services, and analytics tools. These providers are contractually obligated to use your information only to perform services on our behalf and are bound by confidentiality obligations.
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">3.4 Legal Requirements</h3>
              <p>
                We may disclose your information if required to do so by law, regulation, legal process, or governmental request, or when we believe disclosure is necessary to protect our rights, protect your safety or the safety of others, investigate fraud, or respond to a government request.
              </p>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Data Security</h2>
              <p className="mb-4">
                We implement and maintain reasonable administrative, technical, and physical security measures designed to protect your personal information from unauthorized access, disclosure, alteration, and destruction.
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><span className="text-content-primary font-medium">Encryption in transit:</span> All data transmitted between your browser and our servers is encrypted using TLS 1.3.</li>
                <li><span className="text-content-primary font-medium">Encryption at rest:</span> All personal data and portfolio information stored in our databases is encrypted at rest using AES-256 encryption.</li>
                <li><span className="text-content-primary font-medium">Infrastructure:</span> Our Service is built on Supabase infrastructure, which provides enterprise-grade security including row-level security, automated backups, and SOC 2 Type II compliance.</li>
                <li><span className="text-content-primary font-medium">Access controls:</span> Employee access to user data is restricted on a need-to-know basis, logged, and regularly audited.</li>
                <li><span className="text-content-primary font-medium">Authentication:</span> User passwords are hashed using bcrypt with appropriate cost factors. We support and encourage the use of strong, unique passwords.</li>
              </ul>
              <p className="mt-4">
                No method of electronic transmission or storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security. You are responsible for maintaining the confidentiality of your account credentials.
              </p>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Your Rights and Choices</h2>
              <p className="mb-4">
                Depending on your jurisdiction, you may have the following rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><span className="text-content-primary font-medium">Access:</span> You may request a copy of the personal information we hold about you. You can access most of your data directly through your account settings at any time.</li>
                <li><span className="text-content-primary font-medium">Deletion:</span> You may request deletion of your account and associated personal data. Upon verified request, we will delete your data within 30 days, except where retention is required by law or for legitimate business purposes (e.g., fraud prevention). Aggregated, de-identified data that has already been incorporated into anonymous datasets will not be deleted.</li>
                <li><span className="text-content-primary font-medium">Portability:</span> You may request an export of your portfolio data, analysis history, and account information in a machine-readable format (JSON or CSV).</li>
                <li><span className="text-content-primary font-medium">Correction:</span> You may update or correct your personal information through your account settings or by contacting us.</li>
                <li><span className="text-content-primary font-medium">Opt-out of community signals:</span> You may opt out of contributing your anonymized usage data to aggregate community intelligence signals. This can be done in your account privacy settings. Opting out will not affect your access to the Service, but you may see less relevant community-derived market signals.</li>
              </ul>
              <p className="mt-4">
                To exercise any of these rights, contact us at <a href="mailto:legal@xuan.ai" className="text-accent-light hover:text-white transition-colors underline underline-offset-2">legal@xuan.ai</a>. We will respond to verified requests within 30 days.
              </p>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Cookies and Tracking Technologies</h2>

              <h3 className="text-base font-semibold text-content-primary mb-2">6.1 Essential Cookies</h3>
              <p className="mb-4">
                We use strictly necessary cookies to authenticate your session, maintain your login state, remember your security preferences, and ensure the Service functions correctly. These cookies cannot be disabled without impairing the operation of the Service.
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">6.2 Analytics Cookies</h3>
              <p className="mb-4">
                We use analytics cookies and similar technologies to understand how users interact with the Service, identify performance issues, and measure the effectiveness of features. Analytics data is aggregated and does not directly identify individual users. You may opt out of analytics tracking through your browser settings or by using browser extensions that block analytics scripts.
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">6.3 Preference Cookies</h3>
              <p>
                We use preference cookies to remember your settings, such as your preferred dashboard layout, currency format, default analysis parameters, and theme preferences. These cookies enhance your experience but are not strictly necessary to use the Service.
              </p>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. California Privacy Rights (CCPA)</h2>
              <p className="mb-4">
                If you are a California resident, the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA) provide you with specific rights regarding your personal information. In addition to the rights described in Section 5, California residents have the right to:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li><span className="text-content-primary font-medium">Know:</span> Request disclosure of the categories and specific pieces of personal information we have collected about you, the categories of sources from which it was collected, the business purpose for collecting it, and the categories of third parties with whom it has been shared.</li>
                <li><span className="text-content-primary font-medium">Delete:</span> Request deletion of personal information collected from you, subject to certain exceptions permitted by law.</li>
                <li><span className="text-content-primary font-medium">Non-discrimination:</span> You will not be discriminated against for exercising your CCPA rights. We will not deny you services, charge different prices, or provide a different quality of service because you exercised your privacy rights.</li>
                <li><span className="text-content-primary font-medium">Opt-out of sale:</span> We do not sell personal information as defined by the CCPA. Therefore, there is no need to opt out. If our practices change, we will update this policy and provide a &ldquo;Do Not Sell My Personal Information&rdquo; link.</li>
              </ul>
              <p className="mt-4">
                To submit a CCPA request, contact us at <a href="mailto:legal@xuan.ai" className="text-accent-light hover:text-white transition-colors underline underline-offset-2">legal@xuan.ai</a>. We will verify your identity before processing your request. You may also designate an authorized agent to make a request on your behalf.
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Children&rsquo;s Privacy</h2>
              <p>
                The Service is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from anyone under 18 years of age. Real estate investment analysis is an adult financial activity, and our Service is designed exclusively for adult users. If we become aware that we have collected personal information from a person under 18, we will take steps to delete that information promptly. If you are a parent or guardian and believe your child has provided us with personal information, please contact us at <a href="mailto:legal@xuan.ai" className="text-accent-light hover:text-white transition-colors underline underline-offset-2">legal@xuan.ai</a>.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">9. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our practices, technologies, legal requirements, or other factors. When we make material changes, we will notify you by posting the updated policy on this page with a revised &ldquo;Last updated&rdquo; date, and, where required by applicable law, we will provide additional notice (such as an email notification or an in-app banner). Your continued use of the Service after the effective date of any changes constitutes your acceptance of the revised policy. We encourage you to review this policy periodically.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">10. Contact Information</h2>
              <p className="mb-4">
                If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="card p-5 space-y-2">
                <p className="text-content-primary font-medium">Xuan Intelligence, Inc.</p>
                <p>Email: <a href="mailto:legal@xuan.ai" className="text-accent-light hover:text-white transition-colors underline underline-offset-2">legal@xuan.ai</a></p>
                <p>Privacy inquiries: <a href="mailto:privacy@xuan.ai" className="text-accent-light hover:text-white transition-colors underline underline-offset-2">privacy@xuan.ai</a></p>
              </div>
              <p className="mt-4 text-content-tertiary text-xs">
                We aim to respond to all privacy-related inquiries within 30 business days.
              </p>
            </section>

          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/[0.06] py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <span className="text-gold-light text-xl font-serif">&#x7384;</span>
                <span className="font-display font-bold text-white tracking-wider text-sm">XUAN</span>
              </Link>
              <p className="text-xs text-content-tertiary leading-relaxed">
                Real estate intelligence for investors<br />who refuse to guess.
              </p>
            </div>
            {[
              { t: "Product", l: [{ name: "Features", href: "/#features" }, { name: "Pricing", href: "/#pricing" }] },
              { t: "Company", l: [{ name: "About", href: "#" }, { name: "Blog", href: "#" }] },
              { t: "Legal", l: [{ name: "Privacy", href: "/privacy" }, { name: "Terms", href: "/terms" }, { name: "Disclaimer", href: "/disclaimer" }] },
            ].map((c) => (
              <div key={c.t}>
                <div className="text-[11px] font-semibold text-content-tertiary uppercase tracking-wider mb-4">{c.t}</div>
                <ul className="space-y-2">{c.l.map((l) => <li key={l.name}><Link href={l.href} className="text-sm text-content-secondary hover:text-white transition-colors">{l.name}</Link></li>)}</ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.06] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-content-disabled">&copy; 2026 Xuan Intelligence, Inc.</span>
            <span className="text-xs text-content-disabled">Data: FRED &middot; Census &middot; BLS &middot; ATTOM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
