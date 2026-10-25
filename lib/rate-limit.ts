type Bucket = { count: number; reset: number };

const buckets = new Map<string, Bucket>();

// ponytail: in-memory best effort; use a shared store for hard limits across instances.
export function take(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset <= now) {
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k);
    }
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

export function clientIP(req: Request) {
  const value = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return value.slice(0, 64);
}
