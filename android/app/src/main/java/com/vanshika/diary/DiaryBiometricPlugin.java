package com.vanshika.diary;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.security.KeyStore;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Android authenticates each Keystore cipher operation. No biometric data reaches the WebView. */
@CapacitorPlugin(name = "DiaryBiometric")
public class DiaryBiometricPlugin extends Plugin {
    private boolean prompting = false;
    private SharedPreferences prefs() { return getContext().getSharedPreferences("diary-biometric", Context.MODE_PRIVATE); }
    private String alias(String id) { return "diary-biometric-" + id; }
    private String id(PluginCall call) throws Exception {
        String value = call.getString("id", "");
        if (!value.matches("[a-fA-F0-9-]{36}")) throw new Exception("Invalid device key.");
        return value;
    }
    private KeyStore store() throws Exception { KeyStore s = KeyStore.getInstance("AndroidKeyStore"); s.load(null); return s; }
    @PluginMethod public void available(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", BiometricManager.from(getContext()).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG) == BiometricManager.BIOMETRIC_SUCCESS);
        call.resolve(result);
    }
    @PluginMethod public void exists(PluginCall call) {
        try { String id = id(call); JSObject result = new JSObject(); result.put("exists", store().containsAlias(alias(id)) && prefs().contains(id + ".ct")); call.resolve(result); }
        catch (Exception e) { call.reject("Device key unavailable. Use your passphrase or PIN."); }
    }
    @PluginMethod public void remove(PluginCall call) {
        try { String id = id(call); store().deleteEntry(alias(id)); prefs().edit().remove(id + ".ct").remove(id + ".iv").commit(); call.resolve(); }
        catch (Exception e) { call.reject("Could not remove the device key."); }
    }
    @PluginMethod public void enroll(PluginCall call) { authenticate(call, true); }
    @PluginMethod public void unlock(PluginCall call) { authenticate(call, false); }

    private void authenticate(PluginCall call, boolean enroll) {
        getActivity().runOnUiThread(() -> {
            if (prompting) { call.reject("A fingerprint request is already open."); return; }
            byte[] input = null;
            String recordId = null;
            try {
                recordId = id(call);
                Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                if (enroll) {
                    input = Base64.decode(call.getString("secret", ""), Base64.NO_WRAP);
                    if (input.length != 32) throw new Exception("Invalid secret");
                    KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
                    generator.init(new KeyGenParameterSpec.Builder(alias(recordId), KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                        .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                        .setKeySize(256).setUserAuthenticationRequired(true).setUserAuthenticationValidityDurationSeconds(-1)
                        .setInvalidatedByBiometricEnrollment(true).build());
                    cipher.init(Cipher.ENCRYPT_MODE, generator.generateKey());
                } else {
                    input = Base64.decode(prefs().getString(recordId + ".ct", ""), Base64.NO_WRAP);
                    byte[] iv = Base64.decode(prefs().getString(recordId + ".iv", ""), Base64.NO_WRAP);
                    cipher.init(Cipher.DECRYPT_MODE, (SecretKey) store().getKey(alias(recordId), null), new GCMParameterSpec(128, iv));
                }
                final byte[] payload = input;
                final String savedId = recordId;
                prompting = true;
                BiometricPrompt prompt = new BiometricPrompt(getActivity(), ContextCompat.getMainExecutor(getContext()), new BiometricPrompt.AuthenticationCallback() {
                    @Override public void onAuthenticationError(int code, CharSequence message) {
                        prompting = false; Arrays.fill(payload, (byte) 0);
                        if (enroll) cleanup(savedId);
                        call.reject("Fingerprint cancelled or unavailable. Use your passphrase or PIN.");
                    }
                    @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult auth) {
                        prompting = false;
                        byte[] output = null;
                        try {
                            BiometricPrompt.CryptoObject crypto = auth.getCryptoObject();
                            if (crypto == null || crypto.getCipher() == null) throw new Exception("No authenticated cipher");
                            output = crypto.getCipher().doFinal(payload);
                            if (enroll) {
                                boolean saved = prefs().edit().putString(savedId + ".ct", Base64.encodeToString(output, Base64.NO_WRAP))
                                    .putString(savedId + ".iv", Base64.encodeToString(crypto.getCipher().getIV(), Base64.NO_WRAP)).commit();
                                if (!saved) throw new Exception("Storage failed");
                                call.resolve();
                            } else {
                                JSObject result = new JSObject(); result.put("secret", Base64.encodeToString(output, Base64.NO_WRAP)); call.resolve(result);
                            }
                        } catch (Exception e) {
                            if (enroll) cleanup(savedId);
                            call.reject("Fingerprint key unavailable. Use your passphrase or PIN and enable it again.");
                        } finally { Arrays.fill(payload, (byte) 0); if (output != null) Arrays.fill(output, (byte) 0); }
                    }
                });
                prompt.authenticate(new BiometricPrompt.PromptInfo.Builder().setTitle("Unlock Vanshika’s Diary")
                    .setSubtitle(enroll ? "Enable fingerprint unlock" : "Open your encrypted diary")
                    .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG).setNegativeButtonText("Use passphrase or PIN").build(), new BiometricPrompt.CryptoObject(cipher));
            } catch (Exception e) {
                prompting = false; if (input != null) Arrays.fill(input, (byte) 0);
                if (enroll && recordId != null) cleanup(recordId);
                call.reject("Fingerprint unavailable. Use your passphrase or PIN and enable it again.");
            }
        });
    }
    private void cleanup(String id) {
        try { store().deleteEntry(alias(id)); } catch (Exception ignored) {}
        prefs().edit().remove(id + ".ct").remove(id + ".iv").commit();
    }
}