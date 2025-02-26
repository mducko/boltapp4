package com.bolt.diy

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.rule.ActivityTestRule
import androidx.test.uiautomator.UiDevice
import org.junit.ClassRule
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import tools.fastlane.screengrab.Screengrab
import tools.fastlane.screengrab.UiAutomatorScreenshotStrategy
import tools.fastlane.screengrab.locale.LocaleTestRule

@RunWith(AndroidJUnit4::class)
class ScreenshotTest {
    @Rule @JvmField
    val localeTestRule = LocaleTestRule()

    @Rule @JvmField
    val activityRule = ActivityTestRule(MainActivity::class.java)

    @Test
    fun testTakeScreenshots() {
        val device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation())
        Screengrab.setDefaultScreenshotStrategy(UiAutomatorScreenshotStrategy())

        // Wait for app to load
        Thread.sleep(5000)

        // Take main screen screenshot
        Screengrab.screenshot("01_main_screen")

        // Open settings
        device.findObject(androidx.test.uiautomator.By.desc("Settings")).click()
        Thread.sleep(1000)
        Screengrab.screenshot("02_settings")

        // Open storage stats
        device.findObject(androidx.test.uiautomator.By.text("Storage & Data")).click()
        Thread.sleep(1000)
        Screengrab.screenshot("03_storage_stats")

        // Open model manager
        device.findObject(androidx.test.uiautomator.By.text("Local Models")).click()
        Thread.sleep(1000)
        Screengrab.screenshot("04_model_manager")
    }
}