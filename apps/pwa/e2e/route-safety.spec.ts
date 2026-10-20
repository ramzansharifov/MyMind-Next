import { test, expect, open, localData } from './helpers'

test('excluded modules cannot open through bookmarks, browser history or navigation events', async ({
  page
}) => {
  for (const route of ['study', 'boards', 'workouts', 'study?id=legacy', '%73tudy']) {
    await open(page, route)
    await expect(page).toHaveURL(/#home$/)
    await expect(page.locator('.app-header')).toContainText('Главная')
    await expect(page.getByRole('button', { name: /^(Учёба|Доски|Тренировки)$/ })).toHaveCount(0)
    await page.evaluate(
      (view) =>
        window.dispatchEvent(
          new CustomEvent('mymind:module-navigate', {
            detail: { view, resourceId: 'old-id', focusMode: true }
          })
        ),
      route
    )
    await expect(page.locator('.app-header')).toContainText('Главная')
    await expect(page.locator('.desktop-module')).toHaveCount(0)
  }
})

test('hidden desktop records survive blocked routes, runtime restart and backup restore', async ({
  page
}) => {
  await open(page, 'home')
  // Exercise the retained storage compatibility layer, never expose these editors in the UI.
  const ids = await page.evaluate(async () => {
    const study = await window.api.study.createNode({
      type: 'material',
      parentId: null,
      title: 'Hidden study fixture'
    })
    await window.api.study.saveMaterial({
      nodeId: study.id,
      document: {
        version: 1,
        blocks: [{ id: crypto.randomUUID(), type: 'text', text: 'Keep this desktop document' }]
      }
    })
    const board = await window.api.boards.createNode({
      type: 'board',
      parentId: null,
      title: 'Hidden board fixture'
    })
    await window.api.boards.saveDocument({
      nodeId: board.id,
      snapshot: { document: { store: { fixture: 'Keep this drawing' } } }
    })
    const exercise = await window.api.workouts.createExercise({
      title: 'Hidden workout fixture',
      muscleGroups: ['chest'],
      usesExternalWeight: true,
      status: 'active'
    })
    return { study: study.id, board: board.id, exercise: exercise.id }
  })
  const snapshot = async (): Promise<unknown> =>
    page.evaluate(
      async (ids) => ({
        study: await window.api.study.getMaterial(ids.study),
        board: await window.api.boards.getDocument(ids.board),
        workouts: await window.api.workouts.listOverview()
      }),
      ids
    )
  const before = await snapshot()
  await localData(page)
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Создать backup', exact: true }).click()
  const path = await (await downloading).path()
  await expect(page.locator('.workspace')).toHaveAttribute('aria-busy', 'false')
  for (const route of ['study', 'boards', 'workouts']) {
    await open(page, route)
    await expect(page).toHaveURL(/#home$/)
    expect(await snapshot()).toEqual(before)
  }
  await localData(page)
  await page.getByRole('button', { name: 'Восстановить из файла', exact: true }).click()
  const choosing = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Выбрать файл', exact: true }).click()
  await (await choosing).setFiles(path!)
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(page.locator('.workspace')).toHaveAttribute('aria-busy', 'false')
  await open(page, 'home')
  expect(await snapshot()).toEqual(before)
})

test('keyboard creation, nested cancellation and browser Back match mobile forms', async ({
  page
}) => {
  await open(page, 'home')
  await page.getByRole('button', { name: 'Заметки', exact: true }).click()
  const create = page.getByRole('button', { name: 'Создать', exact: true })
  await create.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: 'Новая заметка', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Новая заметка', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Название', exact: true })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('textbox', { name: 'Название', exact: true })).toHaveCount(0)
  await expect(page.locator('.app-header')).toContainText('Заметки')
})
