import { z } from 'zod';
import { env } from '../config/env.js';
import { DEMO_ACCOUNTS } from '../seed/data.js';
import { text } from './common.js';

const emailDomainOk = (email) =>
  !env.ALLOWED_EMAIL_DOMAIN ||
  email.endsWith(`@${env.ALLOWED_EMAIL_DOMAIN}`) ||
  email.endsWith(`.${env.ALLOWED_EMAIL_DOMAIN}`);

const email = z
  .string({ error: 'Enter your email address.' })
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address, like name@college.edu.').max(120, 'Use an email under 120 characters.'));

export const registerSchema = z.object({
  name: text('Enter your name.')
    .min(2, 'Enter your full name (at least 2 characters).')
    .max(60, 'Keep your name under 60 characters.'),
  email: email.refine(emailDomainOk, `Use your college email address (@${env.ALLOWED_EMAIL_DOMAIN}).`),
  password: z
    .string({ error: 'Create a password.' })
    .min(8, 'Use at least 8 characters.')
    .max(72, 'Use 72 characters or fewer.')
    .regex(/[A-Za-z]/, 'Include at least one letter.')
    .regex(/\d/, 'Include at least one number.'),
  phone: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || (/^\+?[\d\s-]+$/.test(v) && v.replace(/\D/g, '').length >= 7 && v.replace(/\D/g, '').length <= 15),
      'Enter a valid phone number with 7–15 digits, e.g. +91 98765 43210.',
    )
    .optional(),
});

export const demoLoginSchema = z.object({
  account: z.enum(
    DEMO_ACCOUNTS.map((a) => a.key),
    { error: 'Choose one of the demo accounts.' },
  ),
});

export const loginSchema = z.object({
  email,
  password: z.string({ error: 'Enter your password.' }).min(1, 'Enter your password.').max(200),
});
