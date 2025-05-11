import { QRSession } from "@prisma/client";
import { Groth16Proof, PublicSignals } from "snarkjs";

export interface Organizer {
  id: string;
  wallet: string;
  email: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  tokenSymbol: string;
  tokenUri: string;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
  claimLimitPerUser: number;
  metadataUri: string;
  qrCodeUrl: string;
  tokenMediaType: string;
  organizerAddress: string;
  organizer?: Organizer;
  qrSessions?: QRSession[];
}

export interface DeviceInfo {
  fingerprint: string;
  geolocation: {
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null;
  userAgent: string;
}

export const CLAIM_STATUSES = {
  IDLE: "idle",
  CONNECTING_WALLET: "connecting_wallet",
  WALLET_CONNECTED: "wallet_connected",
  COLLECTING_DEVICE_INFO: "collecting_device_info",
  DEVICE_INFO_COLLECTED: "device_info_collected",
  GENERATING_PROOF: "generating_proof",
  PROOF_READY: "proof_ready",
  SUBMITTING: "submitting",
  SUBMITTED: "submitted",
  CLAIMED: "claimed",
  FAILED: "failed",
  ERROR: "error",
};

export interface Proof {
  proof: Groth16Proof;
  publicSignals: PublicSignals;
}