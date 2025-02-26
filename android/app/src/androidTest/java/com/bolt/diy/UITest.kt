package com.bolt.diy

import androidx.test.espresso.Espresso.onView
import androidx.test.espresso.action.ViewActions.*
import androidx.test.espresso.assertion.ViewAssertions.matches
import androidx.test.espresso.matcher.ViewMatchers.*
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.rule.ActivityTestRule
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class UITest {
    @Rule @JvmField
    val activityRule = ActivityTestRule(MainActivity::class.java)

    @Test
    fun testMainScreenElements() {
        // Check main UI elements are displayed
        onView(withId(R.id.modelSelector))
            .check(matches(isDisplayed()))
        
        onView(withId(R.id.chatInput))
            .check(matches(isDisplayed()))
            .check(matches(withHint(R.string.chat_input_hint)))
        
        onView(withId(R.id.sendButton))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testSettingsNavigation() {
        // Open settings
        onView(withId(R.id.settingsButton)).perform(click())
        
        // Verify settings screen elements
        onView(withText("Storage & Data"))
            .check(matches(isDisplayed()))
        
        onView(withText("Local Models"))
            .check(matches(isDisplayed()))
            
        // Navigate back
        pressBack()
        
        // Verify back on main screen
        onView(withId(R.id.chatInput))
            .check(matches(isDisplayed()))
    }

    @Test
    fun testChatInteraction() {
        // Type and send message
        onView(withId(R.id.chatInput))
            .perform(typeText("Hello"), closeSoftKeyboard())
        
        onView(withId(R.id.sendButton))
            .perform(click())
        
        // Verify message appears in chat
        onView(withText("Hello"))
            .check(matches(isDisplayed()))
    }
}