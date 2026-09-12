import { useMemo, useRef, useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, ScrollView, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { StudyInternalLinkTarget, StudyTextBlock } from '@mymind/contracts/study'
import { designTokens } from '@mymind/design'
import { messageFor } from './form-model'
import { Button, ErrorState, Label, Row, SearchField } from './primitives'
import {
  ensureStudyRichTextEditableSegments,
  hasStudyRichTextInternalLinks,
  insertStudyRichTextLink,
  parseStudyRichTextSegments,
  removeStudyRichTextLink,
  replaceStudyRichTextLink,
  serializeStudyRichTextSegments,
  studyRichTextLinkFromTarget,
  studyRichTextSegmentsToText,
  updateStudyRichTextTextSegment,
  type StudyRichTextInternalLink,
  type StudyRichTextSegment
} from './studyRichText'
import { useTheme } from './theme'

type PickerState =
  | { mode: 'insert'; textSegmentIndex: number; offset: number }
  | { mode: 'edit'; linkSegmentIndex: number; link: StudyRichTextInternalLink }

interface StudyRichTextEditorProps {
  block: StudyTextBlock
  update(block: StudyTextBlock): void
  searchTargets(query: string): StudyInternalLinkTarget[]
}

function targetFromLink(link: StudyRichTextInternalLink): StudyInternalLinkTarget {
  return {
    kind: link.kind,
    materialId: link.materialId,
    headingId: link.headingId,
    title: link.label,
    materialTitle: link.materialTitle,
    folderPath: [...link.folderPath],
    headingLevel: link.headingLevel
  }
}

function targetSubtitle(target: StudyInternalLinkTarget): string {
  const path = [...target.folderPath, target.materialTitle].filter(Boolean).join(' / ')
  const kind = target.kind === 'heading' ? `H${target.headingLevel ?? ''}` : 'Материал'
  return [kind, path].filter(Boolean).join(' · ')
}

export function StudyInternalLinkPicker({
  initialLink,
  searchTargets,
  save,
  close
}: {
  initialLink?: StudyRichTextInternalLink
  searchTargets(query: string): StudyInternalLinkTarget[]
  save(target: StudyInternalLinkTarget, customLabel: string): void
  close(): void
}): React.JSX.Element {
  const theme = useTheme()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<StudyInternalLinkTarget | null>(() =>
    initialLink ? targetFromLink(initialLink) : null
  )
  const [customLabel, setCustomLabel] = useState(
    initialLink?.labelMode === 'custom' ? initialLink.label : ''
  )
  const search = useMemo(() => {
    try {
      return { results: searchTargets(query), error: '' }
    } catch (reason) {
      return { results: [] as StudyInternalLinkTarget[], error: messageFor(reason) }
    }
  }, [query, searchTargets])

  return (
    <Modal animationType="slide" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={{ padding: 16, gap: 12 }}>
            <Label title>{initialLink ? 'Изменить внутреннюю ссылку' : 'Внутренняя ссылка'}</Label>
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'space-between' }}>
              <Button label="Отмена" onPress={close} />
              <Button
                label={initialLink ? 'Сохранить' : 'Вставить'}
                selected
                disabled={!selected}
                onPress={() => {
                  if (selected) save(selected, customLabel)
                }}
              />
            </View>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
          >
            <SearchField value={query} onChangeText={setQuery} />
            {search.error ? <ErrorState message={search.error} /> : null}
            {selected ? (
              <View
                style={{
                  gap: 6,
                  padding: 12,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: theme.accent,
                  borderRadius: designTokens.radius.md,
                  backgroundColor: theme.accent + '14'
                }}
              >
                <Label>Выбрано: {selected.title}</Label>
                <Label muted>{targetSubtitle(selected)}</Label>
              </View>
            ) : null}
            <View style={{ marginBottom: 16 }}>
              {search.results.map((target) => (
                <Row
                  key={`${target.kind}:${target.materialId}:${target.headingId ?? ''}`}
                  title={target.title}
                  subtitle={targetSubtitle(target)}
                  onPress={() => setSelected(target)}
                />
              ))}
            </View>
            <View style={{ gap: 8 }}>
              <Label>Своя подпись</Label>
              <Label muted>
                Оставьте пустой, чтобы подпись автоматически следовала за названием цели.
              </Label>
              <TextInput
                accessibilityLabel="Своя подпись внутренней ссылки"
                placeholder={selected?.title ?? 'Автоматическая подпись'}
                placeholderTextColor={theme.muted}
                value={customLabel}
                onChangeText={setCustomLabel}
                style={{
                  minHeight: 50,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.surface,
                  color: theme.text,
                  borderRadius: designTokens.radius.md,
                  paddingHorizontal: 14,
                  fontSize: 16
                }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}

export function StudyRichTextEditor({
  block,
  update,
  searchTargets
}: StudyRichTextEditorProps): React.JSX.Element {
  const theme = useTheme()
  const [segments, setSegments] = useState<StudyRichTextSegment[]>(() =>
    ensureStudyRichTextEditableSegments(parseStudyRichTextSegments(block.html, block.text))
  )
  const selection = useRef({ textSegmentIndex: 0, offset: 0 })
  const [picker, setPicker] = useState<PickerState | null>(null)

  const commit = (next: StudyRichTextSegment[]): void => {
    const editable = ensureStudyRichTextEditableSegments(next)
    setSegments(editable)
    update({
      ...block,
      text: studyRichTextSegmentsToText(editable),
      html: hasStudyRichTextInternalLinks(editable)
        ? serializeStudyRichTextSegments(editable)
        : undefined
    })
  }

  const openInsert = (): void => {
    const current = segments[selection.current.textSegmentIndex]
    const textSegmentIndex = current?.type === 'text' ? selection.current.textSegmentIndex : 0
    const text = segments[textSegmentIndex]
    const offset =
      text?.type === 'text' ? Math.max(0, Math.min(selection.current.offset, text.text.length)) : 0
    setPicker({ mode: 'insert', textSegmentIndex, offset })
  }

  const savePicker = (target: StudyInternalLinkTarget, customLabel: string): void => {
    if (!picker) return
    const link = studyRichTextLinkFromTarget(target, customLabel)
    if (picker.mode === 'edit') {
      commit(replaceStudyRichTextLink(segments, picker.linkSegmentIndex, link))
    } else {
      commit(insertStudyRichTextLink(segments, picker.textSegmentIndex, picker.offset, link))
      selection.current = { textSegmentIndex: picker.textSegmentIndex + 2, offset: 0 }
    }
    setPicker(null)
  }

  return (
    <View style={{ gap: 10 }}>
      {segments.map((segment, index) =>
        segment.type === 'text' ? (
          <TextInput
            key={`text-${index}`}
            accessibilityLabel="Текстовый блок"
            multiline
            placeholder="Начните писать…"
            placeholderTextColor={theme.muted}
            value={segment.text}
            onFocus={() => {
              selection.current = { textSegmentIndex: index, offset: segment.text.length }
            }}
            onSelectionChange={(event) => {
              selection.current = {
                textSegmentIndex: index,
                offset: event.nativeEvent.selection.start
              }
            }}
            onChangeText={(text) => commit(updateStudyRichTextTextSegment(segments, index, text))}
            style={{
              color: theme.text,
              backgroundColor: theme.raised,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: designTokens.radius.md,
              padding: 12,
              minHeight: 72,
              textAlignVertical: 'top',
              fontSize: 16
            }}
          />
        ) : (
          <View
            key={`link-${index}-${segment.link.materialId}-${segment.link.headingId ?? ''}`}
            style={{
              gap: 8,
              padding: 12,
              borderWidth: 1,
              borderColor: theme.accent,
              borderRadius: designTokens.radius.md,
              backgroundColor: theme.accent + '12'
            }}
          >
            <Label>Внутренняя ссылка · {segment.link.label}</Label>
            <Label muted>
              {[
                segment.link.kind === 'heading'
                  ? `H${segment.link.headingLevel ?? ''}`
                  : 'Материал',
                [...segment.link.folderPath, segment.link.materialTitle]
                  .filter(Boolean)
                  .join(' / '),
                segment.link.labelMode === 'custom' ? 'Своя подпись' : 'Автоподпись'
              ]
                .filter(Boolean)
                .join(' · ')}
            </Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button
                label="Изменить"
                onPress={() =>
                  setPicker({
                    mode: 'edit',
                    linkSegmentIndex: index,
                    link: segment.link
                  })
                }
              />
              <Button
                label="Удалить ссылку"
                danger
                onPress={() => commit(removeStudyRichTextLink(segments, index))}
              />
            </View>
          </View>
        )
      )}
      <Button label="+ Ссылка в позицию курсора" onPress={openInsert} />
      {picker ? (
        <StudyInternalLinkPicker
          initialLink={picker.mode === 'edit' ? picker.link : undefined}
          searchTargets={searchTargets}
          save={savePicker}
          close={() => setPicker(null)}
        />
      ) : null}
    </View>
  )
}
