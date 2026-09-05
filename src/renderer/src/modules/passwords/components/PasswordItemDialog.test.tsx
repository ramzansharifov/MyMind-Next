import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { PasswordItemRecord } from '../../../../../shared/contracts/passwords'
import { PasswordItemDialog } from './PasswordItemDialog'

vi.mock('../api/passwords-client', () => ({
  passwordsClient: {
    generatePassword: vi.fn()
  }
}))

const existingItem: PasswordItemRecord = {
  id: 'item-github',
  groupId: null,
  type: 'login',
  title: 'GitHub',
  username: 'user@example.com',
  website: 'https://github.com',
  tags: ['Работа', 'Git'],
  favorite: false,
  strength: 'strong',
  securityIssues: [],
  passwordUpdatedAt: 1,
  createdAt: 1,
  updatedAt: 1,
  password: 'secret-password',
  notes: 'Рабочий аккаунт',
  customFields: [{ label: 'Recovery code', value: 'hidden-value' }]
}

describe('PasswordItemDialog', () => {
  it('does not show tags or additional secret fields for a new record', () => {
    render(
      <PasswordItemDialog
        open
        item={null}
        groups={[]}
        initialGroupId={null}
        busy={false}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
      />
    )

    expect(screen.queryByText('Теги')).not.toBeInTheDocument()
    expect(screen.queryByText('Дополнительные секретные поля')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Добавить поле' })).not.toBeInTheDocument()
  })

  it('preserves hidden legacy tags and custom fields when an existing record is saved', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)

    render(
      <PasswordItemDialog
        open
        item={existingItem}
        groups={[]}
        initialGroupId={null}
        busy={false}
        onOpenChange={vi.fn()}
        onSave={onSave}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: existingItem.id,
          tags: existingItem.tags,
          customFields: existingItem.customFields
        })
      )
    )
  })
})
