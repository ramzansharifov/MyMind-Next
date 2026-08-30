from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'marker not found in {path}: {old[:100]!r}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


def write(path: str, content: str) -> None:
    file = Path(path)
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(content, encoding='utf-8')


write(
    'src/shared/contracts/ai-chat.ts',
    '''export const AI_CHAT_IPC_CHANNELS = {
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
''',
)

write(
    'src/shared/validation/ai-chat.ts',
    '''import { z } from 'zod'

export const aiChatBoundsSchema = z.object({
  x: z.number().int().min(0).max(10000),
  y: z.number().int().min(0).max(10000),
  width: z.number().int().min(1).max(10000),
  height: z.number().int().min(1).max(10000)
})

export const setAiChatOpenInputSchema = z.object({
  open: z.boolean(),
  bounds: aiChatBoundsSchema.optional()
})
''',
)

write(
    'src/main/services/ai-chat-view-controller.ts',
    '''import { shell, WebContentsView, type BrowserWindow } from 'electron'

import type { AiChatBounds, SetAiChatOpenInput } from '../../shared/contracts/ai-chat'

const CHATGPT_URL = 'https://chatgpt.com/'
const CHATGPT_PARTITION = 'persist:mymind-chatgpt'

function isEmbeddedNavigation(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false

    const host = parsed.hostname.toLowerCase()
    return (
      host === 'chatgpt.com' ||
      host.endsWith('.chatgpt.com') ||
      host === 'openai.com' ||
      host.endsWith('.openai.com') ||
      host === 'accounts.google.com' ||
      host === 'login.microsoftonline.com' ||
      host === 'appleid.apple.com'
    )
  } catch {
    return false
  }
}

function clampBounds(window: BrowserWindow, bounds: AiChatBounds): AiChatBounds {
  const [contentWidth, contentHeight] = window.getContentSize()
  const x = Math.max(0, Math.min(bounds.x, Math.max(0, contentWidth - 1)))
  const y = Math.max(0, Math.min(bounds.y, Math.max(0, contentHeight - 1)))
  const width = Math.max(1, Math.min(bounds.width, contentWidth - x))
  const height = Math.max(1, Math.min(bounds.height, contentHeight - y))

  return { x, y, width, height }
}

export class AiChatViewController {
  private view: WebContentsView | null = null
  private attachedWindow: BrowserWindow | null = null
  private bounds: AiChatBounds | null = null
  private open = false
  private loaded = false

  constructor(private readonly getWindow: () => BrowserWindow | null) {}

  setOpen(input: SetAiChatOpenInput): void {
    this.open = input.open
    if (input.bounds) this.bounds = input.bounds

    if (!this.open) {
      this.detach()
      return
    }

    this.ensureAttached()
  }

  setBounds(bounds: AiChatBounds): void {
    this.bounds = bounds
    if (this.open) this.ensureAttached()
  }

  reload(): void {
    const view = this.ensureView()
    if (!view || view.webContents.isDestroyed()) return
    view.webContents.reload()
  }

  onWindowClosed(window: BrowserWindow): void {
    if (this.attachedWindow === window) this.detach()
  }

  destroy(): void {
    this.detach()
    if (this.view && !this.view.webContents.isDestroyed()) {
      this.view.webContents.close()
    }
    this.view = null
    this.loaded = false
  }

  private ensureAttached(): void {
    const window = this.getWindow()
    const bounds = this.bounds
    if (!window || window.isDestroyed() || !bounds) return

    const view = this.ensureView()
    if (!view) return

    if (this.attachedWindow !== window) {
      this.detach()
      window.contentView.addChildView(view)
      this.attachedWindow = window
    }

    view.setBounds(clampBounds(window, bounds))

    if (!this.loaded) {
      this.loaded = true
      void view.webContents.loadURL(CHATGPT_URL).catch((reason: unknown) => {
        this.loaded = false
        console.error('Failed to load ChatGPT in MyMind', reason)
      })
    }
  }

  private ensureView(): WebContentsView | null {
    if (this.view && !this.view.webContents.isDestroyed()) return this.view

    const view = new WebContentsView({
      webPreferences: {
        partition: CHATGPT_PARTITION,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })

    view.webContents.setWindowOpenHandler(({ url }) => {
      if (isEmbeddedNavigation(url)) return { action: 'allow' }

      try {
        const parsed = new URL(url)
        if (parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
          void shell.openExternal(url)
        }
      } catch {
        // Invalid URLs are ignored.
      }

      return { action: 'deny' }
    })

    view.webContents.on('will-navigate', (event, navigationUrl) => {
      if (isEmbeddedNavigation(navigationUrl)) return

      event.preventDefault()
      try {
        const parsed = new URL(navigationUrl)
        if (parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
          void shell.openExternal(navigationUrl)
        }
      } catch {
        // Invalid URLs are ignored.
      }
    })

    this.view = view
    return view
  }

  private detach(): void {
    if (!this.attachedWindow || !this.view) {
      this.attachedWindow = null
      return
    }

    if (!this.attachedWindow.isDestroyed()) {
      this.attachedWindow.contentView.removeChildView(this.view)
    }
    this.attachedWindow = null
  }
}
''',
)

