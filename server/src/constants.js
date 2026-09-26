// Single source of truth for enums and the item status workflow.
// The client keeps a copy of CATEGORIES/LOCATIONS for its dropdowns (client/src/lib/constants.js).

export const ROLES = ['user', 'admin'];

export const ITEM_TYPES = ['LOST', 'FOUND'];

export const CATEGORIES = ['Electronics', 'ID Cards', 'Books', 'Bags', 'Keys', 'Clothing', 'Wallets', 'Other'];

export const LOCATIONS = [
  'Main Library',
  'Tech Park',
  'University Building',
  'Java Canteen',
  'Hostel Block A',
  'Hostel Block B',
  'Sports Complex',
  'Bio-Tech Block',
  'Auditorium',
  'Parking Lot',
];

export const ITEM_STATUSES = ['PENDING', 'VERIFIED', 'CLAIMED', 'CLOSED', 'REJECTED'];

/** Statuses anyone can see. PENDING and REJECTED are visible only to the reporter and admins. */
export const PUBLIC_STATUSES = ['VERIFIED', 'CLAIMED', 'CLOSED'];

/** Allowed status moves. CLOSED and REJECTED are final. */
export const STATUS_FLOW = Object.freeze({
  PENDING: ['VERIFIED', 'REJECTED'],
  VERIFIED: ['CLAIMED', 'CLOSED'],
  CLAIMED: ['CLOSED'],
  CLOSED: [],
  REJECTED: [],
});

export const canTransition = (from, to) => (STATUS_FLOW[from] ?? []).includes(to);

export const CLAIM_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];

/** Claims that block the same user from claiming the same item again. */
export const ACTIVE_CLAIM_STATUSES = ['PENDING', 'APPROVED'];

export const AUTH_COOKIE = 'lfh_token';
