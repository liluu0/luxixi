async (page) => {
  const state = () => page.evaluate(() => window.__castleBattle.snapshot())
  const check = (value, message) => { if (!value) throw new Error(message) }
  async function untilGrounded() {
    await page.waitForFunction(() => window.__castleBattle.snapshot().player.canJump, null, { timeout: 5000 })
  }
  async function verifyJump(zone) {
    await untilGrounded()
    const before = await state()
    await page.keyboard.down('v')
    await page.waitForFunction(() => window.__castleBattle.snapshot().player.jumpTime >= .12, null, { timeout: 3000 })
    const first = await state()
    check(first.player.position[1] > before.player.position[1] + .5, 'Jump must lift the actual physics character')
    check(!first.player.grounded && !first.player.canJump, 'Airborne character cannot jump again')
    await page.keyboard.up('v')
    await page.keyboard.press('v')
    const repeat = await state()
    check(repeat.player.stamina >= first.player.stamina, 'A repeated airborne input must not consume more stamina')
    check(repeat.player.jumpTime >= first.player.jumpTime, 'Airborne input must not restart the jump')
    await page.screenshot({ path: `output/playwright/jump-${zone}.png` })
    await untilGrounded()
    const landed = await state()
    check(Math.abs(landed.player.position[1] - before.player.position[1]) < .08, 'The character must return to the same floor')
    await page.waitForTimeout(600)
    await page.keyboard.down('v')
    await page.waitForFunction(() => window.__castleBattle.snapshot().player.jumpTime >= .1)
    await untilGrounded()
    await page.waitForTimeout(400)
    check((await state()).player.jumpTime === -1, 'Holding V must not cause repeated jumps after landing')
    await page.keyboard.up('v')
    const from = await state()
    await page.keyboard.down('d')
    await page.keyboard.press('v')
    await page.waitForTimeout(300)
    await page.keyboard.up('d')
    await untilGrounded()
    const moved = await state()
    check(moved.player.position[0] > from.player.position[0] + .35, 'Directional control must work while jumping')
    return { zone, jumpHeight: first.player.position[1] - before.player.position[1], landedY: landed.player.position[1], rejectsDoubleJump: true, noAutoRepeat: true }
  }
  async function walkTo(x, z) {
    const deadline = Date.now() + 15000
    while (Date.now() < deadline) {
      const s = await state()
      const dx = x - s.player.position[0], dz = z - s.player.position[2]
      if (Math.hypot(dx, dz) < .35) break
      const right = dx * Math.cos(s.yaw) - dz * Math.sin(s.yaw)
      const forward = -dx * Math.sin(s.yaw) - dz * Math.cos(s.yaw)
      for (const [key, on] of [['d', right > .16], ['a', right < -.16], ['w', forward > .16], ['s', forward < -.16]]) {
        if (on) await page.keyboard.down(key)
        else await page.keyboard.up(key)
      }
      await page.waitForTimeout(80)
    }
    for (const key of ['w', 'a', 's', 'd']) await page.keyboard.up(key)
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('http://127.0.0.1:5186/works/castle-battle')
  await page.getByRole('button', { name: /新手启程|重温新手引导/, exact: true }).click()
  const results = [await verifyJump('courtyard')]
  await walkTo(6.1, 9.5)
  await walkTo(6.7, 6.9)
  check((await state()).interaction, 'Courtyard doorway must remain usable after jumping')
  await page.keyboard.press('f')
  check((await state()).zone === 'interior', 'Jump state must reset when entering the castle')
  results.push(await verifyJump('interior'))
  await page.keyboard.press('h')
  await page.getByRole('dialog', { name: '操作手册' }).waitFor()
  const paused = await state()
  await page.keyboard.press('v')
  await page.waitForTimeout(300)
  check((await state()).player.jumpTime === paused.player.jumpTime, 'Manual must block jumping')
  await page.getByRole('button', { name: '关闭操作手册', exact: true }).click()
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 360, height: 640 }]) {
    await page.setViewportSize(size)
    await untilGrounded()
    await page.waitForTimeout(500)
    const button = page.locator('.castle-touch-jump')
    await button.waitFor({ state: 'visible' })
    const bounds = await button.boundingBox()
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForFunction(() => window.__castleBattle.snapshot().player.jumpTime >= .1)
    const airborne = await state()
    check(!airborne.player.grounded, 'The real touch button must trigger a jump')
    await page.screenshot({ path: `output/playwright/jump-mobile-${size.width}.png` })
    results.push({ touch: size, airborne: true })
    await untilGrounded()
  }
  await cdp.detach()
  await page.keyboard.press('p')
  return results
}
