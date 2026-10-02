const cargoTypes = [
  "بار عمومی",
  "بار تجاری",
  "بار سنگین",
  "مصالح ساختمانی",
  "اثاثیه",
  "سایر",
];

export default function RequestPage() {
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

        <div className="relative mx-auto max-w-7xl px-5 py-16 text-center lg:px-8 lg:py-20">

          <div className="inline-flex rounded-full border border-orange-400/20 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-300">
            درخواست حمل بار
          </div>

          <h1 className="mt-6 text-4xl font-black leading-[1.4] sm:text-5xl">
            بار شما،
            <span className="block text-orange-500">
              مأموریت ماست
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl leading-8 text-slate-300">
            اطلاعات زیر را وارد کنید تا درخواست حمل شما برای بررسی
            و هماهنگی آماده شود.
          </p>

        </div>
      </section>

      <section className="px-5 pb-20 lg:px-8">

        <div className="mx-auto max-w-4xl">

          <form className="rounded-[2rem] border border-white/10 bg-white p-6 text-slate-900 shadow-2xl md:p-10">

            <h2 className="text-2xl font-black">
              اطلاعات درخواست
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              اطلاعات ستاره‌دار الزامی است.
            </p>

            <div className="mt-8 grid gap-5 md:grid-cols-2">

              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-bold">
                  نام و نام خانوادگی *
                </label>

                <input
                  id="name"
                  name="name"
                  required
                  placeholder="مثلاً علی رضایی"
                  className="w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-bold">
                  شماره تماس *
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  placeholder="مثلاً 09121234567"
                  className="w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div>
                <label htmlFor="origin" className="mb-2 block text-sm font-bold">
                  مبدا *
                </label>

                <input
                  id="origin"
                  name="origin"
                  required
                  placeholder="شهر یا محل بارگیری"
                  className="w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div>
                <label
                  htmlFor="destination"
                  className="mb-2 block text-sm font-bold"
                >
                  مقصد *
                </label>

                <input
                  id="destination"
                  name="destination"
                  required
                  placeholder="شهر یا محل تخلیه"
                  className="w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>

            </div>

            <div className="mt-6">

              <label htmlFor="cargo" className="mb-2 block text-sm font-bold">
                نوع بار *
              </label>

              <select
                id="cargo"
                name="cargo"
                required
                defaultValue=""
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              >
                <option value="" disabled>
                  نوع بار را انتخاب کنید
                </option>

                {cargoTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>

            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">

              <div>
                <label htmlFor="weight" className="mb-2 block text-sm font-bold">
                  وزن تقریبی بار
                </label>

                <input
                  id="weight"
                  name="weight"
                  placeholder="مثلاً 2 تن"
                  className="w-full rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              <div>
                <label htmlFor="vehicle" className="mb-2 block text-sm font-bold">
                  وسیله پیشنهادی
                </label>

                <select
                  id="vehicle"
                  name="vehicle"
                  defaultValue=""
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-4 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="">فرقی ندارد</option>
                  <option>تریلی</option>
                  <option>کامیون</option>
                  <option>خاور</option>
                  <option>نیسان</option>
                </select>
              </div>

            </div>

            <div className="mt-6">

              <label
                htmlFor="description"
                className="mb-2 block text-sm font-bold"
              >
                توضیحات بار
              </label>

              <textarea
                id="description"
                name="description"
                rows={5}
                placeholder="نوع بسته‌بندی، تعداد، شرایط بارگیری یا توضیحات دیگر..."
                className="w-full resize-none rounded-xl border border-slate-200 px-4 py-4 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />

            </div>

            <button
              type="button"
              className="mt-8 w-full rounded-2xl bg-[#07111f] px-6 py-5 text-lg font-black text-white transition hover:bg-slate-800"
            >
              🚛 ارسال درخواست حمل
            </button>

            <p className="mt-4 text-center text-xs leading-6 text-slate-500">
              در مرحله بعد، این دکمه را به سیستم دریافت درخواست‌ها متصل می‌کنیم.
            </p>

          </form>

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