import type { WorkoutMuscleGroup } from '../../../../shared/contracts/workouts'
import { WorkoutMuscleArtwork } from './components/WorkoutMuscleArtwork'

export function WorkoutMuscleGroupIcon({
  group,
  className
}: {
  group: WorkoutMuscleGroup
  className?: string
}): React.JSX.Element {
  return <WorkoutMuscleArtwork groups={[group]} className={className} />
}
