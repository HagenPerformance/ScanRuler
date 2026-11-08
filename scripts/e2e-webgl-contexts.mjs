// SPDX-License-Identifier: AGPL-3.0-only
// Moving between 3D and 2D must leave only one live WebGL context while
// preserving the 3D scene when its context is restored.
import { check, finish, launchApp, loadScan, repoFile, sleep } from './e2e-lib.mjs'

const { browser, page, consoleErrors } = await launchApp()
try {
  await page.evaluateOnNewDocument(() => {
    const contexts = []
    window.__e2eWebGLContexts = contexts
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      const context = original.call(this, kind, ...args)
      if (kind === 'webgl2' && context && !contexts.includes(context)) contexts.push(context)
      return context
    }
  })
  await page.reload({ waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-test=workspace-flat]')
  await loadScan(page, repoFile('public/samples/fridgeBracket_01-reduced.3mf'))
  const counts = () => page.evaluate(() => {
    const contexts = window.__e2eWebGLContexts
    return { total: contexts.length, live: contexts.filter((context) => !context.isContextLost()).length }
  })
  const initial = await counts()
  check(initial.live === 1, `3D starts with one live context (${initial.live})`)
  for (let visit = 1; visit <= 8; visit++) {
    await page.click('[data-test=workspace-flat]')
    await page.waitForFunction(() => window.__e2eWebGLContexts.length > 1 &&
      window.__e2eWebGLContexts.filter((context) => !context.isContextLost()).length === 1)
    check((await page.$('.webgl-missing')) === null, `2D starts on visit ${visit}`)
    await page.click('[data-test=workspace-elements]')
    await page.waitForFunction(() => {
      const scene = window.__scanruler.scene()
      return !scene.viewport.renderer.getContext().isContextLost() &&
        window.__e2eWebGLContexts.filter((context) => !context.isContextLost()).length === 1
    })
    await sleep(50)
  }
  const end = await counts()
  check(end.live === 1 && end.total > 8, `eight workspace switches kept one live context (${end.live} of ${end.total})`)
  check(await page.evaluate(() => window.__scanruler.scene().scanGeometry() !== null), 'the scan survives returning to 3D')
} finally {
  await finish(browser, consoleErrors)
}
