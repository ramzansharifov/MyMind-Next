import { shell, WebContentsView, type BrowserWindow } from 'electron'

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
