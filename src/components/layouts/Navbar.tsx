"use client";

import { Button } from "@/components/ui/button";
import { useWallet } from "@solana/wallet-adapter-react";
import { motion } from "framer-motion";
import { Home, LayoutDashboard, Menu as MenuIcon, Plus, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { WalletButton } from "../solana/SolanaProvider";

export default function Navbar() {
  const { connected } = useWallet();
  const [isConnected, setIsConnected] = useState(connected);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsConnected(connected);
  }, [connected]);

  return (
    <motion.nav
      className="w-full py-4 px-4 md:px-6 border-b bg-background sticky top-0 z-50 h-16"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mx-auto flex items-center justify-between relative">
        <div className={`${isConnected ? "flex-1" : "w-8"} flex items-center`}>
          {isConnected && (
            <Link
              href="/"
              className="text-xl font-bold text-primary flex items-center"
            >
              zkDrops
            </Link>
          )}
        </div>

        <div className={`${isConnected ? "hidden" : "flex-1 flex justify-center"}`}>
          <Link
            href="/"
            className="text-xl font-bold text-primary flex items-center"
          >
            zkDrops
          </Link>
        </div>

        {isConnected && (
          <div className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-sm text-foreground hover:text-primary transition flex items-center gap-1">
              <Home className="h-4 w-4" /> Dashboard
            </Link>
            <Link href="/dashboard/campaign/create" className="text-sm text-foreground hover:text-primary transition flex items-center gap-1">
              <Plus className="h-4 w-4" /> Create
            </Link>
            <WalletButton  />
          </div>
        )}

        <div className={`${isConnected ? "flex-none" : "w-8"} flex items-center gap-2`}>
          {isConnected && (
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-foreground"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
              </Button>
            </div>
          )}
        </div>
      </div>

      {isConnected && mobileMenuOpen && (
        <motion.div
          className="md:hidden absolute left-0 right-0 bg-background border-b shadow-md py-2 px-4 z-40"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex flex-col space-y-1 py-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-2 py-3 text-foreground hover:bg-muted rounded-md"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Home className="h-4 w-4" /> Dashboard
            </Link>
            <Link
              href="/campaign/create"
              className="flex items-center gap-2 px-2 py-3 text-foreground hover:bg-muted rounded-md"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Plus className="h-4 w-4" /> Create
            </Link>
            <Link
              href="/campaigns"
              className="flex items-center gap-2 px-2 py-3 text-foreground hover:bg-muted rounded-md"
              onClick={() => setMobileMenuOpen(false)}
            >
              <LayoutDashboard className="h-4 w-4" /> Campaigns
            </Link>
            <WalletButton />
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
}