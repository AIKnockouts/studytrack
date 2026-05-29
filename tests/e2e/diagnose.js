const { _electron: electron } = require('playwright')
const path = require('path')

async function main() {
  console.log('Launching...')
  const app = await electron.launch({
    args: [path.join(__dirname, '../../out/main/index.js')],
    timeout: 15000,
  })

  const page = await app.firstWindow()
  const allLogs = []
  page.on('console', msg => allLogs.push({ type: msg.type(), text: msg.text() }))
  page.on('pageerror', err => allLogs.push({ type: 'PAGE_ERROR', text: err.message, stack: err.stack }))

  await page.waitForTimeout(4000)

  const dom = await page.evaluate(() => {
    const root = document.getElementById('root')
    return {
      rootHTML: root ? root.innerHTML.substring(0, 1000) : 'ROOT MISSING',
      hasChildren: root ? root.children.length : 0,
    }
  })

  console.log('\n--- ROOT DOM ---')
  console.log('Children:', dom.hasChildren)
  console.log('HTML:', dom.rootHTML || '(empty)')

  console.log('\n--- ALL CONSOLE MESSAGES ---')
  allLogs.forEach(l => {
    if (l.type === 'PAGE_ERROR') {
      console.log('PAGE_ERROR:', l.text)
      if (l.stack) console.log('STACK:', l.stack.split('\n').slice(0, 6).join('\n'))
    } else if (l.type === 'error' || l.type === 'warn') {
      console.log(`[${l.type.toUpperCase()}]`, l.text)
    }
  })

  await app.close()
}

main().catch(e => { console.error(e.message); process.exit(1) })
