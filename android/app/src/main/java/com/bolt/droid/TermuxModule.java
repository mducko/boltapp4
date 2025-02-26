package com.bolt.droid;

import android.content.Context;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;
import com.termux.terminal.TerminalSession;
import com.termux.terminal.TerminalEmulator;

import java.io.File;
import java.util.HashMap;
import java.util.Map;

public class TermuxModule extends ReactContextBaseJavaModule {
    private static final String TAG = "TermuxModule";
    private final ReactApplicationContext reactContext;
    private final Map<String, TerminalSession> sessions = new HashMap<>();
    private int sessionCounter = 0;

    public TermuxModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return "TermuxModule";
    }

    @ReactMethod
    public void initialize(ReadableMap config, Promise promise) {
        try {
            // Initialize Termux environment
            String homeDir = reactContext.getFilesDir().getAbsolutePath() + "/home";
            File home = new File(homeDir);
            if (!home.exists()) {
                home.mkdirs();
            }

            // Set up environment variables
            Map<String, String> environment = new HashMap<>();
            environment.put("HOME", homeDir);
            environment.put("TERM", config.getString("termType"));
            environment.put("PATH", "/data/data/com.termux/files/usr/bin");

            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize Termux", e);
            promise.reject("INIT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void createSession(Promise promise) {
        try {
            String sessionId = "session_" + (++sessionCounter);
            String[] command = {"/data/data/com.termux/files/usr/bin/bash", "--login"};
            
            TerminalSession session = new TerminalSession(
                command,
                reactContext.getFilesDir().getAbsolutePath() + "/home",
                new String[0],
                new TerminalSession.SessionChangedCallback() {
                    @Override
                    public void onTextChanged(TerminalSession changedSession) {
                        // Handle text changes
                    }

                    @Override
                    public void onTitleChanged(TerminalSession changedSession) {
                        // Handle title changes
                    }

                    @Override
                    public void onSessionFinished(TerminalSession finishedSession) {
                        sessions.remove(sessionId);
                    }

                    @Override
                    public void onClipboardText(TerminalSession session, String text) {
                        // Handle clipboard text
                    }

                    @Override
                    public void onBell(TerminalSession session) {
                        // Handle bell
                    }
                }
            );

            sessions.put(sessionId, session);
            promise.resolve(sessionId);
        } catch (Exception e) {
            Log.e(TAG, "Failed to create terminal session", e);
            promise.reject("SESSION_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void executeCommand(String sessionId, String command, Promise promise) {
        try {
            TerminalSession session = sessions.get(sessionId);
            if (session == null) {
                throw new Exception("Invalid session ID");
            }

            session.write((command + "\n").getBytes());
            
            // Wait for output
            Thread.sleep(100);
            
            String output = session.getEmulator().getScreen().getTranscriptText();
            promise.resolve(output);
        } catch (Exception e) {
            Log.e(TAG, "Failed to execute command", e);
            promise.reject("EXEC_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void resizeTerminal(String sessionId, int columns, int rows, Promise promise) {
        try {
            TerminalSession session = sessions.get(sessionId);
            if (session == null) {
                throw new Exception("Invalid session ID");
            }

            session.updateSize(columns, rows);
            promise.resolve(null);
        } catch (Exception e) {
            Log.e(TAG, "Failed to resize terminal", e);
            promise.reject("RESIZE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void installPackage(String packageName, Promise promise) {
        try {
            String command = "pkg install -y " + packageName;
            executeCommand("session_1", command, promise);
        } catch (Exception e) {
            Log.e(TAG, "Failed to install package", e);
            promise.reject("INSTALL_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void updatePackages(Promise promise) {
        try {
            String command = "pkg update -y && pkg upgrade -y";
            executeCommand("session_1", command, promise);
        } catch (Exception e) {
            Log.e(TAG, "Failed to update packages", e);
            promise.reject("UPDATE_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void closeSession(String sessionId, Promise promise) {
        try {
            TerminalSession session = sessions.get(sessionId);
            if (session != null) {
                session.finishIfRunning();
                sessions.remove(sessionId);
            }
            promise.resolve(null);
        } catch (Exception e) {
            Log.e(TAG, "Failed to close session", e);
            promise.reject("CLOSE_ERROR", e.getMessage());
        }
    }
}