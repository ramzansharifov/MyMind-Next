from __future__ import annotations

import base64
import json
import re
import uuid
import zlib
from pathlib import Path

ROOT = Path('.')


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, value: str) -> None:
    (ROOT / path).write_text(value, encoding='utf-8')


def replace_once(value: str, old: str, new: str, label: str) -> str:
    count = value.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected one match, got {count}')
    return value.replace(old, new, 1)


# Shared contracts
path = 'src/shared/contracts/nutrition.ts'
value = read(path)
value = replace_once(
    value,
    "export interface UpdateNutritionFoodInput extends CreateNutritionFoodInput {\n  id: string\n}\n",
    "export interface CreateNutritionFoodsInput {\n  foods: CreateNutritionFoodInput[]\n}\n\nexport interface CreateNutritionFoodsResult {\n  created: NutritionFoodRecord[]\n  skippedNames: string[]\n}\n\nexport interface UpdateNutritionFoodInput extends CreateNutritionFoodInput {\n  id: string\n}\n",
    'nutrition contracts bulk types',
)
value = replace_once(
    value,
    "  createFood: 'nutrition:create-food',\n",
    "  createFood: 'nutrition:create-food',\n  createFoods: 'nutrition:create-foods',\n",
    'nutrition contracts bulk channel',
)
value = replace_once(
    value,
    "  createFood(input: CreateNutritionFoodInput): Promise<NutritionFoodRecord>\n",
    "  createFood(input: CreateNutritionFoodInput): Promise<NutritionFoodRecord>\n  createFoods(input: CreateNutritionFoodsInput): Promise<CreateNutritionFoodsResult>\n",
    'nutrition contracts bulk api',
)
write(path, value)

# Validation
path = 'src/shared/validation/nutrition.ts'
value = read(path)
value = replace_once(
    value,
    "export const createNutritionFoodInputSchema = foodPayloadSchema\n",
    "export const createNutritionFoodInputSchema = foodPayloadSchema\nexport const createNutritionFoodsInputSchema = z.object({\n  foods: z\n    .array(createNutritionFoodInputSchema)\n    .min(1, 'Добавьте хотя бы один продукт')\n    .max(300, 'За один раз можно добавить до 300 продуктов')\n})\n",
    'nutrition bulk validation',
)
write(path, value)

# Repository
path = 'src/main/repositories/nutrition.repository.ts'
value = read(path)
value = replace_once(
    value,
    "  CreateNutritionFoodInput,\n  CreateNutritionLogEntryInput,\n",
    "  CreateNutritionFoodInput,\n  CreateNutritionFoodsInput,\n  CreateNutritionFoodsResult,\n  CreateNutritionLogEntryInput,\n",
    'repository bulk imports',
)
pattern = re.compile(
    r"export function createNutritionFood\(input: CreateNutritionFoodInput\): NutritionFoodRecord \{.*?\n\}\n\n(?=export function updateNutritionFood)",
    re.S,
)
replacement = """function insertNutritionFood(input: CreateNutritionFoodInput): NutritionFoodRecord {
  const id = randomUUID()
  const now = Date.now()
  getSqlite()
    .prepare(
      `INSERT INTO nutrition_foods (
        id, name, brand, category, base_amount_milli, base_unit,
        calories_milli, protein_milli_g, fat_milli_g, carbs_milli_g, fiber_milli_g,
        sugar_milli_g, sodium_milli_mg, favorite, status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.name.trim(),
      input.brand.trim(),
      input.category,
      toMilli(input.baseAmount),
      input.baseUnit,
      ...nutrientColumns(input.nutrients),
      input.favorite ? 1 : 0,
      input.status,
      input.notes,
      now,
      now
    )
  return requireFood(id)
}

function normalizeFoodIdentity(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU')
}

function foodIdentityKey(input: Pick<CreateNutritionFoodInput, 'name' | 'brand'>): string {
  return `${normalizeFoodIdentity(input.name)}\u0000${normalizeFoodIdentity(input.brand)}`
}

export function createNutritionFood(input: CreateNutritionFoodInput): NutritionFoodRecord {
  return insertNutritionFood(input)
}

export function createNutritionFoods(input: CreateNutritionFoodsInput): CreateNutritionFoodsResult {
  const existingRows = getSqlite()
    .prepare('SELECT name, brand FROM nutrition_foods')
    .all() as Array<{ name: string; brand: string }>
  const seen = new Set(existingRows.map(foodIdentityKey))
  const pending: CreateNutritionFoodInput[] = []
  const skippedNames: string[] = []

  for (const food of input.foods) {
    const key = foodIdentityKey(food)
    if (seen.has(key)) {
      skippedNames.push(food.name.trim())
      continue
    }
    seen.add(key)
    pending.push(food)
  }

  const transaction = getSqlite().transaction((foods: CreateNutritionFoodInput[]) =>
    foods.map(insertNutritionFood)
  )

  return {
    created: transaction(pending),
    skippedNames
  }
}

"""
value, count = pattern.subn(replacement, value, count=1)
if count != 1:
    raise RuntimeError(f'repository create food replacement: expected one match, got {count}')
