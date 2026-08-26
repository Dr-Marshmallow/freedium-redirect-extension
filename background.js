const PREFIX = "https://freedium-mirror.cfd/";

browser.action.onClicked.addListener(async (tab) => {
  const url = tab.url;

  // Nessun URL leggibile (pagina interna, permesso non concesso, ecc.)
  if (!url) return;

  // Funziona solo su pagine http/https: about:, file:, view-source: ecc. vengono ignorate
  if (!/^https?:\/\//i.test(url)) return;

  // Evita di concatenare il prefisso due volte
  if (url.startsWith(PREFIX)) return;

  await browser.tabs.update(tab.id, { url: PREFIX + url });
});
