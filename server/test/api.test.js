import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, test } from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Claim } from '../src/models/Claim.js';
import { Item } from '../src/models/Item.js';
import { Upload } from '../src/models/Upload.js';
import { seedDatabase } from '../src/seed/seed.js';
import { scoreMatch } from '../src/services/matching.js';

// 1x1 transparent PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

let mongod;
let app;
let ids; // { userIds, itemIds, passwords } from the seed (passwords are random per run)
const agents = {};

// Generated at runtime so no password literal is committed (keeps secret scanners quiet).
const NEW_PASSWORD = `pw1-${randomUUID()}`;

const today = () => new Date().toISOString().slice(0, 10);
const daysFromNow = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

async function signIn(email, password = ids.passwords.student) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password });
  assert.equal(res.status, 200, res.body.message);
  return agent;
}

const validItem = (overrides = {}) => ({
  type: 'LOST',
  title: 'Red Casio digital watch',
  description: 'Red Casio digital watch with a black rubber strap, lost at lunch.',
  category: 'Other',
  location: 'Java Canteen',
  date: today(),
  hiddenDetails: 'Strap has a small tear',
  ...overrides,
});

before(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDB(mongod.getUri('lfh-test'), { retries: 0, quiet: true });
  ids = await seedDatabase({ log: () => {} });
  app = createApp();
  agents.anon = request(app);
  agents.admin = await signIn('admin@campus.edu', ids.passwords.admin);
  agents.avneet = await signIn('avneet@campus.edu');
  agents.rahul = await signIn('rahul@campus.edu');
  agents.sneha = await signIn('sneha@campus.edu');
  agents.arjun = await signIn('arjun@campus.edu');
});

after(async () => {
  await disconnectDB();
  await mongod?.stop();
});

describe('auth', () => {
  test('GET /me when signed out returns user: null', async () => {
    const res = await agents.anon.get('/api/auth/me');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.user, null);
  });

  test('register validates every field with specific messages', async () => {
    const res = await agents.anon.post('/api/auth/register').send({ name: 'A', email: 'nope', password: NEW_PASSWORD.slice(0, 5) });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.errors.name, /at least 2/);
    assert.match(res.body.errors.email, /valid email/);
    assert.match(res.body.errors.password, /8 characters/);
  });

  test('register creates a normal user, sets an httpOnly cookie, never returns the hash', async () => {
    const agent = request.agent(app);
    const res = await agent
      .post('/api/auth/register')
      .send({ name: 'Priya Nair', email: 'Priya@Campus.edu ', password: NEW_PASSWORD, role: 'admin' });
    assert.equal(res.status, 201, res.body.message);
    assert.equal(res.body.data.user.role, 'user', 'role cannot be chosen at sign-up');
    assert.equal(res.body.data.user.email, 'priya@campus.edu');
    assert.equal(res.body.data.user.passwordHash, undefined);
    const cookie = res.headers['set-cookie'].join(';');
    assert.match(cookie, /lfh_token=/);
    assert.match(cookie, /HttpOnly/i);
    const me = await agent.get('/api/auth/me');
    assert.equal(me.body.data.user.name, 'Priya Nair');
  });

  test('duplicate email is a 409 with a field error', async () => {
    const res = await agents.anon.post('/api/auth/register').send({ name: 'Dup', email: 'rahul@campus.edu', password: NEW_PASSWORD });
    assert.equal(res.status, 409);
    assert.ok(res.body.errors.email);
  });

  test('wrong password is a 401 with a generic message', async () => {
    const res = await agents.anon.post('/api/auth/login').send({ email: 'rahul@campus.edu', password: `${ids.passwords.student}x` });
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Email or password is incorrect.');
  });

  test('seed passwords are random per run (none hardcoded)', () => {
    assert.match(ids.passwords.admin, /^demo-[\w-]{16}$/);
    assert.notEqual(ids.passwords.admin, ids.passwords.student);
  });

  test('demo account list has no passwords', async () => {
    const res = await agents.anon.get('/api/auth/demo').expect(200);
    const { accounts } = res.body.data;
    assert.deepEqual(accounts.map((a) => a.key), ['admin', 'avneet', 'rahul']);
    assert.ok(accounts.every((a) => a.label && a.email && !('password' in a)));
  });

  test('one-click demo sign-in works and validates the account key', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/demo').send({ account: 'admin' });
    assert.equal(res.status, 200, res.body.message);
    assert.equal(res.body.data.user.role, 'admin');
    const me = await agent.get('/api/auth/me');
    assert.equal(me.body.data.user.email, 'admin@campus.edu');
    const bad = await agents.anon.post('/api/auth/demo').send({ account: 'root' });
    assert.equal(bad.status, 400);
    assert.ok(bad.body.errors.account);
  });

  test('logout clears the session', async () => {
    const agent = await signIn('arjun@campus.edu');
    await agent.post('/api/auth/logout').expect(200);
    const me = await agent.get('/api/auth/me');
    assert.equal(me.body.data.user, null);
  });

  test('a forged token is ignored', async () => {
    const res = await agents.anon.get('/api/auth/me').set('Cookie', 'lfh_token=not.a.jwt');
    assert.equal(res.body.data.user, null);
  });
});

