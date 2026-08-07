import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FINANCE_ICON_NAMES } from '../../../../../shared/contracts/finance'
import { TooltipProvider } from '../../../shared/ui/tooltip'
import { FinanceIconPicker } from './FinanceIconPicker'

describe('FinanceIconPicker', () => {
  it('uses the same visual icon grid interaction as folder and note-group pickers', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <TooltipProvider>
        <FinanceIconPicker value="wallet" onChange={onChange} />
      </TooltipProvider>
    )

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Выбрать иконку счёта' }))

    expect(document.querySelectorAll('[data-finance-icon-option]')).toHaveLength(
      FINANCE_ICON_NAMES.length
    )
    await user.click(await screen.findByRole('menuitem', { name: 'Карта' }))

    expect(onChange).toHaveBeenCalledWith('credit-card')
  })
})
