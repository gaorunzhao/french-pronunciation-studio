mod tts_sidecar;

use std::process::Command;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            launch_embedded_tts_backend(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

pub fn run_tts_backend_from_args() -> std::io::Result<()> {
    tts_sidecar::run_from_args(std::env::args())
}

fn launch_embedded_tts_backend(app: &mut tauri::App) {
    if tts_sidecar::is_backend_available() {
        return;
    }

    let Ok(exe_path) = std::env::current_exe() else {
        eprintln!("Could not locate current executable for TTS backend sidecar");
        return;
    };
    let Ok(output_dir) = app
        .path()
        .app_local_data_dir()
        .map(|path| path.join("models").join("generated-audio"))
    else {
        eprintln!("Could not locate app local data directory for TTS backend sidecar");
        return;
    };

    if let Err(error) = std::fs::create_dir_all(&output_dir) {
        eprintln!("Could not create TTS backend output directory: {error}");
        return;
    }

    match Command::new(exe_path)
        .arg("--tts-backend")
        .arg("--host")
        .arg("127.0.0.1")
        .arg("--port")
        .arg("8765")
        .arg("--output-dir")
        .arg(output_dir)
        .spawn()
    {
        Ok(child) => {
            app.manage(tts_sidecar::BackendProcess::new(child));
        }
        Err(error) => eprintln!("Could not start embedded TTS backend sidecar: {error}"),
    }
}
