package io.github.widlakolak.kicimondo.content.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

import java.io.Serializable;
import java.time.Instant;

@Entity
@Table(name = "published_pack")
@IdClass(PublishedPack.Key.class)
public class PublishedPack {
    public record Key(String packId, int version) implements Serializable {}

    @Id
    @Column(length = 64, nullable = false)
    private String packId;
    @Id
    private int version;
    @Column(nullable = false)
    private int gameContentVersion;
    @Column(length = 2, nullable = false)
    private String locale;
    @Column(columnDefinition = "text", nullable = false)
    private String payload;
    @Column(length = 64, nullable = false)
    private String checksum;
    @Column(nullable = false)
    private Instant publishedAt;

    protected PublishedPack() {}

    public String packId() { return packId; }
    public int version() { return version; }
    public int gameContentVersion() { return gameContentVersion; }
    public String locale() { return locale; }
    public String payload() { return payload; }
    public String checksum() { return checksum; }
    public Instant publishedAt() { return publishedAt; }
}
