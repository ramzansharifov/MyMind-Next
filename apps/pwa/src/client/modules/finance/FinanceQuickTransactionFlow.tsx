import type { PointerEvent } from 'react'
import { motionValue, mapValue, motion } from 'framer-motion'
import {
  playMotion,
  motionStep,
  stopMotion,
  parallelMotion,
  DialogLayer,
  Action,
  TextControl
} from '../../../ui/browser'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  visibleCarouselSlots
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
    | {
        kind: 'app'
        value: AppIconName
      }
    | {
        kind: 'visual'
        value: string
      }
    | {
        kind: 'glyph'
        value: string
      }
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
  const [progress] = useState(() => motionValue(0))
  useEffect(() => {
    playMotion(
      motionStep(progress, 1, {
        damping: 20,
        stiffness: 260,
        mass: 0.72,
        type: 'spring'
      })
    )
  }, [progress])
  const translateY = mapValue(progress, [0, 1], [-8, 0], {
    clamp: true
  })
  const scale = mapValue(progress, [0, 1], [0.94, 1], {
    clamp: true
  })
  return (
    <motion.div
      className="ui-stack"
      style={{
        maxWidth: 185,
        minHeight: 36,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingInline: 10,
        borderWidth: 1,
        borderColor: tone + '50',
        borderRadius: 12,
        backgroundColor: '#111318E8',
        opacity: progress,
        y: translateY,
        scale: scale
      }}
    >
      {icon ? <AppIcon name={icon} size={15.5} color={tone} strokeWidth={2.2} /> : null}
      <span
        className="ui-text"
        data-lines={1}
        style={{
          flexShrink: 1,
          color: tone,
          fontSize: 11.5,
          lineHeight: '16px',
          fontWeight: 700,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 1
        }}
      >
        {label}
      </span>
    </motion.div>
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
  const [offsetY] = useState(() => motionValue(0))
  const gestureStartYRef = useRef(0)
  const gestureBaseIndexRef = useRef(0)
  const displayedIndexRef = useRef(selectedIndex)
  useLayoutEffect(() => {
    displayedIndexRef.current = selectedIndex
  }, [selectedIndex])
  const carouselMotion = useFrameGesture((selection: { index: number; offsetY: number }) => {
    offsetY.set(selection.offsetY)
    if (displayedIndexRef.current !== selection.index) {
      displayedIndexRef.current = selection.index
      onSelectedIndexChange(selection.index)
    }
  })
  const settle = (): void => {
    carouselMotion.flush()
    stopMotion(offsetY)
    playMotion(
      motionStep(offsetY, 0, {
        damping: 25,
        stiffness: 250,
        mass: 0.75,
        type: 'spring'
      }),
      () => onBusyChange(false)
    )
  }
  return (
    <div
      className="ui-stack"
      role={'slider'}
      aria-label={
        options[selectedIndex] ? `Выбрано: ${options[selectedIndex].title}` : 'Карусель выбора'
      }
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary) return
        event.currentTarget.setPointerCapture(event.pointerId)
        ;((event: PointerEvent<HTMLElement>) => {
          if (!options.length) return
          gestureStartYRef.current = event.pageY
          gestureBaseIndexRef.current = selectedIndex
          onBusyChange(true)
          carouselMotion.cancel()
          stopMotion(offsetY)
          offsetY.set(0)
        })(event)
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          ((event: PointerEvent<HTMLElement>) => {
            if (!options.length) return
            const selection = mobileCreateActionSelection(
              event.pageY - gestureStartYRef.current,
              options.length,
              gestureBaseIndexRef.current,
              MOBILE_CREATE_ACTION_STEP
            )
            carouselMotion.schedule(selection)
          })(event)
      }}
      onPointerUp={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
        settle()
        event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onPointerCancel={settle}
      style={{
        width: '100%',
        maxWidth: 360,
        height: CAROUSEL_HEIGHT,
        overflow: 'hidden',
        touchAction: 'none'
      }}
    >
      {visibleCarouselSlots(options.length, selectedIndex).map(({ index: optionIndex, slot }) => {
        const option = options[optionIndex]
        const scale = mapValue(offsetY, [-HALF_STEP, 0, HALF_STEP], slotScaleRange(slot), {
          clamp: true
        })
        const opacity = mapValue(offsetY, [-HALF_STEP, 0, HALF_STEP], slotOpacityRange(slot), {
          clamp: true
        })
        const translateY = mapValue(
          offsetY,
          [-HALF_STEP, HALF_STEP],
          [
            slot * MOBILE_CREATE_ACTION_STEP - HALF_STEP,
            slot * MOBILE_CREATE_ACTION_STEP + HALF_STEP
          ],
          {
            clamp: true
          }
        )
        const active = slot === 0
        return (
          <motion.div
            className="ui-stack"
            key={options.length === 2 ? option.key + ':' + slot : option.key}
            style={{
              position: 'absolute',
              top: CARD_TOP,
              right: 0,
              left: 0,
              height: CARD_HEIGHT,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: opacity,
              y: translateY,
              scale: scale,
              pointerEvents: 'none'
            }}
          >
            <div
              className="ui-stack"
              style={{
                width: '88%',
                maxWidth: 310,
                height: CARD_HEIGHT,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                paddingInline: 16,
                paddingBlock: 14,
                borderWidth: 1,
                borderColor: active ? option.tone + '78' : option.tone + '2E',
                borderRadius: 22,
                backgroundColor: active ? '#111318FA' : '#111318F2',
                boxShadow: `0px ${7}px ${14}px color-mix(in srgb, ${'#000000'} calc(${0.22} * 100%), transparent)`
              }}
            >
              {option.icon.kind === 'visual' ? (
                <VisualIconBadge value={option.icon.value} size={48} />
              ) : (
                <div
                  className="ui-stack"
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
                </div>
              )}

              <div
                className="ui-stack"
                style={{
                  flex: '1 1 0%',
                  minWidth: 0
                }}
              >
                <span
                  className="ui-text"
                  data-lines={1}
                  style={{
                    color: theme.text,
                    fontSize: active ? 20 : 17,
                    lineHeight: active ? '25px' : '22px',
                    fontWeight: 700,
                    letterSpacing: active ? -0.3 : -0.15,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 1
                  }}
                >
                  {option.title}
                </span>
                <span
                  className="ui-text"
                  data-lines={1}
                  style={{
                    marginTop: 5,
                    color: theme.muted,
                    fontSize: active ? 12 : 11.5,
                    lineHeight: '16px',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 1
                  }}
                >
                  {option.subtitle}
                </span>
              </div>

              {active ? (
                <div
                  className="ui-stack"
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
                </div>
              ) : null}
            </div>
          </motion.div>
        )
      })}
      {options.length > 1 ? (
        <div
          className="ui-stack"
          style={{
            position: 'absolute',
            bottom: 2,
            left: 0,
            right: 0,
            alignItems: 'center',
            pointerEvents: 'none'
          }}
        >
          <span
            className="ui-text"
            style={{
              color: theme.muted,
              fontSize: 12,
              fontWeight: 700,
              fontVariant: 'tabular-nums'
            }}
          >
            {selectedIndex + 1} / {options.length}
          </span>
        </div>
      ) : null}
    </div>
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
  const [stageOpacity] = useState(() => motionValue(0))
  const [stageTranslateY] = useState(() => motionValue(-62))
  const [stageScale] = useState(() => motionValue(0.97))
  const [carouselBusy, setCarouselBusy] = useState(false)
  const tone = financeOperationTone(type, theme.accent)
  const operationLabel = type === 'income' ? 'Доход' : type === 'expense' ? 'Расход' : 'Перевод'
  const operationIcon: AppIconName =
    type === 'income' ? 'income' : type === 'expense' ? 'expense' : 'transfer'
  const sourceAccount = accounts.find((account) => account.id === sourceAccountId)
  const destinationAccount = accounts.find((account) => account.id === destinationAccountId)
  const selectedTag = tags.find((tag) => tag.id === tagId)
  const enterStage = useCallback((): void => {
    stageOpacity.set(0)
    stageTranslateY.set(-62)
    stageScale.set(0.97)
    playMotion(
      parallelMotion([
        motionStep(stageOpacity, 1, {
          duration: 210 / 1000,
          ease: 'easeOut',
          type: 'tween'
        }),
        motionStep(stageTranslateY, 0, {
          damping: 24,
          stiffness: 230,
          mass: 0.78,
          type: 'spring'
        }),
        motionStep(stageScale, 1, {
          damping: 24,
          stiffness: 230,
          mass: 0.78,
          type: 'spring'
        })
      ])
    )
  }, [stageOpacity, stageScale, stageTranslateY])
  useEffect(() => {
    requestAnimationFrame(enterStage)
  }, [enterStage])
  const transitionNext = (): void => {
    if (stageIndex >= stages.length - 1) return
    playMotion(
      parallelMotion([
        motionStep(stageOpacity, 0, {
          duration: 190 / 1000,
          ease: 'easeIn',
          type: 'tween'
        }),
        motionStep(stageTranslateY, 136, {
          duration: 215 / 1000,
          ease: 'easeIn',
          type: 'tween'
        }),
        motionStep(stageScale, 0.96, {
          duration: 215 / 1000,
          ease: 'easeIn',
          type: 'tween'
        })
      ]),
      () => {
        setStageIndex((index) => index + 1)
        setCarouselIndex(0)
        requestAnimationFrame(enterStage)
      }
    )
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
    <DialogLayer open={true} transition={'none'} onClose={close}>
      <div
        className="ui-stack"
        style={{
          position: 'absolute',
          inset: 0
        }}
      >
        <div
          className="ui-stack"
          style={{
            flex: '1 1 0%',
            paddingInline: 18,
            paddingTop: 18,
            paddingBottom: 22
          }}
        >
          <div
            className="ui-stack"
            style={{
              minHeight: 44,
              position: 'relative',
              justifyContent: 'flex-start'
            }}
          >
            <div
              className="ui-stack"
              style={{
                minHeight: 38,
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 6,
                paddingRight: 48
              }}
            >
              <QuickSelectionChip label={operationLabel} tone={tone} icon={operationIcon} />

              {sourceAccount ? (
                <QuickSelectionChip
                  key={`source:${sourceAccount.id}`}
                  label={
                    type === 'transfer' ? `Списание: ${sourceAccount.name}` : sourceAccount.name
                  }
                  tone={tone}
                />
              ) : null}

              {destinationAccount ? (
                <QuickSelectionChip
                  key={`destination:${destinationAccount.id}`}
                  label={`Зачисление: ${destinationAccount.name}`}
                  tone={tone}
                />
              ) : null}

              {selectedTag ? (
                <QuickSelectionChip
                  key={`tag:${selectedTag.id}`}
                  label={selectedTag.name}
                  tone={tone}
                  icon="tag"
                />
              ) : null}
            </div>

            <Action
              role={'button'}
              aria-label={'Закрыть быстрый ввод'}
              disabled={pending}
              onClick={close}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 38,
                height: 38,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 12,
                backgroundColor: '#111318E8',
                opacity: 1
              }}
              pressedStyle={{
                opacity: 0.72
              }}
            >
              <AppIcon name="close" size={18} color={theme.muted} />
            </Action>
          </div>

          <motion.div
            className="ui-stack"
            style={{
              flex: '1 1 0%',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: stageOpacity,
              y: stageTranslateY,
              scale: stageScale
            }}
          >
            <span
              className="ui-text"
              style={{
                color: theme.text,
                fontSize: 23,
                lineHeight: '29px',
                fontWeight: 700,
                textAlign: 'center',
                letterSpacing: -0.4
              }}
            >
              {stageTitle(stage, type)}
            </span>

            {stage !== 'amount' ? (
              <>
                <span
                  className="ui-text"
                  style={{
                    marginTop: 8,
                    color: theme.muted,
                    fontSize: 11.5,
                    lineHeight: '17px',
                    fontWeight: 600,
                    textAlign: 'center'
                  }}
                >
                  Проведите вверх или вниз · затем нажмите «Дальше»
                </span>

                <div
                  className="ui-stack"
                  style={{
                    marginTop: 12,
                    width: '100%',
                    alignItems: 'center'
                  }}
                >
                  <QuickCarousel
                    options={currentOptions}
                    selectedIndex={Math.min(carouselIndex, Math.max(0, currentOptions.length - 1))}
                    onSelectedIndexChange={setCarouselIndex}
                    onBusyChange={setCarouselBusy}
                  />
                </div>
              </>
            ) : (
              <div
                className="ui-stack"
                style={{
                  width: '100%',
                  maxWidth: 330,
                  marginTop: 24,
                  gap: 12
                }}
              >
                <div
                  className="ui-stack"
                  style={{
                    paddingInline: 18,
                    paddingBlock: 18,
                    borderWidth: 1,
                    borderColor: tone + '55',
                    borderRadius: 22,
                    backgroundColor: '#111318F7'
                  }}
                >
                  <TextControl
                    autoFocus={true}
                    aria-label={'Сумма операции'}
                    inputMode={'decimal'}
                    value={amount}
                    onValueChange={(value) => {
                      setAmount(value)
                      setError('')
                      setImpact(null)
                      setImpactConfirmed(false)
                    }}
                    placeholder={'0.00'}
                    placeholderColor={theme.muted}
                    style={{
                      color: theme.text,
                      fontSize: 34,
                      lineHeight: '42px',
                      fontWeight: 700,
                      textAlign: 'center',
                      fontVariant: 'tabular-nums'
                    }}
                  ></TextControl>
                  <span
                    className="ui-text"
                    style={{
                      marginTop: 6,
                      color: theme.muted,
                      fontSize: 12,
                      lineHeight: '17px',
                      fontWeight: 600,
                      textAlign: 'center'
                    }}
                  >
                    {sourceAccount
                      ? type === 'transfer' && destinationAccount
                        ? `${sourceAccount.currencyCode} → ${destinationAccount.currencyCode}`
                        : sourceAccount.currencyCode
                      : 'Выберите счёт'}
                  </span>
                </div>

                {error ? (
                  <span
                    className="ui-text"
                    style={{
                      color: theme.error,
                      fontSize: 12,
                      lineHeight: '17px',
                      textAlign: 'center'
                    }}
                  >
                    {error}
                  </span>
                ) : null}

                {impact ? (
                  <div
                    className="ui-stack"
                    style={{
                      padding: 11,
                      borderWidth: 1,
                      borderColor: '#f59e0b55',
                      borderRadius: 13,
                      backgroundColor: '#f59e0b12'
                    }}
                  >
                    <span
                      className="ui-text"
                      style={{
                        color: '#fbbf24',
                        fontSize: 11.5,
                        lineHeight: '16px',
                        fontWeight: 700,
                        textAlign: 'center'
                      }}
                    >
                      Расход затронет {impact.items.length} лимит(а). Нажмите ещё раз для
                      подтверждения.
                    </span>
                  </div>
                ) : null}
              </div>
            )}
          </motion.div>

          <div
            className="ui-stack"
            data-pass-through="true"
            style={{
              position: 'absolute',
              right: 0,
              bottom: 20,
              left: 0,
              alignItems: 'center',
              pointerEvents: 'none'
            }}
          >
            <Action
              role={'button'}
              aria-label={
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
              onClick={stage === 'amount' ? save : confirmCarouselSelection}
              style={{
                minWidth: 176,
                minHeight: 50,
                alignItems: 'center',
                justifyContent: 'center',
                paddingInline: 24,
                borderRadius: 15,
                borderWidth: 1,
                borderColor: tone + '55',
                backgroundColor: tone,
                opacity:
                  pending || carouselBusy || (stage !== 'amount' && currentOptions.length === 0)
                    ? 0.45
                    : 1
              }}
              pressedStyle={{
                opacity:
                  pending || carouselBusy || (stage !== 'amount' && currentOptions.length === 0)
                    ? 0.45
                    : 0.8
              }}
            >
              <span
                className="ui-text"
                style={{
                  color: '#ffffff',
                  fontSize: 14,
                  fontWeight: 700
                }}
              >
                {stage === 'amount'
                  ? pending
                    ? 'Сохранение…'
                    : impactConfirmed
                      ? 'Подтвердить расход'
                      : 'Создать'
                  : 'Дальше'}
              </span>
            </Action>
          </div>
        </div>
      </div>
    </DialogLayer>
  )
}
