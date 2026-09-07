const fs = require('node:fs')

const path = 'apps/mobile/src/modules/boards/BoardsScreen.tsx'
let value = fs.readFileSync(path, 'utf8')
const from = `  useEffect(() => {
    if (!initialBoardId || nodes.loading || initialBoardRef.current === initialBoardId) return
    initialBoardRef.current = initialBoardId
    const target = allNodes.find((node) => node.id === initialBoardId)
    if (!target || target.type !== 'board') {
      setError('Связанная доска не найдена')
      return
    }
    try {
      openBoard(target)
    } catch (reason) {
      setError(messageFor(reason))
    }
  }, [allNodes, initialBoardId, nodes.loading, openBoard])`
const to = `  useEffect(() => {
    if (!initialBoardId || nodes.loading || initialBoardRef.current === initialBoardId) {
      return undefined
    }
    initialBoardRef.current = initialBoardId
    let active = true
    queueMicrotask(() => {
      if (!active) return
      const target = allNodes.find((node) => node.id === initialBoardId)
      if (!target || target.type !== 'board') {
        setError('Связанная доска не найдена')
        return
      }
      try {
        openBoard(target)
      } catch (reason) {
        setError(messageFor(reason))
      }
    })
    return () => {
      active = false
    }
  }, [allNodes, initialBoardId, nodes.loading, openBoard])`

if (!value.includes(from)) throw new Error('Linked board deep-link effect not found')
value = value.replace(from, to)
fs.writeFileSync(path, value)