describe('public items', () => {
  test('lists only VERIFIED/CLAIMED/CLOSED and never leaks hiddenDetails', async () => {
    const res = await agents.anon.get('/api/items?limit=50');
    assert.equal(res.status, 200);
    assert.ok(res.body.data.items.length > 0);
    for (const item of res.body.data.items) {
      assert.ok(['VERIFIED', 'CLAIMED', 'CLOSED'].includes(item.status), item.status);
      assert.equal(item.hiddenDetails, undefined);
      assert.match(item.reportedBy.name, /^\w+ \w\.$/, 'other students only see "First L."');
    }
  });

  test('filters by type and category, paginates', async () => {
    const res = await agents.anon.get('/api/items?type=FOUND&category=Electronics&limit=1');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.items.length, 1);
    assert.ok(res.body.data.total >= 2);
    assert.equal(res.body.data.pages, res.body.data.total);
    assert.equal(res.body.data.items[0].type, 'FOUND');
    assert.equal(res.body.data.items[0].category, 'Electronics');
  });

  test('multi-word search matches words in any order', async () => {
    const res = await agents.anon.get('/api/items?q=blue%20bottle');
    const titles = res.body.data.items.map((i) => i.title);
    assert.deepEqual(titles.sort(), ['Blue Milton water bottle', 'Steel water bottle, blue']);
  });

  test('regex characters in search are treated literally', async () => {
    const res = await agents.anon.get('/api/items?q=.*');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.total, 0);
  });

  test('date range filter', async () => {
    const res = await agents.anon.get(`/api/items?dateFrom=${daysFromNow(-1)}&dateTo=${today()}&limit=50`);
    assert.ok(res.body.data.items.every((i) => i.date >= daysFromNow(-1) && i.date <= today()));
  });

  test('rejects non-public status and bad filters with 400', async () => {
    const res = await agents.anon.get('/api/items?status=PENDING&type=MAYBE');
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.status && res.body.errors.type);
  });

  test('summary counts this week', async () => {
    const res = await agents.anon.get('/api/items/summary');
    assert.equal(res.status, 200);
    const { found, lost, returned } = res.body.data.week;
    assert.ok(found > 0 && lost > 0 && returned > 0);
  });

  test('pending reports are 404 to the public, visible (with private detail) to owner and admin', async () => {
    const id = ids.itemIds.hoodie.toString(); // PENDING, reported by Rahul
    await agents.anon.get(`/api/items/${id}`).expect(404);
    await agents.sneha.get(`/api/items/${id}`).expect(404);
    const own = await agents.rahul.get(`/api/items/${id}`).expect(200);
    assert.equal(own.body.data.item.hiddenDetails, 'Small ink stain on left sleeve');
    assert.equal(own.body.data.viewer.isOwner, true);
    const admin = await agents.admin.get(`/api/items/${id}`).expect(200);
    assert.equal(admin.body.data.item.hiddenDetails, 'Small ink stain on left sleeve');
    assert.deepEqual(admin.body.data.item.nextStatuses, ['VERIFIED', 'REJECTED']);
  });

  test('public item detail hides the private detail from other students', async () => {
    const res = await agents.sneha.get(`/api/items/${ids.itemIds.bottleFound}`).expect(200);
    assert.equal(res.body.data.item.hiddenDetails, undefined);
    assert.equal(res.body.data.viewer.canClaim, true);
  });

  test('malformed ids are 404, not 500', async () => {
    await agents.anon.get('/api/items/not-an-id').expect(404);
    await agents.anon.get('/api/items/64b000000000000000000000').expect(404);
  });

  test('unknown API routes return JSON 404', async () => {
    const res = await agents.anon.get('/api/nope').expect(404);
    assert.equal(res.body.success, false);
  });
});

