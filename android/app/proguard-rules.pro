# Add project specific ProGuard rules here.

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Keep native methods
-keepclassmembers class * {
    @com.facebook.react.uimanager.annotations.ReactProp <methods>;
}

# AsyncStorage
-keep class com.reactnativecommunity.asyncstorage.** { *; }

# NetInfo
-keep class com.reactnativecommunity.netinfo.** { *; }

# Background Tasks
-keep class com.reactnativebackgroundactions.** { *; }

# File System
-keep class com.rnfs.** { *; }

# Keychain
-keep class com.oblador.keychain.** { *; }

# Vector Icons
-keep class com.oblador.vectoricons.** { *; }

# Gzip
-keep class com.reactnativegzip.** { *; }

# Keep JavaScript callbacks
-keepclassmembers class * {
    @com.facebook.react.bridge.ReactMethod *;
}

# Keep native libraries
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep Serializable classes
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}