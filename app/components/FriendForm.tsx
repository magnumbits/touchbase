"use client";
import React, { useState } from 'react';
import { FriendData } from '../../types/index';

interface FriendFormProps {
  onSubmit: (data: FriendData) => void;
  initialData?: FriendData;
}

export default function FriendForm({ onSubmit, initialData }: FriendFormProps) {
  const [form, setForm] = useState<FriendData>(
    initialData || { name: '', phone: '', lastMemory: '', introduction: '', preferredTime: '' }
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <input name="name" placeholder="Friend's Name" value={form.name} onChange={handleChange} required className="input input-bordered" />
      <input name="phone" placeholder="Phone Number" value={form.phone} onChange={handleChange} required className="input input-bordered" />
      <textarea name="lastMemory" placeholder="Last Memory Together" value={form.lastMemory} onChange={handleChange} required className="textarea textarea-bordered" />
      <textarea name="introduction" placeholder="How should we introduce you?" value={form.introduction} onChange={handleChange} required className="textarea textarea-bordered" />
      <input name="preferredTime" placeholder="Preferred Call Time (optional)" value={form.preferredTime} onChange={handleChange} className="input input-bordered" />
      <button type="submit" className="btn btn-primary">Continue</button>
    </form>
  );
}
