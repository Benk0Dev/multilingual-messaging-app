"""
Translates a small sample of Lithuanian and English chat-style messages
across all three providers.

Output:
- results/case_study/lt-en.json: structured Lithuanian -> English results
- results/case_study/en-lt.json: structured English -> Lithuanian results
- results/case_study/output.txt: human-readable side-by-side comparison

Reads no input files. The corpora are hard-coded below.

See README.md for setup instructions.
"""

import json
import sys
import time
from pathlib import Path

# Allow importing providers.py from the parent evaluation/ folder
sys.path.insert(0, str(Path(__file__).parent.parent))
from providers import translate_amazon, translate_google_nmt, translate_google_llm

RESULTS_DIR = Path(__file__).parent.parent / "results" / "case_study"

PROVIDERS = {
    "amazon": translate_amazon,
    "google-nmt": translate_google_nmt,
    "google-llm": translate_google_llm,
}

# Lithuanian -> English: casual chat messages
LT_TO_EN = [
    # Basic greeting
    "Labas",

    # Casual conversational question
    "Labas, kaip laikaisi?",

    # Frustrated everyday complaint about construction work
    "Man atsibodo tie statybininkai ir netvarka, dulkes",

    # Continuation of frustrated complaint
    "Negaliu sulaukti kada jie viska baigs ir dings is cia",

    # Casual invitation
    "Einam vakare i kina?",

    # Common day-to-day question
    "Kaip praejo diena?",

    # Slang phrasing for "what's up"
    "Ka veiki?",

    # Casual recommendation, slang "sauni vieta"
    "Cia tikrai sauni vieta, turim dar kart ateit",

    # Self-deprecating, casual
    "Nezinau ka daryt, viska sugadinau",

    # Common deferral
    "Pasikalbam veliau, dabar uzsiemus esu",

    # Slang intensifier "ziauriai"
    "Tu man labai patinki, ziauriai",

    # Casual complaint about weather
    "Siandien toks bjaurus oras, net i lauka neinasi",

    # Casual reaction
    "Cia juokingiausias dalykas kuri per visa savaite maciau",

    # Soft pushback in conversation
    "Nemanau kad tai gera mintis",

    # Casual food invite
    "Ar jau valgei? Gal uzsisakom pica",

    # Casual birthday greeting with slang "seni" (mate/dude)
    "Sveikinu su gimtadieniu, seni!",
]

# English -> Lithuanian: equivalent casual chat messages
EN_TO_LT = [
    # Basic greeting
    "hello",

    # Casual invitation
    "hey wanna grab dinner tonight?",

    # Frustrated everyday complaint about construction work
    "i'm so tired of these construction workers, honestly",

    # Continuation of frustrated complaint
    "can't wait for them to finish and leave",

    # Common casual question
    "what are you up to?",

    # Common day-to-day question
    "how was your day?",

    # Slang "sick" meaning good - tests slang/idiom handling
    "that place was sick, we need to go back",

    # Slang "idk man" - tests informal abbreviations
    "idk man i really messed up",

    # Slang "rn" (right now) - tests informal abbreviations
    "let's chat later, bit busy rn",

    # Casual emphatic
    "i really like you, a lot",

    # Casual complaint about weather
    "weather's absolutely miserable today",

    # Casual reaction
    "this is the funniest thing i've seen all week",

    # Slang "tbh" (to be honest) - tests informal abbreviations
    "not sure that's a great idea tbh",

    # Casual food invite
    "have you eaten? should we order pizza",

    # Casual birthday greeting with slang "mate"
    "happy birthday mate!",
]


def translate_one(text, source, target):
    """
    Returns {provider_name: {text, latency_ms}} for one source message
    across all three providers.
    """
    results = {}
    for provider_name, translate in PROVIDERS.items():
        start = time.time()
        try:
            translated = translate(text, source, target)
        except Exception as e:
            print(f"  {provider_name} FAILED: {e}")
            translated = ""
        latency_ms = int((time.time() - start) * 1000)
        results[provider_name] = {"text": translated, "latency_ms": latency_ms}
    return results


def run_direction(corpus, source, target):
    """
    Returns a list of {source, translations: {provider: {text, latency_ms}}}
    for every message in the corpus.
    """
    entries = []
    for i, message in enumerate(corpus, 1):
        print(f"  [{i}/{len(corpus)}] {message[:50]}...")
        translations = translate_one(message, source, target)
        entries.append({"source": message, "translations": translations})
    return entries


def write_json(entries, source, target):
    path = RESULTS_DIR / f"{source}-{target}.json"
    with path.open("w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)
    print(f"Wrote {path}")


def write_output_txt(lt_to_en_entries, en_to_lt_entries):
    path = RESULTS_DIR / "output.txt"
    lines = []

    lines.append("=" * 80)
    lines.append("LITHUANIAN -> ENGLISH")
    lines.append("=" * 80)
    lines.append("")
    for entry in lt_to_en_entries:
        lines.append(f"Source: {entry['source']}")
        for provider_name, result in entry["translations"].items():
            label = provider_name.ljust(10)
            latency = f"{result['latency_ms']:>4}ms"
            lines.append(f"  {label} ({latency}): {result['text']}")
        lines.append("")

    lines.append("=" * 80)
    lines.append("ENGLISH -> LITHUANIAN")
    lines.append("=" * 80)
    lines.append("")
    for entry in en_to_lt_entries:
        lines.append(f"Source: {entry['source']}")
        for provider_name, result in entry["translations"].items():
            label = provider_name.ljust(10)
            latency = f"{result['latency_ms']:>4}ms"
            lines.append(f"  {label} ({latency}): {result['text']}")
        lines.append("")

    with path.open("w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"Wrote {path}")


def main():
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    print("Lithuanian -> English")
    lt_to_en_entries = run_direction(LT_TO_EN, "lt", "en")
    write_json(lt_to_en_entries, "lt", "en")

    print("\nEnglish -> Lithuanian")
    en_to_lt_entries = run_direction(EN_TO_LT, "en", "lt")
    write_json(en_to_lt_entries, "en", "lt")

    print("")
    write_output_txt(lt_to_en_entries, en_to_lt_entries)

    print("\nDone.")


if __name__ == "__main__":
    main()