# 🎬 De Grote Familie Bongers Show (`huiskamer-show`)

Volwaardige, zelf-gehoste **TV-spelshow** met **6 rondetypes**, **adaptieve leeftijdsniveaus** en **778 handgemaakte Nederlandse vragen & opdrachten** — speciaal ontworpen voor de hele familie op de bank:

- **65" LG webOS OLED TV (`/tv`)**: centraal showpodium in **OLED Studio Dark Mode** (`#070B18`), anti-screensaver canvas/video-loop, draaiend Categorie-Rad met spanningsopbouw, live Familie Eregalerij (Hall of Fame) en gesynthetiseerde studio-geluidseffecten.
- **Android-tablets (`/play`)**:
  - **Lucas (5 jaar · `ontdekker`)**: extra grote plaatjeskaarten, anti-dubbelklik debounce (`400ms`), automatische Nederlandse voorleesstem (`nl-NL`) en 45s grote plaatjeskaarten bij 30 Seconds.
  - **Lana (7 jaar · `avonturier`)**: groep 3/4 vragen met icoontjes, KPop Demon Hunters (`HUNTR/X`), eenhoorns, regenbogen & Animal Crossing, plus 40s 4-woordenkaarten bij 30 Seconds.
- **Android-telefoons (`/play`)**:
  - **Papa (`meester` · Host) & Mama (`meester` · Co-Host)**: volwaardige Triviant-vragen, klassieke 30 Seconds (5 begrippen in 30s) én volledige show-regie (`⏸️ Pauze`, `⏱️ +15s`, `⏭️ Overslaan`, `👥 Spelers Even weg`, `🔊 Geluid TV`, `🔄 Vorig potje hervatten`, `🔄 Nieuw Spel`).
- **Gezins-Editor (`/admin`)**: beheer alle 6 rondetypes (`Quiz`, `30 Seconds`, `Zoom-in Foto`, `Geluiden`, `Pantomime`, `Schattingen`), inclusief **Batch Familiefoto Wizard** (automatische compressie naar 1600px JPEG + klikbaar zoompunt), zoek- & themapakkettentags, optionele **4-cijferige Ouder-PIN**, **slim herhalingsgeheugen** en **automatische roterende snapshots**.

---

## 🎮 Alle 6 Rondetypes & Spelvormen

1. **🟣 Slimme Quiz** — Iedereen speelt tegelijk op eigen niveau (`ontdekker`, `avonturier`, `meester`).
2. **⏱️ 30 Seconds Familie-editie** — Adaptieve tijd & kaarten (45s / 40s / 30s) met Host-hulpknop voor Lucas.
3. **🔊 Wat hoor je?** — Geluiden-quiz met 46 lokale Web Audio synth-geluiden (+ eigen MP3/WAV uploads).
4. **🔍 Zoom-in Foto** — Foto's en scènes zoomen vloeiend uit van `8×` naar `1×`; druk op de rode BUZZER!
5. **🎭 Wie of Wat ben ik? (Pantomime)** — Uitbeelden zonder woorden; zowel rader (`+100`) als uitbeelder (`+75`) scoren!
6. **🎯 Dichtstbij Wint! (Schattingen)** — Visuele schuifbalk met `+`/`−` knoppen; dichtstbijzijnde schatting wint (`+125`)!

**Spelvormen:** *Ieder voor zich* · *Vaste Duo-teams* · *Wisselende Duo-teams* · *Samen-modus (Gezins-Kroon)*  
**Show-Verrassingen:** `✨ Dubbele Punten (2×)` · `🤝 Gezins-Bonus (+50)` · `🌟 Sterren-Jacht`  
**Themapakketten:** `🎬 Basis` · `🦖 Kids-Special` · `🎁 Sinterklaas` · `🎄 Kerst` · `☀️ Zomer` · `🎂 Verjaardag`

---

## 🚀 Snel Starten (Lokaal of op Proxmox)

### Optie 1: Met Docker Compose (Aanbevolen voor Proxmox)
```bash
docker compose up -d --build
```
- De show draait op poort `3000`:
  - 📺 **TV-Podium:** `http://<proxmox-ip>:3000/tv`
  - 📱 **Telefoons & Tablets:** `http://<proxmox-ip>:3000/play`
  - ⚙️ **Gezins-Editor:** `http://<proxmox-ip>:3000/admin`
  - 🩺 **Healthcheck:** `http://<proxmox-ip>:3000/api/health`
- Persistente opslag staat in `./data` (`/app/data`), inclusief uploads, `stats.json` (Hall of Fame), `played-history.json`, `active-session.json` (crash-recovery) en `/app/data/backups/` (max. 10 roterende snapshots).
- Optionele eind-tot-eind Docker-controle:
  ```bash
  ./scripts/verify-docker.sh
  ```

### Optie 2: Rechtstreeks met Node.js 20+
```bash
npm install
npm run build
npm start
```

### Ontwikkelmodus & Tests
```bash
npm run dev    # Start Express/Socket.IO server (:3000) + Vite HMR (:5173)
npm test       # Draait de volledige Vitest unit-, integratie- & multi-client E2E testsuite
```

---

## 📦 Meegeleverde Start-Content (`server/seed/`)
- **450 Quizvragen** (`150` `ontdekker`, `150` `avonturier`, `150` `meester` — 25 per categorie per niveau).
- **180 30-Seconds Kaarten** (`60` per niveau, zonder dubbele begrippen binnen een niveau).
- **46 "Wat hoor je?" Geluidsuitdagingen** (100% lokaal via Web Audio API + eigen MP3/WAV-uploads).
- **46 "Zoom-in Foto" Uitdagingen** (+ Batch Familiefoto Wizard in `/admin` voor eigen foto's).
- **30 "Wie of Wat ben ik?" Pantomime-opdrachten** (verdeeld over alle 3 niveaus).
- **26 "Dichtstbij Wint!" Schattingsvragen** met leuke weetjes op TV.
- **125 Kleurrijke Lokale SVG-Illustraties** & lokaal gebundelde fonts (`@fontsource/fredoka` & `@fontsource/nunito`) — **0 externe CDN-afhankelijkheden**.
