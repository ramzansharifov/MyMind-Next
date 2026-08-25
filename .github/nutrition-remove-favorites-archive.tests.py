from pathlib import Path

page = Path('src/renderer/src/modules/nutrition/NutritionPage.test.tsx')
text = page.read_text(encoding='utf-8')
anchor = "  it('updates water for the currently selected day', async () => {"
test = """  it('does not expose favorites or archive controls in the food catalog', async () => {
    const user = userEvent.setup()
    render(<NutritionPage />)

    await screen.findByRole('heading', { name: 'Питание' })
    await user.click(screen.getByRole('button', { name: 'Продукты' }))

    expect(screen.queryByRole('button', { name: 'Избранное' })).not.toBeInTheDocument()
    expect(screen.queryByText('Архив')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Статус каталога')).not.toBeInTheDocument()
  })

"""
if anchor not in text:
    raise SystemExit('NutritionPage test anchor not found')
page.write_text(text.replace(anchor, test + anchor, 1), encoding='utf-8')

repo = Path('src/main/repositories/nutrition.repository.test.ts')
text = repo.read_text(encoding='utf-8')
anchor = "  it('calculates recipes from reusable foods and logs them by servings', () => {"
test = """  it('ignores legacy favorite and archive columns in catalog records', () => {
    const chicken = createChicken()
    getSqlite()
      .prepare("UPDATE nutrition_foods SET favorite = 1, status = 'archived' WHERE id = ?")
      .run(chicken.id)

    const stored = listNutritionOverview('2026-08-17').foods.find((food) => food.id === chicken.id)
    expect(stored).toBeDefined()
    expect(stored).not.toHaveProperty('favorite')
    expect(stored).not.toHaveProperty('status')
  })

"""
if anchor not in text:
    raise SystemExit('nutrition repository test anchor not found')
repo.write_text(text.replace(anchor, test + anchor, 1), encoding='utf-8')

print('Added nutrition favorite/archive regression tests')
