"use client";

import {
  CompressedTokenProgram,
  getTokenPoolInfos,
  selectTokenPoolInfo,
  TokenPoolInfo,
} from "@lightprotocol/compressed-token";
import {
  bn,
  createRpc,
  Rpc,
  selectStateTreeInfo,
  buildTx,
  sendAndConfirmTx
} from "@lightprotocol/stateless.js";
import {
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { PublicKey, SendTransactionError, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Copy, Download, Share2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Campaign } from "@/types/types";
import { useWallet } from "@solana/wallet-adapter-react";
import { toast } from "sonner";

const RPC_ENDPOINT = "https://devnet.helius-rpc.com/?api-key=9f52f156-8987-4d04-953f-54db6be65ec2";

export default function NewQrSessionPage() {
  const router = useRouter();
  const { id } = useParams();
  const { publicKey, connected, signTransaction } = useWallet();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [maxClaims, setMaxClaims] = useState<string>("");
  const [expiresIn, setExpiresIn] = useState("15m");
  const [qrSessionUrl, setQrSessionUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [qrSessionNonce, setQrSessionNonce] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [isMinted, setIsMinted] = useState(false);

  useEffect(() => {
    if (!connected) {
      router.back();
    }
  }, [connected, router])

  useEffect(() => {
    const fetchCampaign = async () => {
      if (typeof id !== "string") return;
      setIsLoading(true);


      try {
        const res = await fetch(`/api/campaign?id=${id}`);
        const data = await res.json();
        const fetchedCampaign: Campaign = data.campaign;

        setCampaign(fetchedCampaign);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchCampaign();
  }, [id, publicKey, connected]);

  const handleCreateQRSession = async () => {
    if (!id) return;

    if (!maxClaims || isNaN(parseInt(maxClaims)) || parseInt(maxClaims) <= 0) {
      toast.error("Please enter a valid maximum number of claims");
      return;
    }

    try {
      setIsLoading(true);

      const body = {
        campaignId: id,
        maxClaims: parseInt(maxClaims),
        expiresIn,
      };

      const res = await fetch(`/api/qr-session/create`, {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        toast.error("Failed to create QR session");
        return;
      }

      const data = await res.json();

      setQrSessionUrl(`${window.location.origin}/claim/${data.nonce}`);
      setQrSessionNonce(data.nonce);
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        toast.error(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const test = async () => {
    if (!publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!id || !qrSessionNonce || !maxClaims) return;


    // Set up the connection
    const connection: Rpc = createRpc(RPC_ENDPOINT, RPC_ENDPOINT, RPC_ENDPOINT, { commitment: "confirmed" });

    try {
      setIsMinting(true);

      const [mintPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint"), Buffer.from(qrSessionNonce)],
        CompressedTokenProgram.programId
      );
      const rentExemptBalance = await connection.getMinimumBalanceForRentExemption(82);

      const ata = getAssociatedTokenAddressSync(mintPDA, publicKey);
      const ataInfo = await connection.getAccountInfo(ata);

      if (!ataInfo) {
        const createMintIxs = await CompressedTokenProgram.createMint({
          feePayer: publicKey,
          mint: mintPDA,
          decimals: 0,
          authority: publicKey,
          freezeAuthority: null,
          rentExemptBalance,
        });

        const latestBlock = await connection.getLatestBlockhash("confirmed");

        const createMintTxn = buildTx(
          [...createMintIxs],
          publicKey,
          latestBlock.blockhash
        )

        if (signTransaction) {
          const signedMintTx = await signTransaction(createMintTxn);

          try {
            await sendAndConfirmTx(
              connection,
              signedMintTx,
              {
                commitment: "confirmed",
                preflightCommitment: "processed",
                skipPreflight: false
              }
            );
            toast.success("Transaction sent successfully");
          } catch (err) {
            console.error("Transaction send failed:", err);
            toast.error("Failed to send transaction");
          }
        }
      }
    } catch (testErr) {
      console.error("Basic transaction signing test failed:", testErr);
      toast.error("Your wallet may have issues with transaction signing");
      return;
    } finally {
      setIsMinting(false);
    }
  }

  // const handleMintCPOPs = async () => {
  //   if (!id || !qrSessionNonce || !maxClaims) return;

  //   if (!publicKey) {
  //     toast.error("Please connect your wallet");
  //     return;
  //   }

  //   try {
  //     setIsMinting(true);

  //     const COMPRESSION_ENDPOINT = RPC_ENDPOINT;
  //     const PROVER_ENDPOINT = RPC_ENDPOINT;
  //     const connection: Rpc = createRpc(RPC_ENDPOINT, COMPRESSION_ENDPOINT, PROVER_ENDPOINT, { commitment: "confirmed" });

  //     // Generate mint PDA
  //     const [mintPDA] = PublicKey.findProgramAddressSync(
  //       [Buffer.from("mint"), Buffer.from(qrSessionNonce)],
  //       CompressedTokenProgram.programId
  //     );

  //     const rentExemptBalance = await connection.getMinimumBalanceForRentExemption(82);

  //     // Check if the mint already exists
  //     let mintExists = false;
  //     try {
  //       const mintInfo = await connection.getAccountInfo(mintPDA);
  //       mintExists = !!mintInfo;
  //     } catch (e) {
  //       mintExists = false;
  //     }

  //     // Check if token pool exists
  //     let tokenPoolExists = false;
  //     let tokenPoolInfos: TokenPoolInfo[] = [];

  //     try {
  //       tokenPoolInfos = await getTokenPoolInfos(connection, mintPDA);
  //       tokenPoolExists = tokenPoolInfos.length > 0;
  //     } catch (e) {
  //       tokenPoolExists = false;
  //     }

  //     // Setup phase - create mint and token pool if needed
  //     if (!mintExists || !tokenPoolExists) {
  //       const setupInstructions: TransactionInstruction[] = [];

  //       // Only add mint creation if needed
  //       if (!mintExists) {
  //         const createMintIxs = await CompressedTokenProgram.createMint({
  //           feePayer: publicKey,
  //           mint: mintPDA,
  //           decimals: 0,
  //           authority: publicKey,
  //           freezeAuthority: null,
  //           rentExemptBalance,
  //         });

  //         setupInstructions.push(...(Array.isArray(createMintIxs) ? createMintIxs : [createMintIxs]));
  //       }

  //       // Only create token pool if needed
  //       if (!tokenPoolExists) {
  //         // Create ATA for the mint
  //         const ata = getAssociatedTokenAddressSync(mintPDA, publicKey);
  //         let ataExists = false;

  //         try {
  //           const ataInfo = await connection.getAccountInfo(ata);
  //           ataExists = !!ataInfo;
  //         } catch (e) {
  //           ataExists = false;
  //         }

  //         if (!ataExists) {
  //           const ataIx = createAssociatedTokenAccountInstruction(
  //             publicKey,
  //             ata,
  //             publicKey,
  //             mintPDA
  //           );
  //           setupInstructions.push(ataIx);
  //         }

  //         const createTokenPoolIxs = await CompressedTokenProgram.createTokenPool({
  //           feePayer: publicKey,
  //           mint: mintPDA,
  //         });

  //         setupInstructions.push(...(Array.isArray(createTokenPoolIxs) ? createTokenPoolIxs : [createTokenPoolIxs]));
  //       }

  //       // Only proceed if we have setup instructions
  //       if (setupInstructions.length > 0) {
  //         const latestBlock = await connection.getLatestBlockhash("confirmed");

  //         // Create setup transaction
  //         const setupMessage = new TransactionMessage({
  //           payerKey: publicKey,
  //           recentBlockhash: latestBlock.blockhash,
  //           instructions: setupInstructions,
  //         }).compileToV0Message();

  //         const setupTx = new VersionedTransaction(setupMessage);

  //         if (!signTransaction) {
  //           throw new Error("Wallet does not support signing transactions");
  //         }

  //         // Sign the transaction
  //         const signedSetupTx = await signTransaction(setupTx);

  //         // Send the setup transaction with error handling
  //         let setupSignature;
  //         try {
  //           setupSignature = await connection.sendRawTransaction(signedSetupTx.serialize(), {
  //             skipPreflight: false,
  //             preflightCommitment: "confirmed",
  //           });

  //           console.log("Setup transaction sent, signature:", setupSignature);

  //           // Wait for confirmation with increased timeout
  //           const setupConfirmation = await connection.confirmTransaction({
  //             blockhash: latestBlock.blockhash,
  //             lastValidBlockHeight: latestBlock.lastValidBlockHeight,
  //             signature: setupSignature
  //           }, "confirmed");

  //           if (setupConfirmation.value.err) {
  //             throw new Error(`Setup transaction failed: ${setupConfirmation.value.err.toString()}`);
  //           }

  //           console.log("Setup transaction confirmed");
  //         } catch (sendError) {
  //           if (sendError instanceof SendTransactionError) {
  //             console.error("Send transaction error:", sendError.message);
  //             // Don't try to get logs here since we have the WrongSize issue
  //           }
  //           throw sendError;
  //         }

  //         // Update token pool info after successful setup
  //         if (!tokenPoolExists) {
  //           // Wait a moment for the chain to process
  //           await new Promise(resolve => setTimeout(resolve, 2000));

  //           try {
  //             tokenPoolInfos = await getTokenPoolInfos(connection, mintPDA);
  //             if (tokenPoolInfos.length === 0) {
  //               throw new Error("Failed to create token pool");
  //             }
  //           } catch (e) {
  //             throw new Error("Failed to get token pool info after setup");
  //           }
  //         }
  //       }
  //     }

  //     // Now that setup is complete, proceed with minting
  //     if (tokenPoolInfos.length === 0) {
  //       // Wait a moment to ensure chain state is updated
  //       await new Promise(resolve => setTimeout(resolve, 2000));

  //       try {
  //         tokenPoolInfos = await getTokenPoolInfos(connection, mintPDA);
  //         if (tokenPoolInfos.length === 0) {
  //           throw new Error("Token pool info not available");
  //         }
  //       } catch (e) {
  //         throw new Error("Failed to get token pool info");
  //       }
  //     }

  //     const tokenPoolInfo = selectTokenPoolInfo(tokenPoolInfos);

  //     // Get state tree infos
  //     const treeInfos = await connection.getStateTreeInfos();
  //     if (!treeInfos || treeInfos.length === 0) {
  //       throw new Error("No state trees available");
  //     }
  //     const treeInfo = selectStateTreeInfo(treeInfos);

  //     // Create mint-to instructions
  //     const mintToIxs = await CompressedTokenProgram.mintTo({
  //       feePayer: publicKey,
  //       mint: mintPDA,
  //       authority: publicKey,
  //       toPubkey: publicKey,
  //       amount: bn(parseInt(maxClaims)),
  //       outputStateTreeInfo: treeInfo,
  //       tokenPoolInfo
  //     });

  //     // Get a fresh blockhash for the mint transaction
  //     const latestBlock = await connection.getLatestBlockhash("confirmed");

  //     // Create mint transaction
  //     const mintMessage = new TransactionMessage({
  //       payerKey: publicKey,
  //       recentBlockhash: latestBlock.blockhash,
  //       instructions: Array.isArray(mintToIxs) ? mintToIxs : [mintToIxs],
  //     }).compileToV0Message();

  //     const mintTx = new VersionedTransaction(mintMessage);

  //     if (!signTransaction) {
  //       throw new Error("Wallet does not support signing transactions");
  //     }

  //     // Sign the transaction
  //     const signedMintTx = await signTransaction(mintTx);

  //     // Send the mint transaction with error handling
  //     let mintSignature;
  //     try {
  //       mintSignature = await connection.sendRawTransaction(signedMintTx.serialize(), {
  //         skipPreflight: false,
  //         preflightCommitment: "confirmed",
  //       });

  //       console.log("Mint transaction sent, signature:", mintSignature);

  //       // Confirm transaction with timeout
  //       const mintConfirmation = await connection.confirmTransaction({
  //         blockhash: latestBlock.blockhash,
  //         lastValidBlockHeight: latestBlock.lastValidBlockHeight,
  //         signature: mintSignature
  //       }, "confirmed");

  //       if (mintConfirmation.value.err) {
  //         throw new Error(`Mint transaction failed: ${mintConfirmation.value.err.toString()}`);
  //       }

  //       toast.success(`Mint successful! Tx: ${mintSignature}`);
  //     } catch (sendError) {
  //       if (sendError instanceof SendTransactionError) {
  //         console.error("Send transaction error:", sendError.message);
  //         // Don't try to get logs here to avoid the WrongSize issue
  //       }
  //       throw sendError;
  //     }

  //   } catch (err) {
  //     console.error("Error during minting process:", err);

  //     // Handle errors but avoid trying to get transaction details to prevent WrongSize error
  //     if (err instanceof SendTransactionError) {
  //       // Don't call getLogs() here as it's causing the WrongSize error
  //       toast.error(`Transaction failed: ${err.message}`);
  //     } else if (err instanceof Error) {
  //       toast.error(err.message);
  //     } else {
  //       toast.error("Failed to mint cPOPs");
  //     }
  //   } finally {
  //     setIsMinting(false);
  //   }
  // };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(qrSessionUrl);
    setIsCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setIsCopied(false), 2000);
  };

  const downloadQR = () => {
    const svg = document.querySelector("svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    img.onload = function () {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngFile;
      a.download = "qr-code.png";
      a.click();
      toast.success("QR code downloaded");
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  const shareQRCode = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${campaign?.name} - Claim QR Code`,
          text: "Scan this QR code to claim your collectible",
          url: qrSessionUrl
        });
        toast.success("Shared successfully");
      } catch (error) {
        console.error("Error sharing:", error);
      }
    } else {
      copyToClipboard();
    }
  };

  useEffect(() => {
    if (!campaign || !publicKey || isLoading) return;

    if (!connected) {
      router.push("/dashboard");
      return;
    }

    if (publicKey.toBase58().toLowerCase() !== campaign.organizer?.wallet.toLowerCase()) {
      router.push(`/dashboard/campaign/${id}`);
    }
  }, [campaign, publicKey, connected, id, isLoading, router]);

  // Format expiration time for display
  const getExpirationDisplay = () => {
    switch (expiresIn) {
      case "15m": return "15 minutes";
      case "1h": return "1 hour";
      case "2h": return "2 hours";
      case "1d": return "24 hours";
      default: return expiresIn;
    }
  };

  return (
    <motion.div className="p-4 mx-auto w-full max-w-screen-md flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
      </div>

      <h1 className="text-xl font-bold mb-1">{campaign?.name}</h1>
      <p className="text-muted-foreground mb-6 text-sm">Create a limited-use QR session</p>

      {!qrSessionUrl ? (
        <Card className="flex-1 flex flex-col gap-6 p-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Max Claims</Label>
              <Input
                type="number"
                min="0"
                value={maxClaims}
                onChange={(e) => setMaxClaims(e.target.value)}
              />
            </div>

            <div>
              <Label>Expires In</Label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose expiration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15m">15 Minutes</SelectItem>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="2h">2 Hours</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button className="mt-auto w-full" onClick={handleCreateQRSession} disabled={isLoading}>
            Generate QR Code
          </Button>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="text-center">QR Code Generated</CardTitle>
              <p className="text-center text-sm text-muted-foreground">
                Max claims: {maxClaims} • Expires in: {getExpirationDisplay()}
              </p>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-lg mb-6 shadow-sm">
                <QRCodeSVG
                  value={qrSessionUrl}
                  size={240}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className="w-full relative mb-6">
                <Input
                  value={qrSessionUrl}
                  readOnly
                  className="pr-10 text-sm font-mono"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1 h-8 w-8"
                  onClick={copyToClipboard}
                >
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex gap-3 w-full mb-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4" />
                  <span>Copy Link</span>
                </Button>
                <Button variant="outline" className="flex-1 gap-2" onClick={downloadQR}>
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </Button>
                <Button variant="outline" className="flex-1 gap-2" onClick={shareQRCode}>
                  <Share2 className="h-4 w-4" />
                  <span>Share</span>
                </Button>
              </div>
            </CardContent>
            <Separator />
            <div className="w-full space-y-2 px-4">
              <Label>Mint cPOPs (compressed NFTs)</Label>
              <Button
                onClick={test}
                className="w-full"
                disabled={isMinting}
              >
                {isMinting ? "Minting..." : isMinted ? "Mint cPOPs" : "Mint Token"}
              </Button>
            </div>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}