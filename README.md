# zkdrops – Compressed Proof of Participation on Solana

## 🧩 Overview

**zkdrops** is a zk-compressed Proof-of-Participation protocol built on **Solana**.  
It allows organizers to mint experience tokens (cPOPs), share them via QR codes, and enable attendees to claim them using zero-knowledge proofs — all in a scalable, private, and verifiable manner.

---

## 🔨 Tech Stack

- **Framework**: Next.js (App Router)
- **Blockchain**: Solana
- **Compression**: [Light Protocol](https://docs.lightprotocol.com/)
- **Wallets**: Phantom, Backpack (`@solana/wallet-adapter`)
- **Database**: Prisma + Postgres
- **QR Generation**: `qrcode.react`
- **ZK Proofs**: (Planned) zk-SNARKs

---

## 👤 User Roles

| Role      | Capabilities                                         |
|-----------|------------------------------------------------------|
| Organizer | Create campaigns, generate QR sessions, mint cPOPs  |
| Attendee  | Scan QR codes, generate ZK proof, claim cPOPs (NFTs) |

---

## 🧭 App Flow

1. **Organizer** creates a campaign with metadata.
2. **Organizer** generates a QR session linked to the campaign.
3. **Organizer** mints **cPOPs** using Light Protocol and signs with their wallet.
4. **Attendees** scan the QR code → generate ZK proof → claim the cPOP.
5. **Compressed tokens** are recorded in the DB and linked to the campaign.

---

## 📦 Core Features

### 🎯 Campaign Creation

- `POST /api/campaign`
- Stores: name, description, token URI, metadata URI, limits, etc.

### 🧾 QR Session

- Time-bound, single-use QR code
- Encodes campaign ID + session nonce
- Modal UI for sharing, copying, or downloading the QR code

### 🪙 cPOP Minting (Organizer)

- Organizer signs a compressed token mint transaction
- Minted via [Light Protocol](https://docs.lightprotocol.io)
- Mint metadata saved to `/api/compressed-token`

### 🔒 ZK Proof + Claim (Attendee) *(WIP)*

- Attendee scans QR code
- Generates zero-knowledge proof of presence
- Proof is verified and cPOP is claimed

---

## 🔗 On-Chain Details

- **Compression Library**: `@lightprotocol/compressed-token`
- **Mint Address**: Derived using campaign + QR session nonce
- **Decimals**: None (integer token amounts only)
- **Merkle Trees**: Used to store and validate cTokens efficiently

---

## 🧠 Design Decisions

- ❌ No backend minting — organizer must sign mint tx client-side
- ✅ Metadata is stored once in the `Campaign` model (no duplication)
- ✅ Prisma models are relational and support tracking claims, sessions, and tokens

Built with ❤️ on Solana.