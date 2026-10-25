package com.vanshika.diary;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** System-bar dimensions only; no diary content. Older WebViews report CSS env() as zero. */
@CapacitorPlugin(name = "DiaryInsets")
public class DiaryInsetsPlugin extends Plugin {
    @Override public void load() {
        getActivity().runOnUiThread(() -> {
            ViewCompat.setOnApplyWindowInsetsListener(getBridge().getWebView(), (view, insets) -> {
                notifyListeners("insetsChanged", values(insets), true);
                return insets;
            });
            ViewCompat.requestApplyInsets(getBridge().getWebView());
        });
    }

    private JSObject values(WindowInsetsCompat windowInsets) {
        Insets insets = windowInsets == null ? Insets.NONE : windowInsets.getInsets(
            WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
        float density = getContext().getResources().getDisplayMetrics().density;
        JSObject result = new JSObject();
        result.put("top", insets.top / density);
        result.put("bottom", insets.bottom / density);
        result.put("left", insets.left / density);
        result.put("right", insets.right / density);
        return result;
    }

    @PluginMethod public void getInsets(PluginCall call) {
        getActivity().runOnUiThread(() -> call.resolve(values(
            ViewCompat.getRootWindowInsets(getBridge().getWebView()))));
    }
}