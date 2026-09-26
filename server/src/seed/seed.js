import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { Claim } from '../models/Claim.js';
import { Item } from '../models/Item.js';
import { Upload } from '../models/Upload.js';
import { User } from '../models/User.js';
import { startOfLocalDay } from '../utils/dates.js';
import * as data from './data.js';

const HOUR = 3_600_000;

/** Local date `daysAgo` at `hour`:00, never later than a few minutes ago. */
function at(daysAgo, hour) {
  const d = startOfLocalDay(daysAgo);
  d.setHours(hour);
  return new Date(Math.min(d.getTime(), Date.now() - 5 * 60_000));
}

/** Calendar day stored the way the API stores it: UTC midnight of the local date. */
function calendarDay(daysAgo) {
  const d = startOfLocalDay(daysAgo);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/**
 * Validate docs through Mongoose, then insert via the driver so our hand-picked
 * createdAt/updatedAt survive (Mongoose timestamps would overwrite them).
 */
async function insertWithTimestamps(Model, docs) {
  const prepared = await Promise.all(
    docs.map(async (doc) => {
      const instance = new Model(doc);
      await instance.validate();
      return instance.toObject({ depopulate: true });
    }),
  );
  await Model.collection.insertMany(prepared);
  return prepared;
}

const randomPassword = () => `demo-${crypto.randomBytes(12).toString('base64url')}`;

/**
 * Passwords for the seeded accounts: from server/.env if set, otherwise random for this seed run
 * (printed once to the console). `generated` says which ones are safe to print.
 */
export function demoPasswords() {
  return {
    admin: env.DEMO_ADMIN_PASSWORD || randomPassword(),
    student: env.DEMO_STUDENT_PASSWORD || randomPassword(),
    generated: { admin: !env.DEMO_ADMIN_PASSWORD, student: !env.DEMO_STUDENT_PASSWORD },
  };
}

/** Console lines listing the seeded logins; passwords taken from env are never printed. */
export function describeLogins(passwords) {
  return data.users.map((u) => {
    const kind = u.role === 'admin' ? 'admin' : 'student';
    const pw = passwords.generated[kind] ? passwords[kind] : `(DEMO_${kind.toUpperCase()}_PASSWORD from .env)`;
    return `  ${u.role.padEnd(5)}  ${u.email.padEnd(20)}  ${pw}`;
  });
}

export async function seedDatabase({ log = console.log, passwords = demoPasswords() } = {}) {
  await Promise.all([Claim.deleteMany({}), Item.deleteMany({}), User.deleteMany({}), Upload.deleteMany({})]);
  await Promise.all([User.syncIndexes(), Item.syncIndexes(), Claim.syncIndexes()]);

  const [adminHash, studentHash] = await Promise.all([User.hashPassword(passwords.admin), User.hashPassword(passwords.student)]);
  const userIds = {};
  const userDocs = data.users.map(({ key, demoLabel, ...u }, i) => ({
    ...u,
    passwordHash: u.role === 'admin' ? adminHash : studentHash,
    createdAt: at(30 - i, 10),
    updatedAt: at(30 - i, 10),
  }));
  (await insertWithTimestamps(User, userDocs)).forEach((doc, i) => (userIds[data.users[i].key] = doc._id));

  const itemIds = {};
  const itemDocs = data.items.map((it, i) => {
    const { key, by, daysAgo, ...fields } = it;
    const createdAt = at(daysAgo, 9 + (i % 8)); // spread reports across the day
    const reviewed = fields.status !== 'PENDING';
    const statusChangedAt = reviewed ? new Date(Math.min(createdAt.getTime() + 3 * HOUR, Date.now() - 60_000)) : createdAt;
    return { ...fields, date: calendarDay(daysAgo), reportedBy: userIds[by], createdAt, updatedAt: statusChangedAt, statusChangedAt };
  });
  (await insertWithTimestamps(Item, itemDocs)).forEach((doc, i) => (itemIds[data.items[i].key] = doc._id));

  const itemByKey = Object.fromEntries(data.items.map((it) => [it.key, it]));
  const claimDocs = data.claims.map((c) => {
    const createdAt = at(Math.max(itemByKey[c.item].daysAgo - 1, 0), 18);
    const reviewed = c.status !== 'PENDING';
    return {
      item: itemIds[c.item],
      claimant: userIds[c.by],
      status: c.status,
      proofAnswer: c.proofAnswer,
      message: c.message,
      adminRemarks: c.adminRemarks ?? '',
      ...(reviewed ? { reviewedBy: userIds.admin, reviewedAt: new Date(createdAt.getTime() + HOUR) } : {}),
      createdAt,
      updatedAt: createdAt,
    };
  });
  await insertWithTimestamps(Claim, claimDocs);

  log(`[seed] ${data.users.length} users, ${data.items.length} items, ${data.claims.length} claims`);
  return { userIds, itemIds, passwords };
}

/** Seed only when there are no users at all. Returns the seed result, or null if data already exists. */
export async function seedIfEmpty() {
  // exists() rather than estimatedDocumentCount(): after an unclean mongod stop the estimate can read 0.
  if (await User.exists({})) return null;
  return seedDatabase({ log: () => {} });
}
