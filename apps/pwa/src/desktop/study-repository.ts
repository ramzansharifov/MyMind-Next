import { desktopRuntime } from './runtime'
export const listStudyNodes = (): ReturnType<
  ReturnType<typeof desktopRuntime>['repositories']['study']['listNodes']
> => desktopRuntime().repositories.study.listNodes()
export const renameStudyNode = (
  id: string,
  title: string
): ReturnType<ReturnType<typeof desktopRuntime>['repositories']['study']['renameNode']> =>
  desktopRuntime().repositories.study.renameNode(id, title)
