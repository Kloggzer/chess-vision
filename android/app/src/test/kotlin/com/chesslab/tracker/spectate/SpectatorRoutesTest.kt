package com.chesslab.tracker.spectate

import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.put
import io.ktor.client.statement.HttpResponse
import io.ktor.client.statement.bodyAsText
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.plugin
import io.ktor.server.routing.RoutingNode
import io.ktor.server.routing.RoutingRoot
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

private val SNAPSHOT = gameSnapshot(status(), played("e4" to "e2e4"), 1L)

private fun leaves(node: RoutingNode): List<String> =
    if (node.children.isEmpty()) listOf(node.toString()) else node.children.flatMap(::leaves)

private fun ApplicationTestBuilder.install() {
    application { spectatorModule { SNAPSHOT } }
}

class SpectatorRoutesTest {
    @Test
    fun routeTableIsExactlyTwoGets() =
        testApplication {
            var routes: List<String> = emptyList()
            application {
                spectatorModule { SNAPSHOT }
                routes = leaves(plugin(RoutingRoot))
            }
            client.get("/")
            assertEquals(2, routes.size, "route table: $routes")
            assertTrue(routes.all { it.contains("method:GET") }, "a non-GET route exists: $routes")
            assertTrue(routes.any { it.startsWith("/api/status") }, "route table: $routes")
        }

    @Test
    fun postPutPatchDeleteReturn405() =
        testApplication {
            install()
            val responses =
                listOf("/", "/api/status").flatMap { path ->
                    listOf<suspend () -> HttpResponse>(
                        { client.post(path) },
                        { client.put(path) },
                        { client.patch(path) },
                        { client.delete(path) },
                    )
                }
            responses.forEach { assertEquals(HttpStatusCode.MethodNotAllowed, it().status) }
        }

    @Test
    fun unknownPathReturns404() =
        testApplication {
            install()
            assertEquals(HttpStatusCode.NotFound, client.get("/index.html").status)
            assertEquals(HttpStatusCode.NotFound, client.get("/api/config").status)
        }

    @Test
    fun bothGetsServeTheReadOnlyProjection() =
        testApplication {
            install()
            assertTrue(client.get("/").bodyAsText().contains("/api/status"))
            val json = client.get("/api/status").bodyAsText()
            assertTrue(json.contains("\"sanHistory\""))
            assertTrue(json.contains("\"e2e4\""))
        }
}
