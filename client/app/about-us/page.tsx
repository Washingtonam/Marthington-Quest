import Link from 'next/link';

export const metadata = {
  title: 'About Us | Marthington Baby Quest',
  description: 'Learn more about Marthington Baby Quest and our mission in Abuja.',
};

export default function AboutUsPage() {
  return (
    <main className="policy-shell">
      <section className="card policy-card">
        <p className="eyebrow">Our story</p>
        <h1>About Marthington Baby Quest</h1>
        <p className="muted">
          Marthington Baby Quest is a modern, family-first celebration of beauty, charm, confidence, and joy. We exist to give parents, guardians, and communities a beautiful platform to spotlight adorable children while raising the energy around a meaningful and memorable campaign.
        </p>

        <div className="policy-content">
          <h2>What we do</h2>
          <p>
            We create a polished and welcoming experience for families to register their babies, share their stories, and connect with supporters who want to celebrate them. From the first click on the landing page to the final vote tally, we place clarity, trust, and ease at the center of the experience.
          </p>

          <h2>Why we launched</h2>
          <p>
            Our mission is to bring together the warmth of community with the excitement of a well-managed competition. We believe every child deserves to be seen, celebrated, and appreciated, and we are proud to offer a platform that blends creativity, technology, and service with a strong sense of professionalism.
          </p>

          <h2>Our standards</h2>
          <p>
            Every experience on our platform is built with care. We focus on secure registrations, transparent communication, responsive support, and a clean user experience so families feel confident while participating. We are committed to making the campaign not only fun, but also trustworthy and polished.
          </p>

          <h2>Where we are</h2>
          <p>
            Marthington Baby Quest is proudly rooted in Abuja, Nigeria. Our team works closely with families, partners, and supporters to create a campaign that feels local, personal, and impactful while still delivering a premium digital experience.
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
