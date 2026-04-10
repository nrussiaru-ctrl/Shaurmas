use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionManifest {
    pub latest: LatestVersions,
    pub versions: Vec<VersionInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LatestVersions {
    pub release: String,
    pub snapshot: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionInfo {
    pub id: String,
    #[serde(rename = "type")]
    pub version_type: String,
    pub url: String,
    pub time: String,
    #[serde(rename = "releaseTime")]
    pub release_time: String,
    #[serde(rename = "sha1")]
    pub sha1: String,
    #[serde(rename = "complianceLevel")]
    pub compliance_level: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Version {
    pub id: String,
    #[serde(rename = "type")]
    pub version_type: String,
    pub url: String,
    pub time: String,
    #[serde(rename = "releaseTime")]
    pub release_time: String,
    #[serde(rename = "sha1")]
    pub sha1: String,
    #[serde(rename = "complianceLevel")]
    pub compliance_level: u32,
}

impl From<VersionInfo> for Version {
    fn from(info: VersionInfo) -> Self {
        Version {
            id: info.id,
            version_type: info.version_type,
            url: info.url,
            time: info.time,
            release_time: info.release_time,
            sha1: info.sha1,
            compliance_level: info.compliance_level.unwrap_or(0),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: String,
    pub username: String,
    #[serde(rename = "type")]
    pub account_type: String,
    pub uuid: Option<String>,
    pub avatar: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerStatus {
    pub online: bool,
    pub players: Players,
    pub motd: Motd,
    pub debug: Option<Debug>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Players {
    pub online: u32,
    pub max: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Motd {
    pub raw: Option<Vec<String>>,
    pub clean: Option<Vec<String>>,
    pub html: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Debug {
    pub ping: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaunchArgs {
    pub version_id: String,
    pub account_id: String,
    pub username: String,
    pub uuid: String,
    pub ram_mb: u32,
    pub java_path: Option<String>,
    pub server_ip: Option<String>,
    pub server_port: Option<u16>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PingResult {
    pub success: bool,
    pub message: String,
}
