FROM eclipse-temurin:21.0.9_10-jre-alpine@sha256:08eecc477dbe3f2e33daac27f36e41daf7f4ec51d2f3396006e54fa41832c74c
WORKDIR /app
COPY --chmod=0444 backend/build/libs/kicimondo-content.jar ./kicimondo-content.jar
USER 10001:10001
EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=65.0"
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=5 CMD wget -Y off -qO /dev/null http://127.0.0.1:${SERVER_PORT:-8080}/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "/app/kicimondo-content.jar"]
