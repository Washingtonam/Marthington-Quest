'use client';

import { useEffect, useState } from 'react';

export default function RegisterPage() {
  const [formState, setFormState] = useState({
    email: '',
    firstName: '',
    lastName: '',
    ageLabel: '',
    nickname: '',
    whatsapp: '',
    category: 'nature',
    photoTitle: '',
    bio: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [entryFee, setEntryFee] = useState<number | null>(null);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const f = event.target.files?.[0] ?? null;
    if (f) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    } else {
      setFile(null);
      setPreview(null);
    }
  };

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch(`${apiBaseUrl}/api/settings`);
        if (!res.ok) return;
        const data = await res.json();
        setEntryFee(Number(data.entryFee ?? 0));
      } catch {
        // ignore
      }
    }

    loadSettings();
  }, [apiBaseUrl]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('Preparing your registration...');

    try {
      let imageUrl = '';
      if (file) {
        const form = new FormData();
        form.append('image', file);

        const upRes = await fetch(`${apiBaseUrl}/api/contestants/upload`, {
          method: 'POST',
          body: form,
        });

        if (!upRes.ok) {
          const e = await upRes.json().catch(() => ({}));
          throw new Error(e.message || 'Image upload failed');
        }

        const upData = await upRes.json();
        imageUrl = upData.url;
      }

      const payload = {
        email: formState.email,
        firstName: formState.firstName,
        lastName: formState.lastName,
        ageLabel: formState.ageLabel,
        nickname: formState.nickname,
        whatsapp: formState.whatsapp,
        photoTitle: formState.photoTitle,
        photoDescription: formState.bio,
        category: formState.category,
        imageUrl,
      };

      const createRes = await fetch(`${apiBaseUrl}/api/contestants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        const errorData = await createRes.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create registration');
      }

      const contestant = await createRes.json();
      const effectiveEntryFee = entryFee ?? Number(process.env.NEXT_PUBLIC_ENTRY_FEE_NAIRA || '0');

      if (effectiveEntryFee === 0) {
        const freeRes = await fetch(`${apiBaseUrl}/api/payments/entry`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contestantId: contestant._id,
            amount: 0,
            method: 'free',
            reference: `free_${Date.now()}`,
          }),
        });

        const freeData = await freeRes.json();
        if (!freeRes.ok) {
          throw new Error(freeData.message || 'Free entry registration failed');
        }

        setStatus('Registration complete — no payment required. Redirecting to profile...');
        window.location.href = contestant.shareUrl;
        return;
      }

      const initRes = await fetch(`${apiBaseUrl}/api/payments/flutterwave/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: effectiveEntryFee,
          currency: 'NGN',
          customer_email: formState.email,
          payment_type: 'entry',
          meta: { contestantId: contestant._id, tier: 'standard' },
        }),
      });

      const initData = await initRes.json();
      if (!initRes.ok || !initData.link) {
        throw new Error(initData.message || 'Failed to initialize entry payment');
      }

      setStatus('Redirecting to payment...');
      window.location.href = initData.link;
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <main className="page-shell">
      <div className="page-header">
        <div>
          <p className="eyebrow">Contestant registration</p>
          <h1>Register a contestant</h1>
          <p className="muted">Complete the form below, upload a photo, then finish payment to submit your entry.</p>
          <p className="muted">Entry fee: ₦{entryFee ?? process.env.NEXT_PUBLIC_ENTRY_FEE_NAIRA ?? '0'}</p>
        </div>
      </div>

      <div className="card form-card">
        <form className="input-grid" onSubmit={handleSubmit}>
          <label className="field">
            Email Address
            <input name="email" type="email" value={formState.email} onChange={handleChange} required />
          </label>

          <label className="field">
            Child's First Name
            <input name="firstName" value={formState.firstName} onChange={handleChange} required />
          </label>

          <label className="field">
            Child's Last Name
            <input name="lastName" value={formState.lastName} onChange={handleChange} />
          </label>

          <label className="field">
            Child's Age (eg. 5 Months, 2 Years)
            <input name="ageLabel" placeholder="Age: 8 years maximum" value={formState.ageLabel} onChange={handleChange} />
          </label>

          <label className="field">
            Child's Nickname
            <input name="nickname" value={formState.nickname} onChange={handleChange} />
          </label>

          <label className="field">
            WhatsApp Number
            <input name="whatsapp" value={formState.whatsapp} onChange={handleChange} placeholder="e.g. +2348012345678" />
          </label>

          <label className="field">
            Photo title
            <input name="photoTitle" value={formState.photoTitle} onChange={handleChange} placeholder="e.g. Sunrise in the Delta" />
          </label>

          <label className="field">
            Category
            <select name="category" value={formState.category} onChange={handleChange}>
              <option value="nature">Nature</option>
              <option value="portrait">Portrait</option>
              <option value="travel">Travel</option>
              <option value="street">Street</option>
              <option value="lifestyle">Lifestyle</option>
            </select>
          </label>

          <label className="field">
            Upload contestant photo
            <div className="file-input-wrapper">
              <input type="file" accept="image/*" onChange={handleFile} />
              {preview && <img src={preview} className="preview-image" alt="preview" />}
            </div>
          </label>

          <label className="field">
            Additional information
            <textarea name="bio" value={formState.bio} onChange={handleChange} rows={4} />
          </label>

          <div className="form-actions">
            <button type="submit" className="btn-primary">Continue</button>
          </div>
        </form>

        {status && <p className="status-message">{status}</p>}
      </div>
    </main>
  );
}
