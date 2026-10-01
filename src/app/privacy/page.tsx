export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-white">
      <a href="/" className="text-sm text-cyan-400 hover:underline">
        ← MoneyPulse
      </a>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: September 2026 · Uzbekistan</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-300">
        <section>
          <h2 className="text-base font-semibold text-white">1. Who we are</h2>
          <p className="mt-2">
            MoneyPulse is a personal finance tracker with AI insights. Contact:{" "}
            <a className="text-cyan-400" href="mailto:privacy@moneypulse.app">
              privacy@moneypulse.app
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">2. What we collect</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Account data: name, email, password hash (scrypt — never plain text).</li>
            <li>Financial data you enter: transactions, budgets, goals, accounts.</li>
            <li>Optional: SMS text you paste, receipt images you upload for OCR.</li>
            <li>Technical: session cookie (httpOnly JWT), basic rate-limit keys.</li>
          </ul>
          <p className="mt-2">
            We do <strong className="text-white">not</strong> scrape your phone SMS, do not connect to
            banks without your explicit action, and do not sell personal data.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">3. How we use data</h2>
          <p className="mt-2">
            To provide the product (balances, pulse score, budgets), improve features, prevent abuse
            (rate limits), and — only if you use AI chat/OCR — send minimal context (amounts,
            categories, optional image) to a model provider to generate a reply.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">4. Storage & security</h2>
          <p className="mt-2">
            Production: data in Postgres (e.g. Neon/Supabase). Passwords: scrypt. Sessions: signed JWT
            in httpOnly cookies. TLS in transit on hosted deployments. You should set a strong{" "}
            <code className="text-cyan-300">JWT_SECRET</code> and never share it.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">5. Your rights</h2>
          <p className="mt-2">
            Export or delete data from Settings. Request access or deletion via email. You may stop
            using external AI and rely on the local rule engine only.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">6. Children</h2>
          <p className="mt-2">MoneyPulse is not directed at children under 16.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">7. Changes</h2>
          <p className="mt-2">
            We may update this policy; the date above will change. Continued use means you accept the
            updated policy.
          </p>
        </section>
      </div>
    </div>
  );
}
