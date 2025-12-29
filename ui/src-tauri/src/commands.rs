use serde::{Deserialize, Serialize};
use shard::accounts::{Account, Accounts, load_accounts, remove_account, save_accounts, set_active};
use shard::auth::{DeviceCode, request_device_code};
use shard::config::{Config, load_config, save_config};
use shard::minecraft::{LaunchPlan, prepare};
use shard::ops::{finish_device_code_flow, parse_loader, resolve_input, resolve_launch_account};
use shard::paths::Paths;
use shard::profile::{ContentRef, Profile, Runtime, clone_profile, create_profile, diff_profiles, load_profile, save_profile, upsert_mod, upsert_resourcepack, upsert_shaderpack, remove_mod, remove_resourcepack, remove_shaderpack, list_profiles};
use shard::store::{ContentKind, store_content};
use std::process::Command;
use tauri::{AppHandle, Emitter};

#[derive(Serialize)]
pub struct DiffResult {
    pub only_a: Vec<String>,
    pub only_b: Vec<String>,
    pub both: Vec<String>,
}

#[derive(Serialize)]
pub struct LaunchPlanDto {
    pub instance_dir: String,
    pub java_exec: String,
    pub jvm_args: Vec<String>,
    pub classpath: String,
    pub main_class: String,
    pub game_args: Vec<String>,
}

#[derive(Clone, Serialize)]
pub struct LaunchEvent {
    pub stage: String,
    pub message: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateProfileInput {
    pub id: String,
    pub mc_version: String,
    pub loader_type: Option<String>,
    pub loader_version: Option<String>,
    pub java: Option<String>,
    pub memory: Option<String>,
    pub args: Option<String>,
}

fn load_paths() -> Result<Paths, String> {
    let paths = Paths::new().map_err(|e| e.to_string())?;
    paths.ensure().map_err(|e| e.to_string())?;
    Ok(paths)
}

fn resolve_credentials(
    paths: &Paths,
    client_id: Option<String>,
    client_secret: Option<String>,
) -> Result<(String, Option<String>), String> {
    let config = load_config(paths).map_err(|e| e.to_string())?;
    let id = client_id
        .or(config.msa_client_id)
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
        .ok_or_else(|| "missing Microsoft client id; set it in Settings".to_string())?;
    let secret = client_secret
        .or(config.msa_client_secret)
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty());
    Ok((id, secret))
}

