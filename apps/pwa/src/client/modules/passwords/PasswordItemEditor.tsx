import { TextControl, DialogLayer, Toggle } from '../../../ui/browser'
import { useMemo, useState } from 'react'
import type {
  PasswordCustomField,
  PasswordGroupRecord,
  PasswordItemRecord,
  PasswordItemType
} from '@mymind/contracts/passwords'
import {
  createPasswordItemInputSchema,
  updatePasswordItemInputSchema
} from '@mymind/core/validation/passwords'
import type { PasswordsRepository } from '@mymind/persistence/passwords'
import { Button, ErrorState, Label } from '../../shared/ui/primitives'
import { messageFor } from '../../shared/ui/form-model'
import { useTheme } from '../../shared/ui/theme'
import { PasswordGeneratorModal } from './PasswordGeneratorModal'
function SecretInput({
  label,
  value,
  setValue,
  multiline = false,
  visible,
  setVisible
}: {
  label: string
  value: string
  setValue(value: string): void
  multiline?: boolean
  visible: boolean
  setVisible(value: boolean): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        gap: 7
      }}
    >
      <Label>{label}</Label>
      <div
        className="ui-stack"
        style={{
          gap: 8
        }}
      >
        <TextControl
          value={value}
          onValueChange={setValue}
          type={!visible && !multiline ? 'password' : 'text'}
          multiline={multiline}
          autoCapitalize={'none'}
          autoCorrect={'off'}
          aria-label={label}
          style={{
            minHeight: multiline ? 96 : 48,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            backgroundColor: theme.surface,
            color: theme.text,
            paddingInline: 14,
            paddingBlock: 12,
            fontSize: 16
          }}
        ></TextControl>
        {!multiline ? (
          <div
            className="ui-stack"
            style={{
              alignItems: 'flex-start'
            }}
          >
            <Button label={visible ? 'Скрыть' : 'Показать'} onClick={() => setVisible(!visible)} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
function TextField({
  label,
  value,
  setValue,
  multiline = false,
  autoCapitalize = 'sentences'
}: {
  label: string
  value: string
  setValue(value: string): void
  multiline?: boolean
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        gap: 7
      }}
    >
      <Label>{label}</Label>
      <TextControl
        value={value}
        onValueChange={setValue}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCapitalize !== 'none' ? 'on' : 'off'}
        aria-label={label}
        style={{
          minHeight: multiline ? 96 : 48,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          backgroundColor: theme.surface,
          color: theme.text,
          paddingInline: 14,
          paddingBlock: 12,
          fontSize: 16
        }}
      ></TextControl>
    </div>
  )
}
export function PasswordItemEditor({
  api,
  groups,
  item,
  close,
  saved,
  copy
}: {
  api: PasswordsRepository
  groups: PasswordGroupRecord[]
  item?: PasswordItemRecord
  close(): void
  saved(): void
  copy(value: string): Promise<void>
}): React.JSX.Element {
  const theme = useTheme()
  const [type, setType] = useState<PasswordItemType>(item?.type ?? 'login')
  const [groupId, setGroupId] = useState<string | null>(item?.groupId ?? null)
  const [title, setTitle] = useState(item?.title ?? '')
  const [username, setUsername] = useState(item?.username ?? '')
  const [password, setPassword] = useState(item?.password ?? '')
  const [website, setWebsite] = useState(item?.website ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [tagsText, setTagsText] = useState(item?.tags.join(', ') ?? '')
  const [favorite, setFavorite] = useState(item?.favorite ?? false)
  const [customFields, setCustomFields] = useState<PasswordCustomField[]>(
    item?.customFields.map((field) => ({ ...field })) ?? []
  )
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [customVisible, setCustomVisible] = useState<Record<number, boolean>>({})
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [error, setError] = useState('')
  const tags = useMemo(
    () =>
      tagsText
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    [tagsText]
  )
  const save = (): void => {
    try {
      const raw = {
        groupId,
        type,
        title,
        username,
        password,
        website,
        notes,
        tags,
        customFields,
        favorite
      }
      if (item) {
        const input = updatePasswordItemInputSchema.parse({ ...raw, id: item.id })
        api.updatePasswordItem(input)
      } else {
        api.createPasswordItem(createPasswordItemInputSchema.parse(raw))
      }
      setError('')
      saved()
      close()
    } catch (reason) {
      setError(messageFor(reason))
    }
  }
  const updateCustomField = (index: number, patch: Partial<PasswordCustomField>): void => {
    setCustomFields((fields) =>
      fields.map((field, fieldIndex) => (fieldIndex === index ? { ...field, ...patch } : field))
    )
  }
  return (
    <DialogLayer open={true} transition={'slide'} onClose={close}>
      <div
        className="ui-stack"
        style={{
          flex: '1 1 0%',
          backgroundColor: theme.background
        }}
      >
        <div className="ui-scroll">
          <div
            className="ui-stack ui-scroll-content"
            style={{
              padding: 20,
              gap: 16,
              paddingBottom: 56
            }}
          >
            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 12
              }}
            >
              <div
                className="ui-stack"
                style={{
                  flex: '1 1 0%'
                }}
              >
                <Label title>{item ? 'Редактировать запись' : 'Новая запись'}</Label>
                <Label muted>Все поля сохраняются только в зашифрованном виде.</Label>
              </div>
              <Button label="Закрыть" onClick={close} />
            </div>

            <div
              className="ui-stack"
              style={{
                gap: 7
              }}
            >
              <Label>Тип</Label>
              <div
                className="ui-stack"
                style={{
                  flexDirection: 'row',
                  gap: 8,
                  flexWrap: 'wrap'
                }}
              >
                <Button
                  label="Логин"
                  selected={type === 'login'}
                  onClick={() => setType('login')}
                />
                <Button
                  label="Пароль"
                  selected={type === 'password'}
                  onClick={() => setType('password')}
                />
              </div>
            </div>

            <div
              className="ui-stack"
              style={{
                gap: 7
              }}
            >
              <Label>Группа</Label>
              <div className="ui-scroll" data-horizontal={true}>
                <div
                  className="ui-stack ui-scroll-content"
                  style={{
                    gap: 8,
                    flexDirection: 'row'
                  }}
                >
                  <Button
                    label="Без группы"
                    selected={groupId === null}
                    onClick={() => setGroupId(null)}
                  />
                  {groups.map((group) => (
                    <Button
                      key={group.id}
                      label={group.name}
                      selected={groupId === group.id}
                      onClick={() => setGroupId(group.id)}
                    />
                  ))}
                </div>
              </div>
            </div>

            <TextField label="Название" value={title} setValue={setTitle} />
            <TextField
              label="Логин / email"
              value={username}
              setValue={setUsername}
              autoCapitalize="none"
            />

            <SecretInput
              label="Пароль"
              value={password}
              setValue={setPassword}
              visible={passwordVisible}
              setVisible={setPasswordVisible}
            />
            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              <Button label="Генератор" onClick={() => setGeneratorOpen(true)} />
              {password ? (
                <Button
                  label="Копировать пароль"
                  onClick={() =>
                    void copy(password).catch((reason: unknown) => setError(messageFor(reason)))
                  }
                />
              ) : null}
            </div>

            <TextField label="Сайт" value={website} setValue={setWebsite} autoCapitalize="none" />
            <TextField label="Заметка" value={notes} setValue={setNotes} multiline />
            <TextField
              label="Теги через запятую"
              value={tagsText}
              setValue={setTagsText}
              autoCapitalize="none"
            />

            <div
              className="ui-stack"
              style={{
                minHeight: 54,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                borderRadius: 12,
                paddingInline: 14,
                gap: 12
              }}
            >
              <Label>В избранном</Label>
              <Toggle
                checked={favorite}
                onValueChange={setFavorite}
                trackColors={{ true: theme.accent }}
              ></Toggle>
            </div>

            <div
              className="ui-stack"
              style={{
                gap: 10
              }}
            >
              <div
                className="ui-stack"
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: 10,
                  alignItems: 'center'
                }}
              >
                <div
                  className="ui-stack"
                  style={{
                    flex: '1 1 0%'
                  }}
                >
                  <Label>Дополнительные поля</Label>
                  <Label muted>Например, PIN, recovery code или секретный ответ.</Label>
                </div>
                <Button
                  label="+ Поле"
                  disabled={customFields.length >= 20}
                  onClick={() => setCustomFields((fields) => [...fields, { label: '', value: '' }])}
                />
              </div>
              {customFields.map((field, index) => (
                <div
                  className="ui-stack"
                  key={index}
                  style={{
                    gap: 10,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.surface,
                    borderRadius: 14,
                    padding: 12
                  }}
                >
                  <TextControl
                    value={field.label}
                    onValueChange={(value) => updateCustomField(index, { label: value })}
                    placeholder={'Название поля'}
                    placeholderColor={theme.muted}
                    aria-label={`Название дополнительного поля ${index + 1}`}
                    style={{
                      minHeight: 46,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 10,
                      color: theme.text,
                      backgroundColor: theme.raised,
                      paddingInline: 12,
                      fontSize: 16
                    }}
                  ></TextControl>
                  <TextControl
                    value={field.value}
                    onValueChange={(value) => updateCustomField(index, { value })}
                    type={!customVisible[index] ? 'password' : 'text'}
                    autoCapitalize={'none'}
                    autoCorrect={'off'}
                    placeholder={'Значение'}
                    placeholderColor={theme.muted}
                    aria-label={`Значение дополнительного поля ${index + 1}`}
                    style={{
                      minHeight: 46,
                      borderWidth: 1,
                      borderColor: theme.border,
                      borderRadius: 10,
                      color: theme.text,
                      backgroundColor: theme.raised,
                      paddingInline: 12,
                      fontSize: 16
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
                      label={customVisible[index] ? 'Скрыть' : 'Показать'}
                      onClick={() =>
                        setCustomVisible((current) => ({ ...current, [index]: !current[index] }))
                      }
                    />
                    {field.value ? (
                      <Button
                        label="Копировать"
                        onClick={() =>
                          void copy(field.value).catch((reason: unknown) =>
                            setError(messageFor(reason))
                          )
                        }
                      />
                    ) : null}
                    <Button
                      label="Удалить поле"
                      danger
                      onClick={() =>
                        setCustomFields((fields) =>
                          fields.filter((_, fieldIndex) => fieldIndex !== index)
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            {error ? <ErrorState message={error} /> : null}
            <Button label="Сохранить" selected onClick={save} />
          </div>
        </div>
        {generatorOpen ? (
          <PasswordGeneratorModal
            generate={api.generatePassword}
            close={() => setGeneratorOpen(false)}
            copy={copy}
            onUseValue={(generated) => {
              setPassword(generated)
              setPasswordVisible(true)
            }}
          />
        ) : null}
      </div>
    </DialogLayer>
  )
}
