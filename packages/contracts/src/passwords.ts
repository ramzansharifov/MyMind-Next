export const PASSWORD_ITEM_TYPES = ['login', 'password'] as const
export const PASSWORD_GROUP_ICONS = [
  'folder',
  'briefcase',
  'home',
  'user',
  'globe',
  'code',
  'database',
  'gamepad',
  'shopping-cart',
  'wallet',
  'key-round',
  'shield'
] as const
export const PASSWORD_GROUP_COLORS = [
  'violet',
  'blue',
  'cyan',
  'emerald',
  'amber',
  'orange',
  'rose',
  'pink'
] as const
export const PASSWORD_STRENGTHS = ['weak', 'fair', 'strong'] as const
export const PASSWORD_SECURITY_ISSUES = ['weak', 'reused', 'old'] as const

export type PasswordItemType = (typeof PASSWORD_ITEM_TYPES)[number]
export type PasswordGroupIcon = (typeof PASSWORD_GROUP_ICONS)[number]
export type PasswordGroupColor = (typeof PASSWORD_GROUP_COLORS)[number]
export type PasswordStrength = (typeof PASSWORD_STRENGTHS)[number]
export type PasswordSecurityIssue = (typeof PASSWORD_SECURITY_ISSUES)[number]

export interface PasswordVaultStatus {
  initialized: boolean
  unlocked: boolean
}

export interface PasswordGroupRecord {
  id: string
  name: string
  icon: PasswordGroupIcon
  color: PasswordGroupColor
  position: number
  createdAt: number
  updatedAt: number
}

export interface PasswordCustomField {
  label: string
  value: string
}

export interface PasswordItemSummary {
  id: string
  groupId: string | null
  type: PasswordItemType
  title: string
  username: string
  website: string
  tags: string[]
  favorite: boolean
  strength: PasswordStrength
  securityIssues: PasswordSecurityIssue[]
  passwordUpdatedAt: number
  createdAt: number
  updatedAt: number
}

export interface PasswordItemRecord extends PasswordItemSummary {
  password: string
  notes: string
  customFields: PasswordCustomField[]
}

export interface PasswordSecurityReport {
  total: number
  weak: number
  reused: number
  old: number
  issues: Array<{
    itemId: string
    title: string
    username: string
    issues: PasswordSecurityIssue[]
  }>
}

export interface PasswordsOverview {
  groups: PasswordGroupRecord[]
  items: PasswordItemSummary[]
  security: PasswordSecurityReport
}

export interface SetupPasswordVaultInput {
  masterPassword: string
}

export interface UnlockPasswordVaultInput {
  masterPassword: string
}

export interface ChangeMasterPasswordInput {
  currentMasterPassword: string
  newMasterPassword: string
}

export interface CreatePasswordGroupInput {
  name: string
  icon: PasswordGroupIcon
  color: PasswordGroupColor
}

export interface UpdatePasswordGroupInput extends CreatePasswordGroupInput {
  id: string
}

export interface DeletePasswordGroupInput {
  id: string
}

export interface CreatePasswordItemInput {
  groupId: string | null
  type: PasswordItemType
  title: string
  username: string
  password: string
  website: string
  notes: string
  tags: string[]
  customFields: PasswordCustomField[]
  favorite: boolean
}

export interface UpdatePasswordItemInput extends CreatePasswordItemInput {
  id: string
}

export interface DeletePasswordItemInput {
  id: string
}

export interface GetPasswordItemInput {
  id: string
}

export interface CopyPasswordItemFieldInput {
  id: string
  field: 'username' | 'password'
}

export interface OpenPasswordItemWebsiteInput {
  id: string
}

export interface GeneratePasswordInput {
  length: number
  lowercase: boolean
  uppercase: boolean
  digits: boolean
  symbols: boolean
  excludeAmbiguous: boolean
}

export const PASSWORDS_IPC_CHANNELS = {
  getVaultStatus: 'passwords:get-vault-status',
  setupVault: 'passwords:setup-vault',
  unlockVault: 'passwords:unlock-vault',
  lockVault: 'passwords:lock-vault',
  changeMasterPassword: 'passwords:change-master-password',
  listOverview: 'passwords:list-overview',
  getItem: 'passwords:get-item',
  createGroup: 'passwords:create-group',
  updateGroup: 'passwords:update-group',
  deleteGroup: 'passwords:delete-group',
  createItem: 'passwords:create-item',
  updateItem: 'passwords:update-item',
  deleteItem: 'passwords:delete-item',
  generatePassword: 'passwords:generate-password',
  copyItemField: 'passwords:copy-item-field',
  openWebsite: 'passwords:open-website'
} as const

export interface PasswordsApi {
  getVaultStatus(): Promise<PasswordVaultStatus>
  setupVault(input: SetupPasswordVaultInput): Promise<PasswordVaultStatus>
  unlockVault(input: UnlockPasswordVaultInput): Promise<PasswordVaultStatus>
  lockVault(): Promise<PasswordVaultStatus>
  changeMasterPassword(input: ChangeMasterPasswordInput): Promise<PasswordVaultStatus>
  listOverview(): Promise<PasswordsOverview>
  getItem(input: GetPasswordItemInput): Promise<PasswordItemRecord>
  createGroup(input: CreatePasswordGroupInput): Promise<PasswordGroupRecord>
  updateGroup(input: UpdatePasswordGroupInput): Promise<PasswordGroupRecord>
  deleteGroup(input: DeletePasswordGroupInput): Promise<boolean>
  createItem(input: CreatePasswordItemInput): Promise<PasswordItemRecord>
  updateItem(input: UpdatePasswordItemInput): Promise<PasswordItemRecord>
  deleteItem(input: DeletePasswordItemInput): Promise<boolean>
  generatePassword(input: GeneratePasswordInput): Promise<string>
  copyItemField(input: CopyPasswordItemFieldInput): Promise<boolean>
  openWebsite(input: OpenPasswordItemWebsiteInput): Promise<boolean>
}
