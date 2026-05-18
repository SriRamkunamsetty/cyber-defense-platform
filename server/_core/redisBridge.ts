import { ENV } from "./env";
import { useRedisPubSub } from "./gcpConfig";
import type { InvestigationEvent } from "../websocket";

type RedisClient = {
  publish: (channel: string, message: string) => Promise<number>;
  subscribe: (channel: string) => Promise<void>;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  duplicate: () => RedisClient;
};

let publisher: RedisClient | null = null;
let subscriber: RedisClient | null = null;
const CHANNEL = "trinetra:investigation-events";

let localBroadcast: ((event: InvestigationEvent) => void) | null = null;

export function setLocalBroadcastHandler(
  handler: (event: InvestigationEvent) => void
): void {
  localBroadcast = handler;
}

async function getRedis(): Promise<RedisClient | null> {
  if (!useRedisPubSub() || !ENV.redisUrl) return null;
  if (publisher) return publisher;

  try {
    const Redis = (await import("ioredis")).default;
    publisher = new Redis(ENV.redisUrl) as unknown as RedisClient;
    subscriber = (publisher.duplicate?.() ?? new Redis(ENV.redisUrl)) as RedisClient;
    await subscriber.subscribe(CHANNEL);
    subscriber.on("message", (_ch: unknown, message: unknown) => {
      try {
        const event = JSON.parse(String(message)) as InvestigationEvent;
        localBroadcast?.(event);
      } catch {
        /* ignore */
      }
    });
    console.log("[Redis] Pub/sub bridge connected");
    return publisher;
  } catch (error) {
    console.warn("[Redis] Unavailable:", error);
    return null;
  }
}

/** Publish to Redis for multi-instance fan-out (other Cloud Run replicas). */
export async function publishInvestigationEvent(
  event: InvestigationEvent
): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    await redis.publish(CHANNEL, JSON.stringify(event));
  }
}
