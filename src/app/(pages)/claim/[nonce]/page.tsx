"use client";

import { WalletButton } from "@/components/solana/SolanaProvider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { generateProof, getDeviceInfo } from "@/lib/claim";
import { cn } from "@/lib/utils";
import { CLAIM_STATUSES, DeviceInfo, Proof } from "@/types/types";
import { Campaign, Claim, QRSession } from "@prisma/client";
import { useWallet } from "@solana/wallet-adapter-react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle, Fingerprint, Loader2, MapPin, Shield, XCircle } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface Session extends QRSession {
  campaign: Campaign;
  claims: Claim[];
}

export default function ClaimPage() {
  const router = useRouter();
  const { nonce } = useParams();
  const [session, setSession] = useState<Session | null>(null);
  const [zkProof, setZkProof] = useState<Proof | null>(null);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [status, setStatus] = useState(CLAIM_STATUSES.IDLE);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const { connected, publicKey } = useWallet();

  // 1. Fetch session info
  useEffect(() => {
    if (!nonce || typeof nonce !== "string") {
      setError("Invalid QR code");
      return;
    }

    const fetchSession = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/qr-session?nonce=${encodeURIComponent(nonce)}`);

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || "Session not found or expired");
        }

        const data = await res.json();

        if (!data.session) {
          throw new Error("Invalid session data");
        }

        // Validate expiration
        const expiresAt = new Date(data.session.expiresAt);
        if (expiresAt < new Date()) {
          throw new Error("Session has expired");
        }

        // Check if max claims reached
        if (data.session.currentClaims >= data.session.maxClaims) {
          throw new Error("Maximum claims for this session reached");
        }

        setSession(data.session);
      } catch (err) {
        console.error(err);
        if (err instanceof Error) {
          setError(err.message || "Failed to load session");
          toast.error(err.message || "Invalid or expired session");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [nonce]);

  // 2. Connect wallet function
  useEffect(() => {
    if (connected) {
      setStatus(CLAIM_STATUSES.WALLET_CONNECTED);
    } else {
      setStatus(CLAIM_STATUSES.IDLE);
    }
  }, [connected])

  // 3. Collect device info and geolocation
  const collectDeviceInfo = useCallback(async () => {
    try {
      setStatus(CLAIM_STATUSES.COLLECTING_DEVICE_INFO);
      toast.info("Collecting device information...");

      // Create a progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const next = prev + Math.random() * 10;
          return next > 40 ? 40 : next;
        });
      }, 200);

      const info = await getDeviceInfo(session!, setDeviceInfo);

      clearInterval(progressInterval);
      setProgress(50);
      setStatus(CLAIM_STATUSES.DEVICE_INFO_COLLECTED);
      toast.success("Device information collected");

      return info;
    } catch (err) {
      console.error("Device info collection error:", err);
      if (err instanceof Error) {
        setError(err.message || "Failed to collect device information");
        toast.error(err.message || "Failed to collect device information");
      } else {
        setError("Failed to collect device information");
        toast.error("Failed to collect device information");
      }
      setStatus(CLAIM_STATUSES.ERROR);
      return null;
    }
  }, [session]);

  // 4. ZK proof generation
  const generateZKProof = useCallback(async () => {
    if (!session || !deviceInfo) return;

    try {
      setStatus(CLAIM_STATUSES.GENERATING_PROOF);
      toast.info("Generating ZK proof...");

      // Progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const next = prev + Math.random() * 10;
          return next > 95 ? 95 : next;
        });
      }, 300);

      const { proof, publicSignals } = await generateProof(session, deviceInfo, publicKey);

      clearInterval(progressInterval);
      setProgress(100);

      setZkProof({ proof, publicSignals });
      setStatus(CLAIM_STATUSES.PROOF_READY);
      toast.success("ZK proof generated successfully");

      return { proof, publicSignals };
    } catch (err) {
      console.error("Proof generation error:", err);
      if (err instanceof Error) {
        setError(err.message || "Failed to generate proof");
        toast.error(err.message || "Failed to generate ZK proof");
      } else {
        setError("Failed to generate proof");
        toast.error("Failed to generate ZK proof");
      }
      setStatus(CLAIM_STATUSES.ERROR);
      return null;
    }
  }, [session, deviceInfo, publicKey]);

  // 5. Submit claim
  const submitClaim = useCallback(async () => {
    if (!zkProof || !session || !deviceInfo) return;

    try {
      setStatus(CLAIM_STATUSES.SUBMITTING);

      const payload = {
        campaignId: session.campaignId,
        walletAddress: publicKey?.toBase58() || undefined,
        sessionNonce: session.nonce,
        deviceHash: deviceInfo.fingerprint,
        geoRegion: `${deviceInfo.geolocation?.latitude} ${deviceInfo.geolocation?.longitude} $`,
        proof: zkProof.proof,
        publicSignals: zkProof.publicSignals,
      };

      console.log(payload);


      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to submit claim");
      }

      const { claim } = await res.json();
      setClaimId(claim.id);
      setStatus(CLAIM_STATUSES.SUBMITTED);
      toast.success("Claim submitted successfully!");
    } catch (err) {
      setStatus(CLAIM_STATUSES.ERROR);
      if (err instanceof Error) {
        setError(err.message || "Failed to submit claim");
        toast.error(err.message || "Failed to submit claim");
      } else {
        console.error("Claim submission error:", err);
        setError("Failed to submit claim");
        toast.error("Failed to submit claim");
      }
    }
  }, [zkProof, session, deviceInfo, publicKey]);

  // 6. Poll for mint status
  useEffect(() => {
    if (!claimId || status !== CLAIM_STATUSES.SUBMITTED) return;

    const pollStatus = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/claim/status?id=${encodeURIComponent(claimId)}`);

        if (!res.ok) {
          return;
        }

        const data = await res.json();

        if (data.status === "CLAIMED") {
          setStatus(CLAIM_STATUSES.CLAIMED);
          toast.success("NFT successfully minted! 🎉");
        } else if (data.status === "FAILED") {
          setStatus(CLAIM_STATUSES.FAILED);
          setError("Minting process failed");
          toast.error("Claim failed during mint process");
        }
      } catch (err) {
        // Ignore errors during polling
        console.warn("Polling error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [claimId, status]);

  // Handle error cases
  if (error && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p>{error}</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push('/')} variant="outline">
              Return Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading && !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  const getStatusMessage = () => {
    switch (status) {
      case CLAIM_STATUSES.CONNECTING_WALLET:
        return "Connecting to wallet...";
      case CLAIM_STATUSES.WALLET_CONNECTED:
        return "Wallet connected!";
      case CLAIM_STATUSES.COLLECTING_DEVICE_INFO:
        return "Collecting device information...";
      case CLAIM_STATUSES.DEVICE_INFO_COLLECTED:
        return "Device information collected!";
      case CLAIM_STATUSES.GENERATING_PROOF:
        return "Generating ZK proof...";
      case CLAIM_STATUSES.PROOF_READY:
        return "ZK proof ready!";
      case CLAIM_STATUSES.SUBMITTING:
        return "Submitting claim...";
      case CLAIM_STATUSES.SUBMITTED:
        return "Claim submitted, waiting for mint...";
      case CLAIM_STATUSES.CLAIMED:
        return "NFT successfully minted!";
      case CLAIM_STATUSES.FAILED:
        return "Minting failed";
      default:
        return null;
    }
  };

  // Get step number based on current status
  const getCurrentStep = () => {
    if (status === CLAIM_STATUSES.IDLE) return 0;
    if ([CLAIM_STATUSES.CONNECTING_WALLET, CLAIM_STATUSES.WALLET_CONNECTED].includes(status)) return 1;
    if ([CLAIM_STATUSES.COLLECTING_DEVICE_INFO, CLAIM_STATUSES.DEVICE_INFO_COLLECTED].includes(status)) return 2;
    if ([CLAIM_STATUSES.GENERATING_PROOF, CLAIM_STATUSES.PROOF_READY].includes(status)) return 3;
    if ([CLAIM_STATUSES.SUBMITTING, CLAIM_STATUSES.SUBMITTED].includes(status)) return 4;
    if ([CLAIM_STATUSES.CLAIMED, CLAIM_STATUSES.FAILED].includes(status)) return 5;
    return 0;
  };

  // Check if step is completed
  const isStepCompleted = (step: number) => {
    const currentStep = getCurrentStep();
    if (currentStep > step) return true;

    // Mark step as completed when it's the current step and its status indicates completion
    if (currentStep === step) {
      if (step === 1 && status === CLAIM_STATUSES.WALLET_CONNECTED) return true;
      if (step === 2 && status === CLAIM_STATUSES.DEVICE_INFO_COLLECTED) return true;
      if (step === 3 && status === CLAIM_STATUSES.PROOF_READY) return true;
      if (step === 4 && status === CLAIM_STATUSES.SUBMITTED) return true;
    }
    return false;
  }

  // Check if step is active
  const isStepActive = (step: number) => {
    const currentStep = getCurrentStep();
    return currentStep === step;
  };

  return (
    <div className="h-[calc(100vh-4rem)]">
      <main className="flex-1 h-full max-w-md mx-auto p-4 flex flex-col items-center justify-center">
        <Card className="w-full shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="w-20 h-20 rounded-full overflow-hidden bg-primary/10 mb-2 relative"
              >
                {session?.campaign.tokenUri && (
                  <Image
                    src={session.campaign.tokenUri}
                    alt="Logo"
                    fill
                    className="object-cover"
                  />
                )}
              </motion.div>
            </div>
            <CardTitle className="text-center text-xl">
              {session?.campaign.name || 'Claim Your NFT'}
            </CardTitle>
            <CardDescription className="text-center">
              {session && (
                <span className="flex justify-center items-center gap-1">
                  <span className="text-xs px-2 py-0.5 bg-primary/10 rounded-full">
                    Session: {session.nonce.substring(0, 10)}...
                  </span>
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={status}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Horizontal Steps Indicator */}
                <div className="flex flex-wrap gap-2 justify-between mb-6 mt-2">
                  {/* Step 1: Wallet */}
                  <div className={cn(
                    "flex flex-col items-center",
                    isStepActive(1) && "text-primary"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border-2",
                      isStepActive(1) ? "border-primary bg-primary/10" :
                        isStepCompleted(1) ? "border-green-500 bg-green-50" : "border-gray-300"
                    )}>
                      {isStepCompleted(1) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-sm">1</span>
                      )}
                    </div>
                    <span className="text-xs mt-1">Wallet</span>
                  </div>

                  {/* Step 2: Device */}
                  <div className={cn(
                    "flex flex-col items-center",
                    isStepActive(2) && "text-primary"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border-2",
                      isStepActive(2) ? "border-primary bg-primary/10" :
                        isStepCompleted(2) ? "border-green-500 bg-green-50" : "border-gray-300"
                    )}>
                      {isStepCompleted(2) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-sm">2</span>
                      )}
                    </div>
                    <span className="text-xs mt-1">Device</span>
                  </div>

                  {/* Step 3: Proof */}
                  <div className={cn(
                    "flex flex-col items-center",
                    isStepActive(3) && "text-primary"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border-2",
                      isStepActive(3) ? "border-primary bg-primary/10" :
                        isStepCompleted(3) ? "border-green-500 bg-green-50" : "border-gray-300"
                    )}>
                      {isStepCompleted(3) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-sm">3</span>
                      )}
                    </div>
                    <span className="text-xs mt-1">Proof</span>
                  </div>

                  {/* Step 4: Mint */}
                  <div className={cn(
                    "flex flex-col items-center",
                    isStepActive(4) && "text-primary",
                    isStepActive(5) && (status === CLAIM_STATUSES.CLAIMED ? "text-green-500" : "text-red-500")
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border-2",
                      isStepActive(4) ? "border-primary bg-primary/10" :
                        status === CLAIM_STATUSES.CLAIMED ? "border-green-500 bg-green-50" :
                          status === CLAIM_STATUSES.FAILED ? "border-red-500 bg-red-50" :
                            isStepCompleted(4) ? "border-green-500 bg-green-50" : "border-gray-300"
                    )}>
                      {status === CLAIM_STATUSES.CLAIMED ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : status === CLAIM_STATUSES.FAILED ? (
                        <XCircle className="h-4 w-4 text-red-500" />
                      ) : isStepCompleted(4) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="text-sm">4</span>
                      )}
                    </div>
                    <span className="text-xs mt-1">Mint</span>
                  </div>
                </div>

                {/* Status message */}
                {getStatusMessage() && (
                  <div className="flex items-center justify-center space-x-2 my-4">
                    {[CLAIM_STATUSES.CONNECTING_WALLET, CLAIM_STATUSES.COLLECTING_DEVICE_INFO,
                    CLAIM_STATUSES.GENERATING_PROOF, CLAIM_STATUSES.SUBMITTING, CLAIM_STATUSES.SUBMITTED].includes(status) && (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">{getStatusMessage()}</span>
                        </>
                      )}
                    {[CLAIM_STATUSES.WALLET_CONNECTED, CLAIM_STATUSES.DEVICE_INFO_COLLECTED,
                    CLAIM_STATUSES.PROOF_READY].includes(status) && (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-500">{getStatusMessage()}</span>
                        </>
                      )}
                    {status === CLAIM_STATUSES.CLAIMED && (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-500">{getStatusMessage()}</span>
                      </>
                    )}
                    {status === CLAIM_STATUSES.FAILED && (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-red-500">{getStatusMessage()}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Progress bar */}
                {[CLAIM_STATUSES.COLLECTING_DEVICE_INFO, CLAIM_STATUSES.GENERATING_PROOF].includes(status) && (
                  <div className="space-y-1 mt-2">
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                {/* STEP 0: IDLE / START */}
                {status === CLAIM_STATUSES.IDLE && (
                  <div className="text-center space-y-4 flex flex-col items-center">
                    <p className="text-sm text-muted-foreground">
                      To claim your NFT, we&apos;ll need to connect your wallet and verify your device to prevent duplicates.
                    </p>
                    <WalletButton />
                  </div>
                )}

                {/* STEP 1: WALLET CONNECTED */}
                {status === CLAIM_STATUSES.WALLET_CONNECTED && (
                  <div className="space-y-4">
                    <div className="p-3 bg-green-50 rounded-md">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <p className="text-sm text-green-700 break-all">
                          Wallet connected: {publicKey?.toBase58()}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Next, we need to verify your device to prevent duplicate claims.
                    </p>
                    <Button
                      onClick={collectDeviceInfo}
                      className="w-full"
                      size="lg"
                    >
                      Verify Device
                    </Button>
                  </div>
                )}

                {/* STEP 2: DEVICE INFO COLLECTED */}
                {status === CLAIM_STATUSES.DEVICE_INFO_COLLECTED && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-2">
                      <div className="p-3 bg-green-50 rounded-md">
                        <div className="flex items-start gap-2">
                          <Fingerprint className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-green-700">Device verified</p>
                            <p className="text-xs text-green-600 opacity-80">Fingerprint: {deviceInfo?.fingerprint.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </div>

                      <div className={cn(
                        "p-3 rounded-md",
                        deviceInfo?.geolocation ? "bg-green-50" : "bg-amber-50"
                      )}>
                        <div className="flex items-start gap-2">
                          <MapPin className={cn(
                            "h-4 w-4 flex-shrink-0 mt-0.5",
                            deviceInfo?.geolocation ? "text-green-500" : "text-amber-500"
                          )} />
                          <div>
                            <p className={cn(
                              "text-sm font-medium",
                              deviceInfo?.geolocation ? "text-green-700" : "text-amber-700"
                            )}>
                              {deviceInfo?.geolocation ? "Location verified" : "Location not provided"}
                            </p>
                            {deviceInfo?.geolocation && (
                              <p className="text-xs text-green-600 opacity-80">
                                Coordinates: {deviceInfo.geolocation.latitude.toFixed(2)}, {deviceInfo.geolocation.longitude.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground text-center">
                      Device verified! Now generate a zero-knowledge proof to claim your NFT.
                    </p>
                    <Button
                      onClick={generateZKProof}
                      className="w-full"
                      size="lg"
                    >
                      Generate ZK Proof
                    </Button>
                  </div>
                )}

                {/* STEP 3: PROOF READY */}
                {status === CLAIM_STATUSES.PROOF_READY && (
                  <div className="space-y-4">
                    <div className="p-3 bg-green-50 rounded-md">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-green-700">Zero-Knowledge Proof Generated</p>
                          <p className="text-xs text-green-600 opacity-80">Your proof is ready for submission</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-md">
                      <p className="text-xs text-slate-600 font-mono break-all">
                        <span className="font-medium">Proof Hash:</span> {zkProof?.proof?.pi_a[0].substring(0, 12)}...
                      </p>
                    </div>

                    <p className="text-sm text-muted-foreground text-center">
                      Your zero-knowledge proof is ready. This proves your eligibility without revealing sensitive information.
                    </p>
                    <Button
                      onClick={submitClaim}
                      className="w-full"
                      size="lg"
                    >
                      Submit & Claim NFT
                    </Button>
                  </div>
                )}

                {/* STEP 4: SUBMITTED */}
                {(status === CLAIM_STATUSES.SUBMITTED || status === CLAIM_STATUSES.SUBMITTING) && (
                  <div className="text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {status === CLAIM_STATUSES.SUBMITTING
                        ? "Submitting your claim..."
                        : "Your NFT is being minted on-chain. This may take a few moments."}
                    </p>

                    <div className="grid grid-cols-1 gap-2 mt-4">
                      {claimId && (
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md">
                          <p className="text-xs text-muted-foreground font-medium">Claim ID:</p>
                          <p className="text-xs font-mono break-all">{claimId}</p>
                        </div>
                      )}

                      {publicKey && (
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md">
                          <p className="text-xs text-muted-foreground font-medium">Wallet Address:</p>
                          <p className="text-xs font-mono break-all">{publicKey?.toBase58()}</p>
                        </div>
                      )}

                      {deviceInfo && (
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md">
                          <p className="text-xs text-muted-foreground font-medium">Device ID:</p>
                          <p className="text-xs font-mono break-all">{deviceInfo.fingerprint.substring(0, 16)}...</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 5: CLAIMED - SUCCESS */}
                {status === CLAIM_STATUSES.CLAIMED && (
                  <div className="text-center space-y-4">
                    <motion.div
                      initial={{ scale: 0, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", duration: 0.6 }}
                    >
                      <div className="mx-auto h-28 w-28 rounded-xl bg-green-50 flex items-center justify-center mb-2">
                        <CheckCircle className="h-14 w-14 text-green-500" />
                      </div>
                    </motion.div>
                    <div>
                      <h3 className="font-medium text-lg">Success! 🎉</h3>
                      <p className="text-sm text-muted-foreground">
                        Your NFT has been minted successfully
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-2 mt-4">
                      {publicKey && (
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md">
                          <p className="text-xs text-muted-foreground font-medium">Wallet Address:</p>
                          <p className="text-xs font-mono break-all">{publicKey?.toBase58()}</p>
                        </div>
                      )}

                      {claimId && (
                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-md">
                          <p className="text-xs text-muted-foreground font-medium">Transaction:</p>
                          <p className="text-xs font-mono break-all">{claimId}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 justify-center mt-2">
                      <Button
                        variant="outline"
                        onClick={() => router.push('/my-claims')}
                      >
                        View My Claims
                      </Button>
                      <Button
                        onClick={() => window.open(`https://explorer.solana.com/tx/${claimId}`, '_blank')}
                      >
                        View on Explorer
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 5: FAILED */}
                {status === CLAIM_STATUSES.FAILED && (
                  <div className="text-center space-y-4">
                    <div className="mx-auto h-28 w-28 rounded-xl bg-red-50 flex items-center justify-center mb-2">
                      <XCircle className="h-14 w-14 text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-medium text-lg text-red-500">Minting Failed</h3>
                      <p className="text-sm text-muted-foreground">
                        {error || "There was an error processing your claim"}
                      </p>
                    </div>
                    <Button onClick={() => {
                      setStatus(CLAIM_STATUSES.IDLE);
                      setError(null);
                      setZkProof(null);
                      setClaimId(null);
                      setDeviceInfo(null);
                      setProgress(0);
                    }}>
                      Start Over
                    </Button>
                  </div>
                )}

                {/* ERROR STATE - but can continue */}
                {status === CLAIM_STATUSES.ERROR && (
                  <div className="text-center space-y-4">
                    <div className="mx-auto h-20 w-20 rounded-xl bg-amber-50 flex items-center justify-center mb-2">
                      <AlertCircle className="h-10 w-10 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-medium text-amber-500">Something went wrong</h3>
                      <p className="text-sm text-muted-foreground">
                        {error || "There was an error with your request"}
                      </p>
                    </div>
                    <Button onClick={() => {
                      // Depending on what failed, we might want to go back to a different step
                      if (!publicKey) {
                        setStatus(CLAIM_STATUSES.IDLE);
                      } else if (!deviceInfo) {
                        setStatus(CLAIM_STATUSES.WALLET_CONNECTED);
                      } else if (!zkProof) {
                        setStatus(CLAIM_STATUSES.DEVICE_INFO_COLLECTED);
                      } else {
                        setStatus(CLAIM_STATUSES.PROOF_READY);
                      }
                      setError(null);
                    }}>
                      Try Again
                    </Button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
          <CardFooter className="pt-0 pb-4 px-4 flex flex-col">
            {error && status !== CLAIM_STATUSES.FAILED && status !== CLAIM_STATUSES.ERROR && (
              <div className="w-full mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-md">
                {error}
              </div>
            )}
            {session && (
              <div className="w-full text-center mt-2">
                <p className="text-xs text-muted-foreground">
                  Claim {session.claims.length || 0} of {session.maxClaims} used
                </p>
              </div>
            )}
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}