describe('create / update / delete items', () => {
  let createdId;
  let imageUrl;

  test('requires sign-in', async () => {
    await agents.anon.post('/api/items').send(validItem()).expect(401);
  });

  test('validates fields (future date, lengths, enums)', async () => {
    const res = await agents.avneet
      .post('/api/items')
      .send({ type: 'LOST', title: 'ab', description: 'too short', category: 'Pets', location: 'Moon', date: daysFromNow(3), hiddenDetails: 'x' });
    assert.equal(res.status, 400);
    const e = res.body.errors;
    assert.match(e.title, /3–60/);
    assert.match(e.description, /15 characters/);
    assert.match(e.category, /category/);
    assert.match(e.location, /where/);
    assert.match(e.date, /today or earlier/);
    assert.match(e.hiddenDetails, /5 characters/);
  });

  test('strips HTML tags from text fields', async () => {
    const res = await agents.avneet
      .post('/api/items')
      .send(validItem({ title: '<b>Red</b> Casio watch<script>x</script>' }));
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.item.title, 'Red Casio watchx');
    await Item.deleteOne({ _id: res.body.data.item.id });
  });

  test('creates a PENDING report with an image (multipart)', async () => {
    const data = validItem();
    const req = agents.avneet.post('/api/items');
    for (const [k, v] of Object.entries(data)) req.field(k, v);
    const res = await req.attach('image', PNG, { filename: 'watch.png', contentType: 'image/png' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const { item } = res.body.data;
    assert.equal(item.status, 'PENDING');
    assert.match(item.imageUrl, /^\/uploads\/[a-f\d]{24}$/);
    const img = await agents.anon.get(item.imageUrl).expect(200).expect('content-type', /image\/png/);
    assert.ok(Buffer.from(img.body).equals(PNG), 'served bytes match the upload');
    assert.match(img.headers['cache-control'], /immutable/);
    createdId = item.id;
    imageUrl = item.imageUrl;
  });

  test('rejects a file that only pretends to be an image, and stores nothing', async () => {
    const before = await Upload.countDocuments();
    const req = agents.avneet.post('/api/items');
    for (const [k, v] of Object.entries(validItem())) req.field(k, v);
    const res = await req.attach('image', Buffer.from('<?php echo 1; ?> padding'), { filename: 'x.png', contentType: 'image/png' });
    assert.equal(res.status, 400);
    assert.ok(res.body.errors.image);
    assert.equal(await Upload.countDocuments(), before);
  });

  test('a valid photo with invalid fields is not stored', async () => {
    const before = await Upload.countDocuments();
    const res = await agents.avneet.post('/api/items').field('title', 'x').attach('image', PNG, { filename: 'a.png', contentType: 'image/png' });
    assert.equal(res.status, 400);
    assert.equal(await Upload.countDocuments(), before);
  });

  test('unknown image ids are 404', async () => {
    await agents.anon.get('/uploads/64b000000000000000000000').expect(404);
    await agents.anon.get('/uploads/not-an-id').expect(404);
  });

  test('rejects unsupported types and files over 5 MB', async () => {
    const gif = await agents.avneet.post('/api/items').attach('image', Buffer.from('GIF89a'), { filename: 'a.gif', contentType: 'image/gif' });
    assert.equal(gif.status, 400);
    assert.match(gif.body.errors.image, /JPG, PNG or WebP/);
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
    const res = await agents.avneet.post('/api/items').attach('image', big, { filename: 'big.png', contentType: 'image/png' });
    assert.equal(res.status, 400);
    assert.match(res.body.errors.image, /5 MB/);
  });

  test('GET /items/mine lists own reports with the private detail', async () => {
    const res = await agents.avneet.get('/api/items/mine').expect(200);
    const mine = res.body.data.items.find((i) => i.id === createdId);
    assert.equal(mine.hiddenDetails, 'Strap has a small tear');
    assert.ok(res.body.data.items.every((i) => i.reportedBy.id === ids.userIds.avneet.toString()));
  });

  test('owner can edit while PENDING (and remove the photo); others cannot', async () => {
    const res = await agents.avneet.put(`/api/items/${createdId}`).field('title', 'Red Casio watch').field('removeImage', 'true');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.item.title, 'Red Casio watch');
    assert.equal(res.body.data.item.imageUrl, '');
    await new Promise((r) => setTimeout(r, 50));
    await agents.anon.get(imageUrl).expect(404); // old photo deleted
    await agents.rahul.put(`/api/items/${createdId}`).send({ title: 'Hijacked' }).expect(404);
  });

  test('cannot edit once verified', async () => {
    const res = await agents.avneet.put(`/api/items/${ids.itemIds.bottleLost}`).send({ title: 'New title' });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /pending/);
  });

  test('delete: other students get 403, owner succeeds', async () => {
    await agents.rahul.delete(`/api/items/${ids.itemIds.bottleLost}`).expect(403);
    await agents.avneet.delete(`/api/items/${createdId}`).expect(200);
    await agents.avneet.get(`/api/items/${createdId}`).expect(404);
  });

  test('owners cannot delete claimed reports; admins can delete anything', async () => {
    await agents.sneha.delete(`/api/items/${ids.itemIds.bikeKeys}`).expect(400);
    const res = await agents.admin.delete(`/api/items/${ids.itemIds.charger}`);
    assert.equal(res.status, 200);
  });
});

