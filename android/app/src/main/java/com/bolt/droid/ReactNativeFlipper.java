package com.bolt.droid;

import android.content.Context;
import com.facebook.flipper.android.AndroidFlipperClient;
import com.facebook.flipper.android.utils.FlipperUtils;
import com.facebook.flipper.core.FlipperClient;
import com.facebook.flipper.plugins.inspector.DescriptorMapping;
import com.facebook.flipper.plugins.inspector.InspectorFlipperPlugin;
import com.facebook.flipper.plugins.network.NetworkFlipperPlugin;
import com.facebook.react.ReactInstanceEventListener;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.modules.network.NetworkingModule;

public class ReactNativeFlipper {
  public static void initializeFlipper(Context context, ReactInstanceManager reactInstanceManager) {
    if (FlipperUtils.shouldEnableFlipper(context)) {
      final FlipperClient client = AndroidFlipperClient.getInstance(context);

      client.addPlugin(new InspectorFlipperPlugin(context, DescriptorMapping.withDefaults()));
      final NetworkFlipperPlugin networkFlipperPlugin = new NetworkFlipperPlugin();

      client.addPlugin(networkFlipperPlugin);
      reactInstanceManager.addReactInstanceEventListener(
          new ReactInstanceEventListener() {
            @Override
            public void onReactContextInitialized(ReactContext reactContext) {
              reactContext
                  .getJSModule(NetworkingModule.class)
                  .addNetworkInterceptor(new NetworkingModule.NetworkInterceptor() {
                    @Override
                    public void onRequest(String url, String method, String headers) {
                      networkFlipperPlugin.reportRequest(url, method, headers);
                    }

                    @Override
                    public void onResponse(String url, int statusCode, String headers, String body) {
                      networkFlipperPlugin.reportResponse(url, statusCode, headers, body);
                    }
                  });
            }
          });
      client.start();
    }
  }
}