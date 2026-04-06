import { Helmet } from "react-helmet-async";
import { getDefaultSeoImage, toAbsoluteUrl } from "@/lib/seo";

type PageSeoProps = {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string;
  openGraphType?: "product" | "website";
  structuredData?: Record<string, unknown> | null;
};

export function PageSeo({
  title,
  description,
  canonicalPath,
  image,
  openGraphType = "website",
  structuredData
}: PageSeoProps) {
  const canonicalUrl = toAbsoluteUrl(canonicalPath);
  const openGraphImage = getDefaultSeoImage(image);

  return (
    <>
      <Helmet prioritizeSeoTags>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:site_name" content="TechNexus" />
        <meta property="og:type" content={openGraphType} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={openGraphImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={openGraphImage} />
        <meta property="twitter:url" content={toAbsoluteUrl(canonicalPath)} />
      </Helmet>
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      ) : null}
    </>
  );
}
