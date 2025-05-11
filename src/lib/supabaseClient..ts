import { Campaign } from "@/types/types";

export async function createCampaign(formData: Campaign, tokenImage: FormData) {
  // 1. Upload token image
  const uploadTokenImageRes = await fetch("/api/files", {
    method: "POST",
    body: tokenImage,
  });
  const data = await uploadTokenImageRes.json();

  if (uploadTokenImageRes.status !== 200) {
    throw new Error("Failed to upload token image");
  }
  formData.tokenUri = data.url;

  // 2. Create and upload NFT metadata
  const nftMetadata = {
    name: formData.name,
    description: formData.description,
    image: formData.tokenUri,
    external_url: "https://zkdrops.xyz",
    properties: {
      files: [
        {
          uri: formData.tokenUri,
          type: "image/jpg",
        },
      ],
      category: "image"
    }
  }
  const nftMetadataFileName = `${Date.now()}-${formData.name}-metadata.json`;
  const nftMetadataFile = new File([JSON.stringify(nftMetadata)], nftMetadataFileName, {
    type: "application/json",
  });

  if (!nftMetadataFile) {
    throw new Error('Error creating NFT metadata file');
  }
  
  const metadataBody = new FormData();
  metadataBody.append("file", nftMetadataFile);
  const metadataRes = await fetch("/api/files", {
    method: "POST",
    body: metadataBody
  })

  const metadataData = await metadataRes.json();
  formData.metadataUri = metadataData.url;

  const res = await fetch("/api/campaign/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(formData),
  });

  if (!res.ok) {
    throw new Error("Failed to create campaign");
  }
}