"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel: string;
  successLabel?: string;
  className?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
  title?: string;
  ariaLabel?: string;
};

export function SubmitButton({
  children,
  pendingLabel,
  successLabel,
  className = "button",
  disabled = false,
  name,
  value,
  title,
  ariaLabel
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const [completed, setCompleted] = useState(false);
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      setCompleted(false);
      return;
    }

    if (!wasPending.current || !successLabel) {
      return;
    }

    wasPending.current = false;
    setCompleted(true);
    const timeout = window.setTimeout(() => setCompleted(false), 1800);

    return () => window.clearTimeout(timeout);
  }, [pending, successLabel]);

  return (
    <button
      aria-busy={pending}
      aria-disabled={disabled || pending}
      aria-label={ariaLabel}
      className={className}
      disabled={disabled}
      name={name}
      onClick={(event) => {
        if (pending) event.preventDefault();
      }}
      title={title}
      type="submit"
      value={value}
    >
      {pending ? pendingLabel : completed && successLabel ? successLabel : children}
    </button>
  );
}
