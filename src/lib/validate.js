export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

const bad = (message, field) => new HttpError(400, message, { field });
const blank = (x) => x === undefined || x === null || (typeof x === 'string' && x.trim() === '');

export const v = {
  str(x, name, { min = 0, max = 255, required = false, trim = true } = {}) {
    if (blank(x)) { if (required) throw bad(`${name} is required.`, name); return null; }
    if (typeof x !== 'string') throw bad(`${name} must be text.`, name);
    const s = trim ? x.trim() : x;
    if (s.length < min) throw bad(`${name} must be at least ${min} characters.`, name);
    if (s.length > max) throw bad(`${name} must be at most ${max} characters.`, name);
    return s;
  },
  email(x, name, { required = false } = {}) {
    const s = v.str(x, name, { required, max: 254 });
    if (s === null) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) throw bad(`${name} must be a valid email address.`, name);
    return s.toLowerCase();
  },
  oneOf(x, name, list, { required = false } = {}) {
    if (blank(x)) { if (required) throw bad(`${name} is required.`, name); return null; }
    if (!list.includes(x)) throw bad(`${name} must be one of: ${list.join(', ')}.`, name);
    return x;
  },
  int(x, name, { min = 0, max = 2_147_483_647, required = false } = {}) {
    if (blank(x)) { if (required) throw bad(`${name} is required.`, name); return null; }
    const n = typeof x === 'number' ? x : Number(x);
    if (!Number.isInteger(n) || n < min || n > max) throw bad(`${name} must be a whole number between ${min} and ${max}.`, name);
    return n;
  },
  date(x, name, { required = false } = {}) {
    if (blank(x)) { if (required) throw bad(`${name} is required.`, name); return null; }
    if (typeof x !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x) || new Date(`${x}T00:00:00Z`).toISOString().slice(0, 10) !== x) {
      throw bad(`${name} must be a valid date (YYYY-MM-DD).`, name);
    }
    return x;
  },
  bool(x) { return x === true || x === 'true' || x === 1 || x === '1'; },
  id(x, name = 'id') {
    const n = Number(x);
    if (!Number.isSafeInteger(n) || n < 1) throw new HttpError(400, `Invalid ${name}.`, { field: name });
    return n;
  }
};

// Belgian enterprise numbers: 10 digits, last two = 97 - (first eight mod 97).
const validBelgianDigits = (digits) =>
  /^[01]\d{9}$/.test(digits) && 97 - (Number(digits.slice(0, 8)) % 97) === Number(digits.slice(8));

export function vatNumber(x, name = 'vat_number') {
  const s = v.str(x, name, { max: 30 });
  if (s === null) return null;
  const clean = s.replace(/[\s.\-]/g, '').toUpperCase();
  if (clean.startsWith('BE')) {
    const digits = clean.slice(2);
    if (!validBelgianDigits(digits)) throw bad('That Belgian VAT number is not valid.', name);
    return `BE${digits}`;
  }
  if (!/^[A-Z]{2}[A-Z0-9]{2,12}$/.test(clean)) throw bad('VAT number must start with a two-letter country code.', name);
  return clean;
}

export function companyNumber(x, name = 'company_number') {
  const s = v.str(x, name, { max: 20 });
  if (s === null) return null;
  const digits = s.replace(/[\s.\-]/g, '');
  if (!validBelgianDigits(digits)) throw bad('That company number (KBO/BCE) is not valid.', name);
  return `${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7)}`;
}

// Builds a sanitised object from the fields present in `body` using a schema of validators.
export function parse(body, schema, { partial = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Request body must be a JSON object.');
  const out = {};
  for (const [key, check] of Object.entries(schema)) {
    if (partial && !(key in body)) continue;
    out[key] = check(body[key]);
  }
  return out;
}
