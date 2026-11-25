package io.github.widlakolak.kicimondo.content.api;

import io.github.widlakolak.kicimondo.content.application.ContentPacks;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.util.Arrays;

@Configuration(proxyBeanMethods = false)
class ContentWeb implements WebMvcConfigurer {
    private final String[] origins;

    ContentWeb(@Value("${kicimondo.allowed-origins}") String origins) {
        this.origins = Arrays.stream(origins.split(",")).map(String::trim)
            .filter(origin -> !origin.isEmpty()).toArray(String[]::new);
        if (Arrays.asList(this.origins).contains("*")) throw new IllegalArgumentException("Use explicit CORS origins.");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        if (origins.length > 0) {
            registry.addMapping(PackApi.ROOT + "/**").allowedOrigins(origins)
                .allowedMethods("GET").exposedHeaders(PackApi.SHA256_HEADER);
        }
    }
}

@RestControllerAdvice
class PackErrors extends ResponseEntityExceptionHandler {
    @ExceptionHandler(ContentPacks.NotFound.class)
    ProblemDetail missing() {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "No published pack matches this request.");
    }
}
