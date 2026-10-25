import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { isNativeAndroid } from "./platform";

export async function deliverBackup(blob: Blob, filename: string): Promise<string> {
  if (isNativeAndroid()) {
    // This is already ciphertext: no decrypting or exporting any device Keystore key.
    await Filesystem.mkdir({ path: "backups", directory: Directory.Cache, recursive: true }).catch(() => {});
    const { uri } = await Filesystem.writeFile({ path: `backups/${filename}`, directory: Directory.Cache, data: await blob.text(), encoding: Encoding.UTF8 });
    try {
      await Share.share({ title: "Encrypted diary backup", files: [uri], dialogTitle: "Save encrypted diary backup" });
      return "Backup file created and share sheet opened. Save it outside the app; use today's passphrase or recovery phrase to restore it.";
    } catch { return "Encrypted backup was written to the app cache, but sharing was cancelled or failed. Export again and choose where to save it."; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return "Backup download started. Check your downloads and keep it outside this browser. Use today's passphrase or recovery phrase.";
}