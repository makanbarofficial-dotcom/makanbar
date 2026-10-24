"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ثبت بار فقط از پنل صاحبان بار انجام می‌شود
export default function RequestPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/customer");
  }, [router]);

  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-surface px-5 text-center text-fg"
    >
      <div>
        <p className="font-bold">در حال انتقال به پنل صاحبان بار...</p>
        <Link href="/customer" className="mt-4 inline-block text-sm text-orange-700 underline">
          اگر منتقل نشدید اینجا بزنید
        </Link>
      </div>
    </main>
  );
}
