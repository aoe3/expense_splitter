# Expense Splitter

CLI prototype for turning receipt text/images into structured expense rows, then calculating who owes whom.

## Project layout

```txt
src/
  receipt_parser.ts        # data/input/receipt.txt -> data/generated/parsed_items.json or receipt_summary.json
  expense_builder.ts       # parsed/summary JSON -> data/generated/expenses.csv
  invoice_creator.ts       # data/generated/expenses.csv -> who owes whom

scripts/
  ocr/image_to_receipt_txt.py       # image -> data/input/receipt.txt, with OCR debug output
  dataset/sroie_to_receipt_txt.py   # SROIE box OCR -> data/input/receipt.txt
  dev/inspect_training_data.py      # inspect local SROIE folder
  dev/preview_receipts.py           # preview a SROIE sample

data/
  input/                 # runtime receipt input lives here
  generated/             # runtime generated files live here
  examples/              # committed example receipt text

tests/
  run_tests.py
  fixtures/
```

## Setup

From the project root:

```bash
npm install
source .venv/bin/activate  # if you use the existing Python virtual environment
pip install -r requirements.txt
```

Tesseract must also be installed locally for image OCR:

```bash
brew install tesseract
```

## Common commands

### Parse an example text receipt

```bash
cp data/examples/receipt_restaurant.txt data/input/receipt.txt
npm run parse
```

### OCR an image, then parse it

```bash
python scripts/ocr/image_to_receipt_txt.py path/to/receipt.jpg
npm run parse
```

### Use a SROIE dataset OCR file, then parse it

```bash
python scripts/dataset/sroie_to_receipt_txt.py X51006555072
open training/sroie/SROIE2019/train/img/X51006555072.jpg
npm run parse
```

### Build expenses and calculate balances

```bash
npm run build-expenses
npm run invoice
```

### Run tests

```bash
npm test
```
