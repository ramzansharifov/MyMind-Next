import { useMemo, useState } from 'react'
import { Modal, ScrollView, Switch, TextInput, View } from 'react-native'
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
    <View style={{ gap: 7 }}>
      <Label>{label}</Label>
      <View style={{ gap: 8 }}>
        <TextInput
          value={value}
          onChangeText={setValue}
          secureTextEntry={!visible && !multiline}
          multiline={multiline}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={label}
          style={{
            minHeight: multiline ? 96 : 48,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 12,
            backgroundColor: theme.surface,
            color: theme.text,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 16,
            textAlignVertical: multiline ? 'top' : 'center'
          }}
        />
        {!multiline ? (
          <View style={{ alignItems: 'flex-start' }}>
            <Button label={visible ? 'Скрыть' : 'Показать'} onPress={() => setVisible(!visible)} />
          </View>
        ) : null}
      </View>
    </View>
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
    <View style={{ gap: 7 }}>
      <Label>{label}</Label>
      <TextInput
        value={value}
        onChangeText={setValue}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCapitalize !== 'none'}
        accessibilityLabel={label}
        style={{
          minHeight: multiline ? 96 : 48,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          backgroundColor: theme.surface,
          color: theme.text,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 16,
          textAlignVertical: multiline ? 'top' : 'center'
        }}
      />
    </View>
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
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 56 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Label title>{item ? 'Редактировать запись' : 'Новая запись'}</Label>
              <Label muted>Все поля сохраняются только в зашифрованном виде.</Label>
            </View>
            <Button label="Закрыть" onPress={close} />
          </View>

          <View style={{ gap: 7 }}>
            <Label>Тип</Label>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Button label="Логин" selected={type === 'login'} onPress={() => setType('login')} />
              <Button
                label="Пароль"
                selected={type === 'password'}
                onPress={() => setType('password')}
              />
            </View>
          </View>

          <View style={{ gap: 7 }}>
            <Label>Группа</Label>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              <Button
                label="Без группы"
                selected={groupId === null}
                onPress={() => setGroupId(null)}
              />
              {groups.map((group) => (
                <Button
                  key={group.id}
                  label={group.name}
                  selected={groupId === group.id}
                  onPress={() => setGroupId(group.id)}
                />
              ))}
            </ScrollView>
          </View>

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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Button label="Генератор" onPress={() => setGeneratorOpen(true)} />
            {password ? (
              <Button label="Копировать пароль" onPress={() => void copy(password)} />
            ) : null}
          </View>

          <TextField label="Сайт" value={website} setValue={setWebsite} autoCapitalize="none" />
          <TextField label="Заметка" value={notes} setValue={setNotes} multiline />
          <TextField
            label="Теги через запятую"
            value={tagsText}
            setValue={setTagsText}
            autoCapitalize="none"
          />

          <View
            style={{
              minHeight: 54,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surface,
              borderRadius: 12,
              paddingHorizontal: 14,
              gap: 12
            }}
          >
            <Label>В избранном</Label>
            <Switch
              value={favorite}
              onValueChange={setFavorite}
              trackColor={{ true: theme.accent }}
            />
          </View>

          <View style={{ gap: 10 }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 10,
                alignItems: 'center'
              }}
            >
              <View style={{ flex: 1 }}>
                <Label>Дополнительные поля</Label>
                <Label muted>Например, PIN, recovery code или секретный ответ.</Label>
              </View>
              <Button
                label="+ Поле"
                disabled={customFields.length >= 20}
                onPress={() => setCustomFields((fields) => [...fields, { label: '', value: '' }])}
              />
            </View>
            {customFields.map((field, index) => (
              <View
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
                <TextInput
                  value={field.label}
                  onChangeText={(value) => updateCustomField(index, { label: value })}
                  placeholder="Название поля"
                  placeholderTextColor={theme.muted}
                  accessibilityLabel={`Название дополнительного поля ${index + 1}`}
                  style={{
                    minHeight: 46,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 10,
                    color: theme.text,
                    backgroundColor: theme.raised,
                    paddingHorizontal: 12,
                    fontSize: 16
                  }}
                />
                <TextInput
                  value={field.value}
                  onChangeText={(value) => updateCustomField(index, { value })}
                  secureTextEntry={!customVisible[index]}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Значение"
                  placeholderTextColor={theme.muted}
                  accessibilityLabel={`Значение дополнительного поля ${index + 1}`}
                  style={{
                    minHeight: 46,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 10,
                    color: theme.text,
                    backgroundColor: theme.raised,
                    paddingHorizontal: 12,
                    fontSize: 16
                  }}
                />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Button
                    label={customVisible[index] ? 'Скрыть' : 'Показать'}
                    onPress={() =>
                      setCustomVisible((current) => ({ ...current, [index]: !current[index] }))
                    }
                  />
                  {field.value ? (
                    <Button label="Копировать" onPress={() => void copy(field.value)} />
                  ) : null}
                  <Button
                    label="Удалить поле"
                    danger
                    onPress={() =>
                      setCustomFields((fields) =>
                        fields.filter((_, fieldIndex) => fieldIndex !== index)
                      )
                    }
                  />
                </View>
              </View>
            ))}
          </View>

          {error ? <ErrorState message={error} /> : null}
          <Button label="Сохранить" selected onPress={save} />
        </ScrollView>
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
      </View>
    </Modal>
  )
}
