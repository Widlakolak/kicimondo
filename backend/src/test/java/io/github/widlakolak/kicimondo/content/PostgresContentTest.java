package io.github.widlakolak.kicimondo.content;

import io.github.widlakolak.kicimondo.content.application.ContentPacks;
import io.github.widlakolak.kicimondo.content.domain.PackRules;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static io.github.widlakolak.kicimondo.content.application.ContentPacks.Publication.ALREADY_PUBLISHED;
import static io.github.widlakolak.kicimondo.content.application.ContentPacks.Publication.PUBLISHED;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "kicimondo.allowed-origins=http://127.0.0.1:5173")
@AutoConfigureMockMvc
@Testcontainers
class PostgresContentTest {
    private static final String API = "/api/v1/content/packs";
    private static final String COMPATIBLE = "?gameContentVersion=4";
    @Container
    static final PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17.9-alpine");

    @DynamicPropertySource
    static void dataSource(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired ContentPacks packs;
    @Autowired JdbcTemplate database;
    @Autowired MockMvc mvc;

    private byte[] pack(String id, int version) throws IOException {
        return new String(PackRulesTest.fixture("demo-math.json"), StandardCharsets.UTF_8)
            .replace("kicimondo-math", id).replace("\"version\": 1", "\"version\": " + version)
            .getBytes(StandardCharsets.UTF_8);
    }

    @Test
    void migratesAndEnforcesPublishedVersionConstraints() throws IOException {
        assertThat(database.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE success", Long.class))
            .isEqualTo(1);
        assertThat(packs.publish(pack("immutable", 1))).isEqualTo(PUBLISHED);
        assertThatThrownBy(() -> database.update("UPDATE published_pack SET locale='en' WHERE pack_id='immutable'"))
            .isInstanceOf(DataAccessException.class).hasMessageContaining("immutable");
        assertThatThrownBy(() -> database.update("DELETE FROM published_pack WHERE pack_id='immutable'"))
            .isInstanceOf(DataAccessException.class).hasMessageContaining("immutable");
        assertThatThrownBy(() -> database.update("""
            INSERT INTO published_pack SELECT pack_id, version, game_content_version, locale, payload, checksum, published_at
            FROM published_pack WHERE pack_id='immutable'
            """)).isInstanceOf(DataAccessException.class).hasMessageContaining("published_pack_pkey");
        assertThatThrownBy(() -> database.update("""
            INSERT INTO published_pack SELECT 'invalid-version', 0, game_content_version, locale, payload, checksum, published_at
            FROM published_pack WHERE pack_id='immutable'
            """)).isInstanceOf(DataAccessException.class).hasMessageContaining("published_pack_version_check");
    }

    @Test
    void publishesIdempotentlyAndLeavesTheOriginalVersionUnchangedAfterConflict() throws IOException {
        byte[] first = pack("versions", 1);
        assertThat(packs.publish(first)).isEqualTo(PUBLISHED);
        var artifact = packs.exact("versions", 1, 4, "pl");
        var metadata = packs.latest("versions", 4, "pl");
        assertThat(packs.publish(artifact.payload().getBytes(StandardCharsets.UTF_8))).isEqualTo(ALREADY_PUBLISHED);
        assertThatThrownBy(() -> packs.publish(new String(first, StandardCharsets.UTF_8)
            .replace("123456789", "123456780").getBytes(StandardCharsets.UTF_8)))
            .isInstanceOf(ContentPacks.ConflictingVersion.class);
        assertThat(packs.latest("versions", 4, "pl")).isEqualTo(metadata);
        assertThat(packs.exact("versions", 1, 4, "pl")).isEqualTo(artifact);
        assertThatThrownBy(() -> packs.publish(new byte[PackRules.MAX_BYTES + 1])).isInstanceOf(IllegalArgumentException.class);
        assertThat(packs.publish(pack("versions", 2))).isEqualTo(PUBLISHED);
        assertThat(packs.latest("versions", 4, "pl").version()).isEqualTo(2);
        assertThat(packs.exact("versions", 1, 4, "pl")).isEqualTo(artifact);
    }

    @Test
    void handlesConcurrentImportsWithoutDuplicateRows() throws Exception {
        var bytes = pack("concurrent", 1);
        try (var tasks = Executors.newFixedThreadPool(2)) {
            var first = tasks.submit(() -> packs.publish(bytes));
            var second = tasks.submit(() -> packs.publish(bytes));
            assertThat(List.of(first.get(10, TimeUnit.SECONDS), second.get(10, TimeUnit.SECONDS)))
                .containsExactlyInAnyOrder(PUBLISHED, ALREADY_PUBLISHED);
        }
    }

    @Test
    void servesCompatibleVersionsAndValidatesReadRequests() throws Exception {
        var original = pack("api-math", 1);
        packs.publish(original);
        packs.publish(pack("api-math", 2));
        mvc.perform(get(API + COMPATIBLE)).andExpect(status().isOk())
            .andExpect(jsonPath("$[0].packId").value("api-math"))
            .andExpect(jsonPath("$[0].version").value(2));
        mvc.perform(get(API + "?gameContentVersion=3")).andExpect(status().isOk()).andExpect(content().json("[]"));
        mvc.perform(get(API + "/api-math/latest" + COMPATIBLE)).andExpect(status().isOk())
            .andExpect(jsonPath("$.version").value(2)).andExpect(jsonPath("$.publishedAt").isString());
        var expected = PackRules.bundled().validate(original);
        mvc.perform(get(API + "/api-math/versions/1" + COMPATIBLE).header("Origin", "http://127.0.0.1:5173"))
            .andExpect(status().isOk()).andExpect(header().string("X-Content-SHA256", expected.checksum()))
            .andExpect(header().string("Access-Control-Expose-Headers", "X-Content-SHA256"))
            .andExpect(content().string(expected.payload()));
        mvc.perform(get(API + "/api-math/versions/1?gameContentVersion=3"))
            .andExpect(status().isNotFound()).andExpect(content().contentTypeCompatibleWith("application/problem+json"));
        mvc.perform(get(API + "/api-math/latest" + COMPATIBLE + "&locale=en"))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.status").value(404));
        for (var path : List.of(API, API + "?gameContentVersion=0", API + COMPATIBLE + "&locale=PL",
            API + COMPATIBLE + "&page=-1", API + "/bad_id/latest" + COMPATIBLE, API + "/api-math/versions/0" + COMPATIBLE)) {
            mvc.perform(get(path)).andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.status").value(400));
        }
        mvc.perform(post(API)).andExpect(status().isMethodNotAllowed());
    }

    @Test
    void documentsReadOnlyApiAndLimitsManagementExposure() throws Exception {
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk())
            .andExpect(jsonPath("$.paths['" + API + "'].get").exists())
            .andExpect(jsonPath("$.paths['" + API + "'].post").doesNotExist());
        mvc.perform(get("/actuator/health")).andExpect(status().isOk())
            .andExpect(content().json("{\"status\":\"UP\"}")).andExpect(jsonPath("$.components").doesNotExist());
        mvc.perform(get("/actuator")).andExpect(status().isNotFound());
        mvc.perform(get("/actuator/env")).andExpect(status().isNotFound());
    }
}
