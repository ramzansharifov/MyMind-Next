import { contextBridge, ipcRenderer } from 'electron'

import { IPC_CHANNELS, systemHealthSchema, type MyMindApi } from '../shared/contracts/system'

const api: MyMindApi = {
  system: {
    getHealth: async () => {
      const result = await ipcRenderer.invoke(IPC_CHANNELS.systemHealth)

      return systemHealthSchema.parse(result)
    }
  }
}

if (!process.contextIsolated) {
  throw new Error('Context isolation must be enabled')
}

contextBridge.exposeInMainWorld('api', api)
