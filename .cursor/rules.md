# Tile Component Rules

## ALTIJD de Tile component gebruiken voor tegels/kaartjes

**NOOIT** nieuwe tegel CSS/HTML schrijven. Gebruik ALTIJD `@Tile` component.

### Import
```jsx
import { Tile } from '../components/Tile';
```

### Props
- `title` (required): string of React node voor de titel
- `subtitle` (optional): string voor subtitel onder titel
- `info` (optional): object met `{ title, text, ariaLabel?, buttonId? }` voor info-icoon (itje)
- `children` (required): React node voor content
- `actions` (optional): React node voor acties onderaan (buttons, links, etc.)
- `className` (optional): extra CSS classes voor de tile container
- `contentClassName` (optional): extra CSS classes voor content wrapper
- `actionsClassName` (optional): extra CSS classes voor actions footer

### Voorbeelden

#### Simpele tegel met titel en content
```jsx
<Tile title="Mijn titel">
  <p>Content hier</p>
</Tile>
```

#### Tegel met info-icoon (itje)
```jsx
<Tile
  title="Mijn titel"
  info={{
    title: 'Mijn titel',
    text: 'Uitleg over deze tegel...',
  }}
>
  <p>Content hier</p>
</Tile>
```

#### Tegel met lijst (gebruik `tile-list` class)
```jsx
<Tile title="Stand">
  <div className="tile-list">
    {items.map(item => (
      <div key={item.id}>{item.name}</div>
    ))}
  </div>
</Tile>
```

#### Tegel met acties
```jsx
<Tile
  title="Mijn punten"
  actions={
    <button onClick={handleClick}>
      Bekijk details
    </button>
  }
>
  <p>Content hier</p>
</Tile>
```

#### Tegel met subtitel
```jsx
<Tile
  title="Mijn titel"
  subtitle="Extra informatie"
>
  <p>Content hier</p>
</Tile>
```

### Styling
- Gebruik bestaande `tile-*` classes uit `src/styles/main.scss`
- Voor lijsten: gebruik `tile-list` class op container
- Voor sectie-specifieke styling: gebruik `className` prop (bijv. `points-section`, `standings-section`)

### Legacy classes
**NOOIT** meer gebruiken:
- ❌ `dashboard-section`
- ❌ `team-card`
- ❌ `team-card-header`
- ❌ `dashboard-section-title`

**ALTIJD** gebruiken:
- ✅ `Tile` component met `tile-*` classes

---

# PageTemplate Component Rules

## ALTIJD PageTemplate gebruiken voor pagina layouts

**NOOIT** ad-hoc page layouts schrijven. Gebruik ALTIJD `@PageTemplate` component.

Pagina's zoals "Team aanpassen", "Team overzicht", "Etappe informatie", "Dashboard" zijn ALLEMAAL instanties van dezelfde PageTemplate.

### Import
```jsx
import { PageTemplate } from '../layouts/PageTemplate';
```

### Props
- `title` (required): string - Hoofdtitel in de groene header
- `subtitle` (optional): string - Subtitel/meta-info onder de titel (bijv. etappe info)
- `headerRight` (optional): React node - Extra content rechts in header (bijv. punten, score)
- `backLink` (optional): string | { href: string, onClick?: () => void } - Back link configuratie
- `sidebar` (optional): React node - Sidebar content (bijv. navigatie buttons)
- `children` (required): React node - Hoofdcontent (kolommen met tegels)
- `maxWidth` (optional): string - Max breedte van content area (default: '1280px')
- `stageNavigation` (optional): React node - StageNavigationBar component voor etappe navigatie

### Layout Structuur
- **Header**: Groene header (`#00cac6`) met:
  - Back link linksboven (optioneel)
  - "Interpolis tourspel" rechtsboven
  - Titel (h1) in het midden
  - Optionele subtitel onder titel
  - Optionele headerRight content
  - Illustratie rechtsonder
  - Optionele StageNavigationBar onder header
