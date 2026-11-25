package io.github.widlakolak.kicimondo.content.domain;

import tools.jackson.core.JacksonException;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.Pattern;

public final class PackRules {
    public static final int MAX_BYTES = 16_384;
    public static final String ID = "[a-z][a-z0-9]*(-[a-z0-9]+)*";
    private static final Pattern IDENTIFIER = Pattern.compile(ID);
    private static final JsonMapper JSON = JsonMapper.builder()
        .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
        .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
        .build();

    public record Capability(int maximum, List<String> operations) {}
    public record Compatibility(int gameContentVersion, Map<String, Capability> math) {}
    public record Validated(EducationalPack pack, String payload, String checksum) {}

    private final Compatibility compatibility;

    public PackRules(Compatibility compatibility) {
        this.compatibility = compatibility;
    }

    public static PackRules bundled() {
        try (var input = Objects.requireNonNull(PackRules.class.getResourceAsStream("/compatibility.json"))) {
            return new PackRules(JSON.readValue(input, Compatibility.class));
        } catch (IOException e) {
            throw new IllegalStateException("Cannot read bundled compatibility manifest.", e);
        }
    }

    public Validated validate(byte[] bytes) {
        if (bytes.length == 0 || bytes.length > MAX_BYTES) throw invalid("Pack size is out of range.");
        JsonNode root;
        try {
            root = JSON.readTree(bytes);
        } catch (JacksonException e) {
            throw invalid("Malformed pack JSON.");
        }
        fields(root, "schemaVersion", "packId", "version", "gameContentVersion", "locale", "variants");
        int schemaVersion = (int) integral(root.get("schemaVersion"), 1, 1);
        int gameVersion = (int) integral(root.get("gameContentVersion"), 1, Integer.MAX_VALUE);
        if (gameVersion != compatibility.gameContentVersion()) throw invalid("Incompatible game content version.");
        if (!"pl".equals(root.get("locale").asString(null))) throw invalid("Unsupported locale.");
        var variants = root.get("variants");
        if (!variants.isArray() || variants.isEmpty() || variants.size() > 32) throw invalid("Invalid variant count.");
        var ids = new HashSet<String>();
        var entries = new ArrayList<EducationalPack.Variant>();
        for (var entry : variants) {
            fields(entry, "id", "challengeId", "seed");
            var id = identifier(entry.get("id"));
            if (!ids.add(id)) throw invalid("Duplicate variant ID.");
            var challengeId = identifier(entry.get("challengeId"));
            var capability = compatibility.math().get(challengeId);
            if (capability == null) throw invalid("Unknown math challenge.");
            long seed = integral(entry.get("seed"), 0, 0xffff_ffffL);
            MathQuestions.generate(seed, capability.maximum(), capability.operations());
            entries.add(new EducationalPack.Variant(id, challengeId, seed));
        }
        entries.sort(Comparator.comparing(EducationalPack.Variant::id));
        var pack = new EducationalPack(schemaVersion, identifier(root.get("packId")),
            (int) integral(root.get("version"), 1, Integer.MAX_VALUE), gameVersion, "pl", List.copyOf(entries));
        String payload = JSON.writeValueAsString(pack);
        return new Validated(pack, payload, sha256(payload.getBytes(StandardCharsets.UTF_8)));
    }

    public static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static void fields(JsonNode node, String... names) {
        if (node == null || !node.isObject() || node.size() != names.length) throw invalid("Unexpected pack fields.");
        for (var name : names) {
            if (!node.hasNonNull(name)) throw invalid("Missing pack field.");
        }
    }

    private static String identifier(JsonNode node) {
        if (!node.isString()) throw invalid("Invalid identifier.");
        String value = node.asString();
        if (value.length() > 64 || !IDENTIFIER.matcher(value).matches()) throw invalid("Invalid identifier.");
        return value;
    }

    private static long integral(JsonNode node, long min, long max) {
        if (!node.isNumber()) throw invalid("Invalid integer parameter.");
        var number = node.decimalValue();
        if (number.compareTo(BigDecimal.valueOf(min)) < 0 || number.compareTo(BigDecimal.valueOf(max)) > 0
            || number.stripTrailingZeros().scale() > 0) {
            throw invalid("Integer parameter is out of range.");
        }
        return number.longValueExact();
    }

    private static IllegalArgumentException invalid(String message) {
        return new IllegalArgumentException(message);
    }
}
