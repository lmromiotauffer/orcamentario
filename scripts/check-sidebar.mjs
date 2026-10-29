// Run with playwright-cli run-code --filename=scripts/check-sidebar.mjs.
async (page) => {
  const assert = {
    equal(actual, expected, message = "Unexpected sidebar state") {
      if (actual !== expected) throw new Error(`${message}: ${actual} !== ${expected}`);
    },
    ok(value, message = "Sidebar check failed") { if (!value) throw new Error(message); },
  };
  const welcome = page.getByRole("alertdialog");
  if (await welcome.isVisible()) await welcome.getByRole("button", { name: "Fechar", exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const panel = page.locator('[data-slot="sidebar-container"]');
  const toggle = panel.getByRole("button", { name: /Expandir menu|Recolher menu/ });
  const geometry = () => panel.evaluate((el) => ({
    width: el.getBoundingClientRect().width,
    gap: document.querySelector('[data-slot="sidebar-gap"]').getBoundingClientRect().width,
    iconX: el.querySelector('button svg.lucide-map').getBoundingClientRect().x,
    toggleY: el.querySelector('button[aria-controls="sidebar-navigation"]').getBoundingClientRect().y,
    toggleBottom: el.querySelector('button[aria-controls="sidebar-navigation"]').getBoundingClientRect().bottom,
    menuY: el.querySelector('#sidebar-navigation').getBoundingClientRect().y,
    logoBottom: el.querySelector('img').getBoundingClientRect().bottom,
    logoWidth: el.querySelector('img').getBoundingClientRect().width,
    logoY: el.querySelector('img').getBoundingClientRect().y,
  }));
  const settle = () => panel.evaluate(async (el) => {
    await new Promise(requestAnimationFrame);
    await Promise.all(el.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => {})));
  });
  // Amostra a animação real em tempos controlados: detecta saltos que o estado final esconde.
  const checkContinuity = async () => {
    const frames = await panel.evaluate(async (el) => {
      const control = el.querySelector('button[aria-controls="sidebar-navigation"]');
      const sample = () => ({
        width: el.getBoundingClientRect().width,
        gap: document.querySelector('[data-slot="sidebar-gap"]').getBoundingClientRect().width,
        logo: el.querySelector('img').getBoundingClientRect().width,
        x: control.getBoundingClientRect().x,
        y: control.getBoundingClientRect().y,
        menu: el.querySelector('#sidebar-navigation').getBoundingClientRect().y,
      });
      const before = sample();
      control.click();
      await new Promise(requestAnimationFrame);
      const animations = [
        ...el.getAnimations({ subtree: true }),
        ...document.querySelector('[data-slot="sidebar-gap"]').getAnimations(),
      ];
      animations.forEach(animation => animation.pause());
      const samples = [0, 0.5, 1].map(progress => {
        animations.forEach(animation => {
          animation.currentTime = animation.effect.getComputedTiming().endTime * progress;
        });
        return sample();
      });
      animations.forEach(animation => animation.finish());
      return { before, samples };
    });
    const [start, middle, end] = frames.samples;
    for (const frame of frames.samples) {
      assert.ok(Math.abs(frame.width - frame.gap) < 1, "Panel and gap must stay synchronized");
    }
    for (const key of ["logo", "x", "y", "menu"]) {
      assert.ok(Math.abs(start[key] - frames.before[key]) < 1, `${key} must not jump on the first frame`);
      const progress = (middle[key] - start[key]) / (end[key] - start[key]);
      const panelProgress = (middle.width - start.width) / (end.width - start.width);
      assert.ok(progress > 0 && progress < 1, `${key} must have an intermediate position`);
      assert.ok(Math.abs(progress - panelProgress) < 0.02, `${key} must follow the panel timing`);
    }
  };

  if (await toggle.getAttribute("aria-expanded") === "false") await toggle.click();
  await settle();
  const expanded = await geometry();
  assert.equal(expanded.width, 272);
  assert.equal(expanded.gap, expanded.width, "Panel and reserved width must agree");
  assert.ok(expanded.menuY - expanded.logoBottom <= 32, "Expanded header must retain the original compact spacing");
  const obras = panel.getByRole("button", { name: "Obras", exact: true });
  assert.equal(await obras.locator("svg").last().evaluate((el) => getComputedStyle(el).transitionProperty), "rotate");
  await obras.click();
  assert.equal(await obras.getAttribute("aria-expanded"), "false");
  await settle();
  assert.equal(await panel.getByRole("button", { name: "Tabela de Obras", exact: true }).count(), 0);
  await obras.focus();
  await page.keyboard.press("Enter");
  await settle();
  assert.equal(await obras.getAttribute("aria-expanded"), "true");

  await toggle.focus();
  await checkContinuity();
  await settle();
  const collapsed = await geometry();
  assert.equal(collapsed.width, 60);
  assert.equal(collapsed.gap, collapsed.width);
  assert.equal(collapsed.iconX, expanded.iconX, "Navigation icons must stay anchored");
  assert.ok(expanded.toggleY < expanded.logoY + 20);
  assert.equal(expanded.logoWidth, 44);
  assert.ok(Math.abs(collapsed.logoWidth - 40) < 0.01);
  assert.ok(expanded.menuY - expanded.logoBottom >= 32);
  assert.ok(collapsed.toggleY >= collapsed.logoBottom + 8);
  assert.ok(collapsed.menuY - collapsed.toggleBottom >= 32);
  assert.ok(await toggle.evaluate((el) => el === document.activeElement));
  assert.equal(await panel.getByRole("button", { name: "Tabela de Obras", exact: true }).count(), 0);
  await checkContinuity();
  await settle();
  await toggle.click();
  await settle();
  for (let index = 0; index < 4; index++) await toggle.evaluate((el) => el.click());
  await settle();
  assert.equal((await geometry()).width, 60, "Interrupted transitions must settle correctly");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await toggle.click();
  await settle();
  assert.equal((await geometry()).width, 272);
  assert.ok(await panel.evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration) < 0.01));
  assert.ok(await toggle.evaluate((el) => !getComputedStyle(el).transitionProperty.split(", ").includes("transform")), "Reduced motion must not slide the toggle");
  assert.ok(await panel.locator("img").evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration) < 0.01), "Reduced motion must not scale the logo");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir menu", exact: true }).click();
  const mobile = page.locator('[data-mobile="true"]');
  await mobile.waitFor();
  assert.ok(await mobile.getByRole("button", { name: "Mapa de Obras", exact: true }).isVisible());
  assert.ok(await mobile.getByRole("button", { name: "Fechar menu", exact: true }).isVisible());
  await page.keyboard.press("Escape");
  await mobile.waitFor({ state: "detached" });
  assert.ok(await page.getByRole("button", { name: "Abrir menu", exact: true }).evaluate((el) => el === document.activeElement));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 900 });
  return "Sidebar: motion continuity, geometry, submenus, keyboard, interruption, reduced motion and mobile OK";
}
