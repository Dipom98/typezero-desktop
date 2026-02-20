# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in TypeZero, please report it responsibly.

**Email:** [Support@Dipomdutta.com](mailto:Support@Dipomdutta.com)

Please include:
- A description of the vulnerability
- Steps to reproduce the issue
- Any relevant logs or screenshots

We will acknowledge your report within **48 hours** and aim to provide a fix or mitigation within **7 days** for critical issues.

## Security Architecture

TypeZero is designed with privacy and security as core principles:

- **100% Local Processing** — All voice transcription and AI processing runs entirely on your device. No audio data is ever sent to external servers.
- **No Telemetry** — TypeZero does not collect usage data, analytics, or telemetry of any kind.
- **Minimal Network Access** — The app connects to the internet only for:
  - Checking for application updates
  - Downloading AI models on first launch
  - Firebase Authentication (for account management)
- **Open Source** — The full source code is available for audit and review.

## Dependencies

TypeZero is built with:
- **Tauri** (Rust) — Secure, sandboxed desktop runtime
- **React** — Frontend UI
- **Whisper / Local AI Models** — On-device speech recognition

We regularly update dependencies to address known vulnerabilities.
