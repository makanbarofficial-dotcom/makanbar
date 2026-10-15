import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site";

export const metadata: Metadata = {
  title: "خدمات",
  description:
    "خدمات ماکان بار: حمل بار دربستی، خرده‌بار، بین‌شهری، بار سنگین و اثاثیه، با ثبت آنلاین و پیگیری.",
};

export default function ServicesPage() {
  const services = [
    {
      title: "حمل بار بین‌شهری",
      description:
        "حمل ایمن و سریع انواع بار از تهران به سراسر کشور با هماهنگی کامل.",
      icon: "🚛",
    },
    {
      title: "حمل بار درون‌شهری",
      description:
        "جابه‌جایی بار در تهران و اطراف با خودروهای مناسب و رانندگان باتجربه.",
      icon: "🏙️",
    },
    {
      title: "حمل بار سنگین",
      description:
        "حمل بارهای سنگین و حجیم با انتخاب وسیله مناسب و برنامه‌ریزی دقیق.",
      icon: "⚙️",
    },
    {
      title: "حمل بار تجاری",
      description:
        "انتقال کالاهای تجاری و فروشگاهی با دقت و پیگیری تا مقصد.",
      icon: "📦",
    },
    {
      title: "حمل اثاثیه",
      description:
        "جابه‌جایی اثاثیه منزل و محل کار با رعایت اصول ایمنی.",
      icon: "🏠",
    },
    {
      title: "دربستی",
      description:
        "حمل بار به‌صورت دربستی با خودرو اختصاصی، مناسب برای بارهای حجیم و مسیرهای مستقیم.",
      icon: "🛣️",
    },
  ];

  return (
    <main dir="rtl" className="min-h-screen bg-ink text-white">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-16 text-center lg:px-8 lg:py-20">
          <div className="inline-flex rounded-full border border-orange-400/20 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-300">
            خدمات ماکان بار
          </div>

          <h1 className="mt-6 text-4xl font-black leading-[1.4] sm:text-5xl">
            خدمات حمل‌ونقل
            <span className="block text-orange-500">
              حرفه‌ای و مطمئن
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-300">
            ماکان بار با ارائه خدمات متنوع حمل‌ونقل، تلاش می‌کند
            جابه‌جایی بار شما با سرعت، دقت و امنیت انجام شود.
          </p>
        </div>
      </section>

      <section className="px-5 pb-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <div
              key={service.title}
              className="group rounded-3xl border border-white/10 bg-white/5 p-7 transition duration-300 hover:-translate-y-1 hover:border-orange-500/30 hover:bg-white/[0.07]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-2xl">
                {service.icon}
              </div>

              <h2 className="mt-6 text-xl font-black">
                {service.title}
              </h2>

              <p className="mt-4 leading-8 text-slate-400">
                {service.description}
              </p>

              <a
                href="/request"
                className="mt-6 inline-flex items-center gap-2 text-sm font-black text-orange-400 transition hover:text-orange-300"
              >
                درخواست این خدمت
                <span>←</span>
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-orange-500/20 bg-orange-500/10 px-6 py-10 text-center">
          <h2 className="text-2xl font-black sm:text-3xl">
            برای حمل بار آماده‌ایم
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-8 text-slate-300">
            اطلاعات بار خود را ثبت کنید تا برای هماهنگی و انتخاب وسیله مناسب
            با شما تماس بگیریم.
          </p>

          <a
            href="/request"
            className="mt-7 inline-flex rounded-2xl bg-orange-500 px-7 py-4 font-black text-white transition hover:bg-orange-600"
          >
            ثبت درخواست حمل
          </a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}