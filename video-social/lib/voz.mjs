// Gera a narração na ElevenLabs com o tempo de cada caractere (para sincronizar as cenas e a legenda).
import fs from "node:fs";
import { pegar } from "./env.mjs";

export async function gerarVoz(texto, arquivoMp3) {
  const chave = pegar("ELEVENLABS_API_KEY", "ELEVEN_LABS_API_KEY", "ELEVEN_API_KEY", "XI_API_KEY");
  const voz = pegar("ELEVENLABS_VOICE_ID", "ELEVEN_LABS_VOICE_ID", "ELEVEN_VOICE_ID");
  if (!chave) throw new Error("Não achei a chave da ElevenLabs (ELEVENLABS_API_KEY) no .env.local / .env");
  if (!voz) throw new Error("Não achei o ID da voz (ELEVENLABS_VOICE_ID) no .env.local / .env");
  const modelo = pegar("ELEVENLABS_MODEL") || "eleven_multilingual_v2";

  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voz}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": chave, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: texto,
      model_id: modelo,
      language_code: "pt",
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true, speed: 1.08 },
    }),
  });
  if (!r.ok) {
    const corpo = await r.text();
    // alguns modelos não aceitam language_code: tenta de novo sem ele
    if (r.status === 400 && /language_code/i.test(corpo)) return gerarVozSemIdioma(texto, arquivoMp3, { chave, voz, modelo });
    throw new Error(`ElevenLabs ${r.status}: ${corpo.slice(0, 300)}`);
  }
  return salvar(await r.json(), arquivoMp3);
}

async function gerarVozSemIdioma(texto, arquivoMp3, { chave, voz, modelo }) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voz}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": chave, "Content-Type": "application/json" },
    body: JSON.stringify({ text: texto, model_id: modelo, voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true } }),
  });
  if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return salvar(await r.json(), arquivoMp3);
}

function salvar(json, arquivoMp3) {
  fs.writeFileSync(arquivoMp3, Buffer.from(json.audio_base64, "base64"));
  const al = json.normalized_alignment || json.alignment;
  const duracao = Math.max(...al.character_end_times_seconds);
  return { alinhamento: json.alignment || al, duracao };
}
