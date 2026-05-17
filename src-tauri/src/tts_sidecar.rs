use serde_json::{json, Value};
use std::{
    collections::hash_map::DefaultHasher,
    fs,
    hash::{Hash, Hasher},
    io::{self, Read, Write},
    net::{TcpListener, TcpStream},
    path::{Path, PathBuf},
    process::Child,
    sync::Mutex,
    thread,
    time::Duration,
};

const DEFAULT_HOST: &str = "127.0.0.1";
const DEFAULT_PORT: u16 = 8765;
const SAMPLE_RATE: u32 = 24_000;

pub struct BackendProcess {
    child: Mutex<Option<Child>>,
}

impl BackendProcess {
    pub fn new(child: Child) -> Self {
        Self {
            child: Mutex::new(Some(child)),
        }
    }
}

impl Drop for BackendProcess {
    fn drop(&mut self) {
        if let Ok(mut child) = self.child.lock() {
            if let Some(mut child) = child.take() {
                let _ = child.kill();
            }
        }
    }
}

pub fn is_backend_available() -> bool {
    TcpStream::connect((DEFAULT_HOST, DEFAULT_PORT)).is_ok()
}

pub fn run_from_args(args: impl IntoIterator<Item = String>) -> io::Result<()> {
    let args = args.into_iter().collect::<Vec<_>>();
    let host = arg_value(&args, "--host").unwrap_or_else(|| DEFAULT_HOST.to_string());
    let port = arg_value(&args, "--port")
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(DEFAULT_PORT);
    let output_dir = arg_value(&args, "--output-dir")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            std::env::temp_dir()
                .join("french-pronunciation-studio")
                .join("tts")
        });

    fs::create_dir_all(&output_dir)?;
    let listener = TcpListener::bind((host.as_str(), port))?;

    for stream in listener.incoming() {
        match stream {
            Ok(stream) => {
                let output_dir = output_dir.clone();
                thread::spawn(move || {
                    let _ = handle_client(stream, &output_dir);
                });
            }
            Err(error) => eprintln!("TTS sidecar connection failed: {error}"),
        }
    }

    Ok(())
}

pub fn build_health_payload() -> Value {
    json!({
        "status": "ok",
        "model": "embedded-tts-sidecar",
        "device": "local",
        "modelLoaded": false,
        "runtime": "bundled-sidecar",
        "modelPolicy": "download-separately"
    })
}

pub fn sanitize_audio_id(value: &str) -> String {
    let mut output = String::new();
    let mut previous_was_dash = false;

    for character in value.chars().flat_map(char::to_lowercase) {
        if character.is_ascii_alphanumeric() {
            output.push(character);
            previous_was_dash = false;
        } else if !previous_was_dash && !output.is_empty() {
            output.push('-');
            previous_was_dash = true;
        }
    }

    let output = output.trim_matches('-').to_string();
    if output.is_empty() {
        "sentence".to_string()
    } else {
        output
    }
}

pub fn build_wav(sample_rate: u32, sample_count: usize) -> Vec<u8> {
    let mut pcm = Vec::with_capacity(sample_count * 2);
    let frequency = 440.0_f32;

    for index in 0..sample_count {
        let t = index as f32 / sample_rate as f32;
        let envelope = if index < sample_count / 12 {
            index as f32 / (sample_count / 12).max(1) as f32
        } else if index > sample_count.saturating_sub(sample_count / 12) {
            (sample_count - index) as f32 / (sample_count / 12).max(1) as f32
        } else {
            1.0
        };
        let sample = (t * frequency * std::f32::consts::TAU).sin() * 0.18 * envelope;
        let sample = (sample * i16::MAX as f32) as i16;
        pcm.extend_from_slice(&sample.to_le_bytes());
    }

    let data_len = pcm.len() as u32;
    let mut wav = Vec::with_capacity(44 + pcm.len());
    wav.extend_from_slice(b"RIFF");
    wav.extend_from_slice(&(36 + data_len).to_le_bytes());
    wav.extend_from_slice(b"WAVE");
    wav.extend_from_slice(b"fmt ");
    wav.extend_from_slice(&16_u32.to_le_bytes());
    wav.extend_from_slice(&1_u16.to_le_bytes());
    wav.extend_from_slice(&1_u16.to_le_bytes());
    wav.extend_from_slice(&sample_rate.to_le_bytes());
    wav.extend_from_slice(&(sample_rate * 2).to_le_bytes());
    wav.extend_from_slice(&2_u16.to_le_bytes());
    wav.extend_from_slice(&16_u16.to_le_bytes());
    wav.extend_from_slice(b"data");
    wav.extend_from_slice(&data_len.to_le_bytes());
    wav.extend_from_slice(&pcm);
    wav
}

