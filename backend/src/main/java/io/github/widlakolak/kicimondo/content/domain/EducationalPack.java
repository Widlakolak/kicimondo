package io.github.widlakolak.kicimondo.content.domain;

import java.util.List;

public record EducationalPack(int schemaVersion, String packId, int version, int gameContentVersion,
                              String locale, List<Variant> variants) {
    public record Variant(String id, String challengeId, long seed) {}
}
