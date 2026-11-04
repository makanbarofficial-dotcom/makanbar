import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoLanding } from "@/components/seo-landing";
import { ROUTE_CITIES, findRouteCity, routeSlug } from "@/lib/seo-pages";

const SITE = "https://makanbar.com";

export const dynamicParams = false;

export function generateStaticParams() {
  return ROUTE_CITIES.map((city) => ({ route: routeSlug(city) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ route: string }>;
}): Promise<Metadata> {
  const city = findRouteCity((await params).route);
  if (!city) return {};

  return {
    title: `حمل بار و خرده بار تهران به ${city.fa}`,
    description: `ارسال خرده بار و بار دربستی از تهران به ${city.fa} (${city.province}) با ماکان بار؛ ثبت آنلاین بار، اعلام کرایه، پیامک مشخصات راننده و پیگیری تا تحویل.`,
    alternates: { canonical: `/haml-bar/${routeSlug(city)}/` },
  };
}

export default async function RoutePage({ params }: { params: Promise<{ route: string }> }) {
  const city = findRouteCity((await params).route);
  if (!city) notFound();

  return (
    <SeoLanding
      badge={`مسیر تهران ← ${city.fa}`}
      heading={`حمل بار و ارسال خرده‌بار از تهران به ${city.fa}`}
      intro={`ماکان بار بار شما را از تهران به ${city.fa} و دیگر شهرهای استان ${city.province} می‌رساند؛ چه خرده‌بار و چند کارتن باشد، چه یک ماشین کامل دربستی. بار را آنلاین ثبت کنید، کرایه برایتان پیامک می‌شود و وضعیت بار را تا تحویل در ${city.fa} دنبال می‌کنید.`}
      points={[
        { title: `خرده‌بار تهران به ${city.fa}`, text: `بارهای کم‌حجم با بارهای هم‌مسیر به ${city.fa} فرستاده می‌شوند و فقط سهم خودتان را می‌پردازید.` },
        { title: `دربستی تهران به ${city.fa}`, text: "تریلی، جفت، تک، خاور یا وانت فقط برای بار شما، با حرکت مستقیم تا مقصد." },
        { title: "انتخاب بارگیر", text: "چادری، مسقف، روباز، یخچالی، کفی و... بسته به نوع بار." },
        { title: "پیامک در هر مرحله", text: "اعلام کرایه، پذیرش راننده با نام و پلاک، و تحویل بار برایتان پیامک می‌شود." },
      ]}
      faq={[
        { q: `کرایه‌ی حمل بار از تهران به ${city.fa} چقدر است؟`, a: `کرایه به وزن، حجم، نوع ماشین و دربستی یا خرده‌بار بودن بستگی دارد. بار را ثبت کنید تا متصدی مسیر تهران ← ${city.fa} کرایه را اعلام کند.` },
        { q: `بار در ${city.fa} کجا تحویل داده می‌شود؟`, a: `می‌توانید بار را در ترمینال ${city.fa} تحویل بگیرید یا هنگام ثبت، آدرس تخلیه را بنویسید.` },
        { q: `از ${city.fa} به تهران هم بار می‌فرستید؟`, a: `بله؛ هنگام ثبت بار، مبدا را ${city.fa} و مقصد را تهران انتخاب کنید یا با نماینده‌ی ماکان بار در شهرتان تماس بگیرید.` },
        { q: "چطور بفهمم بار کجاست؟", a: "در پنل صاحبان بار وضعیت بار (ارسال به رانندگان، راننده تعیین شد، در حال حمل، انجام شد) را می‌بینید." },
      ]}
      breadcrumb={[
        { name: "ماکان بار", url: `${SITE}/` },
        { name: "مسیرهای حمل بار", url: `${SITE}/haml-bar/` },
        { name: `تهران به ${city.fa}`, url: `${SITE}/haml-bar/${routeSlug(city)}/` },
      ]}
    />
  );
}
