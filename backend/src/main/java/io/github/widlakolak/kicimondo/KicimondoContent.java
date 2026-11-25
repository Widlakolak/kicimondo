package io.github.widlakolak.kicimondo;

import io.github.widlakolak.kicimondo.content.application.ContentPacks;
import io.github.widlakolak.kicimondo.content.domain.PackRules;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@SpringBootApplication
public class KicimondoContent {
    public static void main(String[] args) throws IOException {
        if (args.length == 2 && args[0].equals("import")) {
            try (var file = Files.newInputStream(Path.of(args[1]))) {
                byte[] bytes = file.readNBytes(PackRules.MAX_BYTES + 1);
                var application = new SpringApplication(KicimondoContent.class);
                application.setWebApplicationType(WebApplicationType.NONE);
                try (var context = application.run()) {
                    System.out.println(context.getBean(ContentPacks.class).publish(bytes));
                }
            }
        } else if (args.length > 0 && args[0].equals("import")) {
            throw new IllegalArgumentException("Usage: java -jar kicimondo-content.jar import <local-json-file>");
        } else {
            SpringApplication.run(KicimondoContent.class, args);
        }
    }
}
