# Security policy

## Supported version

The latest commit on `main` is supported.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting feature instead of opening a public issue. Include the affected endpoint, reproduction steps, and impact.

## Local security boundary

The application is designed for local practice. It does not require credentials, analytics, remote fonts, cookies, or an account. Progress is stored in browser `localStorage`. The API does not execute browser-supplied shell commands, source paths, or arbitrary URLs.
