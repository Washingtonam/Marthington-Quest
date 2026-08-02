import Link from 'next/link';

export const metadata = {
  title: 'Terms and Conditions | Marthington Baby Quest',
  description: 'Legal terms and conditions for using Marthington Baby Quest.',
};

export default function TermsPage() {
  return (
    <main className="policy-shell">
      <section className="card policy-card">
        <p className="eyebrow">Legal terms</p>
        <h1>Terms and Conditions</h1>
        <p className="muted">
          These Terms and Conditions (“Terms”) govern your use of the Marthington Baby Quest website, mobile experience, entry registration flow, voting platform, and related services (collectively, the “Platform”). By accessing or using the Platform, you acknowledge that you have read, understood, and agreed to be bound by these Terms.
        </p>

        <div className="policy-content">
          <h2>1. Acceptance of Terms</h2>
          <p>
            Marthington Baby Quest is operated by Marthington Entertainment and Associates (“we”, “our”, or “us”), based in Abuja, Nigeria. These Terms form a legally binding agreement between you and us. If you do not agree with any part of these Terms, you must discontinue use of the Platform immediately.
          </p>

          <h2>2. Eligibility</h2>
          <p>
            You must be at least 18 years old to register as a contestant or submit payment information. Parents, guardians, or legal representatives may register a child on their behalf. You represent that all information you submit is accurate, complete, and lawful.
          </p>

          <h2>3. Account and Registration</h2>
          <p>
            Registration requires the submission of personal and contestant details, including photographs, contact information, and payment information where applicable. You are responsible for keeping your account information accurate and secure. We reserve the right to reject, remove, suspend, or deny any registration that violates these Terms or harms the integrity of the competition.
          </p>

          <h2>4. Contest Rules</h2>
          <p>
            Entries must be lawful, original, and respectful. You may not submit content that infringes on third-party rights, includes explicit, abusive, or discriminatory material, or contains false statements. By submitting an entry, you grant us the right to display, publish, promote, and reproduce the submitted image and accompanying information for marketing, publicity, archival, and administrative purposes related to the competition.
          </p>

          <h2>5. Payments and Fees</h2>
          <p>
            Entry fees, where applicable, are payable through approved payment channels and may be subject to processing charges, taxes, or banking fees. All amounts are stated in Nigerian Naira unless otherwise indicated. We do not guarantee refunds except where required by law, a payment error occurs, or a booking is cancelled by us under applicable circumstances. Once a payment is confirmed, the entry is deemed accepted subject to our review and approval process.
          </p>

          <h2>6. Voting and Conduct</h2>
          <p>
            Voting is intended to be fair and community-based. You may not use automated tools, bots, fraudulent accounts, multiple identities, or manipulative tactics to influence vote outcomes. We reserve the right to invalidate suspicious votes, remove entries, or disqualify participants where vote manipulation is suspected.
          </p>

          <h2>7. Intellectual Property</h2>
          <p>
            The Platform, branding, text, graphics, software, designs, and content are owned or licensed by us and protected by copyright, trademark, and other intellectual property laws. You may not copy, scrape, redistribute, or alter our materials without prior written consent, except for personal use in accordance with these Terms.
          </p>

          <h2>8. Privacy and Data Protection</h2>
          <p>
            We will process your personal data in line with applicable privacy laws and our privacy practices. By using the Platform, you consent to the collection, processing, storage, and limited sharing of your data for registration, verification, payment processing, communication, moderation, and lawful business operations. We take commercially reasonable steps to secure personal information, but no digital system is completely immune to compromise.
          </p>

          <h2>9. Communication and Consent</h2>
          <p>
            By providing your contact details, you consent to receive administrative messages, competition updates, and support communications from us via email, SMS, or WhatsApp where relevant. You may opt out of non-essential promotional communications at any time, but essential service messages may still be sent where legally permitted.
          </p>

          <h2>10. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, we shall not be liable for indirect, incidental, consequential, special, or punitive damages, including loss of business, reputational harm, or loss of data, arising from your use of the Platform. Our total liability for any claim shall not exceed the amount you paid to us for the relevant service, if any.
          </p>

          <h2>11. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Marthington Entertainment and Associates, its directors, employees, agents, and affiliates from any claims, liabilities, losses, or expenses arising from your misuse of the Platform, violation of these Terms, or infringement of third-party rights.
          </p>

          <h2>12. Termination</h2>
          <p>
            We may suspend or terminate your access to the Platform at any time for conduct that violates these Terms, undermines the competition, or presents a security risk. Upon termination, your rights to use the Platform will cease immediately.
          </p>

          <h2>13. Governing Law</h2>
          <p>
            These Terms shall be governed by the laws of the Federal Republic of Nigeria. Any dispute arising from or related to these Terms shall be subject to the exclusive jurisdiction of the courts of the Federal Capital Territory, Abuja, unless otherwise required by law.
          </p>

          <h2>14. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time to reflect changes in law, platform features, or operational requirements. Continued use of the Platform after updates constitutes your acceptance of the revised Terms.
          </p>
        </div>

        <div className="policy-footer">
          <p>Contact us at <a href="mailto:admin@marthington.com">admin@marthington.com</a> for any questions.</p>
          <Link href="/" className="btn-secondary">Back home</Link>
        </div>
      </section>
    </main>
  );
}
