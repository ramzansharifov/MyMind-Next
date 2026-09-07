import { useCallback, useEffect, useState } from 'react'
import { Alert, Platform, ScrollView, Text, TextInput, View } from 'react-native'
import type {
  StudyCodeApplyResult,
  StudyCodePreviewResult,
  StudyCodeSnapshot
} from '@mymind/contracts/study'
import type { StudyRepository } from '@mymind/persistence/study'
import type { MobileDocumentAssetStore } from '../../shared/platform/documentAssets'
import { Button, ErrorState, Label, LoadingState } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import {
  applyMobileStudyCode,
  formatMobileStudyCode,
  getMobileStudyCodeSnapshot,
  previewMobileStudyCode
} from './studyCode'

export function StudyCodeWorkspace({
  repository,
  documentAssets,
  nodeId,
  onClose,
  onApplied
}: {
  repository: StudyRepository
  documentAssets: MobileDocumentAssetStore
  nodeId: string
  onClose(): void
  onApplied(result: StudyCodeApplyResult): void
}): React.JSX.Element {
  const theme = useTheme()
  const [snapshot, setSnapshot] = useState<StudyCodeSnapshot | null>(null)
  const [source, setSource] = useState('')
  const [preview, setPreview] = useState<StudyCodePreviewResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const reload = useCallback((): void => {
    try {
      const next = getMobileStudyCodeSnapshot(repository, nodeId)
      setSnapshot(next)
      setSource(next.source)
      setPreview(null)
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось открыть режим «Код»')
    }
  }, [nodeId, repository])

  useEffect(() => reload(), [reload])

  const check = useCallback((): StudyCodePreviewResult | null => {
    if (!snapshot) return null
    const result = previewMobileStudyCode(repository, nodeId, source, snapshot.revision)
    setPreview(result)
    setError(result.valid ? '' : (result.diagnostics[0]?.message ?? 'DSL содержит ошибки'))
    return result
  }, [nodeId, repository, snapshot, source])

  const format = (): void => {
    try {
      const next = formatMobileStudyCode(source)
      setSource(next)
      setPreview(null)
      setError('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось отформатировать DSL')
    }
  }

  const commit = async (confirmDestructive: boolean): Promise<void> => {
    if (!snapshot || busy) return
    setBusy(true)
    setError('')
    try {
      const result = await applyMobileStudyCode(
        repository,
        nodeId,
        source,
        snapshot.revision,
        confirmDestructive,
        documentAssets.validateDocumentAssets
      )
      const next = getMobileStudyCodeSnapshot(repository, nodeId)
      setSnapshot(next)
      setSource(next.source)
      setPreview(null)
      onApplied(result)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось применить DSL')
    } finally {
      setBusy(false)
    }
  }

  const save = (): void => {
    const result = check()
    if (!result?.valid) return
    if (!result.destructive) {
      void commit(false)
      return
    }
    Alert.alert(
      'Подтвердить удаления?',
      'Код удаляет элементы или блоки из выбранной ветки. Это действие применяется к локальным данным.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Применить', style: 'destructive', onPress: () => void commit(true) }
      ]
    )
  }

  if (!snapshot && !error) return <LoadingState />

  const summary = preview?.summary
  const changed = summary
    ? Object.values(summary).reduce((total, value) => total + value, 0)
    : 0

  return (
    <View style={{ flex: 1, gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button label="Назад" disabled={busy} onPress={onClose} />
        <Button label="Сбросить" disabled={busy} onPress={reload} />
        <Button label="Формат" disabled={busy} onPress={format} />
        <Button label="Проверить" disabled={busy} onPress={() => void check()} />
        <Button label={busy ? 'Применение…' : 'Применить'} selected disabled={busy} onPress={save} />
      </View>

      {snapshot ? (
        <View style={{ gap: 4 }}>
          <Label title>{snapshot.title}</Label>
          <Label muted>
            Режим «Код» изменяет эту ветку обучения. Существующие @id сохраняют сущности; новые папки,
            материалы и блоки создавайте без @id.
          </Label>
        </View>
      ) : null}

      {preview?.valid ? (
        <Text style={{ color: preview.destructive ? theme.error : theme.muted, fontSize: 13 }}>
          {changed === 0
            ? 'Изменений нет.'
            : `Проверка пройдена. Изменений: ${changed}${preview.destructive ? ' · есть удаления' : ''}.`}
        </Text>
      ) : null}

      {preview && !preview.valid ? (
        <ScrollView style={{ maxHeight: 100 }}>
          {preview.diagnostics.slice(0, 6).map((diagnostic, index) => (
            <Text
              key={`${diagnostic.line}:${diagnostic.column}:${index}`}
              selectable
              style={{ color: theme.error, fontSize: 13, lineHeight: 19 }}
            >
              {diagnostic.line}:{diagnostic.column} · {diagnostic.message}
            </Text>
          ))}
        </ScrollView>
      ) : null}

      {error ? <ErrorState message={error} /> : null}

      <TextInput
        accessibilityLabel="Код материала или папки"
        value={source}
        onChangeText={(value) => {
          setSource(value)
          setPreview(null)
          setError('')
        }}
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        textAlignVertical="top"
        keyboardType="ascii-capable"
        style={{
          flex: 1,
          minHeight: 360,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.surface,
          color: theme.text,
          borderRadius: 12,
          padding: 12,
          fontSize: 13,
          lineHeight: 20,
          fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
        }}
      />
    </View>
  )
}
