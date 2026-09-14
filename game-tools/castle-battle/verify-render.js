async (page) => {
  const pixels = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => {
    const canvas = document.querySelector('.castle-canvas')
    const gl = canvas.getContext('webgl2')
    const data = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4)
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, data)
    const colors = new Set()
    let nonblack = 0
    let count = 0
    let checksum = 0
    for (let index = 0; index < data.length; index += 388) {
      const rgb = data[index] * 65536 + data[index + 1] * 256 + data[index + 2]
      colors.add(rgb)
      if (rgb) nonblack++
      checksum = (checksum + rgb * (count + 1)) % 2147483647
      count++
    }
    resolve({ colors: colors.size, nonblack: nonblack / count, checksum, width: canvas.width, height: canvas.height })
  })))
  const results = []
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(size)
    await page.reload()
    await page.getByRole('button', { name: '踏入钟庭' }).waitFor()
    await page.waitForTimeout(400)
    const before = await pixels()
    await page.waitForTimeout(400)
    const after = await pixels()
    if (before.colors < 100 || before.nonblack < .8 || before.checksum === after.checksum) throw new Error(`Blank or static canvas: ${JSON.stringify({ size, before, after })}`)
    await page.screenshot({ path: `output/playwright/castle-ready-final-${size.width}.png` })
    results.push({ size, before, after })
  }
  return results
}
