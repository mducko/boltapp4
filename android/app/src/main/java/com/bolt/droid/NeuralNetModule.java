package com.bolt.droid;

import android.content.Context;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import org.tensorflow.lite.Interpreter;
import org.tensorflow.lite.NnApiDelegate;
import org.tensorflow.lite.gpu.GpuDelegate;
import org.tensorflow.lite.support.common.FileUtil;

import java.io.File;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class NeuralNetModule extends ReactContextBaseJavaModule {
    private static final String TAG = "NeuralNetModule";
    private final ReactApplicationContext reactContext;
    
    private Interpreter tfliteInterpreter;
    private NnApiDelegate nnApiDelegate;
    private GpuDelegate gpuDelegate;
    private boolean isTraining = false;

    public NeuralNetModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @NonNull
    @Override
    public String getName() {
        return "NeuralNetModule";
    }

    @ReactMethod
    public void initialize(Promise promise) {
        try {
            // Initialize NNAPI delegate if available
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                nnApiDelegate = new NnApiDelegate();
            }

            // Initialize GPU delegate
            gpuDelegate = new GpuDelegate();

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("INIT_ERROR", "Failed to initialize neural network", e);
        }
    }

    @ReactMethod
    public void loadModel(ReadableMap config, Promise promise) {
        try {
            String modelPath = config.getString("modelPath");
            File modelFile = FileUtil.loadFilesFromAssets(reactContext, modelPath).get(0);

            Interpreter.Options options = new Interpreter.Options();
            
            // Configure hardware acceleration based on the specified accelerator
            String accelerator = config.hasKey("accelerator") ? config.getString("accelerator") : "default";
            switch (accelerator) {
                case "gpu":
                    options.addDelegate(gpuDelegate);
                    break;
                case "npu":
                    if (nnApiDelegate != null) {
                        options.addDelegate(nnApiDelegate);
                    }
                    break;
                case "cpu":
                    // Use CPU only
                    break;
                default:
                    // Auto-select best available accelerator
                    if (nnApiDelegate != null) {
                        options.addDelegate(nnApiDelegate);
                    } else {
                        options.addDelegate(gpuDelegate);
                    }
            }

            tfliteInterpreter = new Interpreter(modelFile, options);

            WritableMap result = Arguments.createMap();
            result.putBoolean("success", true);
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("LOAD_ERROR", "Failed to load model", e);
        }
    }

    @ReactMethod
    public void startTraining(ReadableMap config, Promise promise) {
        if (tfliteInterpreter == null) {
            promise.reject("TRAINING_ERROR", "Model not loaded");
            return;
        }

        try {
            isTraining = true;
            int epochs = config.getInt("epochs");
            float learningRate = (float) config.getDouble("learningRate");

            // Start training in a background thread
            new Thread(() -> {
                try {
                    for (int epoch = 0; epoch < epochs && isTraining; epoch++) {
                        // Simulate training progress
                        float progress = (float) epoch / epochs * 100;
                        
                        WritableMap progressData = Arguments.createMap();
                        progressData.putInt("epoch", epoch);
                        progressData.putDouble("progress", progress);
                        
                        sendEvent("trainingProgress", progressData);
                        
                        Thread.sleep(100); // Simulate work
                    }
                } catch (InterruptedException e) {
                    Log.e(TAG, "Training interrupted", e);
                }
            }).start();

            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("TRAINING_ERROR", "Failed to start training", e);
        }
    }

    @ReactMethod
    public void stopTraining(Promise promise) {
        isTraining = false;
        promise.resolve(null);
    }

    @ReactMethod
    public void runInference(ReadableArray input, Promise promise) {
        if (tfliteInterpreter == null) {
            promise.reject("INFERENCE_ERROR", "Model not loaded");
            return;
        }

        try {
            // Convert input array to float buffer
            ByteBuffer inputBuffer = ByteBuffer.allocateDirect(input.size() * 4);
            inputBuffer.order(ByteOrder.nativeOrder());
            for (int i = 0; i < input.size(); i++) {
                inputBuffer.putFloat((float) input.getDouble(i));
            }

            // Prepare output buffer
            ByteBuffer outputBuffer = ByteBuffer.allocateDirect(4); // Adjust size based on your model
            outputBuffer.order(ByteOrder.nativeOrder());

            // Run inference
            long startTime = System.nanoTime();
            tfliteInterpreter.run(inputBuffer, outputBuffer);
            long inferenceTime = (System.nanoTime() - startTime) / 1_000_000; // Convert to milliseconds

            // Extract results
            outputBuffer.rewind();
            float[] outputArray = new float[1]; // Adjust size based on your model
            outputBuffer.asFloatBuffer().get(outputArray);

            WritableMap result = Arguments.createMap();
            WritableArray output = Arguments.createArray();
            for (float value : outputArray) {
                output.pushDouble(value);
            }
            result.putArray("output", output);
            result.putDouble("latencyMs", inferenceTime);

            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("INFERENCE_ERROR", "Failed to run inference", e);
        }
    }

    @ReactMethod
    public void getDeviceInfo(Promise promise) {
        WritableMap info = Arguments.createMap();
        
        // Check NNAPI availability
        info.putBoolean("hasNNAPI", Build.VERSION.SDK_INT >= Build.VERSION_CODES.P);
        
        // Get available accelerators
        WritableArray accelerators = Arguments.createArray();
        accelerators.pushString("cpu");
        if (gpuDelegate != null) accelerators.pushString("gpu");
        if (nnApiDelegate != null) accelerators.pushString("npu");
        info.putArray("accelerators", accelerators);
        
        // Get supported operations
        WritableArray operations = Arguments.createArray();
        if (nnApiDelegate != null) {
            // Add NNAPI supported ops
            operations.pushString("CONV_2D");
            operations.pushString("DEPTHWISE_CONV_2D");
            operations.pushString("FULLY_CONNECTED");
            // Add more supported operations as needed
        }
        info.putArray("supportedOperations", operations);
        
        promise.resolve(info);
    }

    private void sendEvent(String eventName, @Nullable WritableMap params) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, params);
    }

    @Override
    public void onCatalystInstanceDestroy() {
        if (tfliteInterpreter != null) {
            tfliteInterpreter.close();
        }
        if (nnApiDelegate != null) {
            nnApiDelegate.close();
        }
        if (gpuDelegate != null) {
            gpuDelegate.close();
        }
    }
}