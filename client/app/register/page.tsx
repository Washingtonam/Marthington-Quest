'use client';

import { useState } from 'react';

export default function RegisterPage() {
  const [formState, setFormState] = useState({
    email: '',
    firstName: '',
    lastName: '',
    ageLabel: '',
    nickname: '',
    whatsapp: '',
    bio: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target as HTMLInputElement;
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('Submitting entry...');

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
        name: `${formState.firstName} ${formState.lastName}`.trim(),
        age: formState.ageLabel,
        parentName: formState.nickname || formState.whatsapp || 'N/A',
        bio: formState.bio,
        imageUrl,
      };

      const response = await fetch(`${apiBaseUrl}/api/contestants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to submit');
      }

      setStatus('Entry submitted! Awaiting approval.');
      setFormState({ email: '', firstName: '', lastName: '', ageLabel: '', nickname: '', whatsapp: '', bio: '' });
      setFile(null);
      setPreview(null);
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <main>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Sign Up</h1>
        <p className="muted">Please provide the details below and upload a picture (max 10MB).</p>

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
            <input name="ageLabel" placeholder="Age: 8 years Maximum" value={formState.ageLabel} onChange={handleChange} />
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
            Upload Child's Picture and NOTE that this is the picture your child would use for the competition. Max-size: 10MB
            <div className="file-input-wrapper">
              <input type="file" accept="image/*" onChange={handleFile} />
              {preview && <img src={preview} className="preview-image" alt="preview" />}
            </div>
          </label>

          <label className="field">
            Additional information
            <textarea name="bio" value={formState.bio} onChange={handleChange} rows={3} />
          </label>

          <div>
            <button type="submit" className="btn-primary">Continue</button>
          </div>
        </form>

        {status && <p style={{ marginTop: '1rem' }}>{status}</p>}
      </div>
    </main>
  );
}