write(
    'src/renderer/src/app/AiChatOverlay.tsx',
    '''import { Bot, RefreshCw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { AiChatBounds } from '../../../shared/contracts/ai-chat'
import { Tooltip } from '../shared/ui/tooltip'

function elementBounds(element: HTMLElement): AiChatBounds | null {
  const rect = element.getBoundingClientRect()
  const width = Math.round(rect.width)
  const height = Math.round(rect.height)
  if (width < 1 || height < 1) return null

  return {
    x: Math.max(0, Math.round(rect.left)),
    y: Math.max(0, Math.round(rect.top)),
    width,
    height
  }
}

export function AiChatOverlay(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const viewportRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    const viewport = viewportRef.current
    if (!viewport) return

    let openedNativeView = false
    let animationFrame = 0

    const syncBounds = (): void => {
      const bounds = elementBounds(viewport)
      if (!bounds) return

      const request = openedNativeView
        ? window.api.aiChat.setBounds(bounds)
        : window.api.aiChat.setOpen({ open: true, bounds })

      openedNativeView = true
      void request.catch((reason: unknown) => {
        console.error('Failed to synchronize AI chat panel', reason)
      })
    }

    animationFrame = window.requestAnimationFrame(syncBounds)
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => syncBounds())
    observer?.observe(viewport)
    window.addEventListener('resize', syncBounds)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      observer?.disconnect()
      window.removeEventListener('resize', syncBounds)
      void window.api.aiChat.setOpen({ open: false }).catch((reason: unknown) => {
        console.error('Failed to close AI chat panel', reason)
      })
    }
  }, [open])

  return (
    <>
      {!open && (
        <Tooltip content="Открыть ИИ-чат" side="left">
          <button
            type="button"
            aria-label="Открыть ИИ-чат"
            className="fixed right-5 bottom-5 z-[80] flex size-12 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--app-accent-500)_35%,transparent)] bg-[var(--app-accent-500)] text-white shadow-[0_12px_34px_rgb(0_0_0/0.38)] transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-[var(--app-accent-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-workspace)] focus-visible:outline-none motion-reduce:transition-none"
            onClick={() => setOpen(true)}
          >
            <Bot aria-hidden="true" className="size-5" />
          </button>
        </Tooltip>
      )}

      {open && (
        <aside
          aria-label="ИИ-чат"
          className="fixed top-[calc(var(--app-titlebar-offset)+1rem)] right-4 bottom-4 z-[80] flex w-[min(480px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_24px_70px_rgb(0_0_0/0.48)]"
        >
          <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3">
            <span className="flex size-8 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--app-accent-500)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-accent-500)_12%,transparent)] text-[var(--app-accent-500)]">
              <Bot aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--app-text)]">ChatGPT</div>
              <div className="truncate text-[10px] text-[var(--app-muted)]">ИИ-чат MyMind</div>
            </div>

            <Tooltip content="Перезагрузить ChatGPT" side="bottom">
              <button
                type="button"
                aria-label="Перезагрузить ChatGPT"
                className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                onClick={() => {
                  void window.api.aiChat.reload().catch((reason: unknown) => {
                    console.error('Failed to reload ChatGPT', reason)
                  })
                }}
              >
                <RefreshCw aria-hidden="true" className="size-4" />
              </button>
            </Tooltip>

            <Tooltip content="Закрыть ИИ-чат" side="bottom">
              <button
                type="button"
                aria-label="Закрыть ИИ-чат"
                className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                onClick={() => setOpen(false)}
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </Tooltip>
          </header>

          <div
            ref={viewportRef}
            data-testid="ai-chat-viewport"
            className="relative min-h-0 flex-1 bg-[#0b0d10]"
          >
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-[var(--app-muted)]">
              Загрузка ChatGPT…
            </div>
          </div>
        </aside>
      )}
    </>
  )
}
''',
)

