import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type GestureResponderEvent
} from 'react-native'
import type {
  FinanceAccountSummary,
  FinanceLimitImpact,
  FinanceTagSummary,
  FinanceUserTransactionType
} from '@mymind/contracts/finance'
import type { FinanceRepository } from '@mymind/persistence/finance'
import { FINANCE_RATE_SCALE, formatMoneyMinor, parseMoneyToMinor } from '@mymind/core/finance-money'
import * as validation from '@mymind/core/validation/finance'

import { notifyDataChanged } from '../../app/changes'
import { AppIcon, type AppIconName } from '../../shared/ui/icons'
import {
  MOBILE_CREATE_ACTION_STEP,
  mobileCreateActionSelection,
  visibleCarouselSlots,
  wrapCarouselIndex
} from '../../shared/ui/mobile-create-action-gesture'
import { useMobileCreateActionOverlay } from '../../shared/ui/MobileCreateActionOverlayContext'
import { VisualIconBadge, VisualIconGlyph } from '../../shared/ui/VisualPickers'
import { useTheme } from '../../shared/ui/theme'
import { useFrameGesture } from '../../shared/ui/useFrameGesture'
import { useToast } from '../../shared/ui/toast-context'
import {
  financeQuickCompatibleTags,
  financeQuickTransactionStages,
  type FinanceQuickTransactionStage
} from './finance-quick-transaction'
import { financeOperationTone } from './finance-semantic-colors'

interface CarouselOption {
  key: string
  title: string
  subtitle: string
  tone: string
  icon:
    | { kind: 'app'; value: AppIconName }
    | { kind: 'visual'; value: string }
    | { kind: 'glyph'; value: string }
}

const CAROUSEL_HEIGHT = 382
const CARD_HEIGHT = 108
const CARD_TOP = (CAROUSEL_HEIGHT - CARD_HEIGHT) / 2
const HALF_STEP = MOBILE_CREATE_ACTION_STEP / 2

function slotScaleRange(slot: number): [number, number, number] {
  if (slot === 0) return [0.95, 1, 0.95]
  if (slot === -1) return [0.82, 0.9, 0.95]
  if (slot === 1) return [0.95, 0.9, 0.82]
  if (slot < -1) return [0.74, 0.8, 0.82]
  return [0.82, 0.8, 0.74]
}

function slotOpacityRange(slot: number): [number, number, number] {
  if (slot === 0) return [0.86, 1, 0.86]
  if (slot === -1) return [0.22, 0.58, 0.86]
  if (slot === 1) return [0.86, 0.58, 0.22]
  if (slot < -1) return [0.02, 0.1, 0.22]
  return [0.22, 0.1, 0.02]
}

function QuickSelectionChip({
  label,
  tone,
  icon
}: {
  label: string
  tone: string
  icon?: AppIconName
}): React.JSX.Element {
  const [progress] = useState(() => new Animated.Value(0))

  useEffect(() => {
    Animated.spring(progress, {
      toValue: 1,
      damping: 20,
      stiffness: 260,
      mass: 0.72,
      overshootClamping: true,
      useNativeDriver: true
    }).start()
  }, [progress])

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0]
  })
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1]
  })

  return (
    <Animated.View
      style={{
        maxWidth: 185,
        minHeight: 36,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: tone + '50',
        borderRadius: 12,
        backgroundColor: '#111318E8',
        opacity: progress,
        transform: [{ translateY }, { scale }]
      }}
    >
      {icon ? <AppIcon name={icon} size={15.5} color={tone} strokeWidth={2.2} /> : null}
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          flexShrink: 1,
          color: tone,
          fontSize: 11.5,
          lineHeight: 16,
          fontWeight: '700'
        }}
      >
        {label}
      </Text>
    </Animated.View>
  )
}

