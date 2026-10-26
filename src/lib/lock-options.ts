/** The passphrase field hides only when the owner asked and a fingerprint or PIN can still unlock. */
export const passphraseHidden = (pref: boolean, pin: boolean, device: boolean) => pref && (pin || device);
