import json
from pathlib import Path
import tempfile
import unittest
import unittest.mock

from chatterbox_tts_server import (
    ChatterboxEngine,
    _audio_prompt_path_for_voice,
    build_chatterbox_generate_kwargs,
    build_audio_filename,
    duration_ms_from_samples,
    normalize_generation_text,
    parse_tts_request,
)


class ChatterboxTtsServerTest(unittest.TestCase):
    def test_build_audio_filename_uses_safe_sentence_id_and_content_hash(self):
        filename = build_audio_filename(
            sentence_id="../Sentence 1!",
            text="Bonjour.",
            voice={"speed": 0.9, "styleStrength": 0.7},
        )

        self.assertRegex(filename, r"^sentence-1-[a-f0-9]{12}\.wav$")

    def test_duration_ms_from_samples(self):
        self.assertEqual(duration_ms_from_samples(sample_count=48000, sample_rate=24000), 2000)

    def test_normalize_generation_text_adds_a_line_boundary(self):
        self.assertEqual(normalize_generation_text("  bonjour   tout le monde  "), "bonjour tout le monde.")
        self.assertEqual(normalize_generation_text("Bonjour!"), "Bonjour!")
        self.assertEqual(normalize_generation_text("Bonjour ?"), "Bonjour ?")

    def test_generate_kwargs_use_conservative_line_practice_sampling(self):
        kwargs = build_chatterbox_generate_kwargs(
            language_id="fr",
            voice={"speed": 0.9, "styleStrength": 0.7},
        )

        self.assertEqual(kwargs["language_id"], "fr")
        self.assertEqual(kwargs["exaggeration"], 0.7)
        self.assertEqual(kwargs["cfg_weight"], 0.5)
        self.assertEqual(kwargs["temperature"], 0.45)
        self.assertEqual(kwargs["top_p"], 0.85)
        self.assertEqual(kwargs["min_p"], 0.05)
        self.assertEqual(kwargs["repetition_penalty"], 1.5)

    def test_download_model_loads_chatterbox_once_and_reports_endpoint(self):
        class FakeEngine(ChatterboxEngine):
            def __init__(self, output_dir: Path):
                super().__init__(output_dir)
                self.load_count = 0

            def _create_model(self):
                self.load_count += 1
                return object()

        with tempfile.TemporaryDirectory() as directory:
            with unittest.mock.patch.dict(
                "os.environ",
                {"HF_ENDPOINT": "https://hf-mirror.com"},
                clear=False,
            ):
                engine = FakeEngine(Path(directory))

                result = engine.download_model()
                second_result = engine.download_model()

        self.assertEqual(engine.load_count, 1)
        self.assertTrue(result["modelLoaded"])
        self.assertEqual(result["status"], "ready")
        self.assertEqual(result["hfEndpoint"], "https://hf-mirror.com")
        self.assertEqual(second_result["status"], "ready")

    def test_parse_tts_request_requires_french_text(self):
        payload = json.dumps(
            {
                "sentenceId": "sentence-1",
                "text": " Bonjour. ",
                "languageId": "fr",
                "voice": {"speed": 0.9, "styleStrength": 0.7},
            }
        ).encode("utf-8")

        request = parse_tts_request(payload)

        self.assertEqual(request["sentence_id"], "sentence-1")
        self.assertEqual(request["text"], "Bonjour.")
        self.assertEqual(request["language_id"], "fr")
        self.assertEqual(request["voice"]["styleStrength"], 0.7)

    def test_voice_prompt_path_uses_configured_gender_reference(self):
        with unittest.mock.patch.dict(
            "os.environ",
            {"TTS_FEMALE_PROMPT_PATH": __file__},
            clear=False,
        ):
            self.assertEqual(
                _audio_prompt_path_for_voice({"voiceId": "female-fr"}),
                __file__,
            )

    def test_voice_prompt_path_requires_configured_reference_file(self):
        with self.assertRaisesRegex(ValueError, "requires TTS_MALE_PROMPT_PATH"):
            _audio_prompt_path_for_voice({"voiceId": "male-fr"})


if __name__ == "__main__":
    unittest.main()
