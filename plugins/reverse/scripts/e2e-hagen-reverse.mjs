// SPDX-License-Identifier: AGPL-3.0-only
// The custom profile's selection chords on a modelled Reverse engineer body.
import { check, finish, launchApp, sleep, withSettings } from '../../../scripts/e2e-lib.mjs'
import { openReverse, reverseHelpers } from './lib.mjs'

const { browser, page, consoleErrors } = await launchApp({ width: 1600, height: 1000, protocolTimeout: 600_000 })
try {
  await openReverse(page)
  await withSettings(page, () => page.select('#navscheme', 'hagen'))
  const { re, built, screen } = reverseHelpers(page)
  await re(() => {
    const s = () => window.__re.store.getState()
    s().startSketch({ kind: 'world', axis: 'z', offset: 0 }, { origin: [0, 0, 0], normal: [0, 0, 1], basisU: [1, 0, 0], basisV: [0, 1, 0] })
    s().setSketchTool('rectangle')
    s().sketchClick([0, 0], 0.01, false, { off: true })
    s().sketchClick([40, 20], 0.01, false, { off: true })
    const id = s().commitSketch()
    s().startExtrude(id)
    if (s().extrudeDraft.regions.length === 0) s().pickAllDraftRegions()
    s().commitExtrude()
  })
  await built()
  await re(() => window.__re.scene().frameAll())
  await sleep(500)
  const [x, y] = await screen([20, 10, 10])
  const selected = () => re(() => window.__re.store.getState().selection)
  const click = async (modifier) => {
    if (modifier) await page.keyboard.down(modifier)
    await page.mouse.click(x, y)
    if (modifier) await page.keyboard.up(modifier)
    await sleep(200)
  }
  await click(null)
  check((await selected()) === null, 'plain left-click does not select a body face')
  await click('Shift')
  check((await selected()) !== null, 'Shift+left-click selects a body face')
  const first = await selected()
  await click('Shift')
  check(JSON.stringify(await selected()) === JSON.stringify(first), 'Shift+left-click keeps an already selected face')
  await click('Control')
  check((await selected()) === null, 'Ctrl+left-click removes the selected face')
  await click('Control')
  check((await selected()) === null, 'Ctrl+left-click does not select an unselected face')
} finally {
  await finish(browser, consoleErrors)
}
