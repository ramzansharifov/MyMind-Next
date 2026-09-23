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
  wrapCarouselIndex
} from '../../shared/ui/mobile-create-action-gesture'
import { useMobileCreateActionOverlay } from '../../shared/ui/MobileCreateActionOverlayContext'
import { VisualIconBadge, VisualIconGlyph } from '../../shared/ui/VisualPickers'
import { useTheme } from '../../shared/ui/theme'
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

function relativeCarouselSlot(itemIndex: number, currentIndex: number, length: number): number {
  if (length <= 1) return 0

  let slot = wrapCarouselIndex(itemIndex - currentIndex, length)
  if (slot > length / 2) slot -= length
  return slot
}

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

  const settle = (): void => {
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
        offsetY.setValue(selection.offsetY)
        if (selection.index !== selectedIndex) onSelectedIndexChange(selection.index)
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
      {options.map((option, optionIndex) => {
        const slot = relativeCarouselSlot(optionIndex, selectedIndex, options.length)
        if (Math.abs(slot) > 2) return null

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
            key={option.key}
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
                elevation: active ? 16 : 5,
                shadowColor: '#000000',
                shadowOpacity: active ? 0.34 : 0.16,
                shadowRadius: active ? 22 : 10,
                shadowOffset: { width: 0, height: active ? 12 : 5 }
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
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [destinationAccountId, setDestinationAccountId] = useState('')
  const [tagId, setTagId] = useState('')
  const [amount, setAmount] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [impact, setImpact] = useState<FinanceLimitImpact | null>(null)
  const [impactConfirmed, setImpactConfirmed] = useState(false)
  const [stageOpacity] = useState(() => new Animated.Value(0))
  const [stageTranslateY] = useState(() => new Animated.Value(-62))
  const [stageScale] = useState(() => new Animated.Value(0.97))
  const [carouselBusy, setCarouselBusy] = useState(false)

  const tone = financeOperationTone(type, theme.accent)
  const operationLabel = type === 'income' ? 'Доход' : type === 'expense' ? 'Расход' : 'Перевод'
  const operationIcon: AppIconName =
    type === 'income' ? 'income' : type === 'expense' ? 'expense' : 'transfer'

  const sourceAccount = accounts.find((account) => account.id === sourceAccountId)
  const destinationAccount = accounts.find((account) => account.id === destinationAccountId)

  const enterStage = useCallback((): void => {
    stageOpacity.setValue(0)
    stageTranslateY.setValue(-62)
    stageScale.setValue(0.97)
    Animated.parallel([
      Animated.timing(stageOpacity, {
        toValue: 1,
        duration: 210,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.spring(stageTranslateY, {
        toValue: 0,
        damping: 24,
        stiffness: 230,
        mass: 0.78,
        overshootClamping: true,
        useNativeDriver: true
      }),
      Animated.spring(stageScale, {
        toValue: 1,
        damping: 24,
        stiffness: 230,
        mass: 0.78,
        overshootClamping: true,
        useNativeDriver: true
      })
    ]).start()
  }, [stageOpacity, stageScale, stageTranslateY])

  useEffect(() => {
    requestAnimationFrame(enterStage)
  }, [enterStage])

  const transitionNext = (): void => {
    if (stageIndex >= stages.length - 1) return

    Animated.parallel([
      Animated.timing(stageOpacity, {
        toValue: 0,
        duration: 190,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(stageTranslateY, {
        toValue: 136,
        duration: 215,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(stageScale, {
        toValue: 0.96,
        duration: 215,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      })
    ]).start(() => {
      setStageIndex((index) => index + 1)
      setCarouselIndex(0)
      requestAnimationFrame(enterStage)
    })
  }

  const close = (): void => {
    if (pending) return
    createOverlay?.hide()
    onClose()
  }

  const accountOptions = useMemo(
    () =>
      accounts.map<CarouselOption>((account) => ({
        key: account.id,
        title: account.name,
        subtitle: `${formatMoneyMinor(account.balanceMinor, account.currencyCode)} · ${account.currencyCode}`,
        tone: theme.accent,
        icon: { kind: 'visual', value: account.icon }
      })),
    [accounts, theme.accent]
  )

  const destinationOptions = useMemo(
    () => accountOptions.filter((option) => option.key !== sourceAccountId),
    [accountOptions, sourceAccountId]
  )

  const tagOptions = useMemo(
    () =>
      compatibleTags.map<CarouselOption>((tag) => ({
        key: tag.id,
        title: tag.name,
        subtitle:
          tag.type === 'both' ? 'Доходы и расходы' : tag.type === 'income' ? 'Доход' : 'Расход',
        tone: financeOperationTone(type, theme.accent),
        icon: { kind: 'glyph', value: tag.icon }
      })),
    [compatibleTags, theme.accent, type]
  )

  const currentOptions =
    stage === 'source-account'
      ? accountOptions
      : stage === 'destination-account'
        ? destinationOptions
        : tagOptions

  const confirmCarouselSelection = (): void => {
    if (carouselBusy) return
    const safeIndex = Math.min(carouselIndex, Math.max(0, currentOptions.length - 1))
    const option = currentOptions[safeIndex]
    if (!option) {
      setError('Нет доступных вариантов для выбора')
      return
    }

    setError('')
    setImpact(null)
    setImpactConfirmed(false)

    if (stage === 'source-account') {
      setSourceAccountId(option.key)
      if (destinationAccountId === option.key) setDestinationAccountId('')
    } else if (stage === 'destination-account') {
      setDestinationAccountId(option.key)
    } else if (stage === 'tag') {
      setTagId(option.key)
    }

    transitionNext()
  }

  const save = (): void => {
    if (pending) return
    setError('')

    try {
      const source = accounts.find((account) => account.id === sourceAccountId)
      if (!source) throw new Error('Выберите счёт')
      const amountMinor = parseMoneyToMinor(amount, source.currencyCode)
      if (amountMinor <= 0) throw new Error('Сумма должна быть больше нуля')
      const occurredAt = Date.now()

      if (type === 'expense' && !impactConfirmed) {
        if (!tagId) throw new Error('Выберите тег')
        const nextImpact = api.previewExpenseImpact({
          accountId: source.id,
          tagId,
          amountMinor,
          occurredAt,
          excludeTransactionId: null
        })
        if (nextImpact.items.length) {
          setImpact(nextImpact)
          setImpactConfirmed(true)
          return
        }
      }

      setPending(true)

      if (type === 'transfer') {
        const destination = accounts.find((account) => account.id === destinationAccountId)
        if (!destination) throw new Error('Выберите счёт зачисления')
        const destinationAmountMinor = parseMoneyToMinor(amount, destination.currencyCode)
        api.createTransaction(
          validation.createFinanceTransactionInputSchema.parse({
            type: 'transfer',
            sourceAccountId: source.id,
            destinationAccountId: destination.id,
            sourceAmountMinor: amountMinor,
            destinationAmountMinor,
            exchangeRateScaled: FINANCE_RATE_SCALE,
            occurredAt,
            comment: '',
            templateId: null
          })
        )
      } else {
        if (!tagId) throw new Error('Выберите тег')
        api.createTransaction(
          validation.createFinanceTransactionInputSchema.parse({
            type,
            accountId: source.id,
            amountMinor,
            tagId,
            occurredAt,
            comment: '',
            templateId: null
          })
        )
      }

      notifyDataChanged()
      onSaved()
      toast.success('Операция создана')
      createOverlay?.hide()
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить операцию')
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="none"
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={StyleSheet.absoluteFill}
      >
        <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 22 }}>
          <View
            style={{
              minHeight: 44,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10
            }}
          >
            <View
              style={{
                minHeight: 38,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 11,
                borderWidth: 1,
                borderColor: tone + '50',
                borderRadius: 13,
                backgroundColor: '#111318E8'
              }}
            >
              <AppIcon name={operationIcon} size={17} color={tone} />
              <Text style={{ color: tone, fontSize: 12.5, fontWeight: '700' }}>
                {operationLabel}
              </Text>
            </View>

            <View style={{ flex: 1 }} />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Закрыть быстрый ввод"
              disabled={pending}
              onPress={close}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: '#111318E8',
                opacity: pressed ? 0.72 : 1
              })}
            >
              <AppIcon name="close" size={18} color={theme.muted} />
            </Pressable>
          </View>

          <Animated.View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: stageOpacity,
              transform: [{ translateY: stageTranslateY }, { scale: stageScale }]
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontSize: 23,
                lineHeight: 29,
                fontWeight: '700',
                textAlign: 'center',
                letterSpacing: -0.4
              }}
            >
              {stageTitle(stage, type)}
            </Text>

            {stage !== 'amount' ? (
              <>
                <Text
                  style={{
                    marginTop: 8,
                    color: theme.muted,
                    fontSize: 11.5,
                    lineHeight: 17,
                    fontWeight: '600',
                    textAlign: 'center'
                  }}
                >
                  Проведите вверх или вниз · затем нажмите «Дальше»
                </Text>

                <View style={{ marginTop: 12, width: '100%', alignItems: 'center' }}>
                  <QuickCarousel
                    options={currentOptions}
                    selectedIndex={Math.min(carouselIndex, Math.max(0, currentOptions.length - 1))}
                    onSelectedIndexChange={setCarouselIndex}
                    onBusyChange={setCarouselBusy}
                  />
                </View>
              </>
            ) : (
              <View
                style={{
                  width: '100%',
                  maxWidth: 330,
                  marginTop: 24,
                  gap: 12
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 18,
                    paddingVertical: 18,
                    borderWidth: 1,
                    borderColor: tone + '55',
                    borderRadius: 22,
                    backgroundColor: '#111318F7'
                  }}
                >
                  <TextInput
                    autoFocus
                    accessibilityLabel="Сумма операции"
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={(value) => {
                      setAmount(value)
                      setError('')
                      setImpact(null)
                      setImpactConfirmed(false)
                    }}
                    placeholder="0.00"
                    placeholderTextColor={theme.muted}
                    selectionColor={tone}
                    style={{
                      color: theme.text,
                      fontSize: 34,
                      lineHeight: 42,
                      fontWeight: '700',
                      textAlign: 'center',
                      fontVariant: ['tabular-nums']
                    }}
                  />
                  <Text
                    style={{
                      marginTop: 6,
                      color: theme.muted,
                      fontSize: 12,
                      lineHeight: 17,
                      fontWeight: '600',
                      textAlign: 'center'
                    }}
                  >
                    {sourceAccount
                      ? type === 'transfer' && destinationAccount
                        ? `${sourceAccount.currencyCode} → ${destinationAccount.currencyCode}`
                        : sourceAccount.currencyCode
                      : 'Выберите счёт'}
                  </Text>
                </View>

                {error ? (
                  <Text
                    style={{
                      color: theme.error,
                      fontSize: 12,
                      lineHeight: 17,
                      textAlign: 'center'
                    }}
                  >
                    {error}
                  </Text>
                ) : null}

                {impact ? (
                  <View
                    style={{
                      padding: 11,
                      borderWidth: 1,
                      borderColor: '#f59e0b55',
                      borderRadius: 13,
                      backgroundColor: '#f59e0b12'
                    }}
                  >
                    <Text
                      style={{
                        color: '#fbbf24',
                        fontSize: 11.5,
                        lineHeight: 16,
                        fontWeight: '700',
                        textAlign: 'center'
                      }}
                    >
                      Расход затронет {impact.items.length} лимит(а). Нажмите ещё раз для
                      подтверждения.
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </Animated.View>

          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              right: 0,
              bottom: 20,
              left: 0,
              alignItems: 'center'
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                stage === 'amount'
                  ? pending
                    ? 'Сохранение'
                    : impactConfirmed
                      ? 'Подтвердить расход'
                      : 'Создать операцию'
                  : 'Дальше'
              }
              disabled={
                pending || carouselBusy || (stage !== 'amount' && currentOptions.length === 0)
              }
              onPress={stage === 'amount' ? save : confirmCarouselSelection}
              style={({ pressed }) => ({
                minWidth: 176,
                minHeight: 50,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 24,
                borderRadius: 15,
                borderWidth: 1,
                borderColor: tone + '55',
                backgroundColor: tone,
                opacity:
                  pending || carouselBusy || (stage !== 'amount' && currentOptions.length === 0)
                    ? 0.45
                    : pressed
                      ? 0.8
                      : 1
              })}
            >
              <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>
                {stage === 'amount'
                  ? pending
                    ? 'Сохранение…'
                    : impactConfirmed
                      ? 'Подтвердить расход'
                      : 'Создать'
                  : 'Дальше'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
