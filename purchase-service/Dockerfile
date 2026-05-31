FROM maven:3.8.1-openjdk-17-slim AS builder

WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline

COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jdk-alpine

WORKDIR /app

COPY --from=builder /app/target/purchase-service-1.0.0.jar app.jar

EXPOSE 8085 9095

ENTRYPOINT ["java", "-jar", "app.jar"]
