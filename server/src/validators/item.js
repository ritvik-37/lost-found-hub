import { z } from 'zod';
import { CATEGORIES, ITEM_STATUSES, ITEM_TYPES, LOCATIONS, PUBLIC_STATUSES } from '../constants.js';
import { isNotFutureDate, parseISODate } from '../utils/dates.js';
import { isoDate, limit, page, text } from './common.js';

const TITLE_MSG = 'Enter a name of 3–60 characters so others can recognise it.';

// Messages match the client-side validation in client/src/lib/validation.js.
const fields = {
  type: z.enum(ITEM_TYPES, { error: 'Choose whether you lost or found the item.' }),
  title: text('Enter an item name.').min(3, TITLE_MSG).max(60, TITLE_MSG),
  description: text('Describe the item.')
    .min(15, 'Add at least 15 characters describing visible features.')
    .max(500, 'Keep the description under 500 characters.'),
  category: z.enum(CATEGORIES, { error: 'Pick the closest category.' }),
  location: z.enum(LOCATIONS, { error: 'Choose where the item was lost or found.' }),
  exactSpot: text().max(80, 'Keep the exact spot under 80 characters.'),
  date: z
    .string({ error: 'Choose the date.' })
    .trim()
    .refine((v) => {
      const d = parseISODate(v);
      return d !== null && d.getUTCFullYear() >= 2000;
    }, 'Choose a valid date.')
    .refine((v) => {
      const d = parseISODate(v);
      return d === null || isNotFutureDate(d);
    }, 'Choose a date that is today or earlier.'),
  hiddenDetails: text('Add a private identifying detail.')
    .min(5, 'Add a detail of at least 5 characters to protect against false claims.')
    .max(120, 'Keep the private detail under 120 characters.'),
};

export const createItemSchema = z.object({ ...fields, exactSpot: fields.exactSpot.optional() });

/** PUT accepts any subset of fields (multipart), plus removeImage=true to drop the current photo. */
export const updateItemSchema = z
  .object(fields)
  .partial()
  .extend({ removeImage: z.enum(['true', 'false']).optional() });

const listFields = {
  q: z.string().trim().max(100, 'Keep the search under 100 characters.').optional(),
  type: z.enum(ITEM_TYPES).optional(),
  category: z.enum(CATEGORIES).optional(),
  location: z.enum(LOCATIONS).optional(),
  dateFrom: isoDate().optional(),
  dateTo: isoDate().optional(),
  page,
  sort: z.enum(['newest', 'oldest']).default('newest'),
};

export const publicListQuery = z.object({
  ...listFields,
  status: z.enum(PUBLIC_STATUSES).optional(),
  limit: limit(50, 12),
});

export const adminListQuery = z.object({
  ...listFields,
  status: z.enum(ITEM_STATUSES).optional(),
  limit: limit(100, 50),
});
