"use client";

import { useEffect, useState } from "react";

import {
  FIELD_NOTES_UTM_KEYS,
  fieldNotesUtmFromFunnelStorage,
  fieldNotesUtmFromSearchParams,
  mergeFieldNotesUtm,
  type FieldNotesUtmFieldKey,
} from "@/lib/marketing/field-notes-utm";

interface Props {
  initialFromServer?: Partial<Record<FieldNotesUtmFieldKey, string>>;
}

export function FieldNotesUtmHiddenInputs({ initialFromServer }: Props) {
  const [utm, setUtm] = useState<Partial<Record<FieldNotesUtmFieldKey, string>>>(
    initialFromServer ?? {},
  );

  useEffect(() => {
    const fromUrl = fieldNotesUtmFromSearchParams(new URLSearchParams(window.location.search));
    const fromStorage =
      typeof window !== "undefined"
        ? fieldNotesUtmFromFunnelStorage(window.localStorage)
        : {};
    setUtm(mergeFieldNotesUtm(initialFromServer, fromUrl, fromStorage));
  }, [initialFromServer]);

  return (
    <>
      {FIELD_NOTES_UTM_KEYS.map((key) => {
        const value = utm[key];
        if (!value) return null;
        return (
          <input key={key} type="hidden" name={`fields[${key}]`} value={value} />
        );
      })}
    </>
  );
}
