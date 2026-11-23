# 🎬 De Grote Familie Bongers Show (`huiskamer-show`)

Volwaardige, zelf-gehoste **TV-spelshow** met **6 rondetypes**, **adaptieve leeftijdsniveaus** en **778 handgemaakte Nederlandse vragen & opdrachten** — speciaal ontworpen voor de hele familie op de bank:

- **65" LG webOS OLED TV (`/tv`)**: centraal showpodium in een vrolijke, vlakke **kleurvlakken-stijl** op donker inktblauw (goed voor de OLED), met een **seizoensthema dat automatisch wisselt** (zie hieronder), anti-screensaver canvas/video-loop, draaiend Categorie-Rad met spanningsopbouw, live Familie Eregalerij (Hall of Fame) en gesynthetiseerde studio-geluidseffecten.
- **Android-tablets (`/play`)**:
  - **Lucas (5 jaar · `ontdekker`)**: extra grote plaatjeskaarten, anti-dubbelklik debounce (`400ms`), automatische Nederlandse voorleesstem (`nl-NL`) en 45s grote plaatjeskaarten bij 30 Seconds.
  - **Lana (7 jaar · `avonturier`)**: groep 3/4 vragen met icoontjes, KPop Demon Hunters (`HUNTR/X`), eenhoorns, regenbogen & Animal Crossing, plus 40s 4-woordenkaarten bij 30 Seconds.
- **Android-telefoons (`/play`)**:
  - **Papa (`meester` · Host) & Mama (`meester` · Co-Host)**: volwaardige Triviant-vragen, klassieke 30 Seconds (5 begrippen in 30s) én volledige show-regie (`⏸️ Pauze`, `⏱️ +15s`, `⏭️ Overslaan`, `👥 Spelers Even weg`, `🔊 Geluid TV`, `🔄 Vorig potje hervatten`, `🔄 Nieuw Spel`).
- **Gezins-Editor (`/admin`)**: beheer alle 6 rondetypes (`Quiz`, `30 Seconds`, `Zoom-in Foto`, `Geluiden`, `Pantomime`, `Schattingen`), inclusief **Batch Familiefoto Wizard** (automatische compressie naar 1600px JPEG + klikbaar zoompunt), zoek- & themapakkettentags, optionele **Ouder-PIN** (4 tot 8 cijfers, met rem op raden), **slim herhalingsgeheugen** en **automatische roterende snapshots**.

---

## 🎮 Alle 6 Rondetypes & Spelvormen

1. **🟣 Slimme Quiz** — Iedereen speelt tegelijk op eigen niveau (`ontdekker`, `avonturier`, `meester`).
2. **⏱️ 30 Seconds Familie-editie** — Adaptieve tijd & kaarten (45s / 40s / 30s) met Host-hulpknop voor Lucas.
3. **🔊 Wat hoor je?** — Geluiden-quiz met 46 lokale Web Audio synth-geluiden (+ eigen MP3/WAV uploads).
4. **🔍 Zoom-in Foto** — Foto's en scènes zoomen vloeiend uit van `8×` naar `1×`; druk op de rode BUZZER! Oordeelt de host niet binnen 20 seconden, dan komt de buzzer weer vrij (zonder straf).
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
- Bij de eerste start haalt de container zelf de Roos-opnames op uit de GitHub Releases (uit te zetten met `TTS_AUTO_INSTALL=0`).
  Lukt dat niet, dan start de show gewoon, met de computerstem.
- Wil je vanuit `/admin` nieuwe Roos-opnames kunnen maken, zet dan `ELEVENLABS_API_KEY=...` in een bestand `.env` naast
  `docker-compose.yml` (dat bestand gaat niet mee naar git) en start de container opnieuw.
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

## 🎨 Seizoensthema's

De look wisselt automatisch op datum (de TV controleert dit elk uur, dus hij kan dagenlang aan blijven staan):

| Periode | Thema |
| :--- | :--- |
| 12 nov t/m 7 dec | Sinterklaas |
| 8 dec t/m 14 jan | Kerst |
| 15 jan t/m 19 mrt | Winter |
| 20 mrt t/m 20 jun | Lente |
| 21 jun t/m 22 sep | Zomer |
| 23 sep t/m 11 nov | Herfst |

