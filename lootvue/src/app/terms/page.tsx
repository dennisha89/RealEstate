import Link from "next/link";
import { BarChart3 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — LootVue",
  description: "Terms and conditions governing your use of the LootVue real estate intelligence platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-surface text-content-primary">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-surface/80 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-600 to-orange-500 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-white tracking-wider text-sm">LOOTVUE</span>
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
            <p className="text-gold-light text-xs font-semibold tracking-[0.12em] uppercase mb-3">Legal</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
              Terms of Service
            </h1>
            <p className="text-content-secondary text-sm">
              Last updated: March 15, 2026
            </p>
          </header>

          <div className="space-y-12 text-sm text-content-secondary leading-relaxed">

            {/* 1 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
              <p className="mb-4">
                These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;User,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) and LootVue Inc. (&ldquo;LootVue,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) governing your access to and use of the LootVue real estate intelligence platform, including all associated websites, applications, APIs, and services (collectively, the &ldquo;Service&rdquo;).
              </p>
              <p>
                By creating an account, accessing, or using the Service, you agree to be bound by these Terms. If you do not agree to all of these Terms, you may not access or use the Service. If you are using the Service on behalf of a business or entity, you represent and warrant that you have the authority to bind that entity to these Terms.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Description of Service</h2>
              <p className="mb-4">
                LootVue is a real estate intelligence and analytics platform that provides data-driven property analysis, market research, risk assessment, portfolio tracking, and investment insights. The Service aggregates data from public and licensed third-party sources, processes it through proprietary analytical engines, and presents users with structured analysis including scoring, verdicts, and market intelligence.
              </p>
              <div className="card border-amber/20 p-5 mb-4">
                <p className="text-amber-light font-semibold text-sm mb-2">Important Notice</p>
                <p className="text-content-secondary text-sm">
                  The Service is a data analytics and research tool. It does NOT provide financial advice, investment advice, tax advice, legal advice, or personalized recommendations. See Section 6 (Disclaimer of Financial Advice) and our <Link href="/disclaimer" className="text-gold-light hover:text-white transition-colors underline underline-offset-2">Investment Disclaimer</Link> for full details.
                </p>
              </div>
              <p>
                We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, with or without notice. We will make reasonable efforts to provide advance notice of material changes.
              </p>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. User Accounts</h2>

              <h3 className="text-base font-semibold text-content-primary mb-2">3.1 Account Creation</h3>
              <p className="mb-4">
                To access certain features of the Service, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete. Providing false, misleading, or outdated information may result in account suspension or termination.
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">3.2 Account Security</h3>
              <p className="mb-4">
                You are solely responsible for maintaining the confidentiality of your account credentials, including your password. You agree to immediately notify us of any unauthorized use of your account or any other breach of security. LootVue shall not be liable for any loss or damage arising from your failure to protect your account credentials. You are responsible for all activities that occur under your account, whether or not authorized by you.
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">3.3 Account Restrictions</h3>
              <p>
                You may not create more than one account per individual. Accounts are non-transferable. You may not share your account credentials with any third party. If you are accessing the Service on behalf of a company or organization, a separate enterprise agreement may be required.
              </p>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Acceptable Use</h2>
              <p className="mb-4">You agree that you will not, and will not permit any third party to:</p>
              <ul className="list-disc list-inside space-y-2 pl-2">
                <li>Use any automated means, including bots, scrapers, crawlers, or spiders, to access, collect, or extract data from the Service without our prior written consent.</li>
                <li>Reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code, algorithms, data models, or underlying structure of the Service or any component thereof.</li>
                <li>Redistribute, resell, sublicense, or commercially exploit any data, analysis, reports, or content obtained from the Service without our prior written consent.</li>
                <li>Use the Service to build a competing product or service, or to benchmark the Service against a competing product or service.</li>
                <li>Interfere with or disrupt the integrity, security, or performance of the Service, its servers, or networks connected to the Service.</li>
                <li>Attempt to gain unauthorized access to any portion of the Service, other accounts, computer systems, or networks connected to the Service.</li>
                <li>Use the Service to transmit any malicious code, viruses, or harmful content.</li>
                <li>Use the Service in any manner that violates any applicable local, state, national, or international law or regulation.</li>
                <li>Impersonate any person or entity, or falsely state or otherwise misrepresent your affiliation with a person or entity.</li>
                <li>Use data obtained from the Service to discriminate against individuals or groups in violation of fair housing laws or any other anti-discrimination laws.</li>
              </ul>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Intellectual Property</h2>

              <h3 className="text-base font-semibold text-content-primary mb-2">5.1 LootVue&rsquo;s Intellectual Property</h3>
              <p className="mb-4">
                The Service, including all software, algorithms, analytical engines, scoring methodologies, proprietary models, user interface design, visual design, trademarks, logos (including the &ldquo;LV&rdquo; mark and &ldquo;LOOTVUE&rdquo; word mark), documentation, and all content created by LootVue, is and shall remain the exclusive property of LootVue Inc. and its licensors. The Service is protected by copyright, trademark, trade secret, and other intellectual property laws. Nothing in these Terms grants you any right, title, or interest in the Service except for the limited right to use it in accordance with these Terms.
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">5.2 Your Data</h3>
              <p className="mb-4">
                You retain all ownership rights to the portfolio data, property information, financial inputs, and other content that you submit to the Service (&ldquo;User Data&rdquo;). By submitting User Data, you grant LootVue a limited, non-exclusive, worldwide license to use, process, and store your User Data solely for the purpose of providing and improving the Service. This license terminates when you delete your User Data or close your account, except with respect to data that has already been incorporated into anonymized, aggregate datasets.
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">5.3 Feedback</h3>
              <p>
                If you provide any suggestions, ideas, feedback, or recommendations regarding the Service (&ldquo;Feedback&rdquo;), you hereby assign to LootVue all rights in such Feedback and agree that LootVue may use and incorporate such Feedback without restriction, attribution, or compensation to you.
              </p>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Disclaimer of Financial Advice</h2>
              <div className="card border-rose/20 p-5">
                <p className="text-rose-light font-bold text-base mb-3 uppercase tracking-wide">Critical Disclaimer</p>
                <div className="space-y-3 text-content-secondary">
                  <p>
                    <span className="text-content-primary font-semibold">LootVue provides data and analysis, NOT investment advice.</span> The Service is a data analytics and research platform designed to help users organize, analyze, and visualize real estate market data. Nothing contained in the Service constitutes an offer, solicitation, or recommendation to buy, sell, hold, or otherwise transact in any real property or security.
                  </p>
                  <p>
                    <span className="text-content-primary font-semibold">We are not registered investment advisors.</span> LootVue Inc. is not registered as an investment adviser with the U.S. Securities and Exchange Commission (SEC) or with any state securities regulatory authority. We do not provide personalized investment advice, financial planning services, or fiduciary services.
                  </p>
                  <p>
                    <span className="text-content-primary font-semibold">All investment decisions are your own responsibility.</span> The analyses, scores, verdicts, confidence levels, and other outputs generated by the Service are algorithmic computations based on available data and should not be construed as personal recommendations. You should consult with qualified financial advisors, real estate attorneys, accountants, and other professionals before making any investment decisions.
                  </p>
                  <p>
                    For additional information, please review our full <Link href="/disclaimer" className="text-gold-light hover:text-white transition-colors underline underline-offset-2">Investment Disclaimer</Link>.
                  </p>
                </div>
              </div>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Limitation of Liability</h2>
              <p className="mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL LOOTVUE INTELLIGENCE, INC., ITS DIRECTORS, OFFICERS, EMPLOYEES, AGENTS, AFFILIATES, SUCCESSORS, OR ASSIGNS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, INVESTMENT LOSSES, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE SERVICE, REGARDLESS OF THE THEORY OF LIABILITY (CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE), EVEN IF LOOTVUE HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
              </p>
              <p className="mb-4">
                IN NO EVENT SHALL LOOTVUE&rsquo;S TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICE EXCEED THE GREATER OF (A) THE AMOUNTS YOU HAVE PAID TO LOOTVUE IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS ($100.00).
              </p>
              <p>
                SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES, SO SOME OF THE ABOVE LIMITATIONS MAY NOT APPLY TO YOU. IN SUCH JURISDICTIONS, LOOTVUE&rsquo;S LIABILITY SHALL BE LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Data Accuracy</h2>
              <p className="mb-4">
                While we strive for accuracy and obtain data from reputable sources including federal agencies (FRED, Census Bureau, Bureau of Labor Statistics), licensed data providers (ATTOM, RentCast), and other third parties, real estate data can be incomplete, delayed, or inaccurate. Property records may contain errors. Market conditions change rapidly. Publicly available data may lag behind actual conditions.
              </p>
              <p className="mb-4">
                <span className="text-content-primary font-semibold">Always verify critical data independently.</span> Before making any investment decision, you should independently verify all material data points, including but not limited to: property valuations, comparable sales, rental income estimates, tax assessments, zoning information, title status, and property condition.
              </p>
              <p>
                LootVue makes no warranty or representation regarding the accuracy, completeness, timeliness, or reliability of any data, analysis, or content provided through the Service. The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind, either express or implied.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">9. Subscription and Billing</h2>

              <h3 className="text-base font-semibold text-content-primary mb-2">9.1 Free Tier</h3>
              <p className="mb-4">
                LootVue offers a free tier that provides limited access to the Service, including a limited number of property analyses per month. The free tier is subject to usage limits and feature restrictions as described on our pricing page. We reserve the right to modify the scope of the free tier at any time.
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">9.2 Premium Subscriptions</h3>
              <p className="mb-4">
                Premium features, including unlimited analyses, advanced scoring, portfolio tracking, and report generation, are available through paid subscription plans. Subscription fees are billed in advance on a monthly or annual basis, depending on the plan selected. All fees are stated in U.S. dollars and are non-refundable except as expressly stated herein or required by applicable law.
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">9.3 Automatic Renewal</h3>
              <p className="mb-4">
                Paid subscriptions automatically renew at the end of each billing cycle unless cancelled before the renewal date. You will be charged the then-current rate for your plan at each renewal. We will provide reasonable notice of any price increases before they take effect.
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">9.4 Cancellation</h3>
              <p>
                You may cancel your subscription at any time through your account settings. Upon cancellation, you will retain access to premium features until the end of your current billing period. After that, your account will revert to the free tier. Cancellation does not entitle you to a refund of any prepaid fees. Your data will be retained and accessible under the free tier unless you request account deletion.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">10. Termination</h2>
              <p className="mb-4">
                We may suspend or terminate your access to the Service, in whole or in part, at any time and for any reason, including but not limited to: violation of these Terms, suspected fraudulent or illegal activity, extended periods of inactivity, or discontinuation of the Service. Where practicable, we will provide advance notice and an opportunity to export your data before termination.
              </p>
              <p className="mb-4">
                You may terminate your account at any time by contacting us or using the account deletion feature in your settings. Upon termination, your right to use the Service will immediately cease. Sections of these Terms that by their nature should survive termination shall survive, including but not limited to: intellectual property provisions, disclaimers, limitations of liability, and governing law.
              </p>
              <p>
                Upon account deletion, we will delete your personal data in accordance with our <Link href="/privacy" className="text-gold-light hover:text-white transition-colors underline underline-offset-2">Privacy Policy</Link>, subject to any legal retention obligations.
              </p>
            </section>

            {/* 11 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">11. Governing Law and Dispute Resolution</h2>
              <p className="mb-4">
                These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law principles. Any dispute arising out of or relating to these Terms or the Service shall be resolved exclusively in the state or federal courts located in Wilmington, Delaware, and you consent to the personal jurisdiction and venue of such courts.
              </p>
              <p>
                Before initiating any formal legal proceedings, you agree to first attempt to resolve any dispute informally by contacting us at <a href="mailto:legal@lootvue.com" className="text-gold-light hover:text-white transition-colors underline underline-offset-2">legal@lootvue.com</a>. We will attempt to resolve the dispute through good-faith negotiation within 30 days. If the dispute is not resolved within 30 days, either party may proceed with formal legal action as described above.
              </p>
            </section>

            {/* 12 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">12. General Provisions</h2>

              <h3 className="text-base font-semibold text-content-primary mb-2">12.1 Entire Agreement</h3>
              <p className="mb-4">
                These Terms, together with our Privacy Policy and Investment Disclaimer, constitute the entire agreement between you and LootVue regarding the Service and supersede all prior agreements, understandings, and communications, whether oral or written.
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">12.2 Severability</h3>
              <p className="mb-4">
                If any provision of these Terms is found to be unenforceable or invalid by a court of competent jurisdiction, that provision shall be enforced to the maximum extent permissible, and the remaining provisions shall remain in full force and effect.
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">12.3 Waiver</h3>
              <p className="mb-4">
                The failure of LootVue to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision. Any waiver of any provision of these Terms must be in writing and signed by LootVue.
              </p>

              <h3 className="text-base font-semibold text-content-primary mb-2">12.4 Assignment</h3>
              <p>
                You may not assign or transfer these Terms or your rights under these Terms without our prior written consent. LootVue may assign these Terms without restriction, including in connection with a merger, acquisition, reorganization, or sale of assets.
              </p>
            </section>

            {/* 13 */}
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">13. Contact Information</h2>
              <p className="mb-4">
                If you have questions about these Terms of Service, please contact us:
              </p>
              <div className="card p-5 space-y-2">
                <p className="text-content-primary font-medium">LootVue Inc.</p>
                <p>Email: <a href="mailto:legal@lootvue.com" className="text-gold-light hover:text-white transition-colors underline underline-offset-2">legal@lootvue.com</a></p>
                <p>General inquiries: <a href="mailto:hello@lootvue.com" className="text-gold-light hover:text-white transition-colors underline underline-offset-2">hello@lootvue.com</a></p>
              </div>
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
                <span className="text-gold-light text-xl font-serif">LV</span>
                <span className="font-display font-bold text-white tracking-wider text-sm">LOOTVUE</span>
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
            <span className="text-xs text-content-disabled">&copy; 2026 LootVue Inc.</span>
            <span className="text-xs text-content-disabled">Data: FRED &middot; Census &middot; BLS &middot; ATTOM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
