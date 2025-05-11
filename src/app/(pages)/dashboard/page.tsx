"use client";

import { BackgroundLines } from "@/components/ui/background-lines";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Campaign } from "@/types/types";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { Calendar, ExternalLink, Loader2, Plus, Timer } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [fetching, setFetching] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const { connected, publicKey } = useWallet();

  // Update current time every second for the timers
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setLoading(false);
    if (!connected || !publicKey) return;

    setFetching(true);

    const fetchCampaigns = async () => {
      try {
        const res = await fetch(`/api/campaign/${publicKey.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch campaigns");

        const data = await res.json();
        setCampaigns(data);
      } catch (err) {
        console.error(err);
        setCampaigns([]);
      } finally {
        setFetching(false);
      }
    };

    fetchCampaigns();
  }, [connected, publicKey]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate time remaining for a campaign
  const getTimeRemaining = (campaign: Campaign) => {
    const now = currentTime;
    const startDate = new Date(campaign.startsAt);
    const endDate = new Date(campaign.endsAt);

    if (now < startDate) {
      return {
        status: "Not Started",
        variant: "secondary",
        timeLeft: null
      };
    } else if (now > endDate) {
      return {
        status: "Ended",
        variant: "outline",
        timeLeft: null
      };
    } else {
      // Calculate remaining time
      const timeLeft = endDate.getTime() - now.getTime();
      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      return {
        status: `${days}d ${hours}h ${minutes}m ${seconds}s left`,
        variant: "default",
        timeLeft
      };
    }
  };

  // Check if a campaign is active based on dates and isActive flag
  const isCampaignActive = (campaign: Campaign) => {
    const now = currentTime;
    const startDate = new Date(campaign.startsAt);
    const endDate = new Date(campaign.endsAt);

    return campaign.isActive && now >= startDate && now <= endDate;
  };

  const handleConnect = () => {
    const button = document.querySelector(
      ".wallet-adapter-button"
    ) as HTMLElement;
    if (button) {
      button.click();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-[calc(100vh-64px)] animate-pulse text-muted-foreground">
          Loading wallet...
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="overflow-hidden h-[calc(100vh-64px)] bg-background relative">
        <BackgroundLines className="h-[calc(100vh-64px)] flex items-center justify-center px-4">
          <div className="w-full h-[calc(100vh-64px)] flex flex-col items-center justify-center text-center relative z-10 gap-6 max-w-3xl">
            <motion.h1
              className="text-4xl sm:text-6xl font-bold leading-tight text-foreground"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Create Digital Collectibles with zkDrops
            </motion.h1>
            <motion.p
              className="text-base sm:text-lg text-muted-foreground max-w-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Start selling your digital collectibles in minutes. Connect your wallet to begin.
            </motion.p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <button className="relative inline-flex h-11 sm:h-12 w-full sm:w-auto overflow-hidden rounded-full p-[1px] transition-all" onClick={handleConnect}>
                <span className="absolute inset-[-150%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)] dark:bg-[conic-gradient(from_90deg_at_50%_50%,#393BB2_0%,#E2CBFF_50%,#393BB2_100%)]" />
                <span className="relative z-10 inline-flex h-full w-full items-center justify-center rounded-full bg-white dark:bg-slate-950 px-5 py-2 text-sm font-medium text-slate-900 dark:text-white backdrop-blur-md hover:opacity-90 transition">
                  Connect Wallet
                </span>
              </button>
              <div className="hidden">
                <WalletMultiButton />
              </div>
            </motion.div>
          </div>
        </BackgroundLines >
      </div >
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your collectibles and campaigns</p>
          </div>
          <Button
            onClick={() => router.push("/dashboard/campaign/create")}
            className="mt-4 sm:mt-0 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>
        </div>

        {fetching ? (
          <div className="flex items-center justify-center flex-col">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          </div>
        ) : campaigns && campaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign, index) => {
              const { status, variant } = getTimeRemaining(campaign);

              return (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card
                    className="border border-border hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/dashboard/campaign/${campaign.id}`)}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{campaign.name}</CardTitle>
                        <Badge variant="secondary" className={`${isCampaignActive(campaign) ? "bg-green-500" : "bg-accent"}`}>
                          {isCampaignActive(campaign) ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-1">
                        {campaign.tokenSymbol}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-row items-center justify-between gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                          {campaign.description}
                        </p>
                        <div className="flex flex-col gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Starts: {formatDate(campaign.startsAt)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Timer className="h-4 w-4 text-muted-foreground" />
                            <span>Ends: {formatDate(campaign.endsAt)}</span>
                          </div>
                          <div className="mt-1">
                            <Badge variant={variant as "default" | "secondary" | "outline"} className="p-2 px-3 text-sm">
                              {status}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="relative w-[100px] h-[100px]">
                        {!loadedImages[campaign.id] && (
                          <Skeleton className="w-full h-full rounded-md absolute top-0 left-0" />
                        )}
                        <Image
                          src={campaign.tokenUri}
                          alt={campaign.name}
                          width={100}
                          height={100}
                          className={`rounded-md object-cover transition-opacity duration-500 ${loadedImages[campaign.id] ? "opacity-100" : "opacity-0"
                            }`}
                          onLoad={() =>
                            setLoadedImages((prev) => ({ ...prev, [campaign.id]: true }))
                          }
                        />
                      </div>
                    </CardContent>

                    <CardFooter>
                      <Button variant="secondary" className="w-full flex items-center gap-2">
                        <span>View Details</span>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-muted-foreground">No campaigns found for this wallet.</div>
        )}
      </div>
    </div>
  );
}