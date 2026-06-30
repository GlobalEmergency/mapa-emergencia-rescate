import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

const OG_IMAGE = "/opengraph-image.jpg";
const TWITTER_IMAGE = "/twitter-image.jpg";

interface PageMetadataInput {
  title: string;
  description: string;
  path?: string;
  index?: boolean;
}

export function pageMetadata({
  title,
  description,
  path,
  index = true,
}: PageMetadataInput): Metadata {
  const fullTitle = `${title} · ${SITE_NAME}`;
  const meta: Metadata = {
    title: { absolute: fullTitle },
    description,
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
      images: [OG_IMAGE],
      ...(path ? { url: path } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [TWITTER_IMAGE],
    },
  };
  if (path) meta.alternates = { canonical: path };
  if (!index) meta.robots = { index: false, follow: false };
  return meta;
}
