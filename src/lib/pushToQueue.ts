import { redis } from "@/lib/redisConfig";
import { Queue } from "bullmq";

const REDIS_PREPARE_QUEUE_NAME = process.env.REDIS_PREPARE_QUEUE_NAME || "webhookQueue";
const REDIS_MINT_QUEUE_NAME = process.env.REDIS_MINT_QUEUE_NAME || "webhookQueue";

const prepareQueue = new Queue(REDIS_PREPARE_QUEUE_NAME, {
  connection: redis
});
const mintQueue = new Queue(REDIS_MINT_QUEUE_NAME, {
  connection: redis
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function pushToQueue(data: any) {
  await prepareQueue.add("webhook-job", data);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function mintNFT(data: any) {
  await mintQueue.add("mint-job", data);
}