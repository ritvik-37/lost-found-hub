import { LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { useData } from '../../context/DataContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { focusFirstError, useForm } from '../../hooks/useForm.js';
import { api } from '../../lib/api.js';
import { claimRules } from '../../lib/validation.js';
import { Field } from '../ui/Field.jsx';

const ORDER = ['proofAnswer', 'message'];

export function ClaimForm({ item, onDone }) {
  const form = useForm({ proofAnswer: '', message: '' }, claimRules);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const { invalidate } = useData();
  const isFound = item.type === 'FOUND';

  async function onSubmit(e) {
    e.preventDefault();
    const errors = form.validateAll();
    if (Object.keys(errors).length) {
      focusFirstError(errors, ORDER);
      return;
    }
    setSubmitting(true);
    try {
      const json = await api(`/api/items/${item.id}/claims`, { method: 'POST', body: form.values });
      toast(json.message);
      invalidate();
      onDone();
    } catch (err) {
      if (err.errors) {
        form.setErrors(err.errors);
        focusFirstError(err.errors, ORDER);
      }
      toast(err.message, 'err');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby="claim-heading">
      <h4 id="claim-heading">{isFound ? 'This is mine — submit a claim' : 'I found this — let the admin know'}</h4>
      <Field
        id="proofAnswer"
        label={isFound ? 'Describe a detail only the owner would know' : 'Describe a detail that proves it is the same item'}
        required
        error={form.errors.proofAnswer}
      >
        <textarea
          className="input"
          maxLength={300}
          required
          placeholder={isFound ? 'e.g. a sticker, engraving, what’s inside…' : 'e.g. a scratch, sticker or name you noticed…'}
          {...form.field('proofAnswer')}
        />
      </Field>
      <Field id="message" label="Message to admin" optional error={form.errors.message}>
        <input
          className="input"
          maxLength={200}
          placeholder={isFound ? 'When/where you lost it' : 'Where you found it and where it is now'}
          {...form.field('message')}
        />
      </Field>
      <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
        {submitting ? (
          <>
            <LoaderCircle className="icon spin" aria-hidden="true" />
            Submitting…
          </>
        ) : (
          'Submit claim'
        )}
      </button>
    </form>
  );
}
