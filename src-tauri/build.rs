use std::process::Command;

fn git_value(arguments: &[&str]) -> String {
    Command::new("git")
        .args(arguments)
        .output()
        .ok()
        .filter(|output| output.status.success())
        .and_then(|output| String::from_utf8(output.stdout).ok())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "indisponível".into())
}

fn main() {
    println!("cargo:rerun-if-changed=../.git/HEAD");
    println!("cargo:rerun-if-changed=icons/icon.ico");
    println!(
        "cargo:rustc-env=EARTHTRANSLATE_COMMIT={}",
        git_value(&["rev-parse", "--short", "HEAD"])
    );
    println!(
        "cargo:rustc-env=EARTHTRANSLATE_COMMIT_DATE={}",
        git_value(&["log", "-1", "--format=%cs"])
    );
    let attributes = tauri_build::Attributes::new().windows_attributes(
        tauri_build::WindowsAttributes::new().window_icon_path("icons/icon.ico"),
    );
    tauri_build::try_build(attributes).expect("falha ao configurar o build Tauri");
}
