package com.bolt.diy

import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mock
import org.mockito.junit.MockitoJUnitRunner
import org.mockito.kotlin.whenever
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

@RunWith(MockitoJUnitRunner::class)
class StorageManagerTest {
    @Mock
    lateinit var storageManager: StorageManager

    @Test
    fun testStorageQuotas() {
        // Mock storage stats
        whenever(storageManager.getTotalSize()).thenReturn(50 * 1024 * 1024L) // 50MB
        whenever(storageManager.getMessageCount()).thenReturn(500)
        whenever(storageManager.getAttachmentSize()).thenReturn(20 * 1024 * 1024L) // 20MB

        val stats = storageManager.checkQuotas()
        
        assertNotNull(stats)
        assertEquals(false, stats.isOverLimit)
        assertEquals(0, stats.warnings.size)
    }

    @Test
    fun testStorageCleanup() {
        // Test cleanup of old messages
        val result = storageManager.cleanupOldMessages()
        assertEquals(true, result.success)
        
        // Verify cleanup thresholds
        assertEquals(500, result.remainingMessages)
        assertEquals(30, result.cleanupDays)
    }
}