# Versienummer Systeem

Dit project gebruikt een automatisch versienummer systeem dat rechtsonderaan op alle pagina's wordt getoond.

## Werking

Het versienummer wordt automatisch verhoogd bij elke `git push`. Het versienummer wordt getoond als `v[X]` rechtsonderaan op elke pagina.

## Automatische Versie Increment

### Via Git Hook (Aanbevolen)

Er is een `pre-push` git hook geïnstalleerd die automatisch:
1. Het versienummer verhoogt in `VERSION.txt`
2. Het versienummer toevoegt aan de commit message in het formaat `[vX]`
3. De wijzigingen commit

**Let op:** Op Windows moet je mogelijk de hook executable maken. Dit gebeurt automatisch bij de eerste push.

### Handmatig (Alternatief)

Als de git hook niet werkt, kun je handmatig het versienummer verhogen:

**Windows (PowerShell):**
```powershell
.\increment-version.ps1
git push --force-with-lease
```

**Linux/Mac/Node.js:**
```bash
npm run version:increment
# of
node increment-version.js
git push --force-with-lease
```

## Bestanden

- `VERSION.txt` - Bevat het huidige versienummer
- `scripts/version.js` - JavaScript dat het versienummer laadt en toont
- `increment-version.js` - Node.js script om versie te verhogen
- `increment-version.ps1` - PowerShell script om versie te verhogen
- `.git/hooks/pre-push` - Git hook voor automatische increment

## Weergave

Het versienummer wordt subtiel getoond rechtsonderaan op alle pagina's met een grijze kleur en kleine lettergrootte.

