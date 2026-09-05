export const AI_CHAT_IPC_CHANNELS = {
  setOpen: 'ai-chat:set-open',
  setBounds: 'ai-chat:set-bounds',
  reload: 'ai-chat:reload'
} as const

export interface AiChatBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface SetAiChatOpenInput {
  open: boolean
  bounds?: AiChatBounds
}

export interface AiChatApi {
  setOpen(input: SetAiChatOpenInput): Promise<void>
  setBounds(bounds: AiChatBounds): Promise<void>
  reload(): Promise<void>
}
