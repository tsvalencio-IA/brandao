package br.com.sigfrota.app;

import android.app.Activity;
import android.content.Intent;
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

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    private FrameLayout root;
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

        // Android 15 pode impor edge-to-edge. O root ocupa a janela,
        // mas o WebView fica fisicamente dentro da area segura real.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(15, 31, 56));

        webView = new WebView(this);
        webView.setLayoutParams(new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
        root.addView(webView);
        setContentView(root);

        ViewCompat.setOnApplyWindowInsetsListener(root, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                WindowInsetsCompat.Type.statusBars()
                    | WindowInsetsCompat.Type.navigationBars()
                    | WindowInsetsCompat.Type.displayCutout()
            );

            // Padding no container, nao no WebView:
            // isso reduz de verdade a viewport HTML e impede botoes
            // de ficarem sob relogio, bateria, notch ou barra de navegacao.
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return windowInsets;
        });
        ViewCompat.requestApplyInsets(root);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);

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
