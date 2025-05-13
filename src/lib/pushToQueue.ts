import { redis } from "@/lib/redisConfig";
import { Queue } from "bullmq";

const REDIS_PREPARE_QUEUE_NAME = process.env.REDIS_PREPARE_QUEUE_NAME || "webhookQueue";

const webhookQueue = new Queue(REDIS_PREPARE_QUEUE_NAME, {
  connection: redis
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function pushToQueue(data: any) {
  await webhookQueue.add("webhook-job", data);
}