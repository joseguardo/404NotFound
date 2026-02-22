"""Convert between Twilio's μ-law 8kHz and ElevenLabs' PCM 24kHz."""
import audioop


def pcm_to_mulaw(pcm_data: bytes) -> bytes:
    """Convert PCM 16-bit audio to μ-law."""
    return audioop.lin2ulaw(pcm_data, 2)


def elevenlabs_to_twilio(pcm_24k: bytes) -> bytes:
    """Convert ElevenLabs PCM 24kHz 16-bit mono to Twilio μ-law 8kHz."""
    pcm_8k = audioop.ratecv(pcm_24k, 2, 1, 24000, 8000, None)[0]
    return pcm_to_mulaw(pcm_8k)
