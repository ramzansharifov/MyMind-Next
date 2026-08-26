from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'{label} anchor not found')
    file_path.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'src/preload/index.ts',
    "    createLogEntry: (input) => ipcRenderer.invoke(NUTRITION_IPC_CHANNELS.createLogEntry, input),\n    updateLogEntry: (input) => ipcRenderer.invoke(NUTRITION_IPC_CHANNELS.updateLogEntry, input),",
    "    createLogEntry: (input) => ipcRenderer.invoke(NUTRITION_IPC_CHANNELS.createLogEntry, input),\n    importMeals: (input) => ipcRenderer.invoke(NUTRITION_IPC_CHANNELS.importMeals, input),\n    updateLogEntry: (input) => ipcRenderer.invoke(NUTRITION_IPC_CHANNELS.updateLogEntry, input),",
    'preload nutrition'
)

preload_test_path = Path('src/preload/index.test.ts')
preload_test = preload_test_path.read_text(encoding='utf-8')
key_anchor = "      'deleteProgressPhoto',\n      'getReport'\n    ])\n    expect(Object.keys(api.finance)).toEqual(["
key_replacement = "      'deleteProgressPhoto',\n      'getReport'\n    ])\n    expect(Object.keys(api.nutrition)).toEqual([\n      'listOverview',\n      'createFood',\n      'createFoods',\n      'updateFood',\n      'deleteFood',\n      'createRecipe',\n      'updateRecipe',\n      'deleteRecipe',\n      'createLogEntry',\n      'importMeals',\n      'updateLogEntry',\n      'deleteLogEntry',\n      'setWater',\n      'setTargets',\n      'getReport'\n    ])\n    expect(Object.keys(api.finance)).toEqual(["
if key_anchor not in preload_test:
    raise SystemExit('preload keys anchor not found')
preload_test = preload_test.replace(key_anchor, key_replacement, 1)

call_anchor = "    await api.finance.createAccount({\n"
call_block = """    await api.nutrition.importMeals({
      schemaVersion: 1,
      date: '2026-08-26',
      meals: [
        {
          mealType: 'lunch',
          customMealName: '',
          items: [
            {
              name: 'Плов',
              amount: 250,
              unit: 'g',
              nutrients: {
                calories: 575,
                proteinG: 17,
                fatG: 24,
                carbsG: 73,
                fiberG: 0,
                sugarG: 0,
                sodiumMg: 0
              },
              notes: ''
            }
          ]
        }
      ]
    })
    expect(electronMocks.invoke).toHaveBeenCalledWith('nutrition:import-meals', {
      schemaVersion: 1,
      date: '2026-08-26',
      meals: [
        {
          mealType: 'lunch',
          customMealName: '',
          items: [
            {
              name: 'Плов',
              amount: 250,
              unit: 'g',
              nutrients: {
                calories: 575,
                proteinG: 17,
                fatG: 24,
                carbsG: 73,
                fiberG: 0,
                sugarG: 0,
                sodiumMg: 0
              },
              notes: ''
            }
          ]
        }
      ]
    })

    await api.finance.createAccount({
"""
if call_anchor not in preload_test:
    raise SystemExit('preload invocation anchor not found')
preload_test_path.write_text(preload_test.replace(call_anchor, call_block, 1), encoding='utf-8')

replace_once(
    'src/renderer/src/modules/nutrition/components/NutritionDiaryView.tsx',
    '  onImportJson: () => void\n',
    '',
    'diary import prop type'
)
replace_once(
    'src/renderer/src/modules/nutrition/components/NutritionDiaryView.tsx',
    '  onImportJson,\n',
    '',
    'diary import prop destructure'
)
replace_once(
    'src/renderer/src/modules/nutrition/components/NutritionDiaryView.tsx',
    '''          <button
            type="button"
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400"
            onClick={onImportJson}
          >
            <Braces className="size-4" /> Добавить из JSON
          </button>
''',
    '',
    'duplicate JSON button'
)
replace_once(
    'src/renderer/src/modules/nutrition/NutritionPage.tsx',
    '          onImportJson={() => setJsonDialogOpen(true)}\n',
    '',
    'diary import prop use'
)
replace_once(
    'src/renderer/src/modules/nutrition/NutritionPage.test.tsx',
    "import { render, screen, waitFor, within } from '@testing-library/react'\n",
    "import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'\n",
    'testing library fireEvent import'
)
replace_once(
    'src/renderer/src/modules/nutrition/NutritionPage.test.tsx',
    "    await user.type(within(dialog).getByRole('textbox', { name: 'JSON питания' }), json)\n",
    "    fireEvent.change(within(dialog).getByRole('textbox', { name: 'JSON питания' }), {\n      target: { value: json }\n    })\n",
    'JSON textarea input'
)

obsolete_paths = [
    'src/renderer/src/modules/nutrition/components/NutritionCatalogViews.tsx',
    'src/renderer/src/modules/nutrition/components/NutritionFoodDialog.tsx',
    'src/renderer/src/modules/nutrition/components/NutritionFoodJsonImportDialog.tsx',
    'src/renderer/src/modules/nutrition/components/NutritionFoodJsonImportDialog.test.tsx',
    'src/renderer/src/modules/nutrition/components/NutritionGoalsView.tsx',
    'src/renderer/src/modules/nutrition/components/NutritionLibraryView.tsx',
    'src/renderer/src/modules/nutrition/components/NutritionLogDialog.tsx',
    'src/renderer/src/modules/nutrition/components/NutritionRecipeDialog.tsx',
    'src/renderer/src/modules/nutrition/components/NutritionReportsView.tsx',
    'src/renderer/src/modules/nutrition/nutrition-food-json.ts',
    'src/renderer/src/modules/nutrition/nutrition-food-json.test.ts'
]
for obsolete_path in obsolete_paths:
    Path(obsolete_path).unlink(missing_ok=True)