- **Main Content**: 
  - Gecentreerd met max-width
  - Sidebar links (col-3) met action buttons (optioneel)
  - Content rechts (col-9) of full-width (col-12) met tegels
  - Responsive: op mobiel stacken sidebar en content verticaal

### Voorbeelden

#### Team aanpassen pagina
```jsx
<PageTemplate
  title="Team aanpassen"
  backLink="/teamoverzicht.html"
  sidebar={
    <>
      <button className="action-button" onClick={() => navigate('/rules.html')}>
        <span>Spelregels</span>
        <img src="/assets/arrow.svg" alt="" className="action-arrow" />
      </button>
      <button className="action-button" onClick={() => navigate('/statistieken.html')}>
        <span>Statistieken</span>
        <img src="/assets/arrow.svg" alt="" className="action-arrow" />
      </button>
    </>
  }
>
  <div className="dashboard-grid">
    <div className="dashboard-column">
      <Tile title="Renners in team (3/15)">
        {/* content */}
      </Tile>
    </div>
    <div className="dashboard-column">
      <Tile title="Winnaar gele trui">
        {/* content */}
      </Tile>
    </div>
  </div>
</PageTemplate>
```

#### Etappe informatie pagina
```jsx
<PageTemplate
  title="Etappe informatie"
  subtitle="Etappe 7 – Houlgate - Nice (183 km)"
  backLink="/home.html"
  stageNavigation={
    <StageNavigationBar
      stageLabel="Etappe 7"
      routeText="Houlgate - Nice (183km)"
      canPrev={canPrev}
      canNext={canNext}
      onPrev={handlePrev}
      onNext={handleNext}
    />
  }
  sidebar={
    <>
      <button className="action-button" onClick={() => navigate('/rules.html')}>
        <span>Spelregels</span>
        <img src="/assets/arrow.svg" alt="" className="action-arrow" />
      </button>
      <button className="action-button" onClick={() => navigate('/statistieken.html')}>
        <span>Statistieken</span>
        <img src="/assets/arrow.svg" alt="" className="action-arrow" />
      </button>
    </>
  }
>
  <div className="dashboard-grid">
    <div className="dashboard-column">
      <Tile title="Mijn punten (27)">
        {/* content */}
      </Tile>
      <Tile title="Dag uitslag">
        {/* content */}
      </Tile>
    </div>
    <div className="dashboard-column">
      <Tile title="Etappe uitslag">
        {/* content */}
      </Tile>
      <Tile title="Truien">
        {/* content */}
      </Tile>
    </div>
  </div>
</PageTemplate>
```

#### Team overzicht pagina
```jsx
<PageTemplate
  title="Team overzicht"
  backLink="/home.html"
  sidebar={
    <>
      <button className="action-button" onClick={() => navigate('/rules.html')}>
        <span>Spelregels</span>
        <img src="/assets/arrow.svg" alt="" className="action-arrow" />
      </button>
      <button className="action-button" onClick={() => navigate('/statistieken.html')}>
        <span>Statistieken</span>
        <img src="/assets/arrow.svg" alt="" className="action-arrow" />
      </button>
    </>
  }
>
  <div className="grid">
    <div className="col-12">
      <Tile title={teamName}>
        {/* team info */}
      </Tile>
    </div>
    <div className="col-12">
      <Tile title="Basisrenners">
        {/* riders list */}
      </Tile>
    </div>
  </div>
</PageTemplate>
```

### REGEL
**Maak NOOIT ad-hoc page layouts; gebruik altijd PageTemplate + bestaande component templates (Tile, etc.).**

### Legacy patterns
**NOOIT** meer gebruiken:
- ❌ Handmatige `<header className="header">` structuur
- ❌ Handmatige `<main className="main-content page">` structuur
- ❌ Ad-hoc grid layouts zonder PageTemplate

**ALTIJD** gebruiken:
- ✅ `PageTemplate` component voor alle pagina layouts
- ✅ `Tile` component voor alle tegels/kaartjes binnen de content
