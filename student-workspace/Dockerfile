FROM lscr.io/linuxserver/code-server:latest

USER root

# linuxserver/code-server is Debian/Ubuntu-based (not Alpine) -> use apt-get.
# Add Eclipse Temurin's repo to get OpenJDK 17 + 21 cleanly on Debian.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        wget \
        curl \
        gnupg \
        apt-transport-https \
        unzip \
        ca-certificates && \
    mkdir -p /etc/apt/keyrings && \
    wget -O - https://packages.adoptium.net/artifactory/api/gpg/key/public | gpg --dearmor -o /etc/apt/keyrings/adoptium.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb $(awk -F= '/^VERSION_CODENAME/{print $2}' /etc/os-release) main" \
        > /etc/apt/sources.list.d/adoptium.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends \
        temurin-17-jdk \
        temurin-21-jdk \
        maven \
        git && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Default JVM = 21 (matches backend + student assignment target)
ENV JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64
ENV JAVA17_HOME=/usr/lib/jvm/temurin-17-jdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# ---- Install JUnit Console Launcher (standalone jar) ----
ARG JUNIT_VERSION=1.13.4
RUN mkdir -p /opt/junit && \
    curl -fsSL -o /opt/junit/junit-platform-console-standalone.jar \
    "https://repo1.maven.org/maven2/org/junit/platform/junit-platform-console-standalone/${JUNIT_VERSION}/junit-platform-console-standalone-${JUNIT_VERSION}.jar"

ENV JUNIT_CONSOLE_JAR=/opt/junit/junit-platform-console-standalone.jar

# ---- Workspace setup ----
# Actual student code is bind-mounted at /config/workspace via docker-compose.
# We only seed a starter template here as a fallback/reference copy.
COPY starter-template/ /tmp/starter-template/

COPY entrypoint.sh /apexeval-entrypoint.sh
RUN chmod +x /apexeval-entrypoint.sh

EXPOSE 8443

# linuxserver base image uses s6-overlay's /init as PID 1.
# We hook our setup in via cont-init.d instead of overriding ENTRYPOINT,
# so PUID/PGID/PASSWORD handling and s6 supervision still work correctly.
RUN mkdir -p /etc/cont-init.d
COPY entrypoint.sh /etc/cont-init.d/90-apexeval-workspace-init
RUN chmod +x /etc/cont-init.d/90-apexeval-workspace-init
