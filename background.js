const PREFIX = "https://freedium-mirror.cfd/";

// Domini su cui il pulsante e la voce di menu sono attivi: ogni voce copre il
// dominio stesso e tutti i suoi sottodomini (medium.com abilita blog.medium.com,
// nytimes.com abilita cooking.nytimes.com, ...).
const ENABLED_DOMAINS = [
  "medium.com",
  "nytimes.com",
  "washingtonpost.com",
  "bloomberg.com",
  "reuters.com",
  "economist.com",
  "ft.com"
];

const ICON_ENABLED = "icon.svg";
const ICON_DISABLED = "icon-disabled.svg";

const TITLE_ENABLED = "Apri con Freedium";
const TITLE_DISABLED = "Freedium Redirect: attivo solo sui siti supportati";

const MENU_ID = "freedium-redirect-open";

// In un match pattern l'host `*.medium.com` copre anche `medium.com`, quindi un
// solo pattern per dominio basta a replicare la regola di ENABLED_DOMAINS.
const MENU_DOCUMENT_PATTERNS = ENABLED_DOMAINS.map((domain) => `*://*.${domain}/*`);

// Contesti in cui compare la voce: senza `selection`/`image`/`link` il menu
// sparirebbe facendo clic destro su testo selezionato, immagini o collegamenti.
const MENU_CONTEXTS = ["page", "selection", "image", "link"];

// Vero solo per pagine http/https su uno dei domini abilitati.
// Un URL già sul mirror ha come host quello del mirror, quindi ricade nel ramo falso.
function isEnabledUrl(url) {
  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    // URL assente o non valido (pagina interna, scheda non ancora caricata, ecc.)
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

  const host = parsed.hostname.toLowerCase();
  return ENABLED_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

// Riapre sul mirror la pagina della scheda, sia dal pulsante sia dal menu contestuale.
async function openWithFreedium(tab) {
  // Pulsante disattivato e voce di menu filtrata non dovrebbero arrivare fin qui:
  // questa è una rete di sicurezza.
  if (!tab || !isEnabledUrl(tab.url)) return;

  try {
    await browser.tabs.update(tab.id, { url: PREFIX + tab.url });
  } catch (error) {
    console.error("Freedium Redirect: impossibile aprire il mirror.", error);
  }
}

// Allinea stato, icona e tooltip del pulsante all'URL di una singola scheda.
async function refreshAction(tabId, url) {
  const enabled = isEnabledUrl(url);

  try {
    if (enabled) {
      await browser.action.enable(tabId);
    } else {
      await browser.action.disable(tabId);
    }

    await browser.action.setIcon({ tabId, path: enabled ? ICON_ENABLED : ICON_DISABLED });
    await browser.action.setTitle({ tabId, title: enabled ? TITLE_ENABLED : TITLE_DISABLED });
  } catch {
    // La scheda può essere stata chiusa nel frattempo: nulla da aggiornare.
  }
}

// Il pulsante nasce disattivato: viene acceso solo sulle schede riconosciute.
// Eseguito a ogni avvio dell'event page, così lo stato si ricostruisce da solo.
async function applyDefaults() {
  await browser.action.disable();
  await browser.action.setIcon({ path: ICON_DISABLED });
  await browser.action.setTitle({ title: TITLE_DISABLED });

  const tabs = await browser.tabs.query({});
  await Promise.all(tabs.map((tab) => refreshAction(tab.id, tab.url)));
}

// `documentUrlPatterns` limita la voce ai soli siti supportati: Firefox non la
// mostra altrove. La rimozione preventiva evita l'errore di ID duplicato quando
// l'event page si riavvia.
//
// L'icona accanto alla voce arriva dalla chiave `icons` del manifest: per le voci di
// primo livello Firefox ignora la proprietà `icons` di `menus.create`, che vale solo
// dentro i sottomenu.
async function setupMenu() {
  await browser.menus.removeAll();

  browser.menus.create({
    id: MENU_ID,
    title: TITLE_ENABLED,
    contexts: MENU_CONTEXTS,
    documentUrlPatterns: MENU_DOCUMENT_PATTERNS
  });
}

browser.tabs.onUpdated.addListener(
  (tabId, changeInfo, tab) => refreshAction(tabId, tab.url),
  { properties: ["url", "status"] }
);

browser.action.onClicked.addListener((tab) => openWithFreedium(tab));

// Anche sul collegamento o sull'immagine la voce riapre la pagina corrente,
// esattamente come il pulsante nella barra degli strumenti.
browser.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  return openWithFreedium(tab);
});

applyDefaults();
setupMenu();
