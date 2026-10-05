"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { deleteTripAction } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";

type DeleteTripButtonProps = { tripId: string; tripName: string; compact?: boolean };

export function DeleteTripButton({ tripId, tripName, compact = false }: DeleteTripButtonProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current?.close();
  }, [open]);
  return <>
    <button ref={trigger} className="danger-button" type="button" title="Delete trip" aria-label={`Delete ${tripName}`} onClick={() => setOpen(true)}><Trash2 size={17} />{compact ? null : "Delete trip"}</button>
    <dialog ref={dialog} aria-labelledby={titleId} className="modal delete-dialog" onCancel={() => setOpen(false)} onClose={() => { setOpen(false); trigger.current?.focus(); }}>
      <div className="section-head">
        <div><p className="eyebrow">Delete Trip</p><h2 id={titleId}>{tripName}</h2></div>
        <button className="ghost-button" type="button" aria-label="Close" onClick={() => setOpen(false)}><X size={17} /></button>
      </div>
      <p>This will permanently remove the trip and every climbing stop saved inside it.</p>
      <div className="actions">
        <button className="ghost-button" type="button" autoFocus onClick={() => setOpen(false)}>Keep trip</button>
        <form action={deleteTripAction}><input type="hidden" name="tripId" value={tripId} /><SubmitButton className="danger-button" pendingLabel="Deleting…"><Trash2 size={17} />Delete trip</SubmitButton></form>
      </div>
    </dialog>
  </>;
}
