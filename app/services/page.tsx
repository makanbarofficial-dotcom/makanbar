const services = [
  {
    icon: "🚛",
    number: "01",
    title: "حمل بار بین‌شهری",
    text: "جابجایی انواع بار بین شهرهای مختلف با هماهنگی مناسب برای مسیر.",
  },
  {
    icon: "🏙️",
    number: "02",
    title: "حمل بار درون‌شهری",
    text: "راهکار مناسب برای جابه‌جایی بار در داخل شهر و محدوده‌های اطراف.",
  },
  {
    icon: "🏗️",
    number: "03",
    title: "حمل بار سنگین",
    text: "هماهنگی حمل بارهای سنگین و پروژه‌ای متناسب با شرایط محموله.",
  },
  {
    icon: "📦",
    number: "04",
    title: "حمل بار تجاری",
    text: "مناسب برای فروشگاه‌ها، شرکت‌ها و محموله‌های تجاری.",
  },
  {
    icon: "🏠",
    number: "05",
    title: "حمل اثاثیه",
    text: "هماهنگی جابه‌جایی اثاثیه و بارهای خانگی با وسیله مناسب.",
  },
  {
    icon: "📞",
    number: "06",
    title: "هماهنگی و پیگیری",
    text: "برای هماهنگی درخواست حمل و پیگیری مراحل، همراه شما هستیم.",
  },
];

export default function ServicesPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#07111f] text-white">

      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07111f]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">

          <a href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-2xl">
              🚛
            </div>

            <div>
              <div className="text-lg font-black">ماکان بار</div>
              <div className="text-[10px] text-slate-400">
                حمل‌ونقل و جابه‌جایی بار
              </div>
            </div>
          </a>

          <a
            href="/"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10"
          >
            ← بازگشت به خانه
          </a>

        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-20 text-center lg:px-8">

          <div className="inline-flex rounded-full border border-orange-400/20 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-300">
            خدمات ماکان بار
          </div>

          <h1 className="mt-6 text-4xl font-black leading-[1.4] sm:text-5xl">
            خدمات حمل‌ونقل
            <span className="block text-orange-500">
              ساده و حرفه‌ای
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl leading-8 text-slate-300">
            نوع بار و مسیر خود را مشخص کنید تا راهکار مناسب برای
            جابه‌جایی بار شما بررسی و هماهنگ شود.
          </p>

        </div>
      </section>

      <section className="border-t border-white/10 bg-white/[0.025]">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

            {services.map((service) => (
              <div
                key={service.number}
                className="rounded-3xl border border-white/10 bg-[#07111f] p-7 transition hover:-translate-y-1 hover:border-orange-500/40"
              >

                <div className="flex items-center justify-between">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-4xl">
                    {service.icon}
                  </div>

                  <span className="text-4xl font-black text-white/10">
                    {service.number}
                  </span>
                </div>

                <h2 className="mt-6 text-xl font-black">
                  {service.title}
                </h2>

                <p className="mt-3 leading-8 text-slate-400">
                  {service.text}
                </p>

                <a
                  href="/request"
                  className="mt-6 inline-block font-bold text-orange-400 hover:text-orange-300"
                >
                  درخواست این خدمت ←
                </a>

              </div>
            ))}

          </div>
        </div>
      </section>

      <section className="px-5 py-20 lg:px-8">

        <div className="mx-auto max-w-5xl rounded-[2rem] bg-gradient-to-br from-orange-500 to-orange-600 p-8 text-center shadow-2xl md:p-12">

          <div className="text-5xl">🚛</div>

          <h2 className="mt-5 text-3xl font-black sm:text-4xl">
            برای حمل بار آماده‌اید؟
          </h2>

          <p className="mx-auto mt-4 max-w-2xl leading-8 text-orange-50">
            اطلاعات بار خود را وارد کنید تا درخواست حمل شما بررسی شود.
          </p>

          <a
            href="/request"
            className="mt-7 inline-block rounded-2xl bg-[#07111f] px-7 py-4 font-black hover:bg-slate-800"
          >
            ثبت درخواست حمل
          </a>

        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-5 py-7 text-center text-sm text-slate-500 lg:px-8">
          © {new Date().getFullYear()} ماکان بار
        </div>
      </footer>

    </main>
  );
}