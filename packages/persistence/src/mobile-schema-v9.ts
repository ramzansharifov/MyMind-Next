// Task groups follow the application accent; individual colors are no longer stored.
export const mobileSchemaV9: readonly string[] = [
  'ALTER TABLE task_groups DROP COLUMN color;'
] as const
