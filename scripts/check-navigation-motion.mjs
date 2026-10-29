// Run with playwright-cli run-code --filename=scripts/check-navigation-motion.mjs.
async (page) => {
  const check = (value, message) => { if (!value) throw new Error(message); };
  const welcome = page.getByRole('alertdialog');
  if (await welcome.isVisible()) {
    await welcome.getByRole('checkbox').check();
    await welcome.getByRole('button', { name: 'Fechar', exact: true }).click();
  }
  const nav = page.locator('.sidebar-navigation');
  const button = name => nav.getByRole('button', { name, exact: true });
  const settle = () => nav.evaluate(async el => {
    await new Promise(requestAnimationFrame);
    await Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished.catch(() => {})));
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await button('Mapa de Obras').click();
  if (await button('Obras').getAttribute('aria-expanded') === 'false') await button('Obras').click();
  await page.mouse.move(600, 500);
  await settle();
  const frames = await nav.evaluate(async el => {
    const from = el.querySelector('[aria-label="Mapa de Obras"]');
    const to = el.querySelector('[aria-label="Tabela de Obras"]');
    const sample = () => [from, to].map(item => ({
      color: getComputedStyle(item).backgroundColor,
      transform: getComputedStyle(item).transform,
      x: item.getBoundingClientRect().x, y: item.getBoundingClientRect().y,
    }));
    const before = sample();
    to.click();
    for (let i = 0; i < 60 && to.getAttribute('aria-current') !== 'page'; i++) await new Promise(requestAnimationFrame);
    const animations = [...from.getAnimations(), ...to.getAnimations()];
    if (!animations.some(a => a.transitionProperty === 'background-color')) throw new Error('Selection must crossfade');
    animations.forEach(a => a.pause());
    const samples = [0, 60, 180].map(time => {
      animations.forEach(a => { a.currentTime = time; });
      return sample();
    });
    animations.forEach(a => a.finish());
    return { before, samples };
  });
  for (const sample of frames.samples) {
    sample.forEach((item, index) => {
      check(item.transform === 'none', 'Selection must not slide or scale');
      check(item.x === frames.before[index].x && item.y === frames.before[index].y, 'Items must remain anchored');
    });
  }
  for (let index = 0; index < 2; index++) {
    check(frames.samples[1][index].color !== frames.samples[0][index].color, 'Background must have an intermediate color');
    check(frames.samples[1][index].color !== frames.samples[2][index].color, 'Background must fade progressively');
  }
  await button('Análise Customizada').focus();
  await page.keyboard.press('Enter');
  await settle();
  check(await button('Análise Customizada').getAttribute('aria-current') === 'page', 'Keyboard must select the page');
  await nav.evaluate(async el => {
    for (const label of ['Tabela de Obras', 'Análise Customizada', 'Tabela de Obras']) {
      el.querySelector(`[aria-label="${label}"]`).click();
      await new Promise(requestAnimationFrame);
    }
  });
  await settle();
  check(await button('Tabela de Obras').getAttribute('aria-current') === 'page', 'Rapid switching must keep the last selection');
  for (const theme of ['Tema escuro', 'Tema claro']) {
    await page.getByRole('button', { name: theme, exact: true }).click();
    await settle();
    await page.locator('.side-menu').screenshot({ path: `.playwright-cli/navigation-crossfade-${theme === 'Tema escuro' ? 'dark' : 'light'}.png` });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await button('Análise Customizada').click();
  await settle();
  check(await button('Análise Customizada').getAttribute('aria-current') === 'page', 'Reduced motion must preserve selection');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  await button('Tabela de Obras').click();
  await page.locator('[data-mobile="true"]').waitFor({ state: 'detached' });
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
  check(await button('Tabela de Obras').getAttribute('aria-current') === 'page', 'Mobile must restore the selected item');
  await page.locator('[data-mobile="true"]').screenshot({ path: '.playwright-cli/navigation-crossfade-mobile.png' });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  return { result: 'Local crossfade, stable geometry, keyboard, rapid switching, themes, reduced motion and mobile OK', frames };
}
