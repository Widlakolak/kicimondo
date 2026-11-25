package io.github.widlakolak.kicimondo.content.application;

import io.github.widlakolak.kicimondo.content.domain.PackRules;
import io.github.widlakolak.kicimondo.content.persistence.PackRepository;
import io.github.widlakolak.kicimondo.content.persistence.PublishedPack;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class ContentPacks {
    public record Metadata(String packId, int version, int gameContentVersion, String locale,
                           String sha256, Instant publishedAt) {}
    public record Artifact(String payload, String sha256) {}
    public enum Publication { PUBLISHED, ALREADY_PUBLISHED }
    public static final class ConflictingVersion extends RuntimeException {
        public ConflictingVersion() { super("This pack ID and version already have different content."); }
    }
    public static final class NotFound extends RuntimeException {}

    private final PackRepository repository;
    private final PackRules rules = PackRules.bundled();

    public ContentPacks(PackRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public Publication publish(byte[] input) {
        var validated = rules.validate(input);
        var pack = validated.pack();
        if (repository.publish(pack.packId(), pack.version(), pack.gameContentVersion(), pack.locale(),
            validated.payload(), validated.checksum()) == 1) {
            return Publication.PUBLISHED;
        }
        var existing = repository.findById(new PublishedPack.Key(pack.packId(), pack.version())).orElseThrow();
        if (!existing.payload().equals(validated.payload())) throw new ConflictingVersion();
        return Publication.ALREADY_PUBLISHED;
    }

    @Transactional(readOnly = true)
    public List<Metadata> list(int gameVersion, String locale, int page) {
        return repository.compatible(gameVersion, locale, PageRequest.of(page, 50)).stream().map(ContentPacks::metadata).toList();
    }

    @Transactional(readOnly = true)
    public Metadata latest(String id, int gameVersion, String locale) {
        return metadata(repository.findFirstByPackIdAndGameContentVersionAndLocaleOrderByVersionDesc(id, gameVersion, locale)
            .orElseThrow(NotFound::new));
    }

    @Transactional(readOnly = true)
    public Artifact exact(String id, int version, int gameVersion, String locale) {
        var pack = repository.findByPackIdAndVersionAndGameContentVersionAndLocale(id, version, gameVersion, locale)
            .orElseThrow(NotFound::new);
        return new Artifact(pack.payload(), pack.checksum());
    }

    private static Metadata metadata(PublishedPack pack) {
        return new Metadata(pack.packId(), pack.version(), pack.gameContentVersion(), pack.locale(),
            pack.checksum(), pack.publishedAt());
    }
}
