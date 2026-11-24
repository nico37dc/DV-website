# Mapping the Impact of AI through Data

**AI at Work in Europe: how enterprises adopt artificial intelligence**

Website for the course Data Visualization (Università degli Studi di Genova, 2026/27).

- Author: Nico Durst-Claus (10377380)
- Live site: https://nico37dc.github.io/DV-website/

## Content

1. **Project**: introduction, guiding question and data sources.
2. **AI adoption in European enterprises**: six D3.js charts
   - bar chart: AI use per EU country (2025)
   - grouped bar chart: AI use by enterprise size for selected countries (2025)
   - heatmap: AI use per country and year (2021–2025)
   - 100% stacked bar chart: number of AI technologies used, by size class (EU, 2025)
   - waffle charts: out of 100 EU enterprises, how many use AI (all vs. large, 2025)
   - dumbbell plot (extra): change between 2021 and 2025 per country

## Data

Eurostat, [Artificial intelligence by size class of enterprise (isoc_eb_ai)](https://ec.europa.eu/eurostat/databrowser/view/isoc_eb_ai/default/table?lang=en),
downloaded via the Eurostat SDMX 3.0 API in November 2026.

- `data/raw/isoc_eb_ai.csv`: full raw download
- `data/ai_adoption.csv`: indicator `E_AI_TANY` (enterprises using at least one AI technology), unit `PC_ENT`, EU-27 countries + `EU27_2020`, size classes `10-49`, `50-249`, `GE250`, `GE10`, years 2021, 2023, 2024, 2025
- `data/ai_intensity.csv`: EU-27, 2025, enterprises split into using 0 / 1 / 2 / 3+ AI technologies (derived from `E_AI_TANY`, `E_AI_TGE2`, `E_AI_TGE3`)

To rebuild the processed files (Python 3, standard library only):

```bash
python3 scripts/prepare_data.py             # from data/raw/isoc_eb_ai.csv
python3 scripts/prepare_data.py --download  # download a fresh copy first
```

## Structure

- `index.html`: main page
- `css/style.css`: all styles
- `js/charts.js`: all charts (D3.js v7 from jsDelivr)
- `data/`: processed datasets used by the charts
- `scripts/`: data preparation

## Run locally

The charts load CSV files, so the page must be served (opening `index.html`
directly from disk does not work):

```bash
python3 -m http.server
# then open http://localhost:8000
```
