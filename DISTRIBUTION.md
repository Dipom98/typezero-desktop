# TypeZero Distribution Guide

## Building for Release (Unsigned Beta)

Since we are distributing unsigned builds during the Beta phase, follow these steps to generate the distributable artifacts.

### Prerequisites
- Node.js & Rust toolchain installed.
- `tauri-cli` installed or accessible via npm scripts.

### Build Commands

**macOS (Apple Silicon & Intel)**
```bash
npm run tauri build
```
This will generate inside `src-tauri/target/release/bundle/`:
- `.dmg`: The main installer for macOS users.
- `.app`: The raw application bundle.

**Windows**
```bash
npm run tauri build
```
This will generate inside `src-tauri/target/release/bundle/nsis/`:
- `.exe`: The setup executable.

### Distribution Checklist

1. **Version Bump**: Ensure `package.json` and `src-tauri/tauri.conf.json` versions match.
2. **Clean Build**: Run `cargo clean` if you encounter build artifacts issues.
3. **Smoke Test**: Launch the built artifact on a clean environment/VM if possible.
4. **Upload**: Upload the artifacts (DMG/EXE) to the distribution host (e.g., GitHub Releases, S3, or specific download portal).

## Security & Singing (Future)

Currently, builds are **unsigned**.
- **macOS**: Users must right-click > Open to bypass Gatekeeper. The App contains a built-in Security Notice to guide them.
- **Windows**: Users must click "More Info" > "Run Anyway" on the SmartScreen filter.

For the public V1 release, we will need to obtain:
- Apple Developer ID Application Certificate (for code signing & notarization).
- Microsoft Authenticode Certificate (for EV code signing).