#[tauri::command]
pub fn list_profiles_cmd() -> Result<Vec<String>, String> {
    let paths = load_paths()?;
    list_profiles(&paths).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_profile_cmd(id: String) -> Result<Profile, String> {
    let paths = load_paths()?;
    load_profile(&paths, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn create_profile_cmd(input: CreateProfileInput) -> Result<Profile, String> {
    let paths = load_paths()?;
    let loader = match (input.loader_type, input.loader_version) {
        (Some(loader_type), Some(loader_version)) => {
            let loader_string = format!("{}@{}", loader_type.trim(), loader_version.trim());
            Some(parse_loader(&loader_string).map_err(|e| e.to_string())?)
        }
        (None, None) => None,
        _ => {
            return Err("loader type and version must both be provided".to_string());
        }
    };

    let args = input
        .args
        .unwrap_or_default()
        .split_whitespace()
        .map(|s| s.to_string())
        .collect::<Vec<_>>();
    let runtime = Runtime {
        java: input.java.filter(|v| !v.trim().is_empty()),
        memory: input.memory.filter(|v| !v.trim().is_empty()),
        args,
    };

    create_profile(&paths, &input.id, &input.mc_version, loader, runtime)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clone_profile_cmd(src: String, dst: String) -> Result<Profile, String> {
    let paths = load_paths()?;
    clone_profile(&paths, &src, &dst).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn diff_profiles_cmd(a: String, b: String) -> Result<DiffResult, String> {
    let paths = load_paths()?;
    let profile_a = load_profile(&paths, &a).map_err(|e| e.to_string())?;
    let profile_b = load_profile(&paths, &b).map_err(|e| e.to_string())?;
    let (only_a, only_b, both) = diff_profiles(&profile_a, &profile_b);
    Ok(DiffResult { only_a, only_b, both })
}

fn add_content(
    profile_id: &str,
    input: &str,
    name: Option<String>,
    version: Option<String>,
    kind: ContentKind,
) -> Result<bool, String> {
    let paths = load_paths()?;
    let mut profile_data = load_profile(&paths, profile_id).map_err(|e| e.to_string())?;
    let (path, source, file_name_hint) = resolve_input(&paths, input).map_err(|e| e.to_string())?;
    let stored = store_content(&paths, kind, &path, source, file_name_hint).map_err(|e| e.to_string())?;
    let content_ref = ContentRef {
        name: name.unwrap_or(stored.name),
        hash: stored.hash,
        version,
        source: stored.source,
        file_name: Some(stored.file_name),
    };

    let changed = match kind {
        ContentKind::Mod => upsert_mod(&mut profile_data, content_ref),
        ContentKind::ResourcePack => upsert_resourcepack(&mut profile_data, content_ref),
        ContentKind::ShaderPack => upsert_shaderpack(&mut profile_data, content_ref),
    };
    save_profile(&paths, &profile_data).map_err(|e| e.to_string())?;
    Ok(changed)
}

fn remove_content(profile_id: &str, target: &str, kind: ContentKind) -> Result<bool, String> {
    let paths = load_paths()?;
    let mut profile_data = load_profile(&paths, profile_id).map_err(|e| e.to_string())?;
    let changed = match kind {
        ContentKind::Mod => remove_mod(&mut profile_data, target),
        ContentKind::ResourcePack => remove_resourcepack(&mut profile_data, target),
        ContentKind::ShaderPack => remove_shaderpack(&mut profile_data, target),
    };
    if changed {
        save_profile(&paths, &profile_data).map_err(|e| e.to_string())?;
    }
    Ok(changed)
}

#[tauri::command]
pub fn add_mod_cmd(profile_id: String, input: String, name: Option<String>, version: Option<String>) -> Result<bool, String> {
    add_content(&profile_id, &input, name, version, ContentKind::Mod)
}

#[tauri::command]
pub fn add_resourcepack_cmd(profile_id: String, input: String, name: Option<String>, version: Option<String>) -> Result<bool, String> {
    add_content(&profile_id, &input, name, version, ContentKind::ResourcePack)
}

#[tauri::command]
pub fn add_shaderpack_cmd(profile_id: String, input: String, name: Option<String>, version: Option<String>) -> Result<bool, String> {
    add_content(&profile_id, &input, name, version, ContentKind::ShaderPack)
}

#[tauri::command]
pub fn remove_mod_cmd(profile_id: String, target: String) -> Result<bool, String> {
    remove_content(&profile_id, &target, ContentKind::Mod)
}

#[tauri::command]
pub fn remove_resourcepack_cmd(profile_id: String, target: String) -> Result<bool, String> {
    remove_content(&profile_id, &target, ContentKind::ResourcePack)
}

#[tauri::command]
pub fn remove_shaderpack_cmd(profile_id: String, target: String) -> Result<bool, String> {
    remove_content(&profile_id, &target, ContentKind::ShaderPack)
}

#[tauri::command]
pub fn list_accounts_cmd() -> Result<Accounts, String> {
    let paths = load_paths()?;
    load_accounts(&paths).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_active_account_cmd(id: String) -> Result<(), String> {
    let paths = load_paths()?;
    let mut accounts = load_accounts(&paths).map_err(|e| e.to_string())?;
    if set_active(&mut accounts, &id) {
        save_accounts(&paths, &accounts).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("account not found".to_string())
    }
}

#[tauri::command]
pub fn remove_account_cmd(id: String) -> Result<(), String> {
    let paths = load_paths()?;
    let mut accounts = load_accounts(&paths).map_err(|e| e.to_string())?;
    if remove_account(&mut accounts, &id) {
        save_accounts(&paths, &accounts).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("account not found".to_string())
    }
}

#[tauri::command]
pub fn get_config_cmd() -> Result<Config, String> {
    let paths = load_paths()?;
    load_config(&paths).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_config_cmd(client_id: Option<String>, client_secret: Option<String>) -> Result<Config, String> {
    let paths = load_paths()?;
    let mut config = load_config(&paths).map_err(|e| e.to_string())?;
    config.msa_client_id = client_id.filter(|v| !v.trim().is_empty());
    config.msa_client_secret = client_secret.filter(|v| !v.trim().is_empty());
    save_config(&paths, &config).map_err(|e| e.to_string())?;
    Ok(config)
}

#[tauri::command]
pub fn request_device_code_cmd(client_id: Option<String>, client_secret: Option<String>) -> Result<DeviceCode, String> {
    let paths = load_paths()?;
    let (id, secret) = resolve_credentials(&paths, client_id, client_secret)?;
    request_device_code(&id, secret.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn finish_device_code_flow_cmd(
    client_id: Option<String>,
    client_secret: Option<String>,
    device: DeviceCode,
) -> Result<Account, String> {
    let paths = load_paths()?;
    let (id, secret) = resolve_credentials(&paths, client_id, client_secret)?;
    finish_device_code_flow(&paths, &id, secret.as_deref(), &device).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn prepare_profile_cmd(profile_id: String, account_id: Option<String>) -> Result<LaunchPlanDto, String> {
    let paths = load_paths()?;
    let profile = load_profile(&paths, &profile_id).map_err(|e| e.to_string())?;
    let account = resolve_launch_account(&paths, account_id).map_err(|e| e.to_string())?;
    let plan = prepare(&paths, &profile, &account).map_err(|e| e.to_string())?;
    Ok(LaunchPlanDto::from(plan))
}

#[tauri::command]
pub async fn launch_profile_cmd(app: AppHandle, profile_id: String, account_id: Option<String>) -> Result<(), String> {
    let app_handle = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        if let Err(err) = run_launch(app_handle.clone(), profile_id, account_id) {
            let _ = app_handle.emit("launch-status", LaunchEvent {
                stage: "error".to_string(),
                message: Some(err),
            });
        }
    });
    Ok(())
}

#[tauri::command]
pub fn instance_path_cmd(profile_id: String) -> Result<String, String> {
    let paths = load_paths()?;
    Ok(paths.instance_dir(&profile_id).to_string_lossy().to_string())
}

fn run_launch(app: AppHandle, profile_id: String, account_id: Option<String>) -> Result<(), String> {
    let _ = app.emit("launch-status", LaunchEvent {
        stage: "preparing".to_string(),
        message: None,
    });
    let paths = load_paths()?;
    let profile = load_profile(&paths, &profile_id).map_err(|e| e.to_string())?;
    let account = resolve_launch_account(&paths, account_id).map_err(|e| e.to_string())?;
    let plan = prepare(&paths, &profile, &account).map_err(|e| e.to_string())?;

    let _ = app.emit("launch-status", LaunchEvent {
        stage: "launching".to_string(),
        message: None,
    });

    let status = Command::new(&plan.java_exec)
        .args(&plan.jvm_args)
        .arg("-cp")
        .arg(&plan.classpath)
        .arg(&plan.main_class)
        .args(&plan.game_args)
        .current_dir(&plan.instance_dir)
        .status()
        .map_err(|e| e.to_string())?;

    if !status.success() {
        return Err(format!("minecraft exited with status {status}"));
    }

    let _ = app.emit("launch-status", LaunchEvent {
        stage: "done".to_string(),
        message: None,
    });

    Ok(())
}

impl From<LaunchPlan> for LaunchPlanDto {
    fn from(plan: LaunchPlan) -> Self {
        Self {
            instance_dir: plan.instance_dir.to_string_lossy().to_string(),
            java_exec: plan.java_exec,
            jvm_args: plan.jvm_args,
            classpath: plan.classpath,
            main_class: plan.main_class,
            game_args: plan.game_args,
        }
    }
}
