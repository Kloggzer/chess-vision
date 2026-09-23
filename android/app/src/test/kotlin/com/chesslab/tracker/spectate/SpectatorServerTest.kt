package com.chesslab.tracker.spectate

import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertInstanceOf
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Assumptions.assumeTrue
import org.junit.jupiter.api.Test
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.ServerSocket
import java.util.Collections

private const val LOOPBACK = "127.0.0.1"

private class FakeWifi(
    var host: String? = LOOPBACK,
) : WifiAddress {
    override fun current(): String? = host
}

private fun bindable(host: String): Boolean =
    runCatching { ServerSocket().use { it.bind(InetSocketAddress(host, SPECTATOR_PORT)) } }.isSuccess

/** Used to prove the server did NOT bind the wildcard. */
private fun otherLocalAddress(): String? =
    runCatching {
        Collections
            .list(NetworkInterface.getNetworkInterfaces())
            .filter { it.isUp && !it.isLoopback }
            .flatMap { Collections.list(it.inetAddresses) }
            .filterIsInstance<Inet4Address>()
            .firstOrNull { it.isSiteLocalAddress }
            ?.hostAddress
    }.getOrNull()

class SpectatorServerTest {
    private val wifi = FakeWifi()
    private val server = SpectatorServer(wifi) { GameSnapshot() }

    @AfterEach
    fun tearDown() {
        wifi.host = LOOPBACK
        server.stop()
    }

    @Test
    fun serverIsOffByDefault() {
        assertEquals(SpectatorState.Off, server.state.value)
        assertTrue(bindable(LOOPBACK), "constructing the server must open no socket")
    }

    @Test
    fun startWithoutWifiYieldsNoWifi() {
        wifi.host = null
        server.start()
        assertEquals(SpectatorState.NoWifi, server.state.value)
        assertTrue(bindable(LOOPBACK), "no socket may be opened without Wi-Fi")
    }

    @Test
    fun wifiLossWhileRunningStopsServer() {
        server.start()
        assertInstanceOf(SpectatorState.Running::class.java, server.state.value)
        wifi.host = null
        server.refresh(enabled = true)
        assertEquals(SpectatorState.NoWifi, server.state.value)
        assertTrue(bindable(LOOPBACK), "the port must be released when Wi-Fi drops")
    }

    @Test
    fun portInUseYieldsErrorNotAnotherPort() {
        ServerSocket().use { socket ->
            socket.bind(InetSocketAddress(LOOPBACK, SPECTATOR_PORT))
            server.start()
            val state = assertInstanceOf(SpectatorState.Error::class.java, server.state.value)
            assertTrue(state.reason.contains("$SPECTATOR_PORT"), state.reason)
        }
    }

    @Test
    fun bindsWifiAddressNotWildcard() {
        val other = otherLocalAddress()
        assumeTrue(other != null, "no non-loopback IPv4 on this machine")
        server.start()
        val running = assertInstanceOf(SpectatorState.Running::class.java, server.state.value)
        assertEquals("http://$LOOPBACK:$SPECTATOR_PORT", running.url)
        assertTrue(bindable(other!!), "the server bound more than the Wi-Fi interface")
        server.stop()
    }

    @Test
    fun stopReleasesThePort() {
        server.start()
        assertInstanceOf(SpectatorState.Running::class.java, server.state.value)
        server.stop()
        assertEquals(SpectatorState.Off, server.state.value)
        assertTrue(bindable(LOOPBACK), "rebinding must succeed immediately after stop")
    }
}
