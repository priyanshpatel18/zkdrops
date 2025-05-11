"use client";

import { WalletButton } from "@/components/solana/SolanaProvider";
import { BackgroundLines } from "@/components/ui/background-lines";
import { Button } from "@/components/ui/button";
import { useWalletUi } from "@wallet-ui/react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const router = useRouter();
  const { account, connected } = useWalletUi();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, [account, connected]);

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
              <WalletButton />
            </motion.div>
          </div>
        </BackgroundLines>
      </div>
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



      </div>
    </div>
  );
}