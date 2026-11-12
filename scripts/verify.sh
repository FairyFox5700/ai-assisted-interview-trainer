#!/usr/bin/env bash
set -euo pipefail
dotnet restore
dotnet build --no-restore
dotnet test --no-build
node.exe --test web-tests/*.test.js 2>/dev/null || node --test web-tests/*.test.js
node.exe --check src/Practice.Api/wwwroot/app.js 2>/dev/null || node --check src/Practice.Api/wwwroot/app.js
node.exe --check src/Practice.Api/wwwroot/state.js 2>/dev/null || node --check src/Practice.Api/wwwroot/state.js
