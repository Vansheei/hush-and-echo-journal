package com.vanshika.diary;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DiaryBiometricPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