function QuickCarousel({
  options,
  selectedIndex,
  onSelectedIndexChange,
  onBusyChange
}: {
  options: readonly CarouselOption[]
  selectedIndex: number
  onSelectedIndexChange(index: number): void
  onBusyChange(busy: boolean): void
}): React.JSX.Element {
  const theme = useTheme()
  const [offsetY] = useState(() => new Animated.Value(0))
  const gestureStartYRef = useRef(0)
  const gestureBaseIndexRef = useRef(0)
  const displayedIndexRef = useRef(selectedIndex)
  displayedIndexRef.current = selectedIndex
  const motion = useFrameGesture((selection: { index: number; offsetY: number }) => {
    offsetY.setValue(selection.offsetY)
    if (displayedIndexRef.current !== selection.index) {
      displayedIndexRef.current = selection.index
      onSelectedIndexChange(selection.index)
    }
  })

  const settle = (): void => {
    motion.flush()
    offsetY.stopAnimation()
    Animated.spring(offsetY, {
      toValue: 0,
      damping: 25,
      stiffness: 250,
      mass: 0.75,
      overshootClamping: true,
      useNativeDriver: true
    }).start(() => onBusyChange(false))
  }

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={
        options[selectedIndex] ? `Выбрано: ${options[selectedIndex].title}` : 'Карусель выбора'
      }
      onStartShouldSetResponder={() => options.length > 0}
      onMoveShouldSetResponder={() => options.length > 0}
      onResponderGrant={(event: GestureResponderEvent) => {
        if (!options.length) return
        gestureStartYRef.current = event.nativeEvent.pageY
        gestureBaseIndexRef.current = selectedIndex
        onBusyChange(true)
        motion.cancel()
        offsetY.stopAnimation()
        offsetY.setValue(0)
      }}
      onResponderMove={(event: GestureResponderEvent) => {
        if (!options.length) return
        const selection = mobileCreateActionSelection(
          event.nativeEvent.pageY - gestureStartYRef.current,
          options.length,
          gestureBaseIndexRef.current,
          MOBILE_CREATE_ACTION_STEP
        )
        motion.schedule(selection)
      }}
      onResponderRelease={settle}
      onResponderTerminationRequest={() => false}
      onResponderTerminate={settle}
      style={{
        width: '100%',
        maxWidth: 360,
        height: CAROUSEL_HEIGHT,
        overflow: 'hidden'
      }}
    >
      {visibleCarouselSlots(options.length, selectedIndex).map(({ index: optionIndex, slot }) => {
        const option = options[optionIndex]

        const scale = offsetY.interpolate({
          inputRange: [-HALF_STEP, 0, HALF_STEP],
          outputRange: slotScaleRange(slot),
          extrapolate: 'clamp'
        })
        const opacity = offsetY.interpolate({
          inputRange: [-HALF_STEP, 0, HALF_STEP],
          outputRange: slotOpacityRange(slot),
          extrapolate: 'clamp'
        })
        const translateY = offsetY.interpolate({
          inputRange: [-HALF_STEP, HALF_STEP],
          outputRange: [
            slot * MOBILE_CREATE_ACTION_STEP - HALF_STEP,
            slot * MOBILE_CREATE_ACTION_STEP + HALF_STEP
          ],
          extrapolate: 'clamp'
        })
        const active = slot === 0

        return (
          <Animated.View
            key={options.length === 2 ? option.key + ':' + slot : option.key}
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: CARD_TOP,
              right: 0,
              left: 0,
              height: CARD_HEIGHT,
              alignItems: 'center',
              justifyContent: 'center',
              opacity,
              transform: [{ translateY }, { scale }]
            }}
          >
            <View
              style={{
                width: '88%',
                maxWidth: 310,
                height: CARD_HEIGHT,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderWidth: 1,
                borderColor: active ? option.tone + '78' : option.tone + '2E',
                borderRadius: 22,
                backgroundColor: active ? '#111318FA' : '#111318F2',
                elevation: 8,
                shadowColor: '#000000',
                shadowOpacity: 0.22,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 7 }
              }}
            >
              {option.icon.kind === 'visual' ? (
                <VisualIconBadge value={option.icon.value} size={48} />
              ) : (
                <View
                  style={{
                    width: 48,
                    height: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: option.tone + (active ? '5C' : '36'),
                    borderRadius: 15,
                    backgroundColor: option.tone + (active ? '1D' : '12')
                  }}
                >
                  {option.icon.kind === 'glyph' ? (
                    <VisualIconGlyph
                      value={option.icon.value}
                      size={active ? 23 : 21}
                      color={option.tone}
                    />
                  ) : (
                    <AppIcon
                      name={option.icon.value}
                      size={active ? 23 : 21}
                      strokeWidth={2.3}
                      color={option.tone}
                    />
                  )}
                </View>
              )}

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.text,
                    fontSize: active ? 20 : 17,
                    lineHeight: active ? 25 : 22,
                    fontWeight: '700',
                    letterSpacing: active ? -0.3 : -0.15
                  }}
                >
                  {option.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    marginTop: 5,
                    color: theme.muted,
                    fontSize: active ? 12 : 11.5,
                    lineHeight: 16,
                    fontWeight: '500'
                  }}
                >
                  {option.subtitle}
                </Text>
              </View>

              {active ? (
                <View
                  style={{
                    width: 28,
                    height: 28,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 9,
                    backgroundColor: option.tone + '12'
                  }}
                >
                  <AppIcon name="check" size={15} color={option.tone} />
                </View>
              ) : null}
            </View>
          </Animated.View>
        )
      })}
      {Platform.OS === 'web' && options.length > 1 ? (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', bottom: 2, left: 0, right: 0, alignItems: 'center' }}
        >
          <Text
            style={{
              color: theme.muted,
              fontSize: 12,
              fontWeight: '700',
              fontVariant: ['tabular-nums']
            }}
          >
            {selectedIndex + 1} / {options.length}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

function stageTitle(stage: FinanceQuickTransactionStage, type: FinanceUserTransactionType): string {
  if (stage === 'source-account') {
    return type === 'transfer' ? 'Счёт списания' : 'Выберите счёт'
  }
  if (stage === 'destination-account') return 'Счёт зачисления'
  if (stage === 'tag') return 'Выберите тег'
  return 'Введите сумму'
}

export function FinanceQuickTransactionFlow({
  type,
  api,
  accounts,
  tags,
  onClose,
  onSaved
}: {
  type: FinanceUserTransactionType
  api: FinanceRepository
  accounts: FinanceAccountSummary[]
  tags: FinanceTagSummary[]
  onClose(): void
  onSaved(): void
}): React.JSX.Element {
  const theme = useTheme()
  const toast = useToast()
  const createOverlay = useMobileCreateActionOverlay()
  const stages = useMemo(() => financeQuickTransactionStages(type), [type])
  const compatibleTags = useMemo(() => financeQuickCompatibleTags(tags, type), [tags, type])
  const [stageIndex, setStageIndex] = useState(0)
  const stage = stages[stageIndex]
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [sourc