import { SiteFooter, SiteHeader } from "@/components/site";
const vehicles = [
  {
    icon: "🚛",
    title: "تریلی",
    text: "مناسب برای بارهای حجیم، سنگین و حمل‌ونقل بین‌شهری.",
  },
  {
    icon: "🚚",
    title: "کامیون",
    text: "مناسب برای حمل انواع بارهای عمومی و تجاری.",
  },
  {
    icon: "🚐",
    title: "خاور",
    text: "انتخاب مناسب برای بارهای متوسط و حمل شهری و بین‌شهری.",
  },
  {
    icon: "🛻",
    title: "نیسان",
    text: "مناسب برای بارهای سبک و جابه‌جایی سریع شهری.",
  },
];

export default function VehiclesPage() {
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-ink text-white"
    >
      {/* Header */}
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-20 text-center lg:px-8 lg:py-24">

          <div className="inline-flex rounded-full border border-orange-400/20 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-300">
            ناوگان ماکان بار
          </div>

          <h1 className="mt-6 text-4xl font-black leading-[1.4] sm:text-5xl">
            وسیله مناسب برای
            <span className="block text-orange-500">
              بار شما
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            با توجه به نوع، حجم و شرایط بار، وسیله مناسب برای حمل
            بار شما انتخاب و هماهنگ می‌شود.
          </p>

        </div>
      </section>

      {/* Vehicles */}
      <section className="border-t border-white/10 bg-white/[0.025]">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

            {vehicles.map((vehicle) => (
              <div
                key={vehicle.title}
                className="rounded-3xl border border-white/10 bg-ink p-5 transition hover:-translate-y-1 hover:border-orange-500/40 hover:shadow-xl hover:shadow-orange-500/10"
              >

                <div className="flex h-40 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1b3048] to-[#0b1422] text-7xl">
                  {vehicle.icon}
                </div>

                <h2 className="mt-6 text-2xl font-black">
                  {vehicle.title}
                </h2>

                <p className="mt-3 min-h-20 leading-7 text-slate-400">
                  {vehicle.text}
                </p>

                <a
                  href="/request"
                  className="mt-6 block rounded-xl bg-orange-500 px-4 py-3 text-center font-black hover:bg-orange-400"
                >
                  درخواست حمل
                </a>

              </div>
            ))}

          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-20 lg:px-8">

        <div className="mx-auto max-w-5xl rounded-[2rem] border border-orange-500/20 bg-gradient-to-br from-orange-500 to-orange-600 p-8 text-center shadow-2xl md:p-12">

          <div className="text-5xl">
            🚛
          </div>

          <h2 className="mt-5 text-3xl font-black sm:text-4xl">
            بار خود را به ما بسپارید
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-8 text-orange-50">
            مبدا، مقصد و اطلاعات بار خود را وارد کنید تا
            درخواست حمل شما بررسی و هماهنگ شود.
          </p>

          <a
            href="/request"
            className="mt-7 inline-block rounded-2xl bg-ink px-7 py-4 font-black text-white hover:bg-slate-800"
          >
            ثبت درخواست حمل
          </a>

        </div>
      </section>

      {/* Footer */}
      <SiteFooter />
    </main>
  );
}