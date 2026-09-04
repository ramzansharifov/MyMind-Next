import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PasswordItemRecord, PasswordsOverview } from '../../../../shared/contracts/passwords'

const mocks = vi.hoisted(() => ({
  getVaultStatus: vi.fn(),
  setupVault: vi.fn(),
  unlockVault: vi.fn(),
  lockVault: vi.fn(),
  changeMasterPassword: vi.fn(),
  listOverview: vi.fn(),
  getItem: vi.fn(),
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  generatePassword: vi.fn(),
  copyItemField: vi.fn(),
  openWebsite: vi.fn()
}))

vi.mock('./api/passwords-client', () => ({ passwordsClient: mocks }))

import { PasswordsPage } from './PasswordsPage'

const overview: PasswordsOverview = {
  groups: [
    {
      id: 'group-work',
      name: 'Работа',
      icon: 'briefcase',
      color: 'blue',
      position: 0,
      createdAt: 1,
      updatedAt: 1
    }
  ],
  items: [
    {
      id: 'item-github',
      groupId: 'group-work',
      type: 'login',
      title: 'GitHub',
      username: 'user@example.com',
      website: 'https://github.com',
      tags: ['Работа'],
      favorite: true,
      strength: 'weak',
      securityIssues: ['weak'],
      passwordUpdatedAt: Date.now(),
      createdAt: 2,
      updatedAt: 2
    }
  ],
  security: {
    total: 1,
    weak: 1,
    reused: 0,
    old: 0,
    issues: [{ itemId: 'item-github', title: 'GitHub', username: 'user@example.com', issues: ['weak'] }]
  }
}

const fullItem: PasswordItemRecord = {
  ...overview.items[0]!,
  password: 'secret-password',
  notes: 'Рабочий аккаунт',
  customFields: []
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getVaultStatus.mockResolvedValue({ initialized: true, unlocked: true })
  mocks.listOverview.mockResolvedValue(overview)
  mocks.getItem.mockResolvedValue(fullItem)
  mocks.lockVault.mockResolvedValue({ initialized: true, unlocked: false })
  mocks.copyItemField.mockResolvedValue(true)
})

describe('PasswordsPage', () => {
  it('shows encrypted vault entries only after the vault is unlocked', async () => {
    render(<PasswordsPage />)

    expect(await screen.findByRole('heading', { name: 'Пароли' })).toBeInTheDocument()
    expect(screen.getByText('GitHub')).toBeInTheDocument()
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
    expect(screen.queryByText('secret-password')).not.toBeInTheDocument()
  })

  it('copies a password through the main-process API', async () => {
    const user = userEvent.setup()
    render(<PasswordsPage />)

    await user.click(await screen.findByRole('button', { name: 'Скопировать пароль «GitHub»' }))

    expect(mocks.copyItemField).toHaveBeenCalledWith({ id: 'item-github', field: 'password' })
    expect(await screen.findByText('Пароль скопирован')).toBeInTheDocument()
  })

  it('opens the security view and shows weak password findings', async () => {
    const user = userEvent.setup()
    render(<PasswordsPage />)

    await user.click(await screen.findByRole('tab', { name: /Безопасность/ }))

    expect(screen.getByText('Требуют внимания')).toBeInTheDocument()
    expect(screen.getAllByText('Слабый').length).toBeGreaterThan(0)
  })

  it('unlocks an existing vault using the entered master password', async () => {
    const user = userEvent.setup()
    mocks.getVaultStatus.mockResolvedValueOnce({ initialized: true, unlocked: false })
    mocks.unlockVault.mockResolvedValue({ initialized: true, unlocked: true })

    render(<PasswordsPage />)

    const input = await screen.findByPlaceholderText('Введите мастер-пароль')
    await user.type(input, 'correct-master-password')
    await user.click(screen.getByRole('button', { name: 'Разблокировать' }))

    await waitFor(() =>
      expect(mocks.unlockVault).toHaveBeenCalledWith({ masterPassword: 'correct-master-password' })
    )
    expect(await screen.findByRole('heading', { name: 'Пароли' })).toBeInTheDocument()
  })
})