- **Seizoenspakket:** van 12 nov t/m 7 dec doet het Sinterklaas-pakket vanzelf mee, van 8 dec t/m 14 jan het Kerst-pakket en
  van 21 jun t/m 22 sep het Zomer-pakket (dezelfde grenzen als de thema's). Seizoensvragen gaan dan voor, behalve als ze de
  afgelopen 3 dagen al gespeeld zijn. Kiest de host in de lobby zelf pakketten, dan blijft die keuze staan; het seizoenspakket
  heeft daar het label "nu".
- Een thema vastzetten kan met `?thema=kerst` achter de URL (of via **Profielen & Backup** in `/admin`); `?thema=auto` gaat terug naar de datum. De keuze geldt alleen op dat apparaat.
- Paletten en versiering staan in `client/src/styles/themes.css`, de datumregels in `client/src/theme/seasons.ts`. Kleuren gebruik je in code als Tailwind-klassen (`bg-studio-bg`, `bg-studio-card`, `text-studio-gold`), nooit als vaste hex-waarde. Alleen de vier antwoordkleuren (Rood, Blauw, Groen, Geel) staan bewust vast, omdat Lucas ze aan de stem koppelt.

### Ontwikkelmodus & Tests
```bash
npm run dev    # Start Express/Socket.IO server (:3000) + Vite HMR (:5173)
npm test       # Bouwt eerst het gedeelde pakket en draait dan de volledige Vitest unit-, integratie- & multi-client E2E testsuite
```
Bij elke push naar `main` en bij elke pull request draaien de tests ook op GitHub (`.github/workflows/ci.yml`), inclusief de
zelftest van de geluidsbewerking.

### Verbeterde standaardvragen
Pas je een vraag in `server/seed` aan, dan bereikt die verbetering ook bestaande installaties: bij het starten (en via **Sync
Vragen** in `/admin`) wordt een standaardvraag bijgewerkt als hij nog precies een eerdere versie is. Wie een vraag zelf heeft
aangepast, houdt zijn eigen versie. Werk na een wijziging in `server/seed` de lijst met eerdere versies bij:
```bash
npx tsx scripts/build-seed-history.ts          # --check controleert alleen (dat doen de tests ook)
```

---

## 🎬 Tussendoortjes

Elke 5 tot 10 vragen (elke keer opnieuw willekeurig) speelt er een animatie van 3 seconden op de TV en op de telefoons en
tablets: 50 stuks rond de thema's van de show (dino's, Sonic, eenhoorns, K-pop, ruimte, eten, sport, de zee en het gezin).
Twaalf horen bij een seizoen (Sinterklaas, Kerst, winter, lente, zomer, herfst) en komen alleen in dat seizoen langs.
Een tussendoortje komt pas terug als alle andere geweest zijn, en nooit vlak voor de finale. Pauze en Overslaan werken gewoon.

- **Allemaal bekijken** (zonder geluid): open `/animaties`. Pijltjes gaan naar de vorige of volgende, spatie pauzeert.
- **Zelf toevoegen:** zet een regel in `INTERMISSIONS` in `shared/constants.ts` met een bestaande beweging (`parade`, `launch`,
  `zoomby`, `rain`, `orbit`, `popgrid`, `spotlight`, `flip`, `rainbow`, `wave`, `balloons`, `duo`, `burst`, `volcano`) en
  bestaande illustraties. De tests controleren dat alles klopt.

## 🔊 Roos-stem (opnamen)

Alle voorleestekst wordt voorgelezen door **Roos** (ElevenLabs Flash v2.5, Nederlands). De opnames zijn mp3's in `<data-map>/tts`
(standaard `./data/tts`; in Docker de gemounte map `./data`) en horen niet in git. Een tekst zonder opname wordt voorgelezen met de
computerstem van de browser.

**Opnames installeren** (nieuwste uit de GitHub Releases `tts-vN`, met controlesom):
```bash
./scripts/install-tts.sh              # of: npm run tts:install  |  een bepaalde versie: ./scripts/install-tts.sh tts-v3
```
Daarna de server (her)starten. Bij het opstarten zie je hoeveel opnames er zijn; staan er geen, dan krijg je een melding.

**Welke teksten missen nog een opname?** (bijvoorbeeld na het toevoegen van eigen vragen in `/admin`)
```bash
python3 scripts/generate-tts.py --check      # of: npm run tts:check
```
**Ontbrekende opnames maken** (kost ElevenLabs-credits, alleen voor wat ontbreekt; zet `ELEVENLABS_API_KEY=...` in `.env`, die staat niet in git):
```bash
python3 scripts/generate-tts.py              # --limit 5 om eerst een paar te proberen
```
Dat kan ook vanuit **`/admin` → Profielen & Backup → Roos-opnames**: daar zie je hoeveel teksten nog geen opname hebben, wat het
ongeveer kost, en met één knop (na bevestiging) maakt de server ze. Na het opslaan van een quizvraag zonder opname meldt het
beheerscherm dat ook. Telefoons en tablets pikken nieuwe opnames binnen 5 minuten vanzelf op.
**Volume:** elke opname wordt op **-16 LUFS** gebracht (true peak hooguit -1 dBTP), ook losse woorden. ffmpeg's eigen `loudnorm`
meet korte opnames scheef, daarom meet `scripts/tts_audio.py` zelf. Bestaande opnames controleren of gelijk trekken:
```bash
python3 scripts/tts_audio.py check data/tts     # meet en toont de verdeling
python3 scripts/tts_audio.py fix data/tts       # maakt alles wat er te ver naast zit even hard (originelen in data/tts/_origineel)
```
Vervang je opnames door een bewerkte versie, publiceer die dan als nieuwe release (`tts-vN+1`) en draai `install-tts.sh` op elke machine
(ook op de Proxmox-host). Telefoons en tablets halen vervangen opnames vanzelf opnieuw op.

## 📦 Meegeleverde Start-Content (`server/seed/`)
- **480 Quizvragen** (`160` per niveau), waarvan 30 extra seizoensvragen voor Sinterklaas, Kerst en de zomer.
- **186 30-Seconds Kaarten** (`62` per niveau, zonder dubbele begrippen binnen een niveau).
- **46 "Wat hoor je?" Geluidsuitdagingen** (100% lokaal via Web Audio API + eigen MP3/WAV-uploads).
- **46 "Zoom-in Foto" Uitdagingen** (+ Batch Familiefoto Wizard in `/admin` voor eigen foto's).
- **30 "Wie of Wat ben ik?" Pantomime-opdrachten** (verdeeld over alle 3 niveaus).
- **26 "Dichtstbij Wint!" Schattingsvragen** met leuke weetjes op TV.
- **125 Kleurrijke Lokale SVG-Illustraties** & lokaal gebundelde fonts (`@fontsource/sora` & `@fontsource/inter`) — **0 externe CDN-afhankelijkheden**.
