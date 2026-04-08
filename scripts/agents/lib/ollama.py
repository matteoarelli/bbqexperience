"""Client HTTP per Ollama — generazione testo via LLM locale."""

import os
import json
import time
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://192.168.1.119:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.1:70b")


def generate(
    prompt: str,
    *,
    system: str = "",
    model: str = "",
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> str:
    """Genera testo con Ollama. Ritorna il testo generato."""
    url = f"{OLLAMA_URL}/api/generate"
    payload: dict = {
        "model": model or OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }
    if system:
        payload["system"] = system

    body = json.dumps(payload).encode("utf-8")
    last_error: Exception | None = None

    for attempt in range(3):
        req = Request(url, data=body, headers={"Content-Type": "application/json"})
        try:
            with urlopen(req, timeout=1800) as resp:
                result = json.loads(resp.read().decode("utf-8"))
            return result.get("response", "")
        except (HTTPError, URLError, TimeoutError, OSError) as e:
            last_error = e
            if attempt < 2:
                wait = [2, 5][attempt]
                print(f"[RETRY] Ollama tentativo {attempt + 2}/3 tra {wait}s... ({e})")
                time.sleep(wait)

    raise RuntimeError(f"Ollama non raggiungibile dopo 3 tentativi: {last_error}")


def generate_json(
    prompt: str,
    *,
    system: str = "",
    model: str = "",
    temperature: float = 0.3,
) -> dict | list:
    """Genera JSON strutturato con Ollama. Ritorna dict/list parsed."""
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
