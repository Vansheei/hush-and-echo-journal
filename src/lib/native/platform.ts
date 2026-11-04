import { Capacitor } from "@capacitor/core";

export const isNativeAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
export const defaultWhisperModel = (native = isNativeAndroid()): "base" | "small" => native ? "base" : "small";