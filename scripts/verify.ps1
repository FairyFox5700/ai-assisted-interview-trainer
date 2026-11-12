param()
$ErrorActionPreference = 'Stop'
dotnet restore
dotnet build --no-restore
dotnet test --no-build
npm.cmd test
npm.cmd run check
