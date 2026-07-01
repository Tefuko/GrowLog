"use client";
import { useRouter } from "next/navigation";
import { LABEL_CLASS } from "@/lib/theme";

export function BackButton({ fallbackHref }: { fallbackHref?: string }) {
  const router = useRouter();
  const handleClick = () => {
    if (fallbackHref) {
      router.push(fallbackHref);
    } else {
      router.back();
    }
  };

  return (
    <button onClick={handleClick} className={LABEL_CLASS} aria-label="戻る">
      戻る
    </button>
  );
}
