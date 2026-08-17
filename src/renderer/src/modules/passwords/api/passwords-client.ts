import type {
  ChangeMasterPasswordInput,
  CopyPasswordItemFieldInput,
  CreatePasswordGroupInput,
  CreatePasswordItemInput,
  DeletePasswordGroupInput,
  DeletePasswordItemInput,
  GeneratePasswordInput,
  GetPasswordItemInput,
  OpenPasswordItemWebsiteInput,
  SetupPasswordVaultInput,
  UnlockPasswordVaultInput,
  UpdatePasswordGroupInput,
  UpdatePasswordItemInput
} from '../../../../../shared/contracts/passwords'

export const passwordsClient = {
  getVaultStatus: () => window.api.passwords.getVaultStatus(),
  setupVault: (input: SetupPasswordVaultInput) => window.api.passwords.setupVault(input),
  unlockVault: (input: UnlockPasswordVaultInput) => window.api.passwords.unlockVault(input),
  lockVault: () => window.api.passwords.lockVault(),
  changeMasterPassword: (input: ChangeMasterPasswordInput) =>
    window.api.passwords.changeMasterPassword(input),
  listOverview: () => window.api.passwords.listOverview(),
  getItem: (input: GetPasswordItemInput) => window.api.passwords.getItem(input),
  createGroup: (input: CreatePasswordGroupInput) => window.api.passwords.createGroup(input),
  updateGroup: (input: UpdatePasswordGroupInput) => window.api.passwords.updateGroup(input),
  deleteGroup: (input: DeletePasswordGroupInput) => window.api.passwords.deleteGroup(input),
  createItem: (input: CreatePasswordItemInput) => window.api.passwords.createItem(input),
  updateItem: (input: UpdatePasswordItemInput) => window.api.passwords.updateItem(input),
  deleteItem: (input: DeletePasswordItemInput) => window.api.passwords.deleteItem(input),
  generatePassword: (input: GeneratePasswordInput) => window.api.passwords.generatePassword(input),
  copyItemField: (input: CopyPasswordItemFieldInput) => window.api.passwords.copyItemField(input),
  openWebsite: (input: OpenPasswordItemWebsiteInput) => window.api.passwords.openWebsite(input)
}