write(
    'src/renderer/src/app/AiChatOverlay.test.tsx',
    '''import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TooltipProvider } from '../shared/ui/tooltip'
import { AiChatOverlay } from './AiChatOverlay'

const aiChat = {
  setOpen: vi.fn().mockResolvedValue(undefined),
  setBounds: vi.fn().mockResolvedValue(undefined),
  reload: vi.fn().mockResolvedValue(undefined)
}

describe('AiChatOverlay', () => {
  it('opens the native ChatGPT viewport and closes it explicitly', async () => {
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: { aiChat }
    })

    const user = userEvent.setup()
    render(
      <TooltipProvider>
        <AiChatOverlay />
      </TooltipProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Открыть ИИ-чат' }))
    const viewport = screen.getByTestId('ai-chat-viewport')
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
      x: 700,
      y: 84,
      top: 84,
      right: 1180,
      bottom: 820,
      left: 700,
      width: 480,
      height: 736,
      toJSON: () => ({})
    })
    window.dispatchEvent(new Event('resize'))

    await waitFor(() => {
      expect(aiChat.setOpen).toHaveBeenCalledWith({
        open: true,
        bounds: { x: 700, y: 84, width: 480, height: 736 }
      })
    })

    await user.click(screen.getByRole('button', { name: 'Перезагрузить ChatGPT' }))
    expect(aiChat.reload).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: 'Закрыть ИИ-чат' }))
    await waitFor(() => expect(aiChat.setOpen).toHaveBeenCalledWith({ open: false }))
  })
})
''',
)

replace_once(
    'src/shared/contracts/system.ts',
    "import type { BoardApi } from './boards'\n",
    "import type { AiChatApi } from './ai-chat'\nimport type { BoardApi } from './boards'\n",
)
replace_once(
    'src/shared/contracts/system.ts',
    "  system: {\n",
    "  aiChat: AiChatApi\n\n  system: {\n",
)

replace_once(
    'src/preload/index.ts',
    "import { contextBridge, ipcRenderer } from 'electron'\n\n",
    "import { contextBridge, ipcRenderer } from 'electron'\n\nimport { AI_CHAT_IPC_CHANNELS } from '../shared/contracts/ai-chat'\n",
)
replace_once(
    'src/preload/index.ts',
    "const api: MyMindApi = {\n  system: {\n",
    "const api: MyMindApi = {\n  aiChat: {\n    setOpen: (input) => ipcRenderer.invoke(AI_CHAT_IPC_CHANNELS.setOpen, input),\n    setBounds: (bounds) => ipcRenderer.invoke(AI_CHAT_IPC_CHANNELS.setBounds, bounds),\n    reload: () => ipcRenderer.invoke(AI_CHAT_IPC_CHANNELS.reload)\n  },\n\n  system: {\n",
)

replace_once(
    'src/main/ipc/register-ipc.ts',
    "import { BrowserWindow, ipcMain, type IpcMainInvokeEvent, type WebContents } from 'electron'\n\n",
    "import { BrowserWindow, ipcMain, type IpcMainInvokeEvent, type WebContents } from 'electron'\n\nimport { AI_CHAT_IPC_CHANNELS, type AiChatBounds, type SetAiChatOpenInput } from '../../shared/contracts/ai-chat'\n",
)
replace_once(
    'src/main/ipc/register-ipc.ts',
    "import { shutdownResponseSchema, systemHealthSchema } from '../../shared/validation/system'\n",
    "import { aiChatBoundsSchema, setAiChatOpenInputSchema } from '../../shared/validation/ai-chat'\nimport { shutdownResponseSchema, systemHealthSchema } from '../../shared/validation/system'\n",
)
replace_once(
    'src/main/ipc/register-ipc.ts',
    "interface RegisterIpcHandlersOptions {\n  getTrustedWebContents(): WebContents | null\n",
    "interface RegisterIpcHandlersOptions {\n  getTrustedWebContents(): WebContents | null\n  aiChat: {\n    setOpen(input: SetAiChatOpenInput): void\n    setBounds(bounds: AiChatBounds): void\n    reload(): void\n  }\n",
)
replace_once(
    'src/main/ipc/register-ipc.ts',
    "  ipcMain.removeHandler(IPC_CHANNELS.systemHealth)\n",
    "  ipcMain.removeHandler(AI_CHAT_IPC_CHANNELS.setOpen)\n  ipcMain.removeHandler(AI_CHAT_IPC_CHANNELS.setBounds)\n  ipcMain.removeHandler(AI_CHAT_IPC_CHANNELS.reload)\n  ipcMain.removeHandler(IPC_CHANNELS.systemHealth)\n",
)
replace_once(
    'src/main/ipc/register-ipc.ts',
    "  ipcMain.handle(IPC_CHANNELS.systemHealth, () =>\n",
    "  ipcMain.handle(AI_CHAT_IPC_CHANNELS.setOpen, (event, rawInput: unknown) => {\n    getTrustedWindow(event, options.getTrustedWebContents)\n    options.aiChat.setOpen(setAiChatOpenInputSchema.parse(rawInput))\n  })\n\n  ipcMain.handle(AI_CHAT_IPC_CHANNELS.setBounds, (event, rawBounds: unknown) => {\n    getTrustedWindow(event, options.getTrustedWebContents)\n    options.aiChat.setBounds(aiChatBoundsSchema.parse(rawBounds))\n  })\n\n  ipcMain.handle(AI_CHAT_IPC_CHANNELS.reload, (event) => {\n    getTrustedWindow(event, options.getTrustedWebContents)\n    options.aiChat.reload()\n  })\n\n  ipcMain.handle(IPC_CHANNELS.systemHealth, () =>\n",
)

