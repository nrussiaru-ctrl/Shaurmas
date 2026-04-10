use crate::models::version::Account;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct SettingsCommand {
    settings: HashMap<String, Value>,
}

impl SettingsCommand {
    pub fn new() -> Self {
        let mut settings = HashMap::new();
        settings.insert("theme".to_string(), Value::String("dark".to_string()));
        settings.insert("java_path".to_string(), Value::Null);
        settings.insert("ram_allocation".to_string(), Value::Number(4096.into()));
        
        Self { settings }
    }

    pub fn get_setting(&self, key: &str) -> Option<&Value> {
        self.settings.get(key)
    }

    pub fn set_setting(&mut self, key: String, value: Value) {
        self.settings.insert(key, value);
    }

    pub fn get_all_settings(&self) -> &HashMap<String, Value> {
        &self.settings
    }
}

#[tauri::command]
pub fn get_settings(settings: tauri::State<'_, SettingsCommand>) -> HashMap<String, Value> {
    settings.get_all_settings().clone()
}

#[tauri::command]
pub fn set_setting(settings: tauri::State<'_, SettingsCommand>, key: String, value: Value) {
    settings.set_setting(key, value);
}

#[tauri::command]
pub async fn pick_java_path() -> Result<Option<String>, String> {
    // This would use tauri-plugin-dialog in a real implementation
    // For now, return None to indicate automatic Java detection
    Ok(None)
}
