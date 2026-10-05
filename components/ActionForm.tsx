"use client";

import { createContext, useActionState, useContext, useEffect, useId, useMemo, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import type { FormState } from "@/lib/form-state";

const FormContext = createContext<FormState & { resetOnSuccess?: boolean }>({});

export function ActionForm({ action, children, className, resetOnSuccess = false }: {
  action: (formData: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, submit, pending] = useActionState(async (_previous: FormState, formData: FormData) => action(formData), {});
  // Pending rerenders must not reset a draft after an earlier successful submission.
  const context = useMemo(() => ({ ...state, resetOnSuccess }), [state, resetOnSuccess]);
  return (
    <FormContext.Provider value={context}>
      <form action={submit} className={className} aria-busy={pending}>
        {state.errors ? <p className="form-message form-message-error" role="alert">{state.errors.form ?? "Please check the highlighted fields. Your changes have not been saved."}</p> : null}
        {children}
        {!pending && state.success && state.message ? <p className="form-message" role="status">{state.message}</p> : null}
      </form>
    </FormContext.Provider>
  );
}

function useField(name: string | undefined, initial: string | number | readonly string[] | undefined) {
  const state = useContext(FormContext);
  const id = useId();
  const [value, setValue] = useState(String(initial ?? ""));
  useEffect(() => {
    if (state.success && state.resetOnSuccess) setValue(String(initial ?? ""));
  }, [state, initial]);
  const error = name ? state.errors?.[name] : undefined;
  return { value, setValue, error, id };
}

export function FormInput({ defaultValue, ...props }: ComponentProps<"input">) {
  const { value, setValue, error, id } = useField(props.name, defaultValue);
  return <><input {...props} value={value} onChange={event => setValue(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? id : props["aria-describedby"]} />{error ? <small className="field-error" id={id}>{error}</small> : null}</>;
}

export function FormTextarea({ defaultValue, ...props }: ComponentProps<"textarea">) {
  const { value, setValue, error, id } = useField(props.name, defaultValue);
  return <><textarea {...props} value={value} onChange={event => setValue(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? id : props["aria-describedby"]} />{error ? <small className="field-error" id={id}>{error}</small> : null}</>;
}

export function FormSelect({ defaultValue, ...props }: ComponentProps<"select">) {
  const { value, setValue, error, id } = useField(props.name, defaultValue);
  return <><select {...props} value={value} onChange={event => setValue(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? id : props["aria-describedby"]} />{error ? <small className="field-error" id={id}>{error}</small> : null}</>;
}
