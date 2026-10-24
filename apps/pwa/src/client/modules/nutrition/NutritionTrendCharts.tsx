import type { NutritionReportDay } from '@mymind/contracts/nutrition'
import { useTheme } from '../../shared/ui/theme'
export function NutritionTrendCharts({
  timeline
}: {
  timeline: NutritionReportDay[]
}): React.JSX.Element {
  return (
    <div
      className="ui-stack"
      style={{
        gap: 12
      }}
    >
      <TrendChart
        title="Калории по дням"
        unit="ккал"
        timeline={timeline}
        value={(item) => item.nutrients.calories}
        target={(item) => item.targetCalories}
      />
      <TrendChart
        title="Вода по дням"
        unit="мл"
        timeline={timeline}
        value={(item) => item.waterMl}
        target={(item) => item.targetWaterMl}
      />
    </div>
  )
}
function TrendChart({
  title,
  unit,
  timeline,
  value,
  target
}: {
  title: string
  unit: string
  timeline: NutritionReportDay[]
  value(item: NutritionReportDay): number
  target(item: NutritionReportDay): number | null
}): React.JSX.Element {
  const theme = useTheme()
  const values = timeline.map(value)
  const targetValues = timeline.map(target).filter((item): item is number => item !== null)
  const max = Math.max(1, ...values, ...targetValues)
  return (
    <div
      className="ui-stack"
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface,
        padding: 14,
        gap: 10
      }}
    >
      <div
        className="ui-stack"
        style={{
          gap: 2
        }}
      >
        <span
          className="ui-text"
          style={{
            color: theme.text,
            fontSize: 14,
            fontWeight: 800
          }}
        >
          {title}
        </span>
        <span
          className="ui-text"
          style={{
            color: theme.muted,
            fontSize: 10
          }}
        >
          Столбец — фактическое значение; отметка внутри — дневная цель.
        </span>
      </div>
      {timeline.length === 0 ? (
        <span
          className="ui-text"
          style={{
            color: theme.muted,
            fontSize: 12
          }}
        >
          Нет данных для графика.
        </span>
      ) : (
        <div className="ui-scroll" data-horizontal={true}>
          <div
            className="ui-stack ui-scroll-content"
            style={{
              alignItems: 'flex-end',
              gap: 7,
              minHeight: 152,
              paddingTop: 6,
              flexDirection: 'row'
            }}
          >
            {timeline.map((item) => {
              const actual = value(item)
              const goal = target(item)
              const barHeight = Math.max(4, (actual / max) * 104)
              const goalBottom =
                goal === null ? null : Math.max(0, Math.min(104, (goal / max) * 104))
              return (
                <div
                  className="ui-stack"
                  key={`${title}:${item.date}`}
                  style={{
                    width: 48,
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <span
                    className="ui-text"
                    style={{
                      color: theme.text,
                      fontSize: 9,
                      fontWeight: 700
                    }}
                  >
                    {Math.round(actual)}
                  </span>
                  <div
                    className="ui-stack"
                    style={{
                      width: 22,
                      height: 108,
                      borderRadius: 11,
                      overflow: 'hidden',
                      justifyContent: 'flex-end',
                      backgroundColor: theme.raised
                    }}
                  >
                    <div
                      className="ui-stack"
                      aria-label={`${item.date}: ${Math.round(actual)} ${unit}`}
                      style={{
                        width: '100%',
                        height: barHeight,
                        backgroundColor: theme.accent
                      }}
                    ></div>
                    {goalBottom !== null ? (
                      <div
                        className="ui-stack"
                        aria-label={`Цель ${Math.round(goal ?? 0)} ${unit}`}
                        style={{
                          position: 'absolute',
                          left: 2,
                          right: 2,
                          bottom: goalBottom,
                          height: 2,
                          backgroundColor: theme.text
                        }}
                      ></div>
                    ) : null}
                  </div>
                  <span
                    className="ui-text"
                    style={{
                      color: theme.muted,
                      fontSize: 9
                    }}
                  >
                    {item.date.slice(5)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
