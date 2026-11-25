CREATE TABLE published_pack (
    pack_id varchar(64) NOT NULL CHECK (pack_id ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'),
    version integer NOT NULL CHECK (version > 0),
    game_content_version integer NOT NULL CHECK (game_content_version > 0),
    locale varchar(2) NOT NULL CHECK (locale = 'pl'),
    payload text NOT NULL CHECK (octet_length(payload) BETWEEN 1 AND 16384 AND jsonb_typeof(payload::jsonb) = 'object'),
    checksum varchar(64) NOT NULL CHECK (checksum ~ '^[a-f0-9]{64}$'),
    published_at timestamptz NOT NULL DEFAULT current_timestamp,
    PRIMARY KEY (pack_id, version)
);

CREATE INDEX published_pack_compatibility
    ON published_pack (game_content_version, locale, pack_id, version DESC);

CREATE FUNCTION protect_published_pack() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'Published pack versions are immutable';
END;
$$;

CREATE TRIGGER published_pack_immutable
    BEFORE UPDATE OR DELETE ON published_pack
    FOR EACH ROW EXECUTE FUNCTION protect_published_pack();
