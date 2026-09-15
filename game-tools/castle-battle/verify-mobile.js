async (page) => {
  const session = await page.context().newCDPSession(page)
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 })
  const snapshot = () => page.evaluate(() => window.__castleBattle.snapshot())
  const check = (value, message) => { if (!value) throw new Error(message) }
  const center = async selector => {
    const bounds = await page.locator(selector).boundingBox()
    return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
  }
  const send = (type, points) => session.send('Input.dispatchTouchEvent', {
    type, touchPoints: points.map((point, index) => ({ ...point, id: index + 1, radiusX: 4, radiusY: 4, force: 1 })),
  })
  const tap = async selector => {
    await send('touchStart', [await center(selector)])
    await send('touchEnd', [])
  }
  const results = []
  for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(size)
    await page.reload()
    await page.locator('.castle-begin').waitFor()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `output/playwright/castle-ready-${size.width}.png` })
    await page.getByRole('button', { name: /直接挑战|踏入钟庭/, exact: true }).click()
    await page.locator('.castle-joystick').waitFor({ state: 'visible' })
    await page.waitForTimeout(400)
    const before = await snapshot()
    const stick = await center('.castle-joystick')
    const look = await center('.castle-look')
    await send('touchStart', [stick, look])
    await send('touchMove', [{ x: stick.x + 27, y: stick.y }, { x: look.x + 90, y: look.y + 10 }])
    await page.waitForTimeout(600)
    await send('touchEnd', [])
    const moved = await snapshot()
    check(Math.hypot(moved.player.position[0] - before.player.position[0], moved.player.position[2] - before.player.position[2]) > .6, `Touch joystick must move the player: ${JSON.stringify({before, moved})}`)
    check(Math.abs(moved.yaw - before.yaw) > .1, 'Second touch must rotate the camera while moving')
    await tap('.castle-touch-attack')
    check((await snapshot()).player.stamina < 100, 'Touch attack must consume stamina')
    await page.waitForTimeout(650)
    const stamina = (await snapshot()).player.stamina
    await tap('.castle-touch-dodge')
    check((await snapshot()).player.stamina < stamina - 10, 'Touch dodge must consume stamina')
    await tap('.castle-touch-lock')
    check(await page.locator('.castle-touch-lock').getAttribute('aria-pressed') === 'true', 'Touch lock must acquire a guard')
    await page.screenshot({ path: `output/playwright/castle-playing-${size.width}.png` })
    const layout = await page.evaluate(() => {
      const bounds = [...document.querySelectorAll('.castle-topbar button, .castle-joystick, .castle-touch-actions button')]
        .filter(element => getComputedStyle(element).display !== 'none')
        .map(element => { const rect = element.getBoundingClientRect(); return { label: element.getAttribute('aria-label'), x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom } })
      return { overflow: document.documentElement.scrollWidth > innerWidth, bounds }
    })
    check(!layout.overflow && layout.bounds.every(rect => rect.x >= 0 && rect.y >= 0 && rect.right <= size.width && rect.bottom <= size.height), 'All mobile controls must fit inside the screen')
    await page.getByRole('button', { name: '暂停', exact: true }).click()
    results.push({ size, touchMovement: true, touchLook: true, attack: true, dodge: true, lock: true, layout, render: moved.renderer })
  }
  await session.detach()
  return results
}
