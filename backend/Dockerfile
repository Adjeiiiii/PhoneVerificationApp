# ========= Build stage =========
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# Cache Maven deps first (faster rebuilds)
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -q -DskipTests dependency:go-offline

# Now add sources and build the jar
COPY src src
RUN ./mvnw -q -DskipTests package

# ========= Runtime stage =========
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Install curl for healthcheck and openssl for credential generation
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl openssl \
 && rm -rf /var/lib/apt/lists/*

# Copy the built jar (adjust pattern if you use a fixed <finalName>)
COPY --from=build /app/target/*-SNAPSHOT.jar app.jar

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Run as non-root
RUN addgroup --system app && adduser --system --ingroup app app
USER app

EXPOSE 8080

# Container healthcheck against Spring Boot actuator
HEALTHCHECK --interval=30s --timeout=3s --retries=5 \
  CMD curl -fsS http://localhost:8080/actuator/health | grep -q '"status":"UP"' || exit 1

# Allow passing JVM flags and Spring profile via env
ENV JAVA_OPTS=""
ENV SPRING_PROFILES_ACTIVE=""
ENTRYPOINT ["/app/docker-entrypoint.sh"]
