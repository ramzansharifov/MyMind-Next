export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.hidden = true
    const finish = (file: File | null): void => {
      input.remove()
      resolve(file)
    }
    input.onchange = () => finish(input.files?.[0] ?? null)
    input.addEventListener('cancel', () => finish(null), { once: true })
    document.body.append(input)
    input.click()
  })
}

export function pickDirectory(): Promise<Array<{ path: string; file: File }>> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    if (!('webkitdirectory' in input)) {
      reject(new Error('Для выбора desktop-библиотеки откройте PWA в браузере на компьютере.'))
      return
    }
    input.type = 'file'
    input.webkitdirectory = true
    input.multiple = true
    input.hidden = true
    const finish = (files: File[]): void => {
      input.remove()
      resolve(files.map((file) => ({ path: file.webkitRelativePath, file })))
    }
    input.onchange = () => finish([...(input.files ?? [])])
    input.addEventListener('cancel', () => finish([]), { once: true })
    document.body.append(input)
    input.click()
  })
}

export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