describe('matching', () => {
  test('scoreMatch follows the published formula', () => {
    const base = { category: 'Bags', location: 'Tech Park', date: '2026-01-10', title: 'grey backpack', description: 'football keychain' };
    const other = { category: 'Bags', location: 'Tech Park', date: '2026-01-08', title: 'grey backpack', description: 'football keychain' };
    // 40 category + 20 location + (20 - 2*2) date + 4 shared words * 6
    assert.equal(scoreMatch(base, other).score, 40 + 20 + 16 + 24);
    const far = { ...other, category: 'Keys', location: 'Auditorium', date: '2026-02-01', title: 'x', description: 'y' };
    assert.equal(scoreMatch(base, far).score, 0);
  });

  test('keyword points are capped at 30 and the total at 100', () => {
    const words = 'alpha bravo charlie delta echo foxtrot golf hotel';
    const a = { category: 'Other', location: 'Auditorium', date: '2026-01-10', title: words, description: '' };
    assert.equal(scoreMatch(a, { ...a }).score, 100);
    assert.equal(scoreMatch(a, { ...a, category: 'Keys', location: 'Tech Park' }).score, 20 + 30);
  });

  test('the blue bottle pair is a strong match', async () => {
    const res = await agents.anon.get(`/api/items/${ids.itemIds.bottleLost}/matches`).expect(200);
    const [top] = res.body.data.matches;
    assert.equal(top.item.title, 'Steel water bottle, blue');
    assert.ok(top.score >= 90, `score ${top.score}`);
    assert.ok(top.reasons.includes('Same category'));
    assert.ok(res.body.data.matches.length <= 3);
    assert.ok(res.body.data.matches.every((m) => m.score >= 45 && m.item.status === 'VERIFIED' && m.item.type === 'FOUND'));
  });

  test('a new report gets its matches in the create response', async () => {
    const res = await agents.sneha.post('/api/items').send(
      validItem({
        title: 'Lost blue steel water bottle',
        description: 'Blue steel water bottle with a dent, left at the basketball court.',
        location: 'Sports Complex',
      }),
    );
    assert.equal(res.status, 201);
    assert.ok(res.body.data.matches.some((m) => m.item.title === 'Steel water bottle, blue'));
    await Item.deleteOne({ _id: res.body.data.item.id });
  });

  test('matches only include VERIFIED items (pending found backpack is hidden until verified)', async () => {
    const res = await agents.anon.get(`/api/items/${ids.itemIds.backpackLost}/matches`).expect(200);
    assert.ok(!res.body.data.matches.some((m) => m.item.id === ids.itemIds.backpackFound.toString()));
  });
});

