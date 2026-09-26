// Defense in depth against NoSQL operator injection ({"$gt": ""}) and prototype pollution.
// Zod already rejects non-string values for every field; this also covers anything it would not see.
const BAD_KEY = /^\$|\.|^__proto__$|^constructor$|^prototype$/;

function scrub(value, depth = 0) {
  if (depth > 8 || value === null || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (BAD_KEY.test(key)) delete value[key];
    else scrub(value[key], depth + 1);
  }
}

export function sanitizeBody(req, _res, next) {
  if (req.body && typeof req.body === 'object') scrub(req.body);
  next();
}
