import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoLanding } from "@/components/seo-landing";
import { SERVICE_PAGES, findServicePage } from "@/lib/seo-pages";

const SITE = "https://makanbar.com";

export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICE_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const page = findServicePage((await params).slug);
  if (!page) return {};

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `/services/${page.slug}/` },
  };
}

export default async function ServiceLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = findServicePage((await params).slug);
  if (!page) notFound();

  return (
    <SeoLanding
      badge="خدمات ماکان بار"
      heading={page.heading}
      intro={page.intro}
      points={page.points}
      faq={page.faq}
      breadcrumb={[
        { name: "ماکان بار", url: `${SITE}/` },
        { name: "خدمات", url: `${SITE}/services/` },
        { name: page.title, url: `${SITE}/services/${page.slug}/` },
      ]}
    />
  );
}
