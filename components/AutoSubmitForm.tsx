"use client";

import { useRef } from "react";

/**
 * A GET form that submits itself — a <select> submits the instant its value
 * changes, a text <input> submits shortly after you stop typing. Filters
 * stay in the URL (shareable, bookmarkable) but nothing ever needs an
 * Apply button.
 */
export default function AutoSubmitForm({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLFormElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "SELECT") {
      formRef.current?.requestSubmit();
      return;
    }
    if (target.tagName === "INPUT" && (target as HTMLInputElement).type === "text") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => formRef.current?.requestSubmit(), 450);
    }
  };

  return (
    <form ref={formRef} method="get" className={className} onChange={handleChange}>
      {children}
    </form>
  );
}
