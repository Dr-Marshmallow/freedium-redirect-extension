const PREFIX = "https://freedium-mirror.cfd/";

// Domini su cui il pulsante è attivo: il dominio stesso e tutti i suoi sottodomini
// (medium.com, blog.medium.com, nomeutente.medium.com, ...).
const ENABLED_DOMAINS = ["medium.com"];

const ICON_ENABLED = "icon.svg";
const ICON_DISABLED = "icon-disabled.svg";

const TITLE_ENABLED = "Apri con Freedium";
const TITLE_DISABLED = "Freedium Redirect: attivo solo su medium.com";

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

browser.tabs.onUpdated.addListener(
  (tabId, changeInfo, tab) => refreshAction(tabId, tab.url),
  { properties: ["url", "status"] }
);

browser.action.onClicked.addListener(async (tab) => {
  // Un pulsante disattivato non emette onClicked: questa è una rete di sicurezza.
  if (!isEnabledUrl(tab.url)) return;

  try {
    await browser.tabs.update(tab.id, { url: PREFIX + tab.url });
  } catch (error) {
    console.error("Freedium Redirect: impossibile aprire il mirror.", error);
  }
});

applyDefaults();
