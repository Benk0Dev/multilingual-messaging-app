# Translation evaluation

Two complementary evaluations of Amazon Translate, Google Cloud Translation NMT,
and Google Cloud Translation LLM. Results back the translation evaluation in
Chapter 5 of the project report.

## What this measures

### Benchmark

A quantitative comparison of all three providers using the FLORES-200 dataset.
100 sentences from the `devtest` split are translated by each provider in both
directions for three language pairs:

- English <-> Spanish (Latin script, Romance, low morphology)
- English <-> Russian (Cyrillic script, Slavic, high morphology)
- English <-> Hindi (Devanagari script, Indo-Aryan, distinct typology)

For each provider, the script reports chrF (primary metric) and BLEU
(secondary metric) computed via `sacrebleu`, plus mean translation latency.

### Case study

A qualitative comparison of all three providers on a hand-crafted corpus of
casual Lithuanian and English chat messages. Tests slang, idioms, informal
register, and other patterns that the formal-prose FLORES corpus does not
cover. Output is read by eye, not scored automatically.

## Setup

### 1. Python environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. FLORES-200 dataset (benchmark only)

Download and extract once into the `data/` directory:

```bash
mkdir -p data
cd data
curl -L https://tinyurl.com/flores200dataset -o flores200_dataset.tar.gz
tar -xzf flores200_dataset.tar.gz
rm flores200_dataset.tar.gz
cd ..
```

### 3. AWS authentication

If you haven't run `aws configure` before, do it now:

```bash
aws configure
```

### 4. Google authentication

If you haven't run `gcloud auth application-default login` before, do it now:

```bash
gcloud auth application-default login
```

### 5. Environment variables

```bash
export AWS_REGION=eu-west-2
export GOOGLE_CLOUD_PROJECT_ID=<your-google-cloud-project-id>
```

## Running

### Benchmark

```bash
# 1. Pick the 100-sentence sample (writes data/flores_sample.json)
python benchmark/select_sample.py

# 2. Run all three providers across all six directions
#    (writes results/benchmark/<source>-<target>-<provider>.json)
python benchmark/translate.py

# 3. Compute chrF and BLEU, print averages
#    (writes results/benchmark/scores.json and scores.csv)
python benchmark/evaluate.py
```

### Case study

```bash
# Translates a hand-crafted Lithuanian/English corpus across all three providers.
# Writes results/case_study/lt-en.json, en-lt.json, and output.txt.
python case_study/translate.py
```

## Output

### Benchmark

- `data/flores_sample.json`: the 100 source sentences in all four languages.
- `results/benchmark/<source>-<target>-<provider>.json`: raw translations from
  each provider per direction (18 files total).
- `results/benchmark/scores.json`: corpus-level chrF and BLEU scores per
  direction per provider, plus mean latency.
- `results/benchmark/scores.csv`: same data as `scores.json` in flat tabular form.
- A bullet-style summary of provider averages is printed to stdout.

### Case study

- `results/case_study/lt-en.json`: structured Lithuanian -> English translations
  from all three providers.
- `results/case_study/en-lt.json`: structured English -> Lithuanian translations
  from all three providers.
- `results/case_study/output.txt`: human-readable side-by-side comparison of
  all three providers per source message.

## Reproducibility notes

- The benchmark sentence sample is selected with a fixed random seed (42) so
  the same 100 sentences are picked on every run.
- FLORES-200 `devtest` is the standard reporting split used in machine
  translation papers (the `dev` split is conventionally used for tuning).
- chrF is the benchmark's primary metric. BLEU is reported alongside for
  cross-reference with older work in the field.
- The case study corpus is hard-coded inside `case_study/translate.py` to keep
  the experiment fully self-contained.