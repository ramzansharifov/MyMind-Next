import { useMemo, useState } from 'react'
import { Text, View } from 'react-native'

import { Button, Label } from '../shared/ui/primitives'
import { WorkspaceNodeCard, WorkspacePanel } from '../shared/ui/Workspace'
import { useTheme } from '../shared/ui/theme'
import {
  boardsInstructionArticles,
  learningInstructionArticles,
  type MobileInstructionArticle
} from './settings-instructions-catalog'

type InstructionGroup = 'learning' | 'boards'

export function SettingsInstructions(): React.JSX.Element {
  const theme = useTheme()
  const [group, setGroup] = useState<InstructionGroup | null>(null)
  const [articleId, setArticleId] = useState<string | null>(null)

  const articles = group === 'learning' ? learningInstructionArticles : boardsInstructionArticles
  const article = useMemo(
    () => articles.find((item) => item.id === articleId) ?? null,
    [articleId, articles]
  )

  if (article) {
    return (
      <View style={{ gap: 14 }}>
        <View style={{ alignItems: 'flex-start' }}>
          <Button
            label={group === 'learning' ? 'Назад к обучению' : 'Назад к доскам'}
            icon="back"
            onPress={() => setArticleId(null)}
          />
        </View>
        <WorkspacePanel title={article.title} description={article.summary} icon="info">
          <View style={{ gap: 18 }}>
            {article.sections.map((section) => (
              <View key={section.title} style={{ gap: 8 }}>
                <Label title>{section.title}</Label>
                {section.paragraphs?.map((paragraph) => (
                  <Text
                    key={paragraph}
                    style={{ color: theme.text, fontSize: 13, lineHeight: 20 }}
                  >
                    {paragraph}
                  </Text>
                ))}
                {section.bullets?.map((bullet) => (
                  <InstructionLine key={bullet} text={bullet} marker="•" />
                ))}
                {section.steps?.map((step, index) => (
                  <InstructionLine key={step} text={step} marker={`${index + 1}.`} />
                ))}
                {section.note ? (
                  <View
                    style={{
                      padding: 12,
                      borderWidth: 1,
                      borderColor: theme.accent + '45',
                      borderRadius: 14,
                      backgroundColor: theme.accent + '0D'
                    }}
                  >
                    <Text style={{ color: theme.text, fontSize: 12.5, lineHeight: 19 }}>
                      {section.note}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </WorkspacePanel>
      </View>
    )
  }

  if (group) {
    const title = group === 'learning' ? 'Обучение' : 'Доски'
    const description =
      group === 'learning'
        ? 'Библиотека, материалы, режимы работы и все типы блоков.'
        : 'Структура досок, холст, управление и интеграция с обучением.'

    return (
      <View style={{ gap: 14 }}>
        <View style={{ alignItems: 'flex-start' }}>
          <Button
            label="Назад к инструкциям"
            icon="back"
            onPress={() => {
              setGroup(null)
              setArticleId(null)
            }}
          />
        </View>
        <WorkspacePanel
          title={title}
          description={`${description} · ${articles.length} инструкций`}
          icon={group === 'learning' ? 'study' : 'boards'}
        >
          <InstructionArticleList articles={articles} open={setArticleId} />
        </WorkspacePanel>
      </View>
    )
  }

  return (
    <View style={{ gap: 12 }}>
      <WorkspaceNodeCard
        title="Обучение"
        subtitle={`${learningInstructionArticles.length} инструкций · библиотека, материалы и все типы блоков`}
        leadingIcon="study"
        onPress={() => setGroup('learning')}
      />
      <WorkspaceNodeCard
        title="Доски"
        subtitle={`${boardsInstructionArticles.length} инструкций · холст, папки и связи с обучением`}
        leadingIcon="boards"
        onPress={() => setGroup('boards')}
      />
      <View
        style={{
          marginTop: 2,
          padding: 13,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 14,
          backgroundColor: theme.surface
        }}
      >
        <Label muted>
          Инструкции адаптированы под мобильное управление. Сами сущности, правила данных и связи
          совпадают с desktop-версией MyMind.
        </Label>
      </View>
    </View>
  )
}

function InstructionArticleList({
  articles,
  open
}: {
  articles: MobileInstructionArticle[]
  open(id: string): void
}): React.JSX.Element {
  const categories = [...new Set(articles.map((article) => article.category))]

  return (
    <View style={{ gap: 18 }}>
      {categories.map((category) => {
        const items = articles.filter((article) => article.category === category)
        return (
          <View key={category} style={{ gap: 8 }}>
            <Label title>{category}</Label>
            {items.map((article) => (
              <WorkspaceNodeCard
                key={article.id}
                title={article.title}
                subtitle={article.summary}
                leadingIcon="info"
                onPress={() => open(article.id)}
              />
            ))}
          </View>
        )
      })}
    </View>
  )
}

function InstructionLine({
  marker,
  text
}: {
  marker: string
  text: string
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <Text
        style={{
          width: marker === '•' ? 10 : 22,
          color: theme.accent,
          fontSize: 13,
          lineHeight: 20,
          fontWeight: '700'
        }}
      >
        {marker}
      </Text>
      <Text style={{ flex: 1, color: theme.text, fontSize: 13, lineHeight: 20 }}>{text}</Text>
    </View>
  )
}
