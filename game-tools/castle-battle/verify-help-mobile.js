// Run with: playwright-cli -s=castle-help-mobile run-code --filename=game-tools/castle-battle/verify-help-mobile.js
// This script uses normal UI input and reads the DEV snapshot; it never changes game state directly.
async (page) => {
  const results = []
  const failures = []
  const warnings = []
  const resourceErrors = []
  const consoleErrors = []
  const sizes = [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 360, height: 640 }]
  const snapshot = () => page.evaluate(() => window.__castleBattle.snapshot())
  const positionDelta = (a, b) => Math.hypot(a[0] - b[0], a[2] - b[2])
  const assert = (condition, message) => { if (!condition) failures.push(message) }
  const delay = milliseconds => page.waitForTimeout(milliseconds)
  const onResponse = response => {
    if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) resourceErrors.push({ url: response.url(), status: response.status() })
  }
  const onError = error => consoleErrors.push(error.message)
  page.on('response', onResponse)
  page.on('pageerror', onError)

  async function layout() {
    return page.evaluate(() => {
      const viewport = { width: innerWidth, height: innerHeight }
      const rectangle = element => {
        const rect = element.getBoundingClientRect()
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom }
      }
      const visible = element => element && element.getBoundingClientRect().width > 0 && getComputedStyle(element).visibility !== 'hidden'
      const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.x, b.x) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 2
      const textOverflow = []
      for (const element of document.querySelectorAll('.castle-help button, .castle-control-row, .castle-tutorial h2, .castle-tutorial p, .castle-keyset, .castle-location b, .castle-objective')) {
        if (!visible(element)) continue
        if (element.scrollWidth > element.clientWidth + 2) textOverflow.push({ text: element.textContent.trim(), width: element.clientWidth, scrollWidth: element.scrollWidth })
      }
      const help = document.querySelector('.castle-help')
      const manual = document.querySelector('.castle-manual-body')
      const footer = document.querySelector('.castle-help-footer')
      const chapter = document.querySelector('.castle-chapter')
      const tutorial = document.querySelector('.castle-tutorial')
      const conflicts = []
      if (tutorial) {
        const card = rectangle(tutorial)
        for (const selector of ['.castle-hud', '.castle-joystick', '.castle-touch-actions', '.castle-target', '.castle-interaction']) {
          const element = document.querySelector(selector)
          if (visible(element) && overlap(card, rectangle(element))) conflicts.push(selector)
        }
      }
      return {
        viewport, documentWidth: document.documentElement.scrollWidth,
        help: help ? rectangle(help) : null,
        footer: footer ? { ...rectangle(footer), paddingBottom: getComputedStyle(footer).paddingBottom } : null,
        chapterOverHelp: visible(chapter) && help ? overlap(rectangle(chapter), rectangle(help)) : false,
        manual: manual ? { ...rectangle(manual), scrollHeight: manual.scrollHeight, clientHeight: manual.clientHeight, scrollTop: manual.scrollTop, overflowY: getComputedStyle(manual).overflowY } : null,
        tutorial: tutorial ? { ...rectangle(tutorial), scrollHeight: tutorial.scrollHeight, clientHeight: tutorial.clientHeight, text: tutorial.textContent.trim() } : null,
        tutorialCoversCenter: tutorial ? rectangle(tutorial).x < innerWidth / 2 && rectangle(tutorial).right > innerWidth / 2 && rectangle(tutorial).y < innerHeight / 2 && rectangle(tutorial).bottom > innerHeight / 2 : false,
        textOverflow, conflicts,
      }
    })
  }

  try {
    for (const size of sizes) {
      const id = `${size.width}x${size.height}`
      const checks = { size: id }
      await page.setViewportSize(size)
      await page.goto('http://127.0.0.1:5186/works/castle-battle')
      await page.getByRole('button', { name: '新手启程', exact: true }).waitFor({ state: 'visible', timeout: 30000 })
      await delay(500)
      await page.keyboard.press('h')
      const help = page.getByRole('dialog', { name: '操作手册', exact: true })
      await help.waitFor({ state: 'visible' })
      await delay(300)
      checks.readyHelpPhase = (await snapshot()).phase
      assert(checks.readyHelpPhase === 'ready', `${id}: help changed ready phase`)

      await page.getByRole('tab', { name: '键盘与鼠标', exact: true }).click()
      checks.keyboardRows = await page.locator('.castle-control-row').count()
      checks.keyboard = await layout()
      if (parseFloat(checks.keyboard.footer.paddingBottom) > 25) warnings.push(`${id}: global footer padding wastes ${checks.keyboard.footer.paddingBottom} below help actions`)
      if (checks.keyboard.chapterOverHelp) warnings.push(`${id}: decorative chapter label overlaps help panel`)
      assert(checks.keyboardRows === 10, `${id}: keyboard controls missing`)
      assert(checks.keyboard.textOverflow.length === 0, `${id}: keyboard text overflow`)
      const helpRect = checks.keyboard.help
      assert(helpRect.x >= 0 && helpRect.y >= 0 && helpRect.right <= size.width + 1 && helpRect.bottom <= size.height + 1, `${id}: help panel outside viewport`)
      await page.screenshot({ path: `output/playwright/help-keyboard-${id}.png` })
      const manual = checks.keyboard.manual
      if (manual.scrollHeight > manual.clientHeight + 2) {
        await page.mouse.move(manual.x + manual.width / 2, manual.y + manual.height / 2)
        await page.mouse.wheel(0, 900)
        await delay(250)
        checks.scrollTop = (await layout()).manual.scrollTop
        assert(checks.scrollTop > 0, `${id}: help body does not scroll`)
      } else checks.scrollTop = 'all rows fit'

      await page.getByRole('tab', { name: '触屏操作', exact: true }).click()
      checks.touchRows = await page.locator('.castle-control-row').count()
      checks.touch = await layout()
      if (checks.touch.manual.scrollTop > 0) warnings.push(`${id}: switching control tabs retains the old scroll offset (${checks.touch.manual.scrollTop}px)`)
      assert(checks.touchRows === 8, `${id}: touch controls missing`)
      assert(checks.touch.textOverflow.length === 0, `${id}: touch text overflow`)
      await page.screenshot({ path: `output/playwright/help-touch-${id}.png` })
      await page.keyboard.press('h')
      await help.waitFor({ state: 'hidden' })
      assert((await snapshot()).phase === 'ready', `${id}: closing ready help starts the game`)

      await page.getByRole('button', { name: '新手启程', exact: true }).click()
      await page.locator('.castle-tutorial').waitFor({ state: 'visible' })
      await delay(400)
      checks.tutorial = await layout()
      if (checks.tutorial.tutorialCoversCenter) warnings.push(`${id}: tutorial covers the center of the gameplay camera; inspect character visibility in the screenshot`)
      assert(checks.tutorial.textOverflow.length === 0, `${id}: tutorial text overflow`)
      assert(checks.tutorial.conflicts.length === 0, `${id}: tutorial overlaps ${checks.tutorial.conflicts.join(', ')}`)
      await page.screenshot({ path: `output/playwright/tutorial-${id}.png` })

      await page.keyboard.down('w')
      await delay(300)
      await page.keyboard.press('h')
      await help.waitFor({ state: 'visible' })
      const paused = await snapshot()
      await page.keyboard.up('w')
      await delay(300)
      const duringHelp = await snapshot()
      checks.helpPauses = paused.phase === 'paused' && duringHelp.phase === 'paused' && Math.abs(paused.elapsed - duringHelp.elapsed) < 0.02
      assert(checks.helpPauses, `${id}: help does not freeze simulation`)
      await page.keyboard.press('h')
      await help.waitFor({ state: 'hidden' })
      await delay(150)
      const released = await snapshot()
      await delay(400)
      const releasedLater = await snapshot()
      checks.moveAfterRelease = positionDelta(released.player.position, releasedLater.player.position)
      assert(released.phase === 'playing' && releasedLater.phase === 'playing', `${id}: closing help does not resume previous play`)
      assert(checks.moveAfterRelease < 0.12, `${id}: held movement key stays active after closing help`)

      await page.keyboard.press('p')
      await page.getByRole('heading', { name: '片刻休憩', exact: true }).waitFor({ state: 'visible' })
      await page.keyboard.press('h')
      await help.waitFor({ state: 'visible' })
      await page.keyboard.press('p')
      await help.waitFor({ state: 'hidden' })
      checks.closedFromPause = (await snapshot()).phase
      assert(checks.closedFromPause === 'paused', `${id}: P closing paused help secretly resumes play`)

      await page.keyboard.press('h')
      await help.waitFor({ state: 'visible' })
      await page.getByRole('button', { name: '设置', exact: true }).click()
      await page.getByRole('dialog', { name: '设置', exact: true }).waitFor({ state: 'visible' })
      await page.getByRole('button', { name: '关闭设置', exact: true }).click()
      checks.settingsFromPause = (await snapshot()).phase
      assert(checks.settingsFromPause === 'paused', `${id}: switching paused help to settings resumes play`)

      await page.keyboard.press('p')
      await delay(200)
      await page.keyboard.down('Space')
      await delay(250)
      await page.keyboard.press('h')
      await help.waitFor({ state: 'visible' })
      await page.keyboard.up('Space')
      await page.keyboard.press('h')
      await help.waitFor({ state: 'hidden' })
      await delay(700)
      const staminaAfterRelease = (await snapshot()).player.stamina
      await delay(700)
      const staminaLater = (await snapshot()).player.stamina
      checks.attackAfterRelease = { staminaAfterRelease, staminaLater }
      assert(staminaLater >= staminaAfterRelease, `${id}: attack remains held after help closes`)
      await page.keyboard.press('p')
      results.push(checks)
    }

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('http://127.0.0.1:5186/works/castle-battle')
    await page.getByRole('button', { name: '新手启程', exact: true }).waitFor({ state: 'visible' })
    await page.getByRole('button', { name: '新手启程', exact: true }).click()
    await page.locator('.castle-tutorial').waitFor({ state: 'visible' })
    await delay(500)
    await page.mouse.move(800, 450)
    await page.mouse.down()
    await delay(180)
    await page.keyboard.press('h')
    await page.getByRole('dialog', { name: '操作手册', exact: true }).waitFor({ state: 'visible' })
    await page.mouse.up()
    await page.keyboard.press('h')
    await page.getByRole('dialog', { name: '操作手册', exact: true }).waitFor({ state: 'hidden' })
    await delay(700)
    const mouseRelease = await snapshot()
    await delay(700)
    const mouseReleaseLater = await snapshot()
    assert(mouseReleaseLater.player.stamina >= mouseRelease.player.stamina, 'desktop: left mouse attack remains held after help closes')
    await page.mouse.move(800, 450)
    await page.mouse.down({ button: 'right' })
    await page.mouse.move(880, 450, { steps: 8 })
    await page.keyboard.press('h')
    await page.getByRole('dialog', { name: '操作手册', exact: true }).waitFor({ state: 'visible' })
    await page.mouse.up({ button: 'right' })
    await page.keyboard.press('h')
    await page.getByRole('dialog', { name: '操作手册', exact: true }).waitFor({ state: 'hidden' })
    const mouseYaw = (await snapshot()).yaw
    await page.mouse.move(600, 500, { steps: 8 })
    const mouseYawAfterRelease = (await snapshot()).yaw
    assert(Math.abs(mouseYaw - mouseYawAfterRelease) < 0.01, 'desktop: camera drag remains held after help closes')
    results.push({ size: '1280x800', mouseReleasedStamina: [mouseRelease.player.stamina, mouseReleaseLater.player.stamina], mouseYawAfterRelease: [mouseYaw, mouseYawAfterRelease] })
    await page.keyboard.press('p')
  } finally {
    await page.keyboard.up('w')
    await page.keyboard.up('Space')
    page.off('response', onResponse)
    page.off('pageerror', onError)
  }
  return { passed: failures.length === 0 && resourceErrors.length === 0 && consoleErrors.length === 0, failures, warnings, resourceErrors, consoleErrors, results }
}
