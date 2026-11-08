// SPDX-License-Identifier: AGPL-3.0-only
// Exercise the custom 3D controls in the real browser: bare clicks leave the
// model alone, Shift picks and paints, Ctrl erases, and Space confirms a fit.
import { canvasRect, check, finish, launchApp, loadScan, previewReady, repoFile, sleep, withSettings } from './e2e-lib.mjs'

const { browser, page, consoleErrors } = await launchApp({ url: process.env.APP_URL ?? 'http://127.0.0.1:5193/' })
try {
  await loadScan(page, repoFile('public/samples/fridgeBracket_01-reduced.3mf'))
  await withSettings(page, async () => page.select('#navscheme', 'hagen'))
  const rect = await canvasRect(page)
  const spot = async () => page.evaluate((r) => {
    const scene = window.__scanruler.scene()
    for (let y = 0.25; y <= 0.75; y += 0.05) for (let x = 0.25; x <= 0.75; x += 0.05) {
      const at = [r.x + r.w * x, r.y + r.h * y]
      if (scene.pick(...at)) return at
    }
    return null
  }, rect)
  let at = await spot()
  check(at !== null, 'the sample scan has a pickable place')
  if (at) {
    const pose = () => page.evaluate(() => {
      const { camera, controls } = window.__scanruler.scene().viewport
      return { position: camera.position.toArray(), target: controls.target.toArray(), rotation: camera.quaternion.toArray() }
    })
    const move = async (button) => {
      await page.mouse.move(...at)
      await page.mouse.down({ button })
      await page.mouse.move(at[0] + 65, at[1] + 35, { steps: 8 })
      await page.mouse.up({ button })
      await sleep(250)
    }
    const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]))
    const beforePan = await pose()
    await move('middle')
    const afterPan = await pose()
    check(distance(beforePan.target, afterPan.target) > 0.01 && distance(beforePan.rotation, afterPan.rotation) < 1e-5,
      'middle-drag pans without rotating')
    at = await spot()
    const beforeOrbit = await pose()
    await move('left')
    const afterOrbit = await pose()
    check(distance(beforeOrbit.rotation, afterOrbit.rotation) > 0.01, 'plain left-drag rotates')
    at = await spot()
    await page.evaluate(() => {
      const scene = window.__scanruler.scene()
      const pick = scene.onPick
      window.__hagenPicks = 0
      scene.onPick = (hit) => { window.__hagenPicks++; pick?.(hit) }
    })
    await page.mouse.click(...at)
    check((await page.evaluate(() => window.__hagenPicks)) === 0, 'plain left-click does not pick')
    await page.keyboard.down('Shift')
    await page.mouse.click(...at)
    await page.keyboard.up('Shift')
    check((await page.evaluate(() => window.__hagenPicks)) === 1, 'Shift+left-click picks')
  }

  await page.click('[data-test="fit-plane"]')
  await page.select('[data-test="draft-select-mode"]', 'paint')
  await page.click('[data-test="mark-brush"]')
  const count = () => page.$eval('[data-test="paint-count"]', (el) => Number(el.textContent.replace(/[^\d]/g, ''))).catch(() => 0)
  const stroke = async (place, modifier) => {
    if (modifier) await page.keyboard.down(modifier)
    await page.mouse.move(place[0] - 8, place[1] - 5)
    await page.mouse.down()
    await page.mouse.move(place[0] + 8, place[1] + 5, { steps: 6 })
    await page.mouse.up()
    if (modifier) await page.keyboard.up(modifier)
    await sleep(350)
  }
  at = await spot()
  if (at) {
    await stroke(at, null)
    check((await count()) === 0, 'plain left-drag navigates with the brush armed')
    at = await spot()
    if (at) {
      await stroke(at, 'Shift')
      const selected = await count()
      check(selected > 0, `Shift+left-drag marks surface (${selected} vertices)`)
      await stroke(at, 'Control')
      check((await count()) < selected, 'Ctrl+left-drag removes marked surface')
      await stroke(at, 'Shift')
      check(await previewReady(page, { tries: 80, watchStatus: false }), 'marked fit is ready')
      const before = await page.$$eval('[data-test="element-row"]', (els) => els.length)
      await page.keyboard.press('Space')
      await sleep(400)
      const after = await page.$$eval('[data-test="element-row"]', (els) => els.length)
      check(after === before + 1, 'Space confirms the ready fit')
    }
  }
} finally {
  await finish(browser, consoleErrors)
}
