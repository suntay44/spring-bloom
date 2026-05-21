import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const chatRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  prefix: "sb:chat",
});

export const machineRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, "60 s"),
  prefix: "sb:machine",
});

// Generic write-action limit for sensitive POST/PUT/DELETE endpoints
// (integrations save, sandbox provision/connect, settings, etc.)
export const writeRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(30, "60 s"),
  prefix: "sb:write",
});
