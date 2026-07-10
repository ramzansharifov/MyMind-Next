import { contextBridge, ipcRenderer } from 'electron'

import { IPC_CHANNELS, type MyMindApi, type SystemHealth } from '../shared/contracts/system'

const api: MyMindApi = {
  system: {
    getHealth: () => ipcRenderer.invoke(IPC_CHANNELS.systemHealth) as Promise<SystemHealth>
  }
}

if (!process.contextIsolated) {
  throw new Error('Context isolation must be enabled')
}

contextBridge.exposeInMainWorld('api', api)
