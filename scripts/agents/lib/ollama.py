"""Client HTTP per LLM — OpenAI-compatible /v1/chat/completions.
Mantiene il nome 'ollama' per backward-compat con i moduli che importano da qui.
"""

import os
import json
import time
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://192.168.1.124:8081")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "phi-4")


def _endpoint(path: str) -> str:
    base = OLLAMA_URL.rstrip("/")
    if base.endswith("/v1"):
        return base + path
    return base + "/v1" + path


def generate(
    prompt: str,
    *,
    system: str = "",
    model: str = "",
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> str:
    """Genera testo via /v1/chat/completions. Ritorna il testo generato."""
    url = _endpoint("/chat/completions")
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    payload = {
        "model": model or OLLAMA_MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    body = json.dumps(payload).encode("utf-8")
    last_error: Exception | None = None
    for attempt in range(3):
        req = Request(url, data=body, headers={"Content-Type": "application/json"})
        try:
            with urlopen(req, timeout=1800) as resp:
                result = json.loads(resp.read().decode("utf-8"))
            return result["choices"][0]["message"]["content"]
        except (HTTPError, URLError, TimeoutError, OSError) as e:
            last_error = e
            if attempt < 2:
                wait = [2, 5][attempt]
                print(f"[RETRY] LLM tentativo {attempt + 2}/3 tra {wait}s... ({e})")
                time.sleep(wait)
    raise RuntimeError(f"LLM non raggiungibile dopo 3 tentativi: {last_error}")


def generate_json(
    prompt: str,
    *,
    system: str = "",
    model: str = "",
    temperature: float = 0.3,
) -> dict | list:
    """Genera JSON strutturato. Ritorna dict/list parsed."""
    raw = generate(
        prompt,
        system=system + "\n\nRispondi SOLO con JSON valido, nessun testo prima o dopo.",
        model=model,
        temperature=temperature,
    )
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return json.loads(text)


PITMASTER_SYSTEM = """Sei "The Pitmaster" di BBQ Experience, un esperto BBQ brutalmente onesto.
Regole:
- Tono diretto, tecnico, mai promozionale
- Score prodotti: range 5.8-8.8, mai 9+ senza giustificazione eccezionale
- Dati concreti: temperature, tempi, pesi
- Zero marketing BS, zero hype
- Scrivi in modo coinvolgente ma autorevole
- Includi sempre sezioni con H2/H3 ben strutturate
- Ogni articolo deve avere: intro, corpo con sezioni, conclusione, FAQ (3-5 domande)
"""

TRANSLATOR_SYSTEM = """Sei un traduttore specializzato in contenuti BBQ e cucina.
Regole:
- Mantieni il tono "The Pitmaster" (diretto, tecnico)
- Adatta le unita di misura: EN usa imperiale (°F, lbs, oz), IT/ES usa metrico (°C, kg, g)
- Non tradurre nomi propri di prodotti o brand
- Mantieni la struttura HTML/Markdown del testo originale
- Traduci anche le FAQ mantenendo il formato domanda/risposta
"""
