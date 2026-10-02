const features = [
  {
    icon: "🚛",
    title: "حمل‌ونقل مطمئن",
    text: "جابجایی بار با برنامه‌ریزی و هماهنگی دقیق برای رسیدن محموله در زمان مناسب.",
  },
  {
    icon: "⚡",
    title: "سریع و منظم",
    text: "تلاش می‌کنیم فرآیند ثبت درخواست تا هماهنگی حمل، ساده و سریع انجام شود.",
  },
  {
    icon: "📍",
    title: "پیگیری مسیر",
    text: "در طول فرآیند حمل، امکان هماهنگی و پیگیری وضعیت بار فراهم است.",
  },
  {
    icon: "🤝",
    title: "پشتیبانی",
    text: "در کنار شما هستیم تا تجربه‌ای راحت‌تر و مطمئن‌تر از حمل بار داشته باشید.",
  },
];

export default function AboutPage() {
  return (
    <main
      dir="rtl"
      className="min-h-screen overflow-hidden bg-[#071a33] text-white"
    >
      {/* Hero */}
      <section className="relative px-6 py-20 md:px-12 lg:px-20">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -left-40 top-40 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />

        <div className="relative mx-auto max-w-6xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            
            <div>
              <div className="mb-6 inline-flex rounded-full border border-orange-400/30 bg-orange-500/10 px-5 py-2 text-sm text-orange-300">
                درباره ماکان بار
              </div>

              <h1 className="text-4xl font-black leading-tight md:text-6xl">
                ما فقط بار جابه‌جا نمی‌کنیم،
                <span className="block text-orange-400">
                  اعتماد جابه‌جا می‌کنیم.
                </span>
              </h1>

              <p className="mt-7 max-w-xl text-base leading-8 text-slate-300 md:text-lg">
                ماکان بار با هدف ساده‌تر کردن فرآیند حمل‌ونقل شکل گرفته است.
                تلاش ما این است که مشتری بتواند بدون دردسر، بار خود را برای
                جابجایی ثبت و پیگیری کند.
              </p>
            </div>

            <div className="relative">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-8 shadow-2xl backdrop-blur-md">
                <div className="flex h-64 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500/20 to-orange-500/20">
                  <div className="text-center">
                    <div className="text-7xl">🚛</div>
                    <div className="mt-5 text-xl font-bold">
                      مسیر شما، با ما
                    </div>
                    <div className="mt-2 text-sm text-slate-300">
                      ساده، سریع و مطمئن
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24 md:px-12 lg:px-20">
        <div className="mx-auto max-w-6xl">
          
          <div className="mb-10">
            <p className="text-sm font-bold text-orange-400">
              چرا ماکان بار؟
            </p>

            <h2 className="mt-3 text-3xl font-black md:text-4xl">
              خدماتی ساده برای یک مسیر مطمئن
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {features.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 transition duration-300 hover:-translate-y-2 hover:border-orange-400/40"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-400/15 text-3xl">
                  {item.icon}
                </div>

                <h3 className="mt-6 text-lg font-bold">
                  {item.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24 md:px-12 lg:px-20">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-orange-400/20 bg-gradient-to-l from-orange-500/20 to-white/[0.05] p-8 md:p-12">
          <div className="flex flex-col items-start justify-between gap-7 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-black md:text-3xl">
                آماده ارسال بار هستید؟
              </h2>

              <p className="mt-3 text-slate-300">
                درخواست حمل خود را ثبت کنید تا مراحل بعدی را با شما هماهنگ کنیم.
              </p>
            </div>

            <a
              href="/request"
              className="rounded-2xl bg-orange-400 px-7 py-4 font-bold text-slate-950 transition hover:bg-orange-300"
            >
              ثبت درخواست حمل
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}