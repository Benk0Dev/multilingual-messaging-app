"""
Computes chrF and BLEU scores for each provider and direction, using the
JSON files produced by translate.py.

Outputs:
- results/scores.json: structured scores keyed by direction and provider
- results/scores.csv: flat tabular scores, one row per (direction, provider)
- prints per-provider averages across all directions to stdout
"""

import csv
import json
from pathlib import Path
from statistics import mean

from sacrebleu.metrics import BLEU, CHRF

RESULTS_DIR = Path(__file__).parent.parent / "results" / "benchmark"
SCORES_JSON_PATH = RESULTS_DIR / "scores.json"
SCORES_CSV_PATH = RESULTS_DIR / "scores.csv"

DIRECTIONS = [
    ("en", "es"),
    ("es", "en"),
    ("en", "ru"),
    ("ru", "en"),
    ("en", "hi"),
    ("hi", "en"),
]

PROVIDERS = ["amazon", "google-nmt", "google-llm"]

PROVIDER_LABELS = {
    "amazon": "Amazon Translate",
    "google-nmt": "Google NMT",
    "google-llm": "Google LLM",
}


def load_results(source, target, provider):
    path = RESULTS_DIR / f"{source}-{target}-{provider}.json"
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def score_direction(source, target):
    """
    Returns scores for all providers in this direction:
    {provider: {chrf, bleu, mean_latency_ms}}
    """
    bleu = BLEU()
    chrf = CHRF()

    scores = {}
    for provider in PROVIDERS:
        rows = load_results(source, target, provider)
        hypotheses = [row["hypothesis"] for row in rows]
        references = [row["reference"] for row in rows]
        latencies = [row["latency_ms"] for row in rows]

        bleu_score = bleu.corpus_score(hypotheses, [references]).score
        chrf_score = chrf.corpus_score(hypotheses, [references]).score

        scores[provider] = {
            "chrf": round(chrf_score, 2),
            "bleu": round(bleu_score, 2),
            "mean_latency_ms": round(mean(latencies), 1),
        }

    return scores


def write_csv(all_scores):
    with SCORES_CSV_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["direction", "provider", "chrf", "bleu", "mean_latency_ms"])
        for source, target in DIRECTIONS:
            key = f"{source}-{target}"
            for provider in PROVIDERS:
                scores = all_scores[key][provider]
                writer.writerow([
                    f"{source.upper()}->{target.upper()}",
                    PROVIDER_LABELS[provider],
                    scores["chrf"],
                    scores["bleu"],
                    scores["mean_latency_ms"],
                ])


def print_averages(all_scores):
    print()
    print("Average scores across all directions:")
    print()
    print(f"  {'Provider':<20} {'chrF':>8} {'BLEU':>8} {'Latency (ms)':>15}")
    print(f"  {'-' * 20} {'-' * 8} {'-' * 8} {'-' * 15}")

    for provider in PROVIDERS:
        chrf_values = [all_scores[f"{source}-{target}"][provider]["chrf"] for source, target in DIRECTIONS]
        bleu_values = [all_scores[f"{source}-{target}"][provider]["bleu"] for source, target in DIRECTIONS]
        latency_values = [all_scores[f"{source}-{target}"][provider]["mean_latency_ms"] for source, target in DIRECTIONS]

        average_chrf = round(mean(chrf_values), 2)
        average_bleu = round(mean(bleu_values), 2)
        average_latency = round(mean(latency_values), 1)

        print(f"  {PROVIDER_LABELS[provider]:<20} {average_chrf:>8.2f} {average_bleu:>8.2f} {average_latency:>15.1f}")
    print()


def main():
    all_scores = {}
    for source, target in DIRECTIONS:
        print(f"Scoring {source}->{target}...")
        all_scores[f"{source}-{target}"] = score_direction(source, target)

    SCORES_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with SCORES_JSON_PATH.open("w", encoding="utf-8") as f:
        json.dump(all_scores, f, ensure_ascii=False, indent=2)
    print(f"\nWrote scores to {SCORES_JSON_PATH}")

    write_csv(all_scores)
    print(f"Wrote scores to {SCORES_CSV_PATH}")

    print_averages(all_scores)


if __name__ == "__main__":
    main()