fn arg_value(args: &[String], name: &str) -> Option<String> {
    args.windows(2)
        .find_map(|window| (window[0] == name).then(|| window[1].clone()))
}

fn handle_client(mut stream: TcpStream, output_dir: &Path) -> io::Result<()> {
    stream.set_read_timeout(Some(Duration::from_secs(3)))?;
    let request = read_request(&mut stream)?;

    match (request.method.as_str(), request.path.as_str()) {
        ("OPTIONS", _) => send_empty(&mut stream, 204),
        ("GET", "/health") => send_json(&mut stream, 200, &build_health_payload()),
        ("HEAD", path) if path.starts_with("/audio/") => {
            serve_audio_head(&mut stream, output_dir, path)
        }
        ("GET", path) if path.starts_with("/audio/") => serve_audio(&mut stream, output_dir, path),
        ("POST", "/tts") => handle_tts(&mut stream, output_dir, &request.body),
        _ => send_json(&mut stream, 404, &json!({ "error": "not found" })),
    }
}

fn read_request(stream: &mut TcpStream) -> io::Result<Request> {
    let mut buffer = Vec::new();
    let mut chunk = [0_u8; 4096];
    let mut header_end = None;

    while header_end.is_none() {
        let read = stream.read(&mut chunk)?;
        if read == 0 {
            break;
        }
        buffer.extend_from_slice(&chunk[..read]);
        header_end = find_header_end(&buffer);
    }

    let header_end = header_end
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "missing HTTP headers"))?;
    let headers = String::from_utf8_lossy(&buffer[..header_end]);
    let mut lines = headers.lines();
    let request_line = lines
        .next()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidData, "missing request line"))?;
    let mut request_parts = request_line.split_whitespace();
    let method = request_parts.next().unwrap_or_default().to_string();
    let path = request_parts.next().unwrap_or_default().to_string();
    let content_length = lines
        .filter_map(|line| line.split_once(':'))
        .find_map(|(name, value)| {
            name.eq_ignore_ascii_case("content-length")
                .then(|| value.trim().parse::<usize>().ok())
                .flatten()
        })
        .unwrap_or(0);

    let mut body = buffer[(header_end + 4)..].to_vec();
    while body.len() < content_length {
        let read = stream.read(&mut chunk)?;
        if read == 0 {
            break;
        }
        body.extend_from_slice(&chunk[..read]);
    }
    body.truncate(content_length);

    Ok(Request { method, path, body })
}

fn find_header_end(buffer: &[u8]) -> Option<usize> {
    buffer.windows(4).position(|window| window == b"\r\n\r\n")
}

fn handle_tts(stream: &mut TcpStream, output_dir: &Path, body: &[u8]) -> io::Result<()> {
    let payload = serde_json::from_slice::<Value>(body).unwrap_or_else(|_| json!({}));
    let text = payload["text"].as_str().unwrap_or_default().trim();
    if text.is_empty() {
        return send_json(stream, 400, &json!({ "error": "text is required" }));
    }

    let sentence_id = payload["sentenceId"].as_str().unwrap_or("sentence");
    let safe_id = sanitize_audio_id(sentence_id);
    let duration_ms = duration_ms_for_text(text);
    let sample_count = (SAMPLE_RATE as usize * duration_ms as usize) / 1000;
    let wav = build_wav(SAMPLE_RATE, sample_count);
    let filename = format!("{safe_id}-{}.wav", short_hash(&(sentence_id, text)));
    let audio_path = output_dir.join(&filename);
    fs::write(&audio_path, wav)?;

    send_json(
        stream,
        200,
        &json!({
            "audioPath": audio_path,
            "audioUrl": format!("/audio/{filename}"),
            "durationMs": duration_ms,
            "sampleRate": SAMPLE_RATE,
            "backend": "embedded-sidecar-placeholder"
        }),
    )
}

fn duration_ms_for_text(text: &str) -> u32 {
    let word_count = text
        .split_whitespace()
        .filter(|word| !word.is_empty())
        .count() as u32;
    (word_count * 360).clamp(900, 8_000)
}

fn short_hash<T: Hash>(value: &T) -> String {
    let mut hasher = DefaultHasher::new();
    value.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

fn serve_audio_head(stream: &mut TcpStream, output_dir: &Path, path: &str) -> io::Result<()> {
    let audio_path = audio_path_from_request(output_dir, path)?;
    let len = fs::metadata(audio_path)?.len();
    write_headers(stream, 200, "audio/wav", len)?;
    stream.flush()
}

fn serve_audio(stream: &mut TcpStream, output_dir: &Path, path: &str) -> io::Result<()> {
    let audio_path = audio_path_from_request(output_dir, path)?;
    let data = fs::read(audio_path)?;
    write_headers(stream, 200, "audio/wav", data.len() as u64)?;
    stream.write_all(&data)
}

fn audio_path_from_request(output_dir: &Path, path: &str) -> io::Result<PathBuf> {
    let filename = path.trim_start_matches("/audio/");
    if filename.contains('/') || filename.contains('\\') || filename.is_empty() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "invalid audio path",
        ));
    }

    Ok(output_dir.join(filename))
}

fn send_json(stream: &mut TcpStream, status: u16, payload: &Value) -> io::Result<()> {
    let data = serde_json::to_vec(payload)?;
    write_headers(stream, status, "application/json", data.len() as u64)?;
    stream.write_all(&data)
}

fn send_empty(stream: &mut TcpStream, status: u16) -> io::Result<()> {
    write_headers(stream, status, "text/plain", 0)?;
    stream.flush()
}

fn write_headers(
    stream: &mut TcpStream,
    status: u16,
    content_type: &str,
    content_len: u64,
) -> io::Result<()> {
    let reason = match status {
        200 => "OK",
        204 => "No Content",
        400 => "Bad Request",
        404 => "Not Found",
        _ => "OK",
    };
    write!(
        stream,
        "HTTP/1.1 {status} {reason}\r\n\
         Access-Control-Allow-Origin: *\r\n\
         Access-Control-Allow-Methods: GET, HEAD, POST, OPTIONS\r\n\
         Access-Control-Allow-Headers: Content-Type\r\n\
         Content-Type: {content_type}\r\n\
         Content-Length: {content_len}\r\n\
         Connection: close\r\n\r\n"
    )
}

struct Request {
    method: String,
    path: String,
    body: Vec<u8>,
}

#[cfg(test)]
mod tests {
    use super::{build_health_payload, build_wav, sanitize_audio_id};

    #[test]
    fn health_payload_reports_embedded_backend_without_model() {
        let payload = build_health_payload();

        assert_eq!(payload["status"], "ok");
        assert_eq!(payload["model"], "embedded-tts-sidecar");
        assert_eq!(payload["modelLoaded"], false);
    }

    #[test]
    fn audio_ids_are_safe_for_serving_from_disk() {
        assert_eq!(sanitize_audio_id("../Sentence 1!"), "sentence-1");
        assert_eq!(sanitize_audio_id(""), "sentence");
    }

    #[test]
    fn generated_wav_has_a_valid_header_and_duration() {
        let wav = build_wav(24_000, 240);

        assert_eq!(&wav[0..4], b"RIFF");
        assert_eq!(&wav[8..12], b"WAVE");
        assert_eq!(&wav[12..16], b"fmt ");
        assert_eq!(&wav[36..40], b"data");
        assert_eq!(wav.len(), 44 + 240 * 2);
    }
}