write(path, value)

# IPC
path = 'src/main/ipc/register-nutrition-ipc.ts'
value = read(path)
value = replace_once(
    value,
    "  createNutritionFoodInputSchema,\n",
    "  createNutritionFoodInputSchema,\n  createNutritionFoodsInputSchema,\n",
    'IPC bulk validation import',
)
value = replace_once(
    value,
    "  createNutritionFood,\n",
    "  createNutritionFood,\n  createNutritionFoods,\n",
    'IPC bulk repository import',
)
value = replace_once(
    value,
    "  ipcMain.handle(NUTRITION_IPC_CHANNELS.updateFood, (_event, rawInput: unknown) =>\n",
    "  ipcMain.handle(NUTRITION_IPC_CHANNELS.createFoods, (_event, rawInput: unknown) =>\n    mainOperationTracker.run(() =>\n      createNutritionFoods(createNutritionFoodsInputSchema.parse(rawInput))\n    )\n  )\n  ipcMain.handle(NUTRITION_IPC_CHANNELS.updateFood, (_event, rawInput: unknown) =>\n",
    'IPC bulk handler',
)
write(path, value)

# Renderer client
path = 'src/renderer/src/modules/nutrition/api/nutrition-client.ts'
value = read(path)
value = replace_once(
    value,
    "  CreateNutritionFoodInput,\n",
    "  CreateNutritionFoodInput,\n  CreateNutritionFoodsInput,\n",
    'nutrition client bulk type',
)
value = replace_once(
    value,
    "  createFood: (input: CreateNutritionFoodInput) => window.api.nutrition.createFood(input),\n",
    "  createFood: (input: CreateNutritionFoodInput) => window.api.nutrition.createFood(input),\n  createFoods: (input: CreateNutritionFoodsInput) => window.api.nutrition.createFoods(input),\n",
    'nutrition client bulk method',
)
write(path, value)

# Preload
path = 'src/preload/index.ts'
value = read(path)
value = replace_once(
    value,
    "    createFood: (input) => ipcRenderer.invoke(NUTRITION_IPC_CHANNELS.createFood, input),\n",
    "    createFood: (input) => ipcRenderer.invoke(NUTRITION_IPC_CHANNELS.createFood, input),\n    createFoods: (input) => ipcRenderer.invoke(NUTRITION_IPC_CHANNELS.createFoods, input),\n",
    'preload nutrition bulk method',
)
write(path, value)

# JSON parser/component separation
path = 'src/renderer/src/modules/nutrition/components/NutritionFoodJsonImportDialog.tsx'
value = read(path)
value = value.replace(
    "import { createNutritionFoodInputSchema } from '../../../../../shared/validation/nutrition'\n",
    '',
)
value = replace_once(
    value,
    "import { AppDialog } from '../../../shared/ui/AppDialog'\n",
    "import { AppDialog } from '../../../shared/ui/AppDialog'\nimport { NUTRITION_FOODS_JSON_EXAMPLE, parseNutritionFoodsJson } from '../nutrition-food-json'\n",
    'JSON dialog parser import',
)
start = value.find('interface ParseResult {')
end = value.find('export function NutritionFoodJsonImportDialog')
if start < 0 or end < 0 or end <= start:
    raise RuntimeError('JSON dialog parser block not found')
