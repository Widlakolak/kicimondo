package io.github.widlakolak.kicimondo.content;

import io.github.widlakolak.kicimondo.content.domain.MathQuestions;
import io.github.widlakolak.kicimondo.content.domain.PackRules;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Objects;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PackRulesTest {
    private final JsonMapper json = JsonMapper.shared();
    private final PackRules rules = PackRules.bundled();

    static byte[] fixture(String name) throws IOException {
        try (var stream = Objects.requireNonNull(PackRulesTest.class.getResourceAsStream("/fixtures/" + name))) {
            return stream.readAllBytes();
        }
    }

    @Test
    void normalizesPublishedContentAndHashesItsExactBytes() throws IOException {
        var pack = rules.validate(fixture("demo-math.json"));
        assertThat(pack.pack().packId()).isEqualTo("kicimondo-math");
        assertThat(pack.pack().variants()).hasSize(2);
        var bytes = pack.payload().getBytes(StandardCharsets.UTF_8);
        assertThat(rules.validate(bytes)).isEqualTo(pack);
        assertThat(pack.checksum()).isEqualTo(PackRules.sha256(bytes)).hasSize(64);
    }

    @Test
    void rejectsSharedInvalidFixturesAndBoundedInput() throws IOException {
        var valid = (ObjectNode) json.readTree(fixture("demo-math.json"));
        for (var entry : json.readTree(fixture("invalid-packs.json"))) {
            var candidate = valid.deepCopy();
            candidate.setAll((ObjectNode) entry.get("overrides"));
            assertThatThrownBy(() -> rules.validate(json.writeValueAsBytes(candidate)))
                .as(entry.get("name").asString()).isInstanceOf(IllegalArgumentException.class);
        }
        assertThatThrownBy(() -> rules.validate(new byte[PackRules.MAX_BYTES + 1]))
            .isInstanceOf(IllegalArgumentException.class);
        var oversized = valid.deepCopy();
        var variants = oversized.putArray("variants");
        for (int i = 0; i < 33; i++) variants.add(valid.get("variants").get(0));
        assertThatThrownBy(() -> rules.validate(json.writeValueAsBytes(oversized)))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("count");
        assertThatThrownBy(() -> rules.validate("{\"version\":1,\"version\":2}".getBytes(StandardCharsets.UTF_8)))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Malformed");
    }

    @Test
    void producesExactlyTheSharedTypescriptQuestions() throws IOException {
        var manifest = json.readTree(Objects.requireNonNull(getClass().getResourceAsStream("/compatibility.json")));
        for (var vector : json.readTree(fixture("math-vectors.json"))) {
            var profile = manifest.get("math").get(vector.get("challengeId").asString());
            var operations = profile.get("operations").valueStream().map(value -> value.asString()).toList();
            var generated = MathQuestions.generate(vector.get("seed").asLong(), profile.get("maximum").asInt(), operations);
            assertThat(json.<tools.jackson.databind.JsonNode>valueToTree(generated)).isEqualTo(vector.get("questions"));
        }
    }

    @Test
    void rejectsInvalidMathRulesAndNeverProducesNegativeOrAmbiguousAnswers() {
        assertThatThrownBy(() -> MathQuestions.generate(9, 10, List.of("divide")))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> MathQuestions.generate(9, 11, List.of("subtract")))
            .isInstanceOf(IllegalArgumentException.class);
        for (int seed = 0; seed < 1000; seed++) {
            var questions = MathQuestions.generate(seed, 10, List.of("count", "add", "subtract"));
            questions.forEach(question -> {
                assertThat(question.answer()).isBetween(0, 10);
                assertThat(question.options()).contains(question.answer()).hasSize(3).doesNotHaveDuplicates();
            });
        }
    }
}