describe('claims', () => {
  let claimId;

  test('cannot claim your own report', async () => {
    const res = await agents.arjun.post(`/api/items/${ids.itemIds.bottleFound}/claims`).send({ proofAnswer: 'It is mine, I promise.' });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /reported/);
  });

  test('cannot claim items that are not VERIFIED', async () => {
    const claimed = await agents.rahul.post(`/api/items/${ids.itemIds.bikeKeys}/claims`).send({ proofAnswer: 'Red tag with my room number.' });
    assert.equal(claimed.status, 400);
    assert.match(claimed.body.message, /Only verified/);
    await agents.sneha.post(`/api/items/${ids.itemIds.hoodie}/claims`).send({ proofAnswer: 'Ink stain on the sleeve.' }).expect(404);
  });

  test('proof must be at least 10 characters', async () => {
    const res = await agents.rahul.post(`/api/items/${ids.itemIds.umbrella}/claims`).send({ proofAnswer: 'mine' });
    assert.equal(res.status, 400);
    assert.match(res.body.errors.proofAnswer, /10 characters/);
  });

  test('submitting a claim, then a duplicate is a 409', async () => {
    const res = await agents.rahul
      .post(`/api/items/${ids.itemIds.umbrella}/claims`)
      .send({ proofAnswer: 'My initials R.M. are carved into the handle.', message: 'Left it after the seminar.' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.data.claim.status, 'PENDING');
    claimId = res.body.data.claim.id;
    const dup = await agents.rahul.post(`/api/items/${ids.itemIds.umbrella}/claims`).send({ proofAnswer: 'Trying again with more detail.' });
    assert.equal(dup.status, 409);
  });

  test('item detail shows the viewer their claim and hides the claim form', async () => {
    const res = await agents.rahul.get(`/api/items/${ids.itemIds.umbrella}`).expect(200);
    assert.equal(res.body.data.viewer.myClaim.status, 'PENDING');
    assert.equal(res.body.data.viewer.canClaim, false);
  });

  test('admins cannot submit claims', async () => {
    await agents.admin.post(`/api/items/${ids.itemIds.umbrella}/claims`).send({ proofAnswer: 'Admin testing a claim.' }).expect(403);
  });

  test('GET /claims/mine lists my claims with item info', async () => {
    const res = await agents.rahul.get('/api/claims/mine').expect(200);
    const mine = res.body.data.claims.find((c) => c.id === claimId);
    assert.equal(mine.item.title, 'Navy foldable umbrella');
    assert.equal(mine.item.hiddenDetails, undefined);
  });

  test('a second user can also claim the same item (to test auto-reject later)', async () => {
    await agents.sneha
      .post(`/api/items/${ids.itemIds.umbrella}/claims`)
      .send({ proofAnswer: 'It has a wooden handle and it is navy.' })
      .expect(201);
  });
});

