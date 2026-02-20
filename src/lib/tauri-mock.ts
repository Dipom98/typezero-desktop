/**
 * Tauri Mock Layer
 * 
 * This file provides mocks for Tauri APIs that are missing when running
 * in a standard browser environment.
 */

export function setupTauriMocks() {
    if (typeof window === 'undefined') return;

    if ((window as any).__TAURI_INTERNALS__ && !(window as any).__MOCK_ACTIVE__) {
        console.log("Tauri environment detected, skipping mocks.");
        return;
    }

    console.log("Initializing TypeZero Browser Mocks (v2)...");
    (window as any).__MOCK_ACTIVE__ = true;

    const mockInvoke = async (cmd: string, args: any) => {
        console.log(`[Mock Invoke] ${cmd}`, args);

        // Handle plugin-style commands (Tauri 2 pattern)
        if (cmd.startsWith('plugin:')) {
            const [_, pluginPart] = cmd.split(':');
            const [pluginName, commandName] = pluginPart.split('|');

            if (pluginName === 'os' && commandName === 'platform') return 'macos';
            if (pluginName === 'os' && commandName === 'arch') return 'arm64';
            if (pluginName === 'macos-permissions') return true;
            if (pluginName === 'updater' && commandName === 'check') return { shouldUpdate: false };
            // Catch-all for other plugins
            return null;
        }

        // Common app commands
        switch (cmd) {
            case "get_app_settings":
            case "get_settings":
                return {
                    status: "ok",
                    data: {
                        debug_mode: true,
                        post_process_enabled: true,
                        push_to_talk: false,
                        keyboard_implementation: "tauri",
                        bindings: { cancel: { current_binding: "Escape" } },
                        experimental_enabled: false,
                        autostart_enabled: false,
                        update_checks_enabled: true,
                        sound_theme: "marimba",
                        audio_feedback: true,
                        audio_feedback_volume: 0.5,
                        translate_to_english: false,
                        selected_language: "en",
                        overlay_position: "bottom",
                        theme: "plain"
                    }
                };
            case "change_app_theme_setting":
                console.log("[Mock] Theme changed to:", args.theme);
                return { status: "ok", data: null };
            case "has_any_models_available":
                return { status: "ok", data: true };
            case "check_accessibility_permission":
            case "check_microphone_permission":
                return true;
            case "get_default_settings":
                return { status: "ok", data: {} };
            default:
                return null;
        }
    };

    // Tauri 2 Internal Mocking
    (window as any).__TAURI_INTERNALS__ = {
        metadata: { version: "2.0.0" },
        invoke: mockInvoke,
        ipc: (message: any) => {
            console.log("[Mock IPC]", message);
            if (message.cmd === 'plugin:os|platform') return 'macos';
        }
    };

    // Polyfill for @tauri-apps/api/core and other imports
    (window as any).__TAURI__ = {
        core: { invoke: mockInvoke },
        os: { platform: () => "macos" },
        event: { listen: () => Promise.resolve(() => { }), emit: () => Promise.resolve() },
        path: { appDataDir: () => "/mock/appdata" }
    };

    // Provide the global that the OS plugin looks for
    if (!(window as any).rpc) {
        (window as any).rpc = {
            notify: (cmd: string, args: any) => console.log("[Mock RPC Notify]", cmd, args),
            call: mockInvoke
        };
    }
}
