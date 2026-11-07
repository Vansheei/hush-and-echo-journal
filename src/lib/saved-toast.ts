import { toast } from "sonner";
import { t } from "@/lib/i18n";

/** Confirms a save without showing any diary content; "Open" jumps straight to the entry. */
export function announceSaved(open: () => void) {
  toast.success(t("Entry saved"), {
    id: "entry-saved",
    description: t("Encrypted and kept on this phone."),
    action: { label: t("Open"), onClick: open },
    duration: 7000,
  });
}
