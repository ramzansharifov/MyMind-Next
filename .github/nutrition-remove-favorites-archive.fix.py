from pathlib import Path

path = Path('.github/nutrition-remove-favorites-archive.patch.py')
text = path.read_text(encoding='utf-8')

old_validation = "replace(path, \"  favorite: z.boolean(),\\n  status: z.enum(NUTRITION_ENTITY_STATUSES),\\n\", '', 2)"
new_validation = "replace(path, \"  favorite: z.boolean(),\\n  status: z.enum(NUTRITION_ENTITY_STATUSES),\\n\", '')\nreplace(path, \"    favorite: z.boolean(),\\n    status: z.enum(NUTRITION_ENTITY_STATUSES),\\n\", '')"
if old_validation not in text:
    raise SystemExit('validation replacement anchor not found in patch script')
text = text.replace(old_validation, new_validation, 1)

favorite_status_call = "replace(path, \"      input.favorite ? 1 : 0,\\n      input.status,\\n\", '', 1)"
if text.count(favorite_status_call) != 4:
    raise SystemExit(f'expected four repository favorite/status calls, got {text.count(favorite_status_call)}')
text = text.replace(
    favorite_status_call,
    "replace(path, \"      input.favorite ? 1 : 0,\\n      input.status,\\n\", '', 4)",
    1,
)
text = text.replace(favorite_status_call, '', 3)

path.write_text(text, encoding='utf-8')
