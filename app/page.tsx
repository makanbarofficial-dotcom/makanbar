const services = [
  {
    icon: "🚛",
    title: "حمل بار بین‌شهری",
    text: "جابجایی بار از مبدا تا مقصد با هماهنگی قبلی.",
  },
  {
    icon: "📦",
    title: "حمل بار عمومی",
    text: "راهکار مناسب برای انواع بارهای معمولی و تجاری.",
  },
  {
    icon: "🏗️",
    title: "حمل بار سنگین",
    text: "هماهنگی حمل بارهای سنگین و پروژه‌ای.",
  },
];

const vehicles = [
  {
    icon: "🚛",
    title: "تریلی",
    text: "برای بارهای حجیم و سنگین",
  },
  {
    icon: "🚚",
    title: "کامیون",
    text: "برای حمل بارهای عمومی",
  },
  {
    icon: "🚐",
    title: "خاور",
    text: "برای بارهای متوسط",
  },
  {
    icon: "🛻",
    title: "نیسان",
    text: "برای بارهای سبک و شهری",
  },
];

const phoneNumbers = [
  "02155355050",
  "02155355040",
  "02155355030",
  "02155355020",
  "09125573776",
];

export default function Home() {
  return (
    <main
      dir="rtl"
      className="min-h-screen bg-[#07111f] text-white"
    >
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07111f]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-4 px-5 lg:px-8">

          <a href="/" className="flex items-center gap-3">

            <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden">
              <img
                src="/logo.png"
                alt="لوگوی ماکان بار"
                className="h-full w-full object-contain"
              />
            </div>

            <div>
              <div className="text-lg font-black">
                ماکان بار
              </div>

              <div className="text-[10px] text-slate-400">
                حمل‌ونقل و جابه‌جایی بار
              </div>
            </div>

          </a>

          {/* Navigation */}
          <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex">

            <a
              href="/"
              className="hover:text-orange-400"
            >
              خانه
            </a>

            <a
              href="/services"
              className="hover:text-orange-400"
            >
              خدمات
            </a>

            <a
              href="/vehicles"
              className="hover:text-orange-400"
            >
              ناوگان
            </a>

            <a
              href="/request"
              className="hover:text-orange-400"
            >
              درخواست حمل
            </a>

            <a
              href="#contact"
              className="hover:text-orange-400"
            >
              تماس
            </a>

          </nav>

          <a
            href="/request"
            className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-black shadow-lg shadow-orange-500/20 hover:bg-orange-400"
          >
            درخواست حمل
          </a>

        </div>
      </header>

      {/* Hero */}
      <section
        id="home"
        className="relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">

          <div>

            <div className="mb-6 inline-flex rounded-full border border-orange-400/20 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-300">
              حمل‌ونقل ساده و مطمئن
            </div>

            <h1 className="text-4xl font-black leading-[1.35] sm:text-5xl lg:text-6xl">
              بار شما،
              <span className="block text-orange-500">
                مأموریت ماست.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
              برای ثبت درخواست حمل، فقط مبدا، مقصد و اطلاعات بار
              خود را وارد کنید. کارشناسان ما ادامه مسیر را با شما
              هماهنگ می‌کنند.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">

              <a
                href="/request"
                className="rounded-2xl bg-orange-500 px-7 py-4 text-center text-base font-black shadow-xl shadow-orange-500/20 transition hover:-translate-y-1 hover:bg-orange-400"
              >
                🚛 درخواست حمل بار
              </a>

              <a
                href="/services"
                className="rounded-2xl border border-white/10 bg-white/5 px-7 py-4 text-center font-bold hover:bg-white/10"
              >
                آشنایی با خدمات
              </a>

            </div>

            <div className="mt-8 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
              <div>✓ فرم ساده</div>
              <div>✓ هماهنگی سریع</div>
              <div>✓ پاسخگویی</div>
            </div>

          </div>

          {/* Hero Card */}
          <div className="relative">

            <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950 p-3 shadow-2xl">

              <div className="flex min-h-[390px] flex-col items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-[#1b3048] to-[#0b1422] px-6 text-center">

                <img
                  src="/logo.png"
                  alt="ماکان بار"
                  className="h-40 w-64 object-contain sm:h-48 sm:w-72"
                />

                <h2 className="mt-7 text-2xl font-black">
                  مسیر بار شما از اینجا شروع می‌شود
                </h2>

                <p className="mt-3 max-w-sm leading-7 text-slate-400">
                  مبدا و مقصد را مشخص کنید و درخواست حمل خود را ثبت کنید.
                </p>

                <a
                  href="/request"
                  className="mt-7 rounded-xl bg-orange-500 px-6 py-3 font-black hover:bg-orange-400"
                >
                  ثبت درخواست
                </a>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* Services */}
      <section
        id="services"
        className="border-t border-white/10 bg-white/[0.025]"
      >
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">

          <div className="max-w-2xl">

            <div className="font-bold text-orange-400">
              خدمات ما
            </div>

            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              خدمات حمل‌ونقل بدون پیچیدگی
            </h2>

            <p className="mt-5 leading-8 text-slate-400">
              نوع بار و نیاز خود را مشخص کنید تا راهکار مناسب برای
              حمل آن را بررسی کنیم.
            </p>

          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">

            {services.map((service) => (
              <div
                key={service.title}
                className="rounded-3xl border border-white/10 bg-[#07111f] p-7 transition hover:-translate-y-1 hover:border-orange-500/30"
              >

                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-4xl">
                  {service.icon}
                </div>

                <h3 className="mt-6 text-xl font-black">
                  {service.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-400">
                  {service.text}
                </p>

                <a
                  href="/request"
                  className="mt-6 inline-block font-bold text-orange-400"
                >
                  درخواست این خدمت ←
                </a>

              </div>
            ))}

          </div>

          <div className="mt-8 text-center">

            <a
              href="/services"
              className="inline-block rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-bold hover:bg-white/10"
            >
              مشاهده همه خدمات
            </a>

          </div>

        </div>
      </section>

      {/* Vehicles */}
      <section id="vehicles">

        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">

          <div className="text-center">

            <div className="font-bold text-orange-400">
              ناوگان حمل
            </div>

            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              وسیله مناسب برای بار شما
            </h2>

          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

            {vehicles.map((vehicle) => (
              <div
                key={vehicle.title}
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-center transition hover:-translate-y-1 hover:border-orange-500/30"
              >

                <div className="flex h-28 items-center justify-center rounded-2xl bg-slate-900 text-6xl">
                  {vehicle.icon}
                </div>

                <h3 className="mt-5 text-xl font-black">
                  {vehicle.title}
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  {vehicle.text}
                </p>

              </div>
            ))}

          </div>

          <div className="mt-8 text-center">

            <a
              href="/vehicles"
              className="inline-block rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-bold hover:bg-white/10"
            >
              مشاهده ناوگان
            </a>

          </div>

        </div>

      </section>

      {/* Request */}
      <section
        id="request"
        className="px-5 py-20 lg:px-8"
      >

        <div className="mx-auto max-w-5xl rounded-[2rem] border border-orange-500/20 bg-gradient-to-br from-orange-500 to-orange-600 p-6 shadow-2xl md:p-10">

          <div className="mb-8 text-center text-white">

            <div className="text-sm font-bold text-orange-100">
              درخواست حمل بار
            </div>

            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              فقط چند اطلاعات ساده
            </h2>

            <p className="mt-3 text-orange-50/90">
              برای ثبت درخواست کامل، وارد صفحه درخواست حمل شوید.
            </p>

          </div>

          <div className="rounded-3xl bg-white p-7 text-center shadow-xl">

            <div className="text-5xl">
              🚛
            </div>

            <h3 className="mt-5 text-2xl font-black text-slate-900">
              آماده ثبت درخواست هستید؟
            </h3>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-500">
              مبدا، مقصد، نوع بار و اطلاعات تماس خود را وارد کنید.
            </p>

            <a
              href="/request"
              className="mt-6 inline-block rounded-xl bg-[#07111f] px-7 py-4 font-black text-white hover:bg-slate-800"
            >
              ثبت درخواست حمل
            </a>

          </div>

        </div>

      </section>

      {/* Contact */}
      <section
        id="contact"
        className="border-t border-white/10 bg-white/[0.025]"
      >

        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">

          <div className="mb-10 text-center">

            <div className="font-bold text-orange-400">
              تماس با ما
            </div>

            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              ماکان بار در کنار شماست
            </h2>

            <p className="mt-4 text-slate-400">
              همه‌روزه از ساعت ۷ صبح تا ۱۰ شب پاسخگوی شما هستیم.
            </p>

          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

            {/* Phones */}
            <div className="rounded-3xl border border-white/10 bg-[#07111f] p-7">

              <div className="text-4xl">
                ☎️
              </div>

              <h3 className="mt-5 text-xl font-black">
                شماره‌های تماس
              </h3>

              <div className="mt-5 space-y-3">

                {phoneNumbers.map((phone) => (
                  <a
                    key={phone}
                    href={`tel:${phone}`}
                    dir="ltr"
                    className="block text-right font-bold text-slate-300 hover:text-orange-400"
                  >
                    {phone}
                  </a>
                ))}

              </div>

            </div>

            {/* Address */}
            <div className="rounded-3xl border border-white/10 bg-[#07111f] p-7">

              <div className="text-4xl">
                📍
              </div>

              <h3 className="mt-5 text-xl font-black">
                آدرس
              </h3>

              <p className="mt-4 leading-8 text-slate-400">
                چهارراه ترمینال جنوب به سمت افسریه،
                جنب خسارت بیمه ایران
              </p>

            </div>

            {/* Instagram */}
            <div className="rounded-3xl border border-white/10 bg-[#07111f] p-7">

              <div className="text-4xl">
                📸
              </div>

              <h3 className="mt-5 text-xl font-black">
                اینستاگرام
              </h3>

              <p className="mt-4 text-slate-400">
                برای ارتباط و مشاهده آخرین اطلاعات ماکان بار
              </p>

              <a
                href="https://instagram.com/maknbar_com"
                target="_blank"
                rel="noopener noreferrer"
                dir="ltr"
                className="mt-5 inline-block font-black text-orange-400 hover:text-orange-300"
              >
                @maknbar_com
              </a>

            </div>

          </div>

          {/* Working Hours */}
          <div className="mt-5 rounded-3xl border border-orange-500/20 bg-orange-500/10 p-6 text-center">

            <div className="text-sm font-bold text-orange-300">
              ساعت کاری
            </div>

            <div className="mt-2 text-2xl font-black">
              هر روز | ۷ صبح تا ۱۰ شب
            </div>

          </div>

        </div>

      </section>

      {/* Footer */}
      <footer className="border-t border-white/10">

        <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">

          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-right">

            <div className="flex items-center gap-3">

              <div className="flex h-12 w-16 items-center justify-center overflow-hidden">
                <img
                  src="/logo.png"
                  alt="ماکان بار"
                  className="h-full w-full object-contain"
                />
              </div>

              <div>
                <div className="font-black">
                  ماکان بار
                </div>

                <div className="text-xs text-slate-500">
                  حمل‌ونقل و جابه‌جایی بار
                </div>
              </div>

            </div>

            <div className="text-sm text-slate-500">
              © {new Date().getFullYear()} ماکان بار
            </div>

          </div>

        </div>

      </footer>

    </main>
  );
}