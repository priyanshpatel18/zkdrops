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
}