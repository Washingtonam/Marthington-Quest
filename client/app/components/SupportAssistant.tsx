'use client';

import { FormEvent, useMemo, useState } from 'react';

const TOPIC_LABELS: Record<string, string> = {
  registration: 'registration and entry questions',
  payment: 'payment and checkout support',
  voting: 'voting and leaderboard support',
  general: 'general questions about the campaign',
};

export default function SupportAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [topic, setTopic] = useState('general');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [details, setDetails] = useState('');

  const whatsappLink = useMemo(() => {
    const subject = TOPIC_LABELS[topic] || TOPIC_LABELS.general;
    const intro = [
      'Hello Marthington support,',
      `I need help with ${subject}.`,
      name ? `My name is ${name}.` : '',
      email ? `My email is ${email}.` : '',
      details ? `My message: ${details}` : 'Please guide me with the next step.',
      'Thank you.',
    ]
      .filter(Boolean)
      .join(' ');

    return `https://wa.me/2348129097599?text=${encodeURIComponent(intro)}`;
  }, [details, email, name, topic]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.open(whatsappLink, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
    setTopic('general');
    setName('');
    setEmail('');
    setDetails('');
  };

  return (
    <>
      <div className="support-float">
        <button type="button" className="support-trigger" onClick={() => setIsOpen(true)}>
          Need help?
        </button>
      </div>

      {isOpen && (
        <div className="support-overlay" role="dialog" aria-modal="true" aria-label="Marthington support assistant">
          <div className="support-modal">
            <div className="support-modal__header">
              <div>
                <p className="eyebrow">Marthington support</p>
                <h2>Let us help you faster</h2>
              </div>
              <button type="button" className="support-close" onClick={() => setIsOpen(false)} aria-label="Close support assistant">
                ×
              </button>
            </div>

            <p className="support-modal__intro">
              Share what you need and we will open WhatsApp with a clear summary so our team can respond quickly.
            </p>

            <form className="support-form" onSubmit={handleSubmit}>
              <label className="field">
                What do you need help with?
                <select value={topic} onChange={(event) => setTopic(event.target.value)}>
                  <option value="general">General question</option>
                  <option value="registration">Registration</option>
                  <option value="payment">Payment</option>
                  <option value="voting">Voting</option>
                </select>
              </label>

              <label className="field">
                Your name
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Amina Yusuf" required />
              </label>

              <label className="field">
                Email address
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
              </label>

              <label className="field">
                Tell us more
                <textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={5} placeholder="Describe the issue, what you were trying to do, or anything we should know before replying." required />
              </label>

              <div className="support-actions">
                <button type="submit" className="btn-primary">Open WhatsApp</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
