package br.com.sigfrota.app;

import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;

    private final ActivityResultLauncher<Intent> fileChooserLauncher =
        registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
            if (filePathCallback == null) return;
            Uri[] files = null;
            if (result.getResultCode() == Activity.RESULT_OK) {
                files = WebChromeClient.FileChooserParams.parseResult(
                    result.getResultCode(),
                    result.getData()
                );
            }
            filePathCallback.onReceiveValue(files);
            filePathCallback = null;
        });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Android 15+ força edge-to-edge em apps targetSdk 35.
        // O conteúdo web fica dentro de um container nativo que respeita
        // integralmente status bar e navigation bar, sem sobrepor botões.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        boolean darkMode =
            (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
                == Configuration.UI_MODE_NIGHT_YES;
        int systemBackground = darkMode ? Color.rgb(15, 31, 56) : Color.WHITE;

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(systemBackground);

        webView = new WebView(this);
        root.addView(
            webView,
            new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        );
        setContentView(root);

        WindowInsetsControllerCompat barsController =
            WindowCompat.getInsetsController(getWindow(), root);
        barsController.setAppearanceLightStatusBars(!darkMode);
        barsController.setAppearanceLightNavigationBars(!darkMode);

        ViewCompat.setOnApplyWindowInsetsListener(root, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsetsCompat.CONSUMED;
        });
        ViewCompat.requestApplyInsets(root);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

        // Permite que a aplicação web saiba que está dentro do APK
        // e não mostre ações de "instalar aplicativo" novamente.
        String currentUserAgent = settings.getUserAgentString();
        if (currentUserAgent == null) currentUserAgent = "";
        if (!currentUserAgent.contains("SIGFROTA-APP")) {
            settings.setUserAgentString(currentUserAgent + " SIGFROTA-APP");
        }

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                WebView view,
                ValueCallback<Uri[]> filePath,
                FileChooserParams fileChooserParams
            ) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = filePath;

                try {
                    Intent intent = fileChooserParams.createIntent();
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    fileChooserLauncher.launch(intent);
                    return true;
                } catch (Exception error) {
                    filePathCallback = null;
                    return false;
                }
            }
        });

        webView.loadUrl(BuildConfig.SIGFROTA_URL);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) webView.goBack();
                else finish();
            }
        });
    }
}
