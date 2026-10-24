import { TextControl } from '../../../ui/browser'
import { useMemo, useState } from 'react'
import type { GeneratePasswordInput } from '@mymind/contracts/passwords'
import { generatePasswordInputSchema } from '@mymind/core/validation/passwords'
import { AppDialog } from '../../shared/ui/AppDialog'
import { AppCheckbox, AppTextField } from '../../shared/ui/FormControls'
import { Button, ErrorState, Label } from '../../shared/ui/primitives'
import { messageFor } from '../../shared/ui/form-model'
import { useTheme } from '../../shared/ui/theme'
export function PasswordGeneratorModal({
  generate,
  close,
  copy,
  onUseValue
}: {
  generate(input: GeneratePasswordInput): string
  close(): void
  copy(value: string): Promise<void>
  onUseValue?(value: string): void
}): React.JSX.Element {
  const theme = useTheme()
  const [length, setLength] = useState('24')
  const [lowercase, setLowercase] = useState(true)
  const [uppercase, setUppercase] = useState(true)
  const [digits, setDigits] = useState(true)
  const [symbols, setSymbols] = useState(true)
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true)
  const [visible, setVisible] = useState(false)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const settings = useMemo(
    () => [
      { label: 'Строчные буквы', value: lowercase, set: setLowercase },
      { label: 'Заглавные буквы', value: uppercase, set: setUppercase },
      { label: 'Цифры', value: digits, set: setDigits },
      { label: 'Символы', value: symbols, set: setSymbols },
      {
        label: 'Исключить похожие I, l, 1, O, 0, o',
        value: excludeAmbiguous,
        set: setExcludeAmbiguous
      }
    ],
    [digits, excludeAmbiguous, lowercase, symbols, uppercase]
  )
  const regenerate = (): void => {
    try {
      const input = generatePasswordInputSchema.parse({
        length: Number(length),
        lowercase,
        uppercase,
        digits,
        symbols,
        excludeAmbiguous
      })
      setValue(generate(input))
      setError('')
    } catch (reason) {
      setError(messageFor(reason))
    }
  }
  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
      title="Генератор паролей"
      description="Генерация выполняется локально на устройстве."
      icon="passwords"
      presentation="sheet"
    >
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            padding: 16,
            gap: 12,
            paddingBottom: 28
          }}
        >
          <div
            className="ui-stack"
            style={{
              gap: 7
            }}
          >
            <Label>Длина</Label>
            <AppTextField
              value={length}
              onValueChange={setLength}
              inputMode={'numeric'}
              aria-label="Длина пароля"
            />
          </div>

          <div
            className="ui-stack"
            style={{
              gap: 7
            }}
          >
            {settings.map((setting) => (
              <AppCheckbox
                key={setting.label}
                label={setting.label}
                value={setting.value}
                onChange={setting.set}
              />
            ))}
          </div>

          <Button
            label={value ? 'Сгенерировать заново' : 'Сгенерировать'}
            primary
            onClick={regenerate}
          />
          {error ? <ErrorState message={error} /> : null}

          {value ? (
            <div
              className="ui-stack"
              style={{
                gap: 10,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                borderRadius: 16,
                padding: 14
              }}
            >
              <TextControl
                disabled={true}
                value={value}
                type={!visible ? 'password' : 'text'}
                aria-label={'Сгенерированный пароль'}
                style={{
                  color: theme.text,
                  fontSize: 17,
                  minHeight: 44
                }}
              ></TextControl>
              <div
                className="ui-stack"
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8
                }}
              >
                <Button
                  label={visible ? 'Скрыть' : 'Показать'}
                  onClick={() => setVisible(!visible)}
                />
                <Button
                  label="Копировать"
                  icon="copy"
                  onClick={() =>
                    void copy(value).catch((reason: unknown) => setError(messageFor(reason)))
                  }
                />
                {onUseValue ? (
                  <Button
                    label="Использовать"
                    primary
                    onClick={() => {
                      onUseValue(value)
                      close()
                    }}
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AppDialog>
  )
}
