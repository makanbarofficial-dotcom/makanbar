package com.makanbar.app;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // دکمه‌ی «برگشت» گوشی: اول صفحه‌ی قبلی سایت؛ فقط در صفحه‌ی اول، اپ به پس‌زمینه می‌رود
        // (بسته نمی‌شود تا اشتراک موقعیت راننده قطع نشود)
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = bridge != null ? bridge.getWebView() : null;
                if (webView != null && webView.canGoBack()) {
                    webView.goBack();
                } else {
                    moveTaskToBack(true);
                }
            }
        });
    }
}
