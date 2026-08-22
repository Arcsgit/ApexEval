#!/usr/bin/env bash
set -e

WORKSPACE_DIR="/config/workspace"

# If the mounted workspace is empty (first run for this student session),
# seed it with the starter template and initialize a real git repo.
if [ -z "$(ls -A "$WORKSPACE_DIR" 2>/dev/null)" ]; then
    echo "[entrypoint] Empty workspace detected. Seeding starter template..."
    cp -r /tmp/starter-template/. "$WORKSPACE_DIR"/
fi

cd "$WORKSPACE_DIR"

if [ ! -d ".git" ]; then
    echo "[entrypoint] No git repo found. Running git init..."
    git init
    git config user.email "student@apexeval.local"
    git config user.name "ApexEval Student"
    git add -A
    git commit -m "Initial starter code" --allow-empty
fi

echo "[entrypoint] Workspace ready at $WORKSPACE_DIR"
echo "[entrypoint] Java (default): $(java -version 2>&1 | head -n 1)"
echo "[entrypoint] Maven: $(mvn -version 2>&1 | head -n 1)"

# Hand off to the original code-server entrypoint/CMD from the base image.
exec /init
