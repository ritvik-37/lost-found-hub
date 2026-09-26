import { CircleAlert, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { Field } from '../components/ui/Field.jsx';
import { PasswordInput } from '../components/ui/PasswordInput.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { focusFirstError, useForm } from '../hooks/useForm.js';
import { registerRules } from '../lib/validation.js';
import { useReturnTo } from '../hooks/useReturnTo.js';

const ORDER = ['name', 'email', 'phone', 'password'];

export function RegisterPage() {
  useDocumentTitle('Create account');
  const { user, ready, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = useReturnTo();
  const form = useForm({ name: '', email: '', phone: '', password: '' }, registerRules);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  if (ready && user && !submitting) return <Navigate to={returnTo ?? '/'} replace />;

  async function onSubmit(e) {
    e.preventDefault();
    const errors = form.validateAll();
    if (Object.keys(errors).length) {
      focusFirstError(errors, ORDER);
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const { name, email, phone, password } = form.values;
      const json = await register({ name: name.trim(), email: email.trim(), phone: phone.trim(), password });
      toast(json.message);
      navigate(returnTo ?? '/', { replace: true });
    } catch (err) {
      if (err.errors) {
        form.setErrors(err.errors);
        focusFirstError(err.errors, ORDER);
      } else setFormError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="page section">
      <div className="wrap form-wrap-sm">
        <h2>Create your account</h2>
        <p className="muted">Use your college email so admins can verify you when you collect an item.</p>
        <form className="card form-card" onSubmit={onSubmit} noValidate>
          {formError && (
            <div className="alert" role="alert">
              <CircleAlert className="icon" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}
          <Field id="name" label="Full name" required error={form.errors.name}>
            <input className="input" autoComplete="name" required maxLength={60} placeholder="e.g. Priya Nair" {...form.field('name')} />
          </Field>
          <Field id="email" label="College email" required error={form.errors.email}>
            <input className="input" type="email" autoComplete="email" inputMode="email" required maxLength={120} placeholder="name@college.edu" {...form.field('email')} />
          </Field>
          <Field id="phone" label="Phone" optional error={form.errors.phone} hint="Only admins see this, to arrange a handover.">
            <input className="input" type="tel" autoComplete="tel" inputMode="tel" maxLength={20} placeholder="+91 98765 43210" {...form.field('phone', { hintId: 'phone-hint' })} />
          </Field>
          <Field id="password" label="Password" required error={form.errors.password} hint="At least 8 characters, with a letter and a number.">
            <PasswordInput autoComplete="new-password" required maxLength={72} {...form.field('password', { hintId: 'password-hint' })} />
          </Field>
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <LoaderCircle className="icon spin" aria-hidden="true" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </button>
          <p className="muted mt-4 mb-0 text-center text-[.92rem]">
            Already have an account?{' '}
            <Link className="link" to="/login" state={location.state}>
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
