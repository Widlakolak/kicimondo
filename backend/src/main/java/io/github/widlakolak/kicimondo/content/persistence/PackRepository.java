package io.github.widlakolak.kicimondo.content.persistence;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;

import java.util.List;
import java.util.Optional;

public interface PackRepository extends Repository<PublishedPack, PublishedPack.Key> {
    Optional<PublishedPack> findById(PublishedPack.Key key);
    Optional<PublishedPack> findByPackIdAndVersionAndGameContentVersionAndLocale(
        String packId, int version, int gameContentVersion, String locale);
    Optional<PublishedPack> findFirstByPackIdAndGameContentVersionAndLocaleOrderByVersionDesc(
        String packId, int gameContentVersion, String locale);

    @Query("""
        select p from PublishedPack p
        where p.gameContentVersion = :gameVersion and p.locale = :locale and p.version = (
            select max(v.version) from PublishedPack v
            where v.packId = p.packId and v.gameContentVersion = :gameVersion and v.locale = :locale
        )
        order by p.packId
        """)
    List<PublishedPack> compatible(int gameVersion, String locale, Pageable page);

    @Modifying
    @Query(value = """
        INSERT INTO published_pack (pack_id, version, game_content_version, locale, payload, checksum)
        VALUES (:id, :version, :gameVersion, :locale, :payload, :checksum)
        ON CONFLICT (pack_id, version) DO NOTHING
        """, nativeQuery = true)
    int publish(String id, int version, int gameVersion, String locale, String payload, String checksum);
}
