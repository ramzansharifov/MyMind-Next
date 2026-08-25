from pathlib import Path

path = Path('.github/nutrition-remove-favorites-archive.patch.py')
text = path.read_text(encoding='utf-8')
old = "replace(path, \"  favorite: z.boolean(),\\n  status: z.enum(NUTRITION_ENTITY_STATUSES),\\n\", '', 2)"
new = "replace(path, \"  favorite: z.boolean(),\\n  status: z.enum(NUTRITION_ENTITY_STATUSES),\\n\", '')\nreplace(path, \"    favorite: z.boolean(),\\n    status: z.enum(NUTRITION_ENTITY_STATUSES),\\n\", '')"
if old not in text:
    raise SystemExit('validation replacement anchor not found in patch script')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
