import { CircleAlert, Info, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { Field } from '../components/ui/Field.jsx';
import { PasswordInput } from '../components/ui/PasswordInput.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { focusFirstError, useForm } from '../hooks/useForm.js';
import { useApi } from '../hooks/useApi.js';
import { useReturnTo } from '../hooks/useReturnTo.js';
import { loginRules } from '../lib/validation.js';

const ORDER = ['email', 'password'];

export function LoginPage() {
  useDocumentTitle('Sign in');
  const { user, ready, login, demoLogin } = useAuth();
  // The server lists demo accounts only when DEMO_LOGINS is on; no passwords reach the browser.
  const demo = useApi('/api/auth/demo');
  const demoAccounts = demo.data?.accounts ?? [];
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = useReturnTo();
  const form = useForm({ email: '', password: '' }, loginRules);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  if (ready && user && !submitting) return <Navigate to={returnTo ?? '/'} replace />;

  /** `attempt` is either login(credentials) or demoLogin(key). */
  async function signIn(attempt) {
    setSubmitting(true);
    setFormError('');
    try {
      const json = await attempt();
      toast(json.message);
      navigate(returnTo ?? (json.data.user.role === 'admin' ? '/admin' : '/'), { replace: true });
    } catch (err) {
      if (err.errors) {
        form.setErrors(err.errors);
        focusFirstError(err.errors, ORDER);
      } else {
        setFormError(err.message);
        document.getElementById('password')?.focus();
      }
      setSubmitting(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    const errors = form.validateAll();
    if (Object.keys(errors).length) {
      focusFirstError(errors, ORDER);
      return;
    }
    signIn(() => login({ email: form.values.email.trim(), password: form.values.password }));
  }

  return (
    <div className="page section">
      <div className="wrap form-wrap-sm">
        <h2>Sign in</h2>
        <p className="muted">Report items, submit claims and track them in one place.</p>

        {location.state?.reason === 'auth' && (
          <div className="alert alert-info" role="note">
            <Info className="icon" aria-hidden="true" />
            <span>Please sign in to continue.</span>
          </div>
        )}

        <form className="card form-card" onSubmit={onSubmit} noValidate aria-describedby={formError ? 'login-error' : undefined}>
          {formError && (
            <div className="alert" role="alert" id="login-error">
              <CircleAlert className="icon" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}
          <Field id="email" label="College email" required error={form.errors.email}>
            <input className="input" type="email" autoComplete="email" inputMode="email" required placeholder="name@college.edu" {...form.field('email')} />
          </Field>
          <Field id="password" label="Password" required error={form.errors.password}>
            <PasswordInput autoComplete="current-password" required {...form.field('password')} />
          </Field>
          <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <LoaderCircle className="icon spin" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
          <p className="muted mt-4 mb-0 text-center text-[.92rem]">
            New here?{' '}
            <Link className="link" to="/register" state={location.state}>
              Create an account
            </Link>
          </p>
        </form>

        {demoAccounts.length > 0 && (
          <section className="card panel mt-4" aria-labelledby="demo-heading">
            <h3 id="demo-heading" className="text-base">
              Demo accounts
            </h3>
            <p className="muted text-[.88rem]">One click to sign in with seeded data (hackathon demo only).</p>
            <div className="demo-logins">
              {demoAccounts.map((a) => (
                <div key={a.key} className="demo-login">
                  <span>
                    <strong>{a.label}</strong>
                    <span className="muted block text-[.82rem]">{a.email}</span>
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={submitting}
                    onClick={() => signIn(() => demoLogin(a.key))}
                    aria-label={`Sign in as ${a.label}`}
                  >
                    Sign in
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
