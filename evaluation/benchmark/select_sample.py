"""
Selects 100 random sentences from the FLORES-200 devtest split for the
EN/ES/RU/HI language pairs. Uses a fixed random seed so the sample is
reproducible across runs.

Reads the FLORES dataset directly from extracted text files. The dataset
must be extracted to data/flores200_dataset/ before running this script
(see README.md for setup instructions).

Output: data/flores_sample.json with the same 100 sentences in all four
languages, each entry containing aligned text for EN, ES, RU, HI.
"""

import json
import random
from pathlib import Path

SEED = 42
SAMPLE_SIZE = 100
SPLIT = "devtest"
LANGS = {
    "en": "eng_Latn",
    "es": "spa_Latn",
    "ru": "rus_Cyrl",
    "hi": "hin_Deva",
}

DATA_DIR = Path(__file__).parent.parent / "data"
FLORES_DIR = DATA_DIR / "flores200_dataset" / SPLIT
OUT_PATH = DATA_DIR / "flores_sample.json"


def load_sentences(flores_code: str) -> list[str]:
    path = FLORES_DIR / f"{flores_code}.{SPLIT}"
    if not path.exists():
        raise FileNotFoundError(
            f"Could not find {path}. "
            f"Make sure FLORES-200 is extracted to {FLORES_DIR.parent}. "
            f"See README.md for setup instructions."
        )
    with path.open(encoding="utf-8") as f:
        return [line.rstrip("\n") for line in f]


def main():
    print(f"Loading FLORES-200 {SPLIT} split for {len(LANGS)} languages...")
    sentences_by_lang = {short: load_sentences(code) for short, code in LANGS.items()}

    total_sentences = len(sentences_by_lang["en"])
    print(f"Found {total_sentences} sentences per language.")

    # Sanity check: all languages have the same number of sentences
    for short, sentences in sentences_by_lang.items():
        if len(sentences) != total_sentences:
            raise RuntimeError(
                f"Sentence count mismatch: {short} has {len(sentences)} but expected {total_sentences}."
            )

    random.seed(SEED)
    indices = sorted(random.sample(range(total_sentences), SAMPLE_SIZE))
    print(f"Selected {SAMPLE_SIZE} indices using seed={SEED}.")

    sample = []
    for index in indices:
        entry = {"index": index}
        for short, sentences in sentences_by_lang.items():
            entry[short] = sentences[index]
        sample.append(entry)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w", encoding="utf-8") as f:
        json.dump(sample, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(sample)} entries to {OUT_PATH}")


if __name__ == "__main__":
    main()