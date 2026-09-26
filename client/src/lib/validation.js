// Client-side rules mirror the server's Zod schemas (server/src/validators) so users get the
// same message before and after submitting. Each rule returns '' when valid or a message that
// says what's wrong and how to fix it.
import { todayISO } from './format.js';

const len = (v) => String(v ?? '').trim().length;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const itemRules = {
  title: (v) => (len(v) >= 3 && len(v) <= 60 ? '' : 'Enter a name of 3–60 characters so others can recognise it.'),
  category: (v) => (v ? '' : 'Pick the closest category.'),
  location: (v) => (v ? '' : 'Choose where the item was lost or found.'),
  date: (v) => (!v ? 'Choose the date.' : v > todayISO() ? 'Choose a date that is today or earlier.' : ''),
  description: (v) =>
    len(v) < 15 ? 'Add at least 15 characters describing visible features.' : len(v) > 500 ? 'Keep the description under 500 characters.' : '',
  exactSpot: (v) => (len(v) > 80 ? 'Keep the exact spot under 80 characters.' : ''),
  hiddenDetails: (v) =>
    len(v) < 5 ? 'Add a detail of at least 5 characters to protect against false claims.' : len(v) > 120 ? 'Keep the private detail under 120 characters.' : '',
};

export function imageError(file) {
  if (!file) return '';
  if (!IMAGE_TYPES.includes(file.type)) return 'Use a JPG, PNG or WebP image under 5 MB.';
  if (file.size > MAX_IMAGE_BYTES) return "This photo is still over 5 MB after resizing. Try a screenshot of it instead.";
  return '';
}

export const claimRules = {
  proofAnswer: (v) =>
    len(v) < 10 ? 'Add at least 10 characters so the admin can verify ownership.' : len(v) > 300 ? 'Keep your proof under 300 characters.' : '',
  message: (v) => (len(v) > 200 ? 'Keep the message under 200 characters.' : ''),
};

export const loginRules = {
  email: (v) => (!len(v) ? 'Enter your email address.' : EMAIL.test(String(v).trim()) ? '' : 'Enter a valid email address, like name@college.edu.'),
  password: (v) => (v ? '' : 'Enter your password.'),
};

export const registerRules = {
  name: (v) => (len(v) < 2 ? 'Enter your full name (at least 2 characters).' : len(v) > 60 ? 'Keep your name under 60 characters.' : ''),
  email: loginRules.email,
  phone: (v) => {
    const s = String(v ?? '').trim();
    if (!s) return '';
    const digits = s.replace(/\D/g, '').length;
    return /^\+?[\d\s-]+$/.test(s) && digits >= 7 && digits <= 15 ? '' : 'Enter a valid phone number with 7–15 digits, e.g. +91 98765 43210.';
  },
  password: (v) => {
    const s = String(v ?? '');
    if (s.length < 8) return 'Use at least 8 characters.';
    if (s.length > 72) return 'Use 72 characters or fewer.';
    if (!/[A-Za-z]/.test(s)) return 'Include at least one letter.';
    if (!/\d/.test(s)) return 'Include at least one number.';
    return '';
  },
};
