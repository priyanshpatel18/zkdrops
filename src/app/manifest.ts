import type { MetadataRoute } from "next";

const { appName, description } = {
  appName: "Echover – Provenance-Powered Web3 Creator PlatformSolixDB",
  description:
    "Echover is a provenance-driven content platform where creators publish digital work, verify genuine engagement using ZK-proofs, and reward top supporters with NFTs on Solana. Own your audience, build trust, and showcase authentic content history—all in one place.",
};

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: appName,
    short_name: appName,
    description: description,
    start_url: "/",
    display: "standalone",
    background_color: "#fff",
    theme_color: "#fff",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}