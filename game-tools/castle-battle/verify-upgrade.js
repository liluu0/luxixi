async (page) => {
  const check = (value, message) => { if (!value) throw new Error(message) }
  const state = () => page.evaluate(() => window.__castleBattle.snapshot())
  const release = async () => { for (const key of ['w', 'a', 's', 'd']) await page.keyboard.up(key) }
  async function go(x, z) {
    const deadline = Date.now() + 14000
    while (Date.now() < deadline) {
      const current = await state()
      const dx = x - current.player.position[0]
      const dz = z - current.player.position[2]
      if (Math.hypot(dx, dz) < .4) { await release(); return }
      const horizontal = dx * Math.cos(current.yaw) - dz * Math.sin(current.yaw)
      const forward = -dx * Math.sin(current.yaw) - dz * Math.cos(current.yaw)
      for (const [key, on] of [['d', horizontal > .2], ['a', horizontal < -.2], ['w', forward > .2], ['s', forward < -.2]]) {
        if (on) await page.keyboard.down(key)
        else await page.keyboard.up(key)
      }
      await page.waitForTimeout(100)
    }
    await release()
    throw new Error(`Unable to walk to ${x},${z}: ${JSON.stringify(await state())}`)
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('http://127.0.0.1:5186/works/castle-battle')
  await page.locator('.castle-begin').waitFor()
  await page.keyboard.press('h')
  await page.getByRole('dialog', { name: '操作手册' }).waitFor()
  await page.waitForTimeout(300)
  check(await page.getByText('W', { exact: true }).count() > 0, 'Manual must show WASD')
  await page.screenshot({ path: 'output/playwright/v2-controls-desktop.png' })
  await page.keyboard.press('h')
  const tutorialButton = page.getByRole('button', { name: /新手启程|重温新手引导/, exact: true })
  await tutorialButton.click()
  await go(2, 11)
  check((await state()).tutorialStep === 1, 'Walking must complete step one')
  await page.mouse.move(870, 450)
  await page.mouse.down({ button: 'right' })
  await page.mouse.move(1010, 450, { steps: 8 })
  await page.mouse.up({ button: 'right' })
  check((await state()).tutorialStep === 2, 'Looking must complete step two')
  await page.keyboard.press('Space')
  check((await state()).tutorialStep === 3, 'A short attack press must complete step three')
  await page.waitForTimeout(650)
  await page.keyboard.press('c')
  check((await state()).tutorialStep === 4, 'Dodging must complete step four')
  await page.waitForTimeout(700)
  await page.keyboard.press('q')
  check((await state()).tutorialStep === 5, 'Locking must complete step five')
  check((await state()).player.health === 100, 'Tutorial must be safe')
  await go(6.1, 9.4)
  await go(6.7, 6.9)
  check((await state()).interaction, 'The real doorway must be reachable on foot')
  await page.screenshot({ path: 'output/playwright/v2-entrance-desktop.png' })
  await page.keyboard.press('f')
  check((await state()).zone === 'interior', 'F must enter the hall')
  await page.waitForTimeout(650)
  check((await state()).tutorialStep === 6, 'Entering completes the tutorial')
  check(await page.evaluate(() => localStorage.getItem('luxixi.castle.tutorial.v2')) === 'complete', 'Tutorial completion must persist')
  await page.screenshot({ path: 'output/playwright/v2-hall-desktop.png' })
  await page.keyboard.press('p')
  const paused = await state()
  await page.waitForTimeout(400)
  check((await state()).elapsed === paused.elapsed, 'Pause must freeze indoor combat')
  return { tutorial: true, interiorEntry: true, persisted: true, paused }
}
