"""
Translates the FLORES sample across all three providers and all six directions.

Reads:
- data/flores_sample.json (produced by select_sample.py)

Output:
- results/<source>-<target>-<provider>.json, one file per direction per provider.
- Each file contains: [{index, source, reference, hypothesis, provider, latency_ms}, ...]

See README.md for setup instructions.
"""

import json
import sys
import time
from pathlib import Path

# Allow importing providers.py from the parent evaluation/ folder
sys.path.insert(0, str(Path(__file__).parent.parent))
from providers import translate_amazon, translate_google_nmt, translate_google_llm

DATA_PATH = Path(__file__).parent.parent / "data" / "flores_sample.json"
RESULTS_DIR = Path(__file__).parent.parent / "results" / "benchmark"

DIRECTIONS = [
    ("en", "es"),
    ("es", "en"),
    ("en", "ru"),
    ("ru", "en"),
    ("en", "hi"),
    ("hi", "en"),
]

PROVIDERS = {
    "amazon": translate_amazon,
    "google-nmt": translate_google_nmt,
    "google-llm": translate_google_llm,
}

def load_sample():
    with DATA_PATH.open(encoding="utf-8") as f:
        return json.load(f)

def run_provider(provider_name, sample, source, target, translate_fn):
    # Returns a list of {index, source, reference, hypothesis, provider, latency_ms} for one direction.
    out = []
    for i, entry in enumerate(sample, 1):
        source_text = entry[source]
        reference = entry[target]

        start = time.time()
        try:
            hypothesis = translate_fn(source_text, source, target)
        except Exception as e:
            print(f"  [{i}/{len(sample)}] FAILED: {e}")
            hypothesis = ""
        latency_ms = int((time.time() - start) * 1000)

        out.append({
            "index": entry["index"],
            "source": source_text,
            "reference": reference,
            "hypothesis": hypothesis,
            "provider": provider_name,
            "latency_ms": latency_ms,
        })

        if i % 25 == 0:
            print(f"  [{i}/{len(sample)}] done")

    return out


def write_results(results, source, target, provider):
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    path = RESULTS_DIR / f"{source}-{target}-{provider}.json"
    with path.open("w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"  wrote {path}")


def main():
    print(f"Loading sample from {DATA_PATH}...")
    sample = load_sample()
    print(f"Loaded {len(sample)} sentences.")

    for source, target in DIRECTIONS:
        print(f"\n=== {source} -> {target} ===")

        for provider_name, translate in PROVIDERS.items():
            print(f"{provider_name}...")
            results = run_provider(provider_name, sample, source, target, translate)
            write_results(results, source, target, provider_name)

    print("\nDone.")

if __name__ == "__main__":
    main()