"use client";
import React, { useState } from 'react';
import { useRef } from 'react';

interface CallFormData {
  userName: string;
  friendName: string;
  phone: string;
  introduction: string;
  lastMemory: string;

}

interface FriendFormProps {
  initialData?: Partial<CallFormData>;
  onBack?: () => void;
  onCallInitiated?: (callId: string, formData: CallFormData) => void;
}

export default function FriendForm({ initialData = {}, onBack, onCallInitiated }: FriendFormProps) {
  const [form, setForm] = useState<CallFormData>({
    userName: initialData.userName || '',
    friendName: initialData.friendName || '',
    phone: initialData.phone || '',
    lastMemory: initialData.lastMemory || '',
    introduction: initialData.introduction || '',

  });
  const [touched, setTouched] = useState<{ [K in keyof CallFormData]?: boolean }>({});
  const [errors, setErrors] = useState<{ [K in keyof CallFormData]?: string }>({});
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle'|'success'|'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const formRef = useRef<HTMLFormElement>(null);


  function autoFormatPhone(value: string) {
    let v = value.replace(/[^\d+]/g, '');
    if (!v.startsWith('+')) {
      // Assume US if 10 digits and no country code
      if (v.length === 10) return '+1' + v;
    }
    return v;
  }

  function validate(values: CallFormData) {
    const errs: { [K in keyof CallFormData]?: string } = {};
    if (!values.userName.trim()) errs.userName = 'Your name is required.';
    else if (values.userName.length < 2 || values.userName.length > 50) errs.userName = 'Name must be 2-50 characters.';
    if (!values.friendName.trim()) errs.friendName = "Friend's name is required.";
    if (!values.phone.trim()) {
      errs.phone = 'Phone number is required.';
    } else if (!/^\+\d{10,15}$/.test(autoFormatPhone(values.phone.trim()))) {
      errs.phone = 'Phone must be in E.164 format (e.g. +1234567890)';
    }
    if (!values.lastMemory.trim()) errs.lastMemory = 'Please enter a memory/context.';
    else if (values.lastMemory.length > 300) errs.lastMemory = 'Max 300 characters.';
    if (!values.introduction.trim()) errs.introduction = 'Please provide an introduction.';
    else if (values.introduction.length > 100) errs.introduction = 'Max 100 characters.';
    return errs;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: name === 'phone' ? autoFormatPhone(value) : value }));
    if (touched[name as keyof CallFormData]) {
      setErrors(validate({ ...form, [name]: value }));
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name } = e.target;
    setTouched(t => ({ ...t, [name]: true }));
    setErrors(validate(form));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    setTouched({ userName: true, friendName: true, phone: true, lastMemory: true, introduction: true });
    if (Object.keys(errs).length === 0) {
      setLoading(true);
      setStatus('idle');
      setStatusMsg('');
      try {
        const res = await fetch('/api/trigger-call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userName: form.userName,
            friendName: form.friendName,
            phone: autoFormatPhone(form.phone),
            introduction: form.introduction,
            lastMemory: form.lastMemory,

          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setStatus('success');
        setStatusMsg('Call initiated! Your friend should receive a call shortly.');
        
        // Pass the callId back to parent component
        if (data.success && data.callId && typeof onCallInitiated === 'function') {
          onCallInitiated(data.callId, form);
        }
      } catch (err: any) {
        setStatus('error');
        setStatusMsg(err?.message || 'Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      // Focus first error field
      const firstErr = Object.keys(errs)[0];
      if (formRef.current) {
        const el = formRef.current.querySelector(`[name="${firstErr}"]`) as HTMLElement;
        if (el) el.focus();
      }
    }
  }

  return (
    <form ref={formRef} className="flex flex-col gap-4 w-full max-w-md mx-auto bg-white p-6 rounded shadow-md" onSubmit={handleSubmit} aria-disabled={loading}>
      <div>
        <label className="block text-sm font-semibold mb-1 text-gray-700">Your Name<span className="text-red-500">*</span></label>
        <input
          name="userName"
          value={form.userName}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          minLength={2}
          maxLength={50}
          disabled={loading}
          className={`w-full px-4 py-2 rounded border text-gray-900 placeholder-gray-500 ${errors.userName ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-orange-400`}
          placeholder="How should you introduce yourself?"
          aria-required="true"
        />
        {errors.userName && touched.userName && <div className="text-red-500 text-xs mt-1">{errors.userName}</div>}
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1 text-gray-700">Friend's Name<span className="text-red-500">*</span></label>
        <input
          name="friendName"
          value={form.friendName}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          maxLength={50}
          disabled={loading}
          className={`w-full px-4 py-2 rounded border text-gray-900 placeholder-gray-500 ${errors.friendName ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-orange-400`}
          placeholder="Enter your friend's name"
          aria-required="true"
        />
        {errors.friendName && touched.friendName && <div className="text-red-500 text-xs mt-1">{errors.friendName}</div>}
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1 text-gray-700">Phone Number<span className="text-red-500">*</span></label>
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          maxLength={16}
          disabled={loading}
          className={`w-full px-4 py-2 rounded border text-gray-900 placeholder-gray-500 ${errors.phone ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-orange-400`}
          placeholder="+1 (555) 123-4567"
          aria-required="true"
        />
        <div className="text-xs text-gray-500 mt-1">Format: +1234567890</div>
        {errors.phone && touched.phone && <div className="text-red-500 text-xs mt-1">{errors.phone}</div>}
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1 text-gray-700">Last Memory/Context<span className="text-red-500">*</span></label>
        <textarea
          name="lastMemory"
          value={form.lastMemory}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          rows={3}
          maxLength={300}
          disabled={loading}
          className={`w-full px-4 py-2 rounded border text-gray-900 placeholder-gray-500 ${errors.lastMemory ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-orange-400`}
          placeholder="What do you remember about your last conversation or interaction?"
          aria-required="true"
        />
        <div className="text-xs text-gray-500 mt-1">Max 300 characters</div>
        {errors.lastMemory && touched.lastMemory && <div className="text-red-500 text-xs mt-1">{errors.lastMemory}</div>}
      </div>
      <div>
        <label className="block text-sm font-semibold mb-1 text-gray-700">How do you know them?<span className="text-red-500">*</span></label>
        <input
          name="introduction"
          value={form.introduction}
          onChange={handleChange}
          onBlur={handleBlur}
          required
          maxLength={100}
          disabled={loading}
          className={`w-full px-4 py-2 rounded border text-gray-900 placeholder-gray-500 ${errors.introduction ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-orange-400`}
          placeholder="e.g. We met at college, We worked together at Acme Corp, We're neighbors, etc."
          aria-required="true"
        />
        <div className="text-xs text-gray-500 mt-1">Max 100 characters</div>
        {errors.introduction && touched.introduction && <div className="text-red-500 text-xs mt-1">{errors.introduction}</div>}
      </div>

      <div className="flex flex-row gap-2 mt-4">
        {onBack && (
          <button
            type="button"
            className="flex-1 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold text-lg transition disabled:opacity-50"
            onClick={onBack}
            disabled={loading}
          >
            Back to Recording
          </button>
        )}
        <button
          type="submit"
          className="flex-1 py-2 rounded bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg transition disabled:opacity-50 flex items-center justify-center"
          disabled={loading || Object.keys(validate(form)).length > 0}
        >
          {loading ? (
            <span className="flex items-center gap-2"><svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>Calling...</span>
          ) : (
            'Call Friend Now'
          )}
        </button>
      </div>
      {status === 'success' && (
        <div className="mt-4 px-3 py-2 bg-green-100 text-green-700 rounded text-center">{statusMsg}</div>
      )}
      {status === 'error' && (
        <div className="mt-4 px-3 py-2 bg-red-100 text-red-700 rounded text-center">
          {statusMsg}
          <button type="button" className="ml-2 underline text-red-700" onClick={() => setStatus('idle')}>Retry</button>
        </div>
      )}
    </form>
  );
}
