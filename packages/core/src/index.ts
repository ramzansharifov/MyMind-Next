import type { AppPlatform, PlatformServices } from '@mymind/contracts'

export type CoreContext = Readonly<{
  platform: AppPlatform
  services: PlatformServices
}>

export function createCoreContext(
  platform: AppPlatform,
  services: PlatformServices = {}
): CoreContext {
  return Object.freeze({ platform, services })
}

export type MyMindModuleDefinition<Id extends string = string> = Readonly<{
  id: Id
  version: number
}>

export function defineMyMindModule<const Id extends string>(
  definition: MyMindModuleDefinition<Id>
): MyMindModuleDefinition<Id> {
  return Object.freeze(definition)
}
