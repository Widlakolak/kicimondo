plugins {
    java
    id("org.springframework.boot") version "4.2.0"
}

group = "io.github.widlakolak.kicimondo"
version = "0.7.0"

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation(platform(org.springframework.boot.gradle.plugin.SpringBootPlugin.BOM_COORDINATES))
    implementation("org.springframework.boot:spring-boot-starter-webmvc")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-flyway")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:3.2.1")
    runtimeOnly("org.flywaydb:flyway-database-postgresql")
    runtimeOnly("org.postgresql:postgresql")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
    testImplementation("org.testcontainers:testcontainers-junit-jupiter")
    testImplementation("org.testcontainers:testcontainers-postgresql")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.processResources {
    from("../contracts/compatibility.json")
}

tasks.processTestResources {
    from("../contracts/fixtures") { into("fixtures") }
    from("../contracts/demo-math.json") { into("fixtures") }
}

tasks.test {
    useJUnitPlatform()
}

tasks.bootJar {
    archiveFileName.set("kicimondo-content.jar")
}
