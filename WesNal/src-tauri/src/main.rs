#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::Value;
use std::collections::HashMap;
use tauri::Manager;
use wesnal_lib::commands::{
    accounts, launch, settings, versions,
    fetch_versions_command, get_cached_versions_command,
    ping_server_command, launch_game_command,
    pick_java_path,
};
use wesnal_lib::models::version::{LaunchArgs, PingResult};

struct AppState {
    versions: versions::VersionsCommand,
    settings: settings::SettingsCommand,
}

fn main() {
    let versions_cmd = versions::VersionsCommand::new().expect("Failed to create VersionsCommand");
    let settings_cmd = settings::SettingsCommand::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            versions: versions_cmd,
            settings: settings_cmd,
        })
        .invoke_handler(tauri::generate_handler![
            fetch_versions_command,
            get_cached_versions_command,
            ping_server_command,
            launch_game_command,
            pick_java_path,
            generate_uuid,
            validate_username,
            get_settings,
            set_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[tauri::command]
fn generate_uuid() -> String {
    uuid::Uuid::new_v4().to_string()
}

#[tauri::command]
fn validate_username(username: String) -> bool {
    let regex = regex::Regex::new(r"^[a-zA-Z0-9_]{3,16}$").unwrap();
    regex.is_match(&username)
}

#[tauri::command]
fn get_settings(state: tauri::State<'_, AppState>) -> HashMap<String, Value> {
    state.settings.get_all_settings().clone()
}

#[tauri::command]
fn set_setting(state: tauri::State<'_, AppState>, key: String, value: Value) {
    let mut settings = state.settings;
    settings.set_setting(key, value);
}
