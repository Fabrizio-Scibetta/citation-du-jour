#!/usr/bin/env python3
"""Regénère widgets/widget-data.json avec la citation du jour.

Ce script est exécuté chaque matin par GitHub Actions (voir
.github/workflows/widget-quotidien.yml) pour que le widget Windows 11
affiche toujours la citation du jour, sans serveur à maintenir.

Il peut aussi être lancé à la main :
    python tools/update_widget.py

L'URL de l'application est lue dans la variable d'environnement
APP_BASE_URL (ex. https://pseudo.github.io/citation-du-jour).
"""
import datetime
import json
import os
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE_URL = os.environ.get("APP_BASE_URL", "https://VOTRE-PSEUDO.github.io/citation-du-jour").rstrip("/")


def main() -> int:
    data = json.loads((ROOT / "data" / "calendrier.json").read_text(encoding="utf-8"))
    today = datetime.date.today().isoformat()
    row = next((r for r in data if r["date"] == today), None)
    if row is None:
        # Hors période du calendrier : on garde le premier jour plutôt que rien.
        row = data[0]

    source = row.get("source") or ""
    if source.startswith("Attribuée") or source in ("Tradition orale", "Attribution traditionnelle"):
        source = ""

    date_label = row["jour_date"]
    date_label = date_label[0].upper() + date_label[1:]

    out = {
        "citation": row["citation"],
        "auteur": row["auteur"],
        "source": source,
        "dateLabel": date_label,
        "shareUrl": f"{BASE_URL}/?date={row['date']}",
    }

    target = ROOT / "widgets" / "widget-data.json"
    target.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"widget-data.json : {row['date']} — {row['auteur']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
