use crate::models::version::Version;
use anyhow::Result;
use chrono::{DateTime, Duration, Utc};
use reqwest::Client;
use serde_json::Value;
use std::fs;
use std::path::PathBuf;

const MANIFEST_URL: &str = "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json";
const CACHE_DURATION_HOURS: i64 = 1;

pub struct VersionsCommand {
    client: Client,
    cache_dir: PathBuf,
}

impl VersionsCommand {
    pub fn new() -> Result<Self> {
        let cache_dir = get_cache_dir()?;
        Ok(Self {
            client: Client::new(),
            cache_dir,
        })
    }

    pub async fn fetch_versions(&self) -> Result<Vec<Value>> {
        let response = self.client.get(MANIFEST_URL).send().await?;
        let manifest: Value = response.json().await?;
        
        let versions = manifest["versions"]
            .as_array()
            .ok_or_else(|| anyhow::anyhow!("Invalid manifest format"))?;

        let mut result = Vec::new();
        for v in versions {
            let version = serde_json::json!({
                "id": v["id"].as_str().unwrap_or(""),
                "type": v["type"].as_str().unwrap_or(""),
                "url": v["url"].as_str().unwrap_or(""),
                "time": v["time"].as_str().unwrap_or(""),
                "releaseTime": v["releaseTime"].as_str().unwrap_or(""),
                "sha1": v["sha1"].as_str().unwrap_or(""),
                "complianceLevel": v["complianceLevel"].as_u64().unwrap_or(0) as u32,
            });
            result.push(version);
        }

        self.cache_versions(&result).await?;
        Ok(result)
    }

    pub async fn get_cached_versions(&self) -> Option<Vec<Value>> {
        let cache_file = self.cache_dir.join("version_manifest.json");
        
        if !cache_file.exists() {
            return None;
        }

        let metadata = fs::metadata(&cache_file).ok()?;
        let modified = metadata.modified().ok()?;
        let modified_time: DateTime<Utc> = modified.into();
        
        if Utc::now() - modified_time > Duration::hours(CACHE_DURATION_HOURS) {
            return None;
        }

        let content = fs::read_to_string(&cache_file).ok()?;
        serde_json::from_str(&content).ok()
    }

    async fn cache_versions(&self, versions: &[Value]) -> Result<()> {
        fs::create_dir_all(&self.cache_dir)?;
        let cache_file = self.cache_dir.join("version_manifest.json");
        let content = serde_json::to_string(versions)?;
        fs::write(cache_file, content)?;
        Ok(())
    }
}

fn get_cache_dir() -> Result<PathBuf> {
    let app_data = dirs::data_local_dir()
        .ok_or_else(|| anyhow::anyhow!("Failed to get local data directory"))?;
    let cache_dir = app_data.join("WesNal").join("cache");
    fs::create_dir_all(&cache_dir)?;
    Ok(cache_dir)
}

#[tauri::command]
pub async fn fetch_versions_command(versions: tauri::State<'_, VersionsCommand>) -> Result<Vec<Value>, String> {
    versions.fetch_versions().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_cached_versions_command(versions: tauri::State<'_, VersionsCommand>) -> Option<Vec<Value>> {
    versions.get_cached_versions().await
}
