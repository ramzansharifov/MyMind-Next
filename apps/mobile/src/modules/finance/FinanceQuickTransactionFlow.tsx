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
  wrapCarouselIndex
} from '../../shared/ui/mobile-create-action-gesture'
import { useMobileCreateActionOverlay } from '../../shared/ui/MobileCreateActionOverlayContext'
import { VisualIconBadge } from '../../shared/ui/VisualPickers'
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
  icon: { kind: 'app'; value: AppIconName } | { kind: 'visual'; value: string }
}

const CAROUSEL_HEIGHT = 356
const CARD_HEIGHT = 104
const CARD_TOP = (CAROUSEL_HEIGHT - CARD_HEIGHT) / 2
const SWIPE_THRESHOLD = 54

function slotScale(slot: number): [number, number, number] {
  if (slot === 0) return [0.91, 1, 0.91]
  if (slot === -1) return [0.78, 0.88, 1]
  if (slot === 1) return [1, 0.88, 0.78]
  return [0.68, 0.74, 0.78]
}

function slotOpacity(slot: number): [number, number, number] {
  if (slot === 0) return [0.82, 1, 0.82]
  if (slot === -1) return [0.1, 0.5, 0.82]
  if (slot === 1) return [0.82, 0.5, 0.1]
  return [0.01, 0.06, 0.1]
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
  const [dragY] = useState(() => new Animated.Value(0))
  const startYRef = useRef(0)
  const currentYRef = useRef(0)
  const settlingRef = useRef(false)

  const settle = (direction: -1 | 1): void => {
    if (settlingRef.current || options.length < 2) return
    settlingRef.current = true
    onBusyChange(true)
    const target = direction === 1 ? -MOBILE_CREATE_ACTION_STEP : MOBILE_CREATE_ACTION_STEP

    Animated.timing(dragY, {
      toValue: target,
      duration: 175,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start(() => {
      onSelectedIndexChange(wrapCarouselIndex(selectedIndex + direction, options.length))
      dragY.setValue(0)
      settlingRef.current = false
      onBusyChange(false)
    })
  }

  const selected = options[selectedIndex]

  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={selected ? `Выбрано: ${selected.title}` : 'Карусель выбора'}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(event: GestureResponderEvent) => {
        if (settlingRef.current) return
        startYRef.current = event.nativeEvent.pageY
        currentYRef.current = event.nativeEvent.pageY
        dragY.stopAnimation()
      }}
      onResponderMove={(event: GestureResponderEvent) => {
        if (settlingRef.current) return
        currentYRef.current = event.nativeEvent.pageY
        const dy = currentYRef.current - startYRef.current
        dragY.setValue(
          Math.max(-MOBILE_CREATE_ACTION_STEP, Math.min(MOBILE_CREATE_ACTION_STEP, dy))
        )
      }}
      onResponderRelease={() => {
        if (settlingRef.current || !selected) return
        const dy = currentYRef.current - startYRef.current
        if (Math.abs(dy) < 12) {
          Animated.spring(dragY, {
            toValue: 0,
            damping: 24,
            stiffness: 250,
            mass: 0.75,
            useNativeDriver: true
          }).start()
          return
        }
        if (Math.abs(dy) >= SWIPE_THRESHOLD && options.length > 1) {
          settle(dy < 0 ? 1 : -1)
          return
        }
        Animated.spring(dragY, {
          toValue: 0,
          damping: 24,
          stiffness: 250,
          mass: 0.75,
          useNativeDriver: true
        }).start()
      }}
      onResponderTerminationRequest={() => false}
      onResponderTerminate={() => {
        Animated.spring(dragY, {
          toValue: 0,
          damping: 24,
          stiffness: 250,
          mass: 0.75,
          useNativeDriver: true
        }).start()
      }}
      style={{
        width: '100%',
        maxWidth: 360,
        height: CAROUSEL_HEIGHT,
        overflow: 'hidden'
      }}
    >
      {(options.length === 1
        ? [0]
        : options.length <= 3
          ? [-1, 0, 1]
          : [-2, -1, 0, 1, 2]
      ).map((slot) => {
        const optionIndex = wrapCarouselIndex(selectedIndex + slot, options.length)
        const option = options[optionIndex]
        if (!option) return null

        const scale = dragY.interpolate({
          inputRange: [-MOBILE_CREATE_ACTION_STEP, 0, MOBILE_CREATE_ACTION_STEP],
          outputRange: slotScale(slot),
          extrapolate: 'clamp'
        })
        const opacity = dragY.interpolate({
          inputRange: [-MOBILE_CREATE_ACTION_STEP, 0, MOBILE_CREATE_ACTION_STEP],
          outputRange: slotOpacity(slot),
          extrapolate: 'clamp'
        })
        const translateY = dragY.interpolate({
          inputRange: [-MOBILE_CREATE_ACTION_STEP, MOBILE_CREATE_ACTION_STEP],
          outputRange: [
            slot * MOBILE_CREATE_ACTION_STEP - MOBILE_CREATE_ACTION_STEP,
            slot * MOBILE_CREATE_ACTION_STEP + MOBILE_CREATE_ACTION_STEP
          ],
          extrapolate: 'clamp'
        })
        const active = slot === 0

        return (
          <Animated.View
            key={`${slot}:${option.key}`}
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
                gap: 13,
                paddingHorizontal: 15,
                borderWidth: 1,
                borderColor: active ? option.tone + '80' : option.tone + '30',
                borderRadius: 21,
                backgroundColor: active ? '#111318FA' : '#111318F0',
                elevation: active ? 14 : 4,
                shadowColor: '#000000',
                shadowOpacity: active ? 0.34 : 0.14,
                shadowRadius: active ? 20 : 8,
                shadowOffset: { width: 0, height: active ? 10 : 4 }
              }}
            >
              {option.icon.kind === 'visual' ? (
                <VisualIconBadge value={option.icon.value} size={46} />
              ) : (
                <View
                  style={{
                    width: 46,
                    height: 46,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: option.tone + '50',
                    borderRadius: 14,
                    backgroundColor: option.tone + '18'
                  }}
                >
                  <AppIcon
                    name={option.icon.value}
                    size={22}
                    strokeWidth={2.3}
                    color={option.tone}
                  />
                </View>
              )}

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.text,
                    fontSize: active ? 18.5 : 16,
                    lineHeight: 23,
                    fontWeight: '700'
                  }}
                >
                  {option.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    marginTop: 4,
                    color: theme.muted,
                    fontSize: 11.5,
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
                    backgroundColor: option.tone + '14'
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
        icon: { kind: 'visual', value: tag.icon }
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
                pending ||
                carouselBusy ||
                (stage !== 'amount' && currentOptions.length === 0)
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
                  pending ||
                  carouselBusy ||
                  (stage !== 'amount' && currentOptions.length === 0)
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