value = value[:start] + value[end:]
value = value.replace('setValue(EXAMPLE_JSON)', 'setValue(NUTRITION_FOODS_JSON_EXAMPLE)')
write(path, value)

path = 'src/renderer/src/modules/nutrition/components/NutritionFoodJsonImportDialog.test.tsx'
value = read(path)
value = value.replace(
    "import { parseNutritionFoodsJson } from './NutritionFoodJsonImportDialog'",
    "import { parseNutritionFoodsJson } from '../nutrition-food-json'",
)
write(path, value)

# Nutrition page
path = 'src/renderer/src/modules/nutrition/NutritionPage.tsx'
value = read(path)
value = replace_once(value, '  BarChart3,\n', '  BarChart3,\n  Braces,\n', 'page Braces icon')
value = replace_once(
    value,
    "  CreateNutritionFoodInput,\n",
    "  CreateNutritionFoodInput,\n  CreateNutritionFoodsResult,\n",
    'page bulk result type',
)
value = replace_once(
    value,
    "import { NutritionFoodDialog } from './components/NutritionFoodDialog'\n",
    "import { NutritionFoodDialog } from './components/NutritionFoodDialog'\nimport { NutritionFoodJsonImportDialog } from './components/NutritionFoodJsonImportDialog'\n",
    'page JSON dialog import',
)
value = replace_once(
    value,
    "  const [foodDialogOpen, setFoodDialogOpen] = useState(false)\n",
    "  const [foodDialogOpen, setFoodDialogOpen] = useState(false)\n  const [foodJsonDialogOpen, setFoodJsonDialogOpen] = useState(false)\n",
    'page JSON dialog state',
)
value = replace_once(
    value,
    "  const [error, setError] = useState<string | null>(null)\n",
    "  const [error, setError] = useState<string | null>(null)\n  const [importNotice, setImportNotice] = useState<string | null>(null)\n",
    'page import notice state',
)
marker = """  async function saveRecipe(
    input: CreateNutritionRecipeInput | UpdateNutritionRecipeInput
  ): Promise<void> {
"""
import_function = """  async function importFoods(
    foodsToImport: CreateNutritionFoodInput[]
  ): Promise<CreateNutritionFoodsResult> {
    setIsBusy(true)
    setError(null)
    setImportNotice(null)
    try {
      const result = await nutritionClient.createFoods({ foods: foodsToImport })
      await loadOverview()
      setImportNotice(
        result.skippedNames.length > 0
          ? `Добавлено: ${result.created.length}. Пропущено дубликатов: ${result.skippedNames.length}.`
          : `Добавлено продуктов: ${result.created.length}.`
      )
      return result
    } catch (reason) {
      setError(nutritionErrorMessage(reason))
      throw reason
    } finally {
      setIsBusy(false)
    }
  }

"""
value = replace_once(value, marker, import_function + marker, 'page import function')
old_header = """    tab === 'foods' ? (
      <PrimaryAction
        onClick={() => {
          setEditingFood(null)
          setFoodDialogOpen(true)
        }}
      >
        <Plus className=\"size-4\" /> Добавить продукт
      </PrimaryAction>
    ) : tab === 'recipes' ? (
"""
new_header = """    tab === 'foods' ? (
      <div className=\"flex items-center gap-2\">
        <button
          type=\"button\"
          className=\"inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]\"
          onClick={() => setFoodJsonDialogOpen(true)}
        >
          <Braces className=\"size-4\" /> Из JSON
        </button>
        <PrimaryAction
          onClick={() => {
            setEditingFood(null)
            setFoodDialogOpen(true)
          }}
        >
          <Plus className=\"size-4\" /> Добавить продукт
        </PrimaryAction>
      </div>
    ) : tab === 'recipes' ? (
"""
value = replace_once(value, old_header, new_header, 'page foods header actions')
value = replace_once(
    value,
    "      {tab === 'diary' && (\n",
    """      {importNotice && (
        <div
          role=\"status\"
          className=\"mt-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300\"
        >
          <span>{importNotice}</span>
          <button
            type=\"button\"
            aria-label=\"Закрыть сообщение об импорте\"
            className=\"flex size-7 items-center justify-center rounded-lg hover:bg-emerald-500/10\"
            onClick={() => setImportNotice(null)}
          >
            <X className=\"size-4\" />
          </button>
        </div>
      )}

      {tab === 'diary' && (
""",
    'page import notice render',
)
value = replace_once(
    value,
    "      <NutritionFoodDialog\n",
    """      <NutritionFoodJsonImportDialog
        open={foodJsonDialogOpen}
        busy={isBusy}
        onOpenChange={setFoodJsonDialogOpen}
        onImport={importFoods}
      />

      <NutritionFoodDialog
""",
    'page JSON dialog render',
)
write(path, value)

# Nutrition page tests
path = 'src/renderer/src/modules/nutrition/NutritionPage.test.tsx'
value = read(path)
value = value.replace(
    "import { render, screen, waitFor } from '@testing-library/react'",
    "import { render, screen, waitFor, within } from '@testing-library/react'",
)
value = replace_once(
    value,
    "  createFood: vi.fn(),\n",
    "  createFood: vi.fn(),\n  createFoods: vi.fn(),\n",
    'page test bulk mock',
)
value = replace_once(
    value,
    "  mocks.listOverview.mockResolvedValue(overview())\n",
    "  mocks.listOverview.mockResolvedValue(overview())\n  mocks.createFoods.mockResolvedValue({ created: [chicken], skippedNames: [] })\n",
    'page test bulk mock result',
)
insert_before = """  it('updates water for the currently selected day', async () => {
"""
new_test = """  it('imports a list of foods from JSON', async () => {
    const user = userEvent.setup()
    render(<NutritionPage />)

    await screen.findByRole('heading', { name: 'Питание' })
    await user.click(screen.getByRole('button', { name: 'Продукты' }))
    await user.click(screen.getByRole('button', { name: 'Из JSON' }))

    const dialog = screen.getByRole('dialog')
    const textarea = within(dialog).getByRole('textbox', { name: 'JSON продуктов' })
    await user.click(textarea)
    await user.paste(
      '[{"name":"Картофель","category":"vegetables","calories":77,"proteinG":2,"fatG":0.1,"carbsG":17.5}]'
    )
    await user.click(within(dialog).getByRole('button', { name: 'Добавить' }))

    await waitFor(() => {
      expect(mocks.createFoods).toHaveBeenCalledWith({
        foods: [
          {
            name: 'Картофель',
            brand: '',
            category: 'vegetables',
            baseAmount: 100,
            baseUnit: 'g',
            nutrients: {
              calories: 77,
              proteinG: 2,
              fatG: 0.1,
              carbsG: 17.5,
              fiberG: 0,
              sugarG: 0,
              sodiumMg: 0
            },
            favorite: false,
            status: 'active',
            notes: ''
          }
        ]
      })
    })
    expect(screen.getByRole('status')).toHaveTextContent('Добавлено продуктов: 1')
  })

"""
value = replace_once(value, insert_before, new_test + insert_before, 'page JSON import test')
write(path, value)

# Repository tests
path = 'src/main/repositories/nutrition.repository.test.ts'
value = read(path)
value = replace_once(
    value,
    "  createNutritionFood,\n",
    "  createNutritionFood,\n  createNutritionFoods,\n",
    'repository test bulk import',
)
insert_before = """  it('keeps historical nutrient snapshots after a food is edited', () => {
"""
new_test = """  it('bulk creates products transactionally and skips exact catalog duplicates', () => {
    createChicken()
    const apple = {
      name: 'Яблоко',
      brand: '',
      category: 'fruits' as const,
      baseAmount: 100,
      baseUnit: 'g' as const,
      nutrients: {
        calories: 52,
        proteinG: 0.3,
        fatG: 0.2,
        carbsG: 13.8,
        fiberG: 2.4,
        sugarG: 10.4,
        sodiumMg: 1
      },
      favorite: false,
      status: 'active' as const,
      notes: ''
    }

    const result = createNutritionFoods({
      foods: [
        {
          name: 'Куриная грудка',
          brand: '',
          category: 'protein',
          baseAmount: 100,
          baseUnit: 'g',
          nutrients: {
            calories: 165,
            proteinG: 31,
            fatG: 3.6,
            carbsG: 0,
            fiberG: 0,
            sugarG: 0,
            sodiumMg: 74
          },
          favorite: false,
          status: 'active',
          notes: ''
        },
        apple,
        apple
      ]
    })

    expect(result.created.map((food) => food.name)).toEqual(['Яблоко'])
    expect(result.skippedNames).toEqual(['Куриная грудка', 'Яблоко'])
    expect(listNutritionOverview('2026-08-17').foods.map((food) => food.name)).toEqual([
      'Куриная грудка',
      'Яблоко'
    ])
  })

"""
value = replace_once(value, insert_before, new_test + insert_before, 'repository bulk test')
write(path, value)

# Default catalog data migration
B64 = "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"
items = json.loads(zlib.decompress(base64.b64decode(B64)))
if len(items) != 211:
    raise RuntimeError(f'Expected 211 default foods, got {len(items)}')

namespace = uuid.UUID('12345678-1234-5678-1234-567812345678')
note = 'Справочное среднее значение; фактическая пищевая ценность зависит от сорта, бренда и способа приготовления.'


def sql_text(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"

rows: list[str] = []
for item in items:
    name, category, unit, calories, protein, fat, carbs, fiber, sugar, sodium = item
    food_id = str(uuid.uuid5(namespace, 'mymind:nutrition-default:' + name))
    nums = [calories, protein, fat, carbs, fiber, sugar, sodium]
    millis = [str(round(float(number) * 1000)) for number in nums]
    rows.append(
        '(' + ', '.join([
            sql_text(food_id),
            sql_text(name),
            "''",
            sql_text(category),
            '100000',
            sql_text(unit),
            *millis,
            sql_text(note),
        ]) + ')'
    )

migration = """WITH default_foods (
  id, name, brand, category, base_amount_milli, base_unit,
  calories_milli, protein_milli_g, fat_milli_g, carbs_milli_g,
  fiber_milli_g, sugar_milli_g, sodium_milli_mg, notes
) AS (
  VALUES
""" + ',\n'.join('    ' + row for row in rows) + """
)
INSERT INTO nutrition_foods (
  id, name, brand, category, base_amount_milli, base_unit,
  calories_milli, protein_milli_g, fat_milli_g, carbs_milli_g,
  fiber_milli_g, sugar_milli_g, sodium_milli_mg,
  favorite, status, notes, created_at, updated_at
)
SELECT
  d.id, d.name, d.brand, d.category, d.base_amount_milli, d.base_unit,
  d.calories_milli, d.protein_milli_g, d.fat_milli_g, d.carbs_milli_g,
  d.fiber_milli_g, d.sugar_milli_g, d.sodium_milli_mg,
  0, 'active', d.notes, 1787668200000, 1787668200000
FROM default_foods d
WHERE NOT EXISTS (
  SELECT 1
  FROM nutrition_foods existing
  WHERE existing.name = d.name COLLATE NOCASE
    AND existing.brand = d.brand COLLATE NOCASE
);
"""
write('drizzle/0035_nutrition_default_food_catalog.sql', migration)

# Journal entry for data migration
path = 'drizzle/meta/_journal.json'
journal = json.loads(read(path))
tag = '0035_nutrition_default_food_catalog'
if not any(entry.get('tag') == tag for entry in journal['entries']):
    journal['entries'].append({
        'idx': 35,
        'version': '6',
        'when': 1787668200000,
        'tag': tag,
        'breakpoints': True,
    })
write(path, json.dumps(journal, ensure_ascii=False, indent=2) + '\n')

print(f'Patched nutrition catalog and generated {len(items)} default foods')
