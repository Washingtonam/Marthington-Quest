import Link from 'next/link';

export const metadata = {
  title: 'About Quest',
  description: 'Learn about Quest, an online home for competitions and community voting.',
};

export default function AboutUsPage() {
  return (
    <main className="policy-shell">
      <section className="card policy-card">
        <p className="eyebrow">Our story</p>
        <h1>About Quest</h1>
        <p className="muted">
          Quest is an online home for competitions where people can discover contestants, share their stories, and cast votes. Our current featured competition, Marthington Baby Quest, celebrates young contestants and the families and supporters cheering them on.
        </p>

        <div className="policy-content">
          <h2>What we do</h2>
          <p>
            Quest brings competition entries, contestant profiles, and community voting together in one place. The current Marthington Baby Quest registration is designed for parents and guardians entering a child.
          </p>

          <h2>Why we launched</h2>
          <p>
            Our mission is to make it easier for communities to take part in competitions and celebrate the people and ideas they support. Marthington Baby Quest is the first competition featured on Quest.
          </p>

          <h2>Our standards</h2>
          <p>
            We focus on clear competition information, reliable registration and voting, responsive support, and a straightforward experience for participants and voters.
          </p>

          <h2>Where we are</h2>
          <p>
            Quest is operated by Marthington Entertainment and Associates in Abuja, Nigeria. Marthington Baby Quest is our current local competition, bringing families and supporters together online.
          </p>

          <h2>Contact us</h2>
          <p>
            For questions, support, or partnership requests, please reach us at <a href="mailto:admin@marthington.com">admin@marthington.com</a> or call <a href="tel:+2348085426005">+234 808 542 6005</a>.
          </p>
        </div>

        <div className="policy-footer">
          <Link href="/" className="btn-secondary">Back home</Link>
        </div>
      </section>
    </main>
  );
}
