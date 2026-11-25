package io.github.widlakolak.kicimondo.content.api;

import io.github.widlakolak.kicimondo.content.application.ContentPacks;
import io.github.widlakolak.kicimondo.content.application.ContentPacks.Metadata;
import io.github.widlakolak.kicimondo.content.domain.EducationalPack;
import io.github.widlakolak.kicimondo.content.domain.PackRules;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping(path = PackApi.ROOT, produces = MediaType.APPLICATION_JSON_VALUE)
public class PackApi {
    static final String ROOT = "/api/v1/content/packs";
    static final String SHA256_HEADER = "X-Content-SHA256";
    private final ContentPacks packs;

    public PackApi(ContentPacks packs) {
        this.packs = packs;
    }

    @GetMapping
    @Operation(summary = "List latest compatible metadata by pack ID (50 items per page)")
    public List<Metadata> list(
        @Parameter(example = "4") @RequestParam("gameContentVersion") @Positive int gameVersion,
        @Parameter(example = "pl") @RequestParam(name = "locale", defaultValue = "pl") @Pattern(regexp = "[a-z]{2}") String locale,
        @RequestParam(name = "page", defaultValue = "0") @Min(0) @Max(1000) int page) {
        return packs.list(gameVersion, locale, page);
    }

    @GetMapping("/{packId}/latest")
    @Operation(summary = "Get latest metadata compatible with this bundled game version")
    @ApiResponse(responseCode = "404", description = "No compatible published version",
        content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE))
    public Metadata latest(
        @Parameter(example = "kicimondo-math") @PathVariable("packId") @Size(max = 64) @Pattern(regexp = PackRules.ID) String id,
        @Parameter(example = "4") @RequestParam("gameContentVersion") @Positive int gameVersion,
        @RequestParam(name = "locale", defaultValue = "pl") @Pattern(regexp = "[a-z]{2}") String locale) {
        return packs.latest(id, gameVersion, locale);
    }

    @GetMapping("/{packId}/versions/{version}")
    @Operation(summary = "Get immutable JSON bytes with their lowercase SHA-256 in X-Content-SHA256")
    @ApiResponse(responseCode = "200", description = "Published educational pack", content = @Content(
        mediaType = MediaType.APPLICATION_JSON_VALUE, schema = @Schema(implementation = EducationalPack.class),
        examples = @ExampleObject(value = """
            {"schemaVersion":1,"packId":"kicimondo-math","version":1,"gameContentVersion":4,"locale":"pl",
             "variants":[{"id":"fresh-water-count","challengeId":"count-water-drops","seed":123456789}]}
            """)))
    @ApiResponse(responseCode = "404", description = "Exact compatible version not found",
        content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE))
    public ResponseEntity<byte[]> exact(
        @Parameter(example = "kicimondo-math") @PathVariable("packId") @Size(max = 64) @Pattern(regexp = PackRules.ID) String id,
        @PathVariable("version") @Positive int version,
        @Parameter(example = "4") @RequestParam("gameContentVersion") @Positive int gameVersion,
        @RequestParam(name = "locale", defaultValue = "pl") @Pattern(regexp = "[a-z]{2}") String locale) {
        var artifact = packs.exact(id, version, gameVersion, locale);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON)
            .header(SHA256_HEADER, artifact.sha256())
            .cacheControl(CacheControl.maxAge(1, TimeUnit.DAYS).cachePublic().immutable())
            .body(artifact.payload().getBytes(StandardCharsets.UTF_8));
    }
}
