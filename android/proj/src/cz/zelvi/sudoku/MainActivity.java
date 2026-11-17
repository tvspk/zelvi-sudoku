package cz.zelvi.sudoku;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private static final String HOME = "file:///android_asset/index.html";
    private WebView web;
    private static final int REQ_CAMERA = 5;
    private PermissionRequest camRequest;   // žádost stránky o kameru, čeká na oprávnění Androidu

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#E2F2EF"));
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // localStorage = uložený postup
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false); // zvuky přes Web Audio
        s.setTextZoom(100);                    // velikost písma řídí aplikace (Nastavení), ne systém
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setAllowContentAccess(false);
        s.setGeolocationEnabled(false);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                return !r.getUrl().toString().startsWith("file:///android_asset/");
            }
        });
        /* kamera jen pro naskenování párovacího QR kódu: jen vlastní stránka (file://), jen obraz */
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(PermissionRequest request) {
                boolean video = false, other = false;
                for (String r : request.getResources()) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) video = true; else other = true;
                }
                Uri o = request.getOrigin();
                if (!video || other || (o != null && o.getScheme() != null && !"file".equals(o.getScheme()))) { request.deny(); return; }
                if (checkSelfPermission("android.permission.CAMERA") == PackageManager.PERMISSION_GRANTED) {
                    request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
                    return;
                }
                if (camRequest != null) camRequest.deny();
                camRequest = request;
                requestPermissions(new String[]{"android.permission.CAMERA"}, REQ_CAMERA);
            }

            @Override
            public void onPermissionRequestCanceled(PermissionRequest request) {
                if (camRequest == request) camRequest = null;
            }
        });
        web.addJavascriptInterface(new Bridge(), "ZSAndroid");
        setContentView(web);
        if (state != null) web.restoreState(state);
        if (web.getUrl() == null) web.loadUrl(HOME);
    }

    /** Volá se z JS (zsBars): barva stavové a navigační lišty podle vzhledu. */
    private class Bridge {
        @JavascriptInterface
        public void setBars(final String status, final String nav) {
            runOnUiThread(new Runnable() {
                public void run() { applyBars(status, nav); }
            });
        }

        @JavascriptInterface
        public void copy(final String text) {
            runOnUiThread(new Runnable() {
                public void run() {
                    android.content.ClipboardManager cm = (android.content.ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                    if (cm != null) cm.setPrimaryClip(android.content.ClipData.newPlainText("Záloha Želví sudoku", text));
                }
            });
        }
    }

    private static boolean isLight(int c) {
        double l = 0.299 * Color.red(c) + 0.587 * Color.green(c) + 0.114 * Color.blue(c);
        return l > 150;
    }

    private void applyBars(String status, String nav) {
        try {
            int sc = Color.parseColor(status.trim());
            int nc = Color.parseColor(nav.trim());
            Window w = getWindow();
            w.setStatusBarColor(sc);
            w.setNavigationBarColor(nc);
            web.setBackgroundColor(sc);
            if (Build.VERSION.SDK_INT >= 30) {
                WindowInsetsController ic = w.getInsetsController();
                if (ic != null) {
                    int mask = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                             | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                    int val = (isLight(sc) ? WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS : 0)
                            | (isLight(nc) ? WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS : 0);
                    ic.setSystemBarsAppearance(val, mask);
                }
            } else {
                View d = w.getDecorView();
                int f = d.getSystemUiVisibility();
                f = isLight(sc) ? (f | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR) : (f & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
                f = isLight(nc) ? (f | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR) : (f & ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
                d.setSystemUiVisibility(f);
            }
        } catch (Exception e) { /* neplatná barva: nechat výchozí */ }
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] results) {
        if (req != REQ_CAMERA) return;
        PermissionRequest r = camRequest; camRequest = null;
        if (r == null) return;
        if (checkSelfPermission("android.permission.CAMERA") == PackageManager.PERMISSION_GRANTED)
            r.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
        else r.deny();
    }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("(window.zsBack&&window.zsBack())?'1':'0'", new android.webkit.ValueCallback<String>() {
            public void onReceiveValue(String r) {
                if (r == null || !r.contains("1")) moveTaskToBack(true);
            }
        });
    }

    /* Při odchodu z aplikace se postup ještě nahraje (synchronizace běží v JS po skrytí stránky),
       proto se JS časovače zastaví až po chvíli. Herní hodiny stojí hned: stránka je skrytá (document.hidden). */
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable pauser = new Runnable() {
        public void run() { if (web != null) web.pauseTimers(); }
    };

    @Override
    protected void onPause() {
        super.onPause();
        // uložit stav; skrytí stránky (onPause) spustí i synchronizaci
        web.evaluateJavascript("try{window.dispatchEvent(new Event('pagehide'))}catch(e){}", null);
        web.onPause();
        handler.removeCallbacks(pauser);
        handler.postDelayed(pauser, 20000);
    }

    @Override
    protected void onResume() {
        super.onResume();
        handler.removeCallbacks(pauser);
        web.onResume();
        web.resumeTimers();
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(pauser);
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }
}