replace_once(
    'src/main/index.ts',
    "import { CalendarReminderScheduler } from './services/calendar-reminder-scheduler'\n",
    "import { AiChatViewController } from './services/ai-chat-view-controller'\nimport { CalendarReminderScheduler } from './services/calendar-reminder-scheduler'\n",
)
replace_once(
    'src/main/index.ts',
    "let mainWindow: BrowserWindow | null = null\nconst calendarReminderScheduler = new CalendarReminderScheduler(() => mainWindow)\n",
    "let mainWindow: BrowserWindow | null = null\nconst aiChatViewController = new AiChatViewController(() => mainWindow)\nconst calendarReminderScheduler = new CalendarReminderScheduler(() => mainWindow)\n",
)
replace_once(
    'src/main/index.ts',
    "function closeApplicationResources(): void {\n  calendarReminderScheduler.stop()\n",
    "function closeApplicationResources(): void {\n  aiChatViewController.destroy()\n  calendarReminderScheduler.stop()\n",
)
replace_once(
    'src/main/index.ts',
    "  window.on('closed', () => {\n    if (mainWindow === window) {\n",
    "  window.on('closed', () => {\n    aiChatViewController.onWindowClosed(window)\n    if (mainWindow === window) {\n",
)
replace_once(
    'src/main/index.ts',
    "    registerIpcHandlers({\n      getTrustedWebContents: () => mainWindow?.webContents ?? null,\n",
    "    registerIpcHandlers({\n      getTrustedWebContents: () => mainWindow?.webContents ?? null,\n      aiChat: {\n        setOpen: (input) => aiChatViewController.setOpen(input),\n        setBounds: (bounds) => aiChatViewController.setBounds(bounds),\n        reload: () => aiChatViewController.reload()\n      },\n",
)

replace_once(
    'src/renderer/src/app/AppShell.tsx',
    "import { AppTitleBar } from './AppTitleBar'\n",
    "import { AiChatOverlay } from './AiChatOverlay'\nimport { AppTitleBar } from './AppTitleBar'\n",
)
replace_once(
    'src/renderer/src/app/AppShell.tsx',
    "        </div>\n      </div>\n    </TooltipProvider>\n",
    "        </div>\n\n        <AiChatOverlay />\n      </div>\n    </TooltipProvider>\n",
)

replace_once(
    'src/preload/index.test.ts',
    "    expect(key).toBe('api')\n",
    "    expect(key).toBe('api')\n    expect(Object.keys(api.aiChat)).toEqual(['setOpen', 'setBounds', 'reload'])\n",
)
replace_once(
    'src/preload/index.test.ts',
    "    await api.boards.listNodes()\n",
    "    await api.aiChat.setOpen({\n      open: true,\n      bounds: { x: 700, y: 80, width: 480, height: 720 }\n    })\n    expect(electronMocks.invoke).toHaveBeenCalledWith('ai-chat:set-open', {\n      open: true,\n      bounds: { x: 700, y: 80, width: 480, height: 720 }\n    })\n\n    await api.boards.listNodes()\n",
)
'''
