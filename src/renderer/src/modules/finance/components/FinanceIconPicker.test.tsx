import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { FINANCE_ICON_NAMES } from '../../../../../shared/contracts/finance'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { TooltipProvider } from '../../../shared/ui/tooltip'
import { FinanceIconPicker } from './FinanceIconPicker'

describe('FinanceIconPicker', () => {
  it('renders its visual grid above the account app dialog', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <TooltipProvider>
        <AppDialog
          open
          title="Новый счёт"
          description="Форма счёта"
          onOpenChange={() => undefined}
        >
          <FinanceIconPicker value="wallet" onChange={onChange} />
        </AppDialog>
      </TooltipProvider>
    )

    expect(document.querySelector('[data-app-dialog-content]')).toHaveClass('z-[81]')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Выбрать иконку счёта' }))

    expect(document.querySelector('[data-icon-picker-content]')).toHaveClass('z-[120]')
    expect(document.querySelectorAll('[data-finance-icon-option]')).toHaveLength(
      FINANCE_ICON_NAMES.length
    )
    await user.click(await screen.findByRole('menuitem', { name: 'Карта' }))

    expect(onChange).toHaveBeenCalledWith('credit-card')
  })
})
