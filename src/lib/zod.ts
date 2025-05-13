import { z } from 'zod'

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
})

export const createQrSessionSchema = z.object({
  campaignId: z.string().min(1, 'Campaign ID is required'),
  maxClaims: z
    .number({ invalid_type_error: 'maxClaims must be a number' })
    .int('maxClaims must be an integer')
    .positive('maxClaims must be greater than 0'),
  expiresIn: z.enum(['TWELVE_HOURS', 'ONE_DAY', 'TWO_DAY', 'NEVER'], {
    errorMap: () => ({ message: 'Invalid expiration option' }),
  }),
})

export const claimSchema = z.object({
  campaignId: z.string().min(1, 'Campaign ID is required'),
  walletAddress: z.string().min(1, 'Wallet address is required'),
  sessionNonce: z.string().min(1, 'QR Session Nonce is required'),
  deviceHash: z.string().min(1, 'Device hash is required'),
  geoRegion: z.string().min(1, 'Geo region is required'),

  proof: z.object({
    pi_a: z.array(z.string().regex(/^\d+$/, 'pi_a elements must be decimal strings')).length(3),
    pi_b: z.array(z.array(z.string().regex(/^\d+$/, 'pi_b elements must be decimal strings')).length(2)).length(3),
    pi_c: z.array(z.string().regex(/^\d+$/, 'pi_c elements must be decimal strings')).length(3),
    protocol: z.literal('groth16'),
    curve: z.literal('bn128'),
  }),

  publicSignals: z.array(z.string().regex(/^\d+$/, 'Public signals must be decimal strings')).min(1),
})
