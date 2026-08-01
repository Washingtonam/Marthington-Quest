'use client';

import { useState } from 'react';

export default function RegisterPage() {
  const [formState, setFormState] = useState({
    name: '',
    age: '',
    parentName: '',
    bio: '',
    imageUrl: '',
  });
  const [status, setStatus] = useState('');

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('Submitting entry...');

    try {
      const response = await fetch(`${apiBaseUrl}/api/contestants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formState,
          age: Number(formState.age),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit');
      }

      setStatus('Entry submitted! Awaiting approval.');
      setFormState({ name: '', age: '', parentName: '', bio: '', imageUrl: '' });
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <main style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Register a Baby</h1>
      <p>Submit your contestant entry and pay the entry fee through your chosen payment method.</p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', maxWidth: 560 }}>
        <label>
          Baby name
          <input name="name" value={formState.name} onChange={handleChange} required />
        </label>
        <label>
          Baby age
          <input name="age" type="number" value={formState.age} onChange={handleChange} required min="0" />
        </label>
        <label>
          Parent / guardian name
          <input name="parentName" value={formState.parentName} onChange={handleChange} required />
        </label>
        <label>
          Bio
          <textarea name="bio" value={formState.bio} onChange={handleChange} rows={4} />
        </label>
        <label>
          Image URL
          <input name="imageUrl" value={formState.imageUrl} onChange={handleChange} required />
        </label>

        <button type="submit" style={{ padding: '0.75rem 1.25rem' }}>
          Submit entry
        </button>
      </form>

      {status && <p>{status}</p>}
    </main>
  );
}
