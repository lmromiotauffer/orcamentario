// Run against Vite with: playwright-cli run-code --filename=scripts/check-filters.mjs
// Uses the real components and CSS with isolated Qlik selections; no server data is changed.
async (page) => {
  const check = (value, message) => { if (!value) throw new Error(message); };
  const testPage = await page.context().newPage();
  const errors = [];
  testPage.on("pageerror", (error) => errors.push(error.message));
  const origin = "https://localhost:5174";
  const source = await page.request.get(origin + '/src/components/CurrentSelections/CurrentSelections.tsx', {ignoreHTTPSErrors: true});
  const version = (await source.text()).match(/react\.js(\?v=[^"]+)/)[1];
  await testPage.route("**/@cluster-data-experience_qlik-modules.js*", (route) => route.fulfill({
    contentType: "text/javascript",
    body: `import React from '/node_modules/.vite/deps/react.js${version}';
      export const useQlikSelections = () => {
        const items = React.useSyncExternalStore(window.subscribe, () => window.items);
        return { items, handleClearAll: () => window.setItems([]) };
      };
      export const useQlikApp = () => ({ app: { getField: async (field) => ({
        toggleSelect: async () => window.setItems(window.items.filter(item => item.fieldName !== field))
      }) } });
      export const useGenericListObject = () => ({ data: [], isLoading: true });`,
  }));
  await testPage.route("**/__filter-check", (route) => route.fulfill({
    contentType: "text/html",
    body: `<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body><div id="root" style="padding:16px"></div><script type="module">
      import RefreshRuntime from '/@react-refresh';
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
      window.__vite_plugin_react_preamble_installed__ = true;
      const {default: React} = await import('/node_modules/.vite/deps/react.js${version}');
      const {default: ReactDOM} = await import('/node_modules/.vite/deps/react-dom_client.js${version}');
      const {CurrentSelections} = await import('/src/components/CurrentSelections/CurrentSelections.tsx');
      const {useQlikSelections} = await import('/node_modules/.vite/deps/@cluster-data-experience_qlik-modules.js${version}');
      await import('/src/index.css');
      const listeners = new Set();
      window.items = [];
      window.subscribe = callback => { listeners.add(callback); return () => listeners.delete(callback); };
      window.setItems = items => { window.items = items; listeners.forEach(callback => callback()); };
      function Fixture() {
        const {items} = useQlikSelections();
        return React.createElement(CurrentSelections, {
          filters: [{expression: '=codigoAtivo', label: 'Ativo'}],
          selections: items.map(item => ({field: item.fieldName,
            label: item.fieldName + ': ' + item.qSelectedFieldSelectionInfo[0].qName,
            limpar: () => window.setItems(window.items.filter(other => other !== item))}))
        });
      }
      ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(Fixture));
      </script></body></html>`,
  }));
  try {
    await testPage.setViewportSize({ width: 1440, height: 900 });
    await testPage.goto(origin + "/__filter-check");
    const bar = testPage.getByRole("banner", { name: "Filtros aplicados" });
    await bar.waitFor({timeout: 10000});
    const height = (await bar.boundingBox()).height;
    const setCount = async (count) => {
      await testPage.evaluate((count) => window.setItems(Array.from({length: count}, (_, index) => ({
        fieldName: index === 0 ? 'nmServicoFoto' : index === 1 ? 'codigoAtivo' : 'Campo ' + index,
        qSelectedCount: 1,
        qSelectedFieldSelectionInfo: [{qName: index === 0 ? 'Execução de passeio (calçada) com concreto moldado in loco, usinado, acabamento convencional, não armado. Espessura = 7,0 cm' : 'Valor selecionado ' + index}]
      }))), count);
      await testPage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    };
    const geometry = async () => bar.evaluate((bar) => {
      const chips = [...bar.querySelectorAll('[data-selection-chip]')];
      const visible = chips.filter(chip => getComputedStyle(chip).visibility === 'visible');
      const overflow = bar.querySelector('[data-slot="sheet-trigger"]');
      const hasOverflow = overflow && getComputedStyle(overflow).visibility === 'visible';
      return {
        visible: visible.length, total: chips.length, height: bar.getBoundingClientRect().height,
        hidden: hasOverflow ? Number(overflow.textContent.match(/\d+/)[0]) : 0,
        noOverlap: !hasOverflow || visible.every(chip => chip.getBoundingClientRect().right + 4 <= overflow.getBoundingClientRect().left),
        capped: visible.every(chip => chip.getBoundingClientRect().width <= 288),
        contained: document.documentElement.scrollWidth <= innerWidth,
        noScroller: [...bar.querySelectorAll('*')].every(el => !['auto','scroll'].includes(getComputedStyle(el).overflowX)),
      };
    });
    const results = [];
    for (const width of [1440, 1024, 768, 390, 320]) {
      await testPage.setViewportSize({width, height: 900});
      for (const count of [1, 4, 12, 24]) {
        await setCount(count);
        const state = await geometry();
        check(state.height === height, 'The bar changed height');
        check(state.visible + state.hidden === count, 'Overflow count is incorrect');
        check(state.noOverlap && state.capped && state.contained && state.noScroller, JSON.stringify({message: 'Filters overflow or overlap', width, count, state}));
        results.push({width, count, visible: state.visible, hidden: state.hidden});
      }
    }
    await testPage.setViewportSize({width: 1024, height: 768});
    await setCount(12);
    const overflow = bar.getByRole('button', {name: /Ver todos os filtros/});
    await overflow.focus();
    await testPage.keyboard.press('Enter');
    const dialog = testPage.getByRole('dialog');
    await dialog.getByRole('heading', {name: 'Serviço da foto', exact: true}).waitFor();
    check(await dialog.getByRole('heading', {name: 'Ativo', exact: true}).count() === 1, 'Configured field label missing');
    check(await dialog.getByRole('button', {name: /^Remover /}).count() === 12, 'Sheet did not open on all applied filters');
    await dialog.getByRole('button', {name: 'Remover Valor selecionado 11', exact: true}).click();
    check(await dialog.getByRole('button', {name: /^Remover /}).count() === 11, 'Remove in sheet failed');
    await testPage.keyboard.press('Escape');
    await dialog.waitFor({state: 'hidden'});
    check(await overflow.evaluate(el => el === document.activeElement), 'Focus did not return to overflow trigger');
    await bar.getByRole('button', {name: /^Ver valores do filtro Serviço da foto/}).click();
    await testPage.getByRole('dialog').getByRole('heading', {name: 'Serviço da foto'}).waitFor();
    await testPage.keyboard.press('Escape');
    await bar.getByRole('button', {name: /^Remover filtro Serviço da foto/}).click();
    check(await bar.getByRole('button', {name: /^Remover filtro Serviço da foto/}).count() === 0, 'Chip removal failed');
    await bar.getByRole('button', {name: 'Limpar filtros', exact: true}).click();
    await bar.getByText('Nenhum filtro aplicado.').waitFor();
    await setCount(24);
    await testPage.setViewportSize({width: 1440, height: 900});
    await testPage.screenshot({path: '.playwright-cli/filters-desktop.png'});
    await testPage.setViewportSize({width: 390, height: 844});
    await overflow.click();
    await dialog.getByRole('heading', {name: 'Serviço da foto', exact: true}).waitFor();
    await dialog.evaluate(async el => {
      await new Promise(requestAnimationFrame);
      await Promise.all(el.getAnimations({subtree: true}).map(animation => animation.finished));
    });
    check(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), 'Sheet has horizontal overflow');
    const sheetScroll = dialog.locator('.overflow-y-auto');
    check(await sheetScroll.evaluate(el => el.scrollHeight > el.clientHeight), 'Long selection list must scroll inside sheet');
    await dialog.getByRole('button', {name: 'Remover Valor selecionado 23', exact: true}).scrollIntoViewIfNeeded();
    await sheetScroll.evaluate(el => { el.scrollTop = 0; });
    await testPage.screenshot({path: '.playwright-cli/filters-mobile.png'});
    check(errors.length === 0, errors.join('\n'));
    return {passed: true, results, errors};
  } catch (error) {
    await testPage.screenshot({path: '.playwright-cli/filters-failure.png'});
    throw new Error(JSON.stringify({message: error.message, errors, body: await testPage.locator('body').innerText()}));
  } finally {
    await testPage.close();
  }
}
