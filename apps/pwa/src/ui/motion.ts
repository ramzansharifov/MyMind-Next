import { animate, type MotionValue, type ValueAnimationTransition } from 'framer-motion'
type MotionTask = () => Promise<boolean>
const running = new WeakMap<MotionValue<number>, () => void>()
export function stopMotion(value: MotionValue<number>): void {
  running.get(value)?.()
  running.delete(value)
  value.stop()
}
export function motionStep(
  value: MotionValue<number>,
  target: number,
  transition: ValueAnimationTransition<number>
): MotionTask {
  return () =>
    new Promise((resolve) => {
      stopMotion(value)
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        value.set(target)
        resolve(true)
        return
      }
      const controls = animate(value, target, transition)
      const cancel = (): void => {
        controls.stop()
        resolve(false)
      }
      running.set(value, cancel)
      void controls.then(() => {
        if (running.get(value) === cancel) {
          running.delete(value)
          resolve(true)
        }
      })
    })
}
export function parallelMotion(tasks: MotionTask[]): MotionTask {
  return async () => (await Promise.all(tasks.map((task) => task()))).every(Boolean)
}
export function sequenceMotion(tasks: MotionTask[]): MotionTask {
  return async () => {
    for (const task of tasks) if (!(await task())) return false
    return true
  }
}
export function waitMotion(milliseconds: number): MotionTask {
  return () => new Promise((resolve) => setTimeout(() => resolve(true), milliseconds))
}
export function playMotion(
  task: MotionTask,
  complete?: (result: { finished: boolean }) => void
): void {
  void task().then((finished) => complete?.({ finished }))
}
