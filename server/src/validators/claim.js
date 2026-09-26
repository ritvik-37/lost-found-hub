import { z } from 'zod';
import { CLAIM_STATUSES, ITEM_STATUSES } from '../constants.js';
import { limit, page, text } from './common.js';

export const createClaimSchema = z.object({
  proofAnswer: text('Describe a detail only the owner would know.')
    .min(10, 'Add at least 10 characters so the admin can verify ownership.')
    .max(300, 'Keep your proof under 300 characters.'),
  message: text().max(200, 'Keep the message under 200 characters.').optional(),
});

export const reviewClaimSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], { error: 'Choose APPROVED or REJECTED.' }),
  adminRemarks: text().max(200, 'Keep remarks under 200 characters.').optional(),
});

export const itemStatusSchema = z.object({
  status: z.enum(ITEM_STATUSES, { error: `Choose one of: ${ITEM_STATUSES.join(', ')}.` }),
  note: text().max(200, 'Keep the note under 200 characters.').optional(),
});

export const adminClaimsQuery = z.object({
  status: z.enum(CLAIM_STATUSES).optional(),
  page,
  limit: limit(100, 50),
});
