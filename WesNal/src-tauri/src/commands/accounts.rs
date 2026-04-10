use crate::models::version::Account;
use anyhow::Result;
use uuid::Uuid;

pub struct AccountsCommand;

impl AccountsCommand {
    pub fn new() -> Self {
        Self
    }

    pub fn generate_offline_uuid(&self) -> String {
        Uuid::new_v4().to_string()
    }

    pub fn validate_username(&self, username: &str) -> bool {
        let regex = regex::Regex::new(r"^[a-zA-Z0-9_]{3,16}$").unwrap();
        regex.is_match(username)
    }

    pub fn create_offline_account(&self, username: String) -> Account {
        Account {
            id: Uuid::new_v4().to_string(),
            username,
            account_type: "offline".to_string(),
            uuid: Some(self.generate_offline_uuid()),
            avatar: None,
        }
    }
}

#[tauri::command]
pub fn generate_uuid_command() -> String {
    Uuid::new_v4().to_string()
}

#[tauri::command]
pub fn validate_username_command(username: String) -> bool {
    let regex = regex::Regex::new(r"^[a-zA-Z0-9_]{3,16}$").unwrap();
    regex.is_match(&username)
}
