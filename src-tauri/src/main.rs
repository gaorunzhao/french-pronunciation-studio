fn main() {
    if std::env::args().any(|arg| arg == "--tts-backend") {
        if let Err(error) = french_pronunciation_studio_lib::run_tts_backend_from_args() {
            eprintln!("TTS backend failed: {error}");
            std::process::exit(1);
        }
        return;
    }

    french_pronunciation_studio_lib::run();
}
