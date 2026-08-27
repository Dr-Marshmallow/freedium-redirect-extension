# Freedium Redirect

Estensione Firefox minimale: un solo pulsante nella barra degli strumenti che riapre
la pagina corrente anteponendo all'URL il prefisso di un mirror Freedium, sostituendo
la scheda attiva.

Da `https://medium.com/@autore/articolo` si passa a
`https://freedium-mirror.cfd/https://medium.com/@autore/articolo`.

Il pulsante è attivo **solo su `medium.com` e sui suoi sottodomini**. Su qualsiasi
altra pagina resta disattivato e mostra un'icona grigia.

---

## Indice

- [Requisiti](#requisiti)
- [Struttura del progetto](#struttura-del-progetto)
- [Installazione temporanea (per sviluppo)](#installazione-temporanea-per-sviluppo)
- [Installazione permanente su Developer Edition](#installazione-permanente-su-developer-edition)
- [Creare il pacchetto .xpi](#creare-il-pacchetto-xpi)
- [Sviluppo con web-ext](#sviluppo-con-web-ext)
- [Personalizzazione](#personalizzazione)
- [Aggiornare l'estensione](#aggiornare-lestensione)
- [Risoluzione dei problemi](#risoluzione-dei-problemi)
- [Note sulla sicurezza](#note-sulla-sicurezza)

---

## Requisiti

- **Firefox Developer Edition** 109 o superiore (il manifest è MV3, dichiarato in
  `strict_min_version`).
- Facoltativo: [`web-ext`](https://github.com/mozilla/web-ext) per il ciclo di
  sviluppo (`npm install -g web-ext`).

Developer Edition usa un profilo separato da Firefox stabile: tutte le impostazioni
descritte qui valgono solo per quel profilo.

---

## Struttura del progetto

```
freedium-redirect/
├── manifest.json       # manifest MV3: permessi, action, background
├── background.js       # abilitazione per dominio + listener sul click
├── icon.svg            # icona della toolbar (pulsante attivo)
├── icon-disabled.svg   # icona grigia (pulsante disattivato)
└── README.md
```

I quattro file dell'estensione devono stare **alla radice** dell'archivio `.xpi`.
Un livello di annidamento in più impedisce a Firefox di trovare il manifest.

### Permessi richiesti

- `activeTab` — accesso alla scheda corrente nel momento in cui premi il pulsante.
- `tabs` — lettura dell'URL delle schede.

`tabs` serve per decidere *prima* del click se la pagina è su Medium: `activeTab`
concede l'URL solo *durante* il click, troppo tardi per colorare o spegnere l'icona.
In cambio l'estensione può leggere l'URL di tutte le schede aperte. Il codice lo usa
solo per confrontarlo con `ENABLED_DOMAINS`: nessun dato viene memorizzato o inviato
altrove, e l'unica richiesta di rete parte dal click, verso il mirror.

---

## Installazione temporanea (per sviluppo)

Il metodo più rapido, non richiede modifiche alla configurazione del browser.
L'estensione viene rimossa alla chiusura di Firefox.

1. Apri `about:debugging` nella barra degli indirizzi.
2. Nel menu a sinistra seleziona **Questo Firefox**.
3. Clicca **Carica componente aggiuntivo temporaneo…**.
4. Seleziona il file `manifest.json` dentro la cartella del progetto. Firefox carica
   automaticamente l'intera cartella.
5. Se il pulsante non compare nella barra, clicca l'icona a puzzle delle estensioni,
   trova *Freedium Redirect* e fissalo alla barra degli strumenti.

---

## Installazione permanente su Developer Edition

Developer Edition consente di installare estensioni non firmate. Firefox stabile ed
ESR ignorano questa preferenza: lì serve la firma su addons.mozilla.org.

### 1. Disattivare il controllo della firma

1. Apri `about:config`.
2. Conferma con **Accetta il rischio e continua**.
3. Cerca `xpinstall.signatures.required`.
4. Portala a `false` con il pulsante di inversione a destra. Non serve riavviare.

### 2. Installare il pacchetto

1. Prepara il file `.xpi` (vedi [Creare il pacchetto](#creare-il-pacchetto-xpi)).
2. Apri `about:addons`.
3. Clicca l'ingranaggio in alto a destra → **Installa componente aggiuntivo da file…**.
4. Seleziona il `.xpi` e conferma con **Aggiungi**.
5. Riavvia Firefox e verifica in `about:addons` che l'estensione sia ancora presente.

> L'installazione da file funziona solo se il manifest dichiara un ID esplicito.
> Questo progetto lo definisce in `browser_specific_settings.gecko.id`
> (`freedium-redirect@local`): non rimuoverlo.

---

## Creare il pacchetto .xpi

Un `.xpi` è un normale archivio ZIP con estensione diversa. Comprimi **i file**, non
la cartella che li contiene.

**Linux / macOS**

```bash
cd freedium-redirect
zip -X ../freedium-redirect.xpi manifest.json background.js icon.svg icon-disabled.svg
```

**Windows (PowerShell)**

```powershell
Compress-Archive -Path manifest.json,background.js,icon.svg,icon-disabled.svg -DestinationPath freedium-redirect.zip
Rename-Item freedium-redirect.zip freedium-redirect.xpi
```

**Con web-ext** (valida anche il pacchetto durante la build)

```bash
web-ext build --source-dir . --artifacts-dir dist
```

Verifica sempre la struttura prima di installare:

```bash
unzip -l freedium-redirect.xpi
```

L'output deve elencare i quattro file senza alcun prefisso di cartella.

---

## Sviluppo con web-ext

```bash
web-ext lint                                  # controlla manifest e codice
web-ext run --firefox=firefoxdeveloperedition # avvia un profilo pulito con hot reload
```

`web-ext run` ricarica l'estensione a ogni salvataggio e non tocca il profilo su cui
hai installato la versione permanente, quindi è il modo più comodo per iterare.

---

## Personalizzazione

### Cambiare il mirror

In `background.js`, prima riga:

```js
const PREFIX = "https://freedium-mirror.cfd/";
```

Mantieni lo slash finale e il doppio slash dopo `https:`.

### Cambiare i domini su cui il pulsante è attivo

Sempre in `background.js`:

```js
const ENABLED_DOMAINS = ["medium.com"];
```

Ogni voce copre il dominio indicato **e tutti i suoi sottodomini**: `medium.com`
abilita anche `blog.medium.com` e `nomeutente.medium.com`. Per includere le testate
Medium su dominio proprio basta aggiungerle all'elenco:

```js
const ENABLED_DOMAINS = ["medium.com", "towardsdatascience.com"];
```

Scrivi solo il nome host, senza schema né slash.

### Aggiungere una scorciatoia da tastiera

In `manifest.json`, allo stesso livello di `"action"`:

```json
"commands": {
  "_execute_action": {
    "suggested_key": { "default": "Ctrl+Shift+F" }
  }
}
```

### Comportamento del pulsante

Il pulsante ha due stati, aggiornati a ogni navigazione e ricalcolati per ciascuna
scheda in modo indipendente:

- **attivo** (icona a colori) sulle pagine `http`/`https` di un dominio elencato in
  `ENABLED_DOMAINS`;
- **disattivato** (icona grigia, click inerte) ovunque altrove.

Ricadono nello stato disattivato anche le pagine non `http`/`https` (`about:`,
`file:`, `view-source:`, nuova scheda vuota) e le pagine già aperte sul mirror: il
loro host non è `medium.com`, quindi non c'è modo di concatenare il prefisso due volte.

Sulle schede disattivate il tooltip spiega il motivo invece di lasciare un pulsante
apparentemente rotto.

---

## Aggiornare l'estensione

Firefox non ricarica il codice di un'estensione installata da file se il numero di
versione non cambia: la reinstallazione viene ignorata silenziosamente.

1. Modifica il codice.
2. Incrementa `"version"` in `manifest.json` (es. da `1.0` a `1.1`).
3. Ricrea il `.xpi`.
4. Reinstalla da `about:addons`.

È la causa più frequente di «ho cambiato il codice ma non succede niente».

---

## Risoluzione dei problemi

**«Il componente aggiuntivo sembra danneggiato»**

- Su Windows, con le estensioni dei file nascoste, rinominare `.zip` in `.xpi`
  produce in realtà `nome.xpi.zip`. Attiva Visualizza → *Estensioni nomi file* e
  controlla il nome reale.
- L'archivio contiene un livello di cartella in più: ricomprimi selezionando i quattro
  file, non la directory.
- Download incompleto: il pacchetto corretto pesa circa 2,3 KB.

**«Il componente aggiuntivo non risulta verificato»**

`xpinstall.signatures.required` è ancora a `true`, oppure sei su Firefox stabile
anziché Developer Edition.

**L'estensione sparisce al riavvio**

È stata caricata da `about:debugging`, che è temporaneo per definizione. Usa
l'installazione permanente.

**Il pulsante è grigio e non risponde**

È il comportamento previsto fuori da `medium.com`: passa il mouse sull'icona, il
tooltip lo conferma. Se resta grigio *su* un articolo Medium, controlla di essere su
un host coperto da `ENABLED_DOMAINS` (le testate su dominio proprio, per esempio
`towardsdatascience.com`, vanno aggiunte a mano) e che l'estensione sia aggiornata
alla versione 1.1 o successiva.

**Il pulsante è a colori ma non fa nulla**

Apri `about:debugging` → *Questo Firefox* → **Ispeziona** accanto all'estensione e
controlla la console: gli errori di apertura del mirror vengono registrati lì.

---

## Note sulla sicurezza

Con `xpinstall.signatures.required` impostata a `false` il profilo accetta qualsiasi
`.xpi`, incluso uno installato da terze parti o scaricato inavvertitamente. È un
compromesso accettabile su un profilo di sviluppo usato consapevolmente; se quel
profilo diventa il browser principale, conviene ripristinare la preferenza a `true`
e firmare l'estensione su addons.mozilla.org (distribuzione *self-hosted*, gratuita).
