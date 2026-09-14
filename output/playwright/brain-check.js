async (page) => {
  await page.goto('http://127.0.0.1:5180/works/brain-games');
  await page.locator('.brain-tile').first().waitFor();
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'output/playwright/brain-desktop.png', fullPage: true });
  await page.getByRole('button', { name: /01 \/ STROOP/ }).click();
  await page.getByRole('button', { name: '练习', exact: true }).click();
  await page.clock.runFor(450);
  async function colorAnswer() {
    const index = await page.evaluate(() => {
      const ink = getComputedStyle(document.querySelector('.brain-word')).color;
      return [...document.querySelectorAll('.brain-answers i')].findIndex(i => getComputedStyle(i).backgroundColor === ink);
    });
    assert(index >= 0, 'Color answer not found');
    await page.locator('.brain-answers button').nth(index).click();
  }
  for (let i = 0; i < 3; i++) { await colorAnswer(); await page.clock.runFor(600); }
  assert((await page.locator('.brain-result-number').innerText()).startsWith('3'), 'Practice score');
  assert(await page.evaluate(() => localStorage.getItem('luxixi-brain-v1')) === null, 'Practice wrote record');
  await page.getByRole('button', { name: '正式挑战', exact: true }).click();
  await page.clock.runFor(450);
  for (let i = 0; i < 12; i++) { await colorAnswer(); await page.clock.runFor(600); }
  assert((await page.locator('.brain-result-number').innerText()).startsWith('12'), 'Formal score');
  assert((await page.evaluate(() => JSON.parse(localStorage.getItem('luxixi-brain-v1'))))['stroop:pointer'].score === 12, 'Record missing');
  await page.screenshot({ path: 'output/playwright/brain-result.png', fullPage: true });
  await page.getByRole('button', { name: '返回挑战列表' }).click();
  await page.getByRole('button', { name: /03 \/ REVERSE/ }).click();
  await page.getByRole('button', { name: '键盘', exact: true }).click();
  await page.getByRole('button', { name: '正式挑战', exact: true }).click();
  await page.clock.runFor(450);
  for (let i = 0; i < 12; i++) {
    const index = await page.locator('.brain-direction').evaluate(el => ['up','right','down','left'].findIndex(dir => el.classList.contains('lucide-arrow-' + dir)));
    assert(index >= 0, 'Direction not found');
    const reverse = (await page.locator('.brain-rule').innerText()) === '反向';
    await page.keyboard.press(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'][(index + (reverse ? 2 : 0)) % 4]);
    await page.clock.runFor(600);
  }
  assert((await page.locator('.brain-result-number').innerText()).startsWith('12'), 'Reverse score');
  await page.getByRole('button', { name: '返回挑战列表' }).click();
  await page.getByRole('button', { name: /02 \/ MEMORY/ }).click();
  await page.getByRole('button', { name: '鼠标 / 触屏', exact: true }).click();
  await page.getByRole('button', { name: '练习', exact: true }).click();
  await page.clock.runFor(400);
  for (const size of [3, 4]) {
    const sequence = [];
    await page.clock.runFor(510);
    for (let i = 0; i < size; i++) {
      sequence.push(await page.locator('.brain-memory .lit').getAttribute('aria-label'));
      await page.clock.runFor(750);
    }
    for (const label of sequence) await page.getByRole('button', { name: label, exact: true }).click();
    await page.clock.runFor(600);
  }
  assert((await page.locator('.brain-result-number').innerText()).startsWith('4'), 'Memory sequence failed');
  await page.getByRole('button', { name: '正式挑战', exact: true }).click();
  await page.clock.runFor(450);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  assert(await page.getByText('本局已中断', { exact: true }).isVisible(), 'Visibility did not interrupt');
  await page.evaluate(() => { delete document.hidden; });
  await page.getByRole('button', { name: '返回挑战列表' }).click();
  await page.setViewportSize({ width: 375, height: 812 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile overflow');
  await page.screenshot({ path: 'output/playwright/brain-mobile.png', fullPage: true });
  await page.getByRole('button', { name: /02 \/ MEMORY/ }).click();
  await page.getByRole('button', { name: '练习', exact: true }).click();
  await page.clock.runFor(1000);
  await page.screenshot({ path: 'output/playwright/brain-mobile-memory.png', fullPage: true });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Game mobile overflow');
  await page.getByRole('button', { name: '返回挑战列表' }).click();
  await page.getByRole('button', { name: '返回作品集' }).click();
  await page.getByRole('link', { name: /给大脑/ }).click();
  assert(page.url().endsWith('/works/brain-games'), 'Homepage route');
  assert(errors.length === 0, errors.join('\n'));
  return 'PASS: practice, formal scoring, color, keyboard reversal, sequence replay, storage, interruption, mobile overflow, homepage route.';
}
