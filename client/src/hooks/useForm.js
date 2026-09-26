import { useCallback, useRef, useState } from 'react';

/**
 * Minimal form state with on-blur validation.
 * - A field is checked when it loses focus (not on every keystroke).
 * - Once a field shows an error, it is re-checked while typing so the error clears as soon as it's fixed.
 * - `field(name)` returns the props for an <input>/<select>/<textarea>, including ARIA wiring.
 */
export function useForm(initialValues, rules) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  const run = (name, value, all) => rulesRef.current[name]?.(value, all) || '';

  const check = useCallback((name, value = valuesRef.current[name]) => {
    const message = run(name, value, { ...valuesRef.current, [name]: value });
    setErrors((prev) => (prev[name] === message ? prev : { ...prev, [name]: message }));
    return message;
  }, []);

  const setValue = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: run(name, value, { ...valuesRef.current, [name]: value }) } : prev));
  }, []);

  const field = (name, { hintId } = {}) => ({
    id: name,
    name,
    value: values[name] ?? '',
    onChange: (e) => setValue(name, e.target.value),
    onBlur: (e) => check(name, e.target.value),
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': [hintId, errors[name] ? `${name}-error` : null].filter(Boolean).join(' ') || undefined,
  });

  /** Validate everything; returns { field: message } for the invalid ones. */
  const validateAll = () => {
    const next = {};
    for (const name of Object.keys(rulesRef.current)) {
      const message = run(name, valuesRef.current[name], valuesRef.current);
      if (message) next[name] = message;
    }
    setErrors(next);
    return next;
  };

  const reset = (next = initialValues) => {
    setValues(next);
    setErrors({});
  };

  return { values, setValues, setValue, errors, setErrors, field, check, validateAll, reset };
}

/** Move focus to the first invalid field (in visual order). Returns its name. */
export function focusFirstError(errors, order) {
  const first = order.find((name) => errors[name]) ?? Object.keys(errors)[0];
  // Fields are always rendered (only their error state changes), so focus synchronously.
  if (first) document.getElementById(first)?.focus();
  return first;
}
