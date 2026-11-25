FROM eclipse-temurin:21.0.9_10-jre-alpine
WORKDIR /app
COPY --chmod=0444 backend/build/libs/kicimondo-content.jar ./kicimondo-content.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=65.0", "-jar", "/app/kicimondo-content.jar"]
