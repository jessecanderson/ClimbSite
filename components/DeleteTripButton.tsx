"use client";

import { useId, useState } from "react";
import { Trash2, X } from "lucide-react";
import { deleteTripAction } from "@/app/actions";

type DeleteTripButtonProps = {
  tripId: string;
  tripName: string;
  compact?: boolean;
};

export function DeleteTripButton({ tripId, tripName, compact = false }: DeleteTripButtonProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  return (
    <>
      <button
        className="danger-button"
        type="button"
        title="Delete trip"
        aria-label={`Delete ${tripName}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 size={17} />
        {compact ? null : "Delete trip"}
      </button>

      {open ? (
        <div className="modal-backdrop" role="presentation">
          <div
            aria-labelledby={titleId}
            aria-modal="true"
            className="modal"
            role="dialog"
          >
            <div className="section-head">
              <div>
                <p className="eyebrow">Delete Trip</p>
                <h2 id={titleId}>{tripName}</h2>
              </div>
              <button
                className="ghost-button"
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X size={17} />
              </button>
            </div>
            <p>
              This will permanently remove the trip and every climbing stop saved inside it.
            </p>
            <div className="actions">
              <button className="ghost-button" type="button" onClick={() => setOpen(false)}>
                Keep trip
              </button>
              <form action={deleteTripAction}>
                <input type="hidden" name="tripId" value={tripId} />
                <button className="danger-button" type="submit">
                  <Trash2 size={17} />
                  Delete trip
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
