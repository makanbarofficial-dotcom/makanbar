"use client";

import { type InputHTMLAttributes, useState } from "react";
import { formatPriceInput, normalizeDigits, priceInWords } from "@/lib/shipments";

// کادر کرایه برای فرم‌های بدون state: عدد را جدا می‌کند و مبلغ را به حروف زیرش نشان می‌دهد
export function PriceInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [text, setText] = useState("");
  const digits = normalizeDigits(text).replace(/\D/g, "");

  return (
    <>
      <input
        {...props}
        value={text}
        onChange={(event) => setText(formatPriceInput(event.target.value))}
        ref={(input) => {
          // با form.reset() کادر هم خالی شود
          const form = input?.form;
          if (!form) return;
          const clear = () => setText("");
          form.addEventListener("reset", clear);
          return () => form.removeEventListener("reset", clear);
        }}
        inputMode="numeric"
        dir="ltr"
      />
      {digits && (
        <span className="mt-1 block text-xs font-bold text-emerald-700">{priceInWords(Number(digits))}</span>
      )}
    </>
  );
}
