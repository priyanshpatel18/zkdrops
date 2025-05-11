import { z } from "zod"

export const createCampaignSchema = z.object({
  name: z.string().max(32).min(1),
  description: z.string().max(200).min(1).optional(),
  tokenSymbol: z.string().max(32).min(1),
  tokenUri: z.string().max(200).min(1).optional(),
  isActive: z.boolean(),
  startsAt: z.string(),
  endsAt: z.string(),
  claimLimitPerUser: z.number(),
  metadataUri: z.string().optional(),
  organizerAddress: z.string().optional(),
});