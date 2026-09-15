async (page) => {
  const check = (value, message) => { if (!value) throw new Error(message) }
  const state = () => page.evaluate(() => window.__castleBattle.snapshot())
  const held = new Set()
  async function movement(dx = 0, dz = 0, yaw = 0) {
    const x = dx * Math.cos(yaw) - dz * Math.sin(yaw)
    const y = -dx * Math.sin(yaw) - dz * Math.cos(yaw)
    for (const [key, on] of [['d', x > .15], ['a', x < -.15], ['w', y > .15], ['s', y < -.15]]) {
      if (on && !held.has(key)) { await page.keyboard.down(key); held.add(key) }
      if (!on && held.has(key)) { await page.keyboard.up(key); held.delete(key) }
    }
  }
  async function go(x, z) {
    const deadline = Date.now() + 15000
    while (Date.now() < deadline) {
      const s = await state()
      const dx = x - s.player.position[0], dz = z - s.player.position[2]
      if (Math.hypot(dx, dz) < .45) { await movement(); return }
      await movement(dx, dz, s.yaw)
      await page.waitForTimeout(100)
    }
    await movement()
    throw new Error('Walking was blocked at ' + JSON.stringify(await state()))
  }
  async function clearZone() {
    const deadline = Date.now() + 55000
    await page.keyboard.down('Space')
    while (Date.now() < deadline) {
      const s = await state()
      check(s.player.health > 0, 'The hero must survive the real combat test')
      check(s.player.position[1] >= 10.1, 'No character fall is allowed')
      const live = s.enemies.filter(enemy => enemy.zone === s.zone && enemy.health > 0)
        .sort((a, b) => Math.hypot(a.position[0] - s.player.position[0], a.position[2] - s.player.position[2]) - Math.hypot(b.position[0] - s.player.position[0], b.position[2] - s.player.position[2]))
      if (!live.length) { await movement(); await page.keyboard.up('Space'); return s }
      const dx = live[0].position[0] - s.player.position[0], dz = live[0].position[2] - s.player.position[2]
      if (Math.hypot(dx, dz) > 2.1) await movement(dx, dz, s.yaw)
      else await movement()
      if (s.player.health < 55 && s.player.potions > 0) await page.keyboard.press('e')
      await page.waitForTimeout(140)
    }
    await movement()
    await page.keyboard.up('Space')
    throw new Error('Guards failed to engage: ' + JSON.stringify(await state()))
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('http://127.0.0.1:5186/works/castle-battle')
  await page.getByRole('button', { name: /直接挑战|踏入钟庭/, exact: true }).click()
  const courtyard = await clearZone()
  check(courtyard.kills === 8 && courtyard.phase === 'playing', 'Outdoor guards alone must not trigger victory')
  await go(5.8, 9.2)
  await go(6.7, 6.9)
  await page.keyboard.press('f')
  check((await state()).zone === 'interior', 'Door must enter the hall')
  const victory = await clearZone()
  check(victory.kills === 12 && victory.phase === 'victory', 'All twelve real guard deaths must trigger victory')
  await page.getByRole('heading', { name: '通关成功' }).waitFor()
  await page.waitForTimeout(300)
  await page.screenshot({ path: 'output/playwright/v2-victory.png' })
  await page.getByRole('button', { name: '继续探索', exact: true }).click()
  check((await state()).exploring, 'Victory must allow continued exploration')
  await go(80, -10)
  await go(80, 6.3)
  await page.keyboard.press('f')
  const returned = await state()
  check(returned.zone === 'courtyard' && returned.kills === 12, 'Returning outdoors must preserve defeated guards')
  await page.waitForTimeout(900)
  await page.keyboard.press('f')
  check((await state()).zone === 'interior', 'The door must remain reusable after victory')
  await page.keyboard.press('h')
  await page.getByRole('dialog', { name: '操作手册' }).waitFor()
  const paused = await state()
  await page.keyboard.press('r')
  await page.keyboard.press('f')
  await page.waitForTimeout(300)
  check((await state()).phase === 'paused' && (await state()).elapsed === paused.elapsed, 'Manual must block game hotkeys and freeze the simulation')
  await page.keyboard.press('h')
  check((await state()).phase === 'playing', 'Closing the manual must restore play')
  await page.keyboard.press('p')
  return { courtyardKills: courtyard.kills, victoryKills: victory.kills, victoryHealth: victory.player.health, returned: returned.zone, exploration: true, helpPauses: true }
}
