from pathlib import Path

schema = Path('src/main/database/schema/nutrition.ts')
text = schema.read_text(encoding='utf-8')
old_import = "import type {\n  NutritionEntityStatus,\n  NutritionFoodCategory,\n  NutritionLogSourceType,\n  NutritionMealType,\n  NutritionUnit\n} from '../../../shared/contracts/nutrition'\n"
new_import = "import type {\n  NutritionFoodCategory,\n  NutritionLogSourceType,\n  NutritionMealType,\n  NutritionUnit\n} from '../../../shared/contracts/nutrition'\n\ntype LegacyNutritionEntityStatus = 'active' | 'archived'\n"
if text.count(old_import) != 1:
    raise SystemExit('nutrition schema import anchor not found')
text = text.replace(old_import, new_import, 1)
if text.count('$type<NutritionEntityStatus>()') != 2:
    raise SystemExit('expected two legacy nutrition status columns')
text = text.replace('$type<NutritionEntityStatus>()', '$type<LegacyNutritionEntityStatus>()')
schema.write_text(text, encoding='utf-8')

repo_test = Path('src/main/repositories/nutrition.repository.test.ts')
text = repo_test.read_text(encoding='utf-8')
legacy_fixture = "          favorite: false,\n          status: 'active',\n"
if text.count(legacy_fixture) != 1:
    raise SystemExit(f'expected one remaining favorite/status fixture, got {text.count(legacy_fixture)}')
repo_test.write_text(text.replace(legacy_fixture, '', 1), encoding='utf-8')

print('Separated legacy DB status typing and cleaned final test fixture')
