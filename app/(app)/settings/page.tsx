"use client";

import { isIaSettingsEnabled } from "@/lib/ia-settings-flag";
import SettingsPageIa from "@/components/settings/SettingsPageIa";
import SettingsPageLegacy from "@/components/settings/SettingsPageLegacy";

export default function SettingsPage() {
  if (isIaSettingsEnabled()) {
    return <SettingsPageIa />;
  }
  return <SettingsPageLegacy />;
}