describe('admin', () => {
  test('students get 403 and visitors 401', async () => {
    await agents.rahul.get('/api/admin/stats').expect(403);
    await agents.anon.get('/api/admin/stats').expect(401);
    await agents.rahul.patch(`/api/admin/items/${ids.itemIds.hoodie}/status`).send({ status: 'VERIFIED' }).expect(403);
  });

  test('stats have totals, categories, lost vs found and 7 days', async () => {
    const res = await agents.admin.get('/api/admin/stats').expect(200);
    const d = res.body.data;
    assert.equal(d.totals.total, d.byType.LOST + d.byType.FOUND);
    assert.equal(d.byCategory.length, 8);
    assert.equal(d.last7Days.length, 7);
    assert.ok(d.last7Days.reduce((s, x) => s + x.count, 0) > 0);
    assert.ok(d.totals.PENDING >= 1 && d.claims.PENDING >= 1);
  });

  test('admin item list includes private details and allowed next statuses', async () => {
    const res = await agents.admin.get('/api/admin/items?status=PENDING').expect(200);
    assert.ok(res.body.data.items.length >= 1);
    for (const item of res.body.data.items) {
      assert.equal(item.status, 'PENDING');
      assert.ok(item.hiddenDetails);
      assert.deepEqual(item.nextStatuses, ['VERIFIED', 'REJECTED']);
      assert.ok(item.reportedBy.email);
    }
  });

  test('illegal status jumps are 400', async () => {
    const pending = await agents.admin.patch(`/api/admin/items/${ids.itemIds.hoodie}/status`).send({ status: 'CLAIMED' });
    assert.equal(pending.status, 400);
    assert.match(pending.body.message, /PENDING to CLAIMED/);
    const closed = await agents.admin.patch(`/api/admin/items/${ids.itemIds.walletLost}/status`).send({ status: 'VERIFIED' });
    assert.equal(closed.status, 400);
    assert.match(closed.body.message, /final/);
    const bogus = await agents.admin.patch(`/api/admin/items/${ids.itemIds.hoodie}/status`).send({ status: 'LOST' });
    assert.equal(bogus.status, 400);
  });

  test('verifying the pending backpack makes it public and reveals the match', async () => {
    const res = await agents.admin.patch(`/api/admin/items/${ids.itemIds.backpackFound}/status`).send({ status: 'VERIFIED' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.item.status, 'VERIFIED');
    await agents.anon.get(`/api/items/${ids.itemIds.backpackFound}`).expect(200);
    const matches = await agents.anon.get(`/api/items/${ids.itemIds.backpackLost}/matches`);
    assert.equal(matches.body.data.matches[0].item.id, ids.itemIds.backpackFound.toString());
  });

  test('admin claim list shows reporter private detail next to the proof', async () => {
    const res = await agents.admin.get('/api/admin/claims?status=PENDING').expect(200);
    const c = res.body.data.claims.find((x) => x.item.title === 'Navy foldable umbrella');
    assert.equal(c.item.hiddenDetails, 'Initials carved into the handle');
    assert.ok(c.proofAnswer && c.claimant.email);
  });

  test('approving a claim marks the item CLAIMED and auto-rejects the other pending claims', async () => {
    const list = await agents.admin.get('/api/admin/claims?status=PENDING');
    const rahulClaim = list.body.data.claims.find((c) => c.item.title === 'Navy foldable umbrella' && c.claimant.email === 'rahul@campus.edu');
    const res = await agents.admin.patch(`/api/admin/claims/${rahulClaim.id}`).send({ status: 'APPROVED', adminRemarks: 'Collect at 4pm.' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.claim.status, 'APPROVED');
    assert.equal(res.body.data.autoRejectedClaims, 1);

    const item = await Item.findById(ids.itemIds.umbrella);
    assert.equal(item.status, 'CLAIMED');
    const others = await Claim.find({ item: ids.itemIds.umbrella, _id: { $ne: rahulClaim.id } });
    assert.ok(others.every((c) => c.status === 'REJECTED' && /Another claim/.test(c.adminRemarks)));

    const again = await agents.admin.patch(`/api/admin/claims/${rahulClaim.id}`).send({ status: 'REJECTED' });
    assert.equal(again.status, 400);
  });

  test('rejecting a claim fills in a default remark', async () => {
    const list = await agents.admin.get('/api/admin/claims?status=PENDING');
    const watchClaim = list.body.data.claims.find((c) => c.item.title === 'Silver wristwatch');
    const res = await agents.admin.patch(`/api/admin/claims/${watchClaim.id}`).send({ status: 'REJECTED' });
    assert.equal(res.status, 200);
    assert.match(res.body.data.claim.adminRemarks, /did not match/);
  });

  test('closing an item with pending claims rejects them', async () => {
    await agents.rahul.post(`/api/items/${ids.itemIds.powerbank}/claims`).send({ proofAnswer: 'Actually I am the finder.' }).expect(400);
    await agents.sneha.post(`/api/items/${ids.itemIds.powerbank}/claims`).send({ proofAnswer: 'Green tape on the cable.' }).expect(201);
    const res = await agents.admin.patch(`/api/admin/items/${ids.itemIds.powerbank}/status`).send({ status: 'CLOSED' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.autoRejectedClaims, 1);
  });

  test('admin can reject a pending report; it disappears from public view', async () => {
    const res = await agents.admin.patch(`/api/admin/items/${ids.itemIds.notebook}/status`).send({ status: 'REJECTED', note: 'Spam' });
    assert.equal(res.status, 200);
    await agents.anon.get(`/api/items/${ids.itemIds.notebook}`).expect(404);
  });
});
