"""
Shared translation client logic for both the FLORES benchmark and the
Lithuanian-English case study.

See README.md for full setup instructions.
"""

import os

import boto3
from google.cloud import translate_v3 as google_translate

AWS_REGION = os.environ.get("AWS_REGION")
GOOGLE_PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT_ID")
GOOGLE_LOCATION = "us-central1" # Translation LLM is hosted here

amazon_client = boto3.client("translate", region_name=AWS_REGION)
google_client = google_translate.TranslationServiceClient()

def translate_amazon(text, source, target):
    response = amazon_client.translate_text(
        Text=text,
        SourceLanguageCode=source,
        TargetLanguageCode=target,
    )
    return response["TranslatedText"]

def translate_google_nmt(text, source, target):
    parent = f"projects/{GOOGLE_PROJECT}/locations/{GOOGLE_LOCATION}"
    model_path = f"{parent}/models/general/nmt"

    response = google_client.translate_text(
        contents=[text],
        source_language_code=source,
        target_language_code=target,
        parent=parent,
        model=model_path,
        mime_type="text/plain",
    )
    return response.translations[0].translated_text


def translate_google_llm(text, source, target):
    parent = f"projects/{GOOGLE_PROJECT}/locations/{GOOGLE_LOCATION}"
    model_path = f"{parent}/models/general/translation-llm"

    response = google_client.translate_text(
        contents=[text],
        source_language_code=source,
        target_language_code=target,
        parent=parent,
        model=model_path,
        mime_type="text/plain",
    )
    return response.translations[0].translated_text