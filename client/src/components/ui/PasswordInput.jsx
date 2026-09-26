import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export function PasswordInput(props) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="input-wrap">
      <input className="input" type={visible ? 'text' : 'password'} {...props} />
      <button
        type="button"
        className="reveal"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="icon" aria-hidden="true" /> : <Eye className="icon" aria-hidden="true" />}
      </button>
    </div>
  );
}
