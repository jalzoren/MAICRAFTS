import xss from "xss";

const shouldSkipKey = (key) => {
  if (!key) return false;
  const normalized = key.toLowerCase();
  return (
    normalized.includes("password") ||
    normalized.includes("token") ||
    normalized.includes("otp") ||
    normalized.includes("captcha")
  );
};

const sanitizeValue = (value, key = "") => {
  if (typeof value === "string") {
    return xss(value, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ["script"],
    });
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === "object" && value.constructor === Object) {
    const sanitized = {};
    for (const [childKey, item] of Object.entries(value)) {
      sanitized[childKey] = shouldSkipKey(childKey)
        ? item
        : sanitizeValue(item, childKey);
    }
    return sanitized;
  }

  return value;
};

const sanitizeObjectInPlace = (obj) => {
  if (!obj || typeof obj !== "object") {
    return;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (shouldSkipKey(key)) {
      continue;
    }

    const sanitized = sanitizeValue(value, key);
    try {
      obj[key] = sanitized;
    } catch {
      // Ignore read-only fields (e.g., req.query in Express 5).
    }
  }
};

const sanitizeRequest = (req, _res, next) => {
  if (Array.isArray(req.body) || typeof req.body === "string") {
    req.body = sanitizeValue(req.body);
  } else {
    sanitizeObjectInPlace(req.body);
  }

  sanitizeObjectInPlace(req.query);
  sanitizeObjectInPlace(req.params);
  next();
};

export default sanitizeRequest;
