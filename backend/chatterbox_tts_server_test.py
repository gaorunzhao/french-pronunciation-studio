import json
import unittest

from chatterbox_tts_server import (
    build_audio_filename,
    duration_ms_from_samples,
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


if __name__ == "__main__":
    unittest.main()
