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

---

# ListItem Component Rules

## ALTIJD ListItem gebruiken voor list items met avatar/getal links, titel, subtitel en getal/icoon rechts

**NOOIT** nieuwe list item HTML/CSS schrijven. Gebruik ALTIJD `@ListItem` component.

### Import
```jsx
import { ListItem } from '../components/ListItem';
```

### Props
- `avatarPhotoUrl` (optional): string - URL van de avatar foto (links)
- `avatarAlt` (optional): string - Alt tekst voor de avatar (defaults naar title)
- `avatarInitials` (optional): string - Initialen voor placeholder (bijv. "JD")
- `leftValue` (optional): string | number - Getal links (in plaats van avatar, bijv. positie/rank bij stand)
- `title` (optional): string - Titel/naam (wordt vet weergegeven)
- `subtitle` (optional): string - Subtitel (kleinere font, optioneel)
- `value` (optional): string | number - Getal rechts uitgelijnd
- `rightIcon` (optional): React.ReactNode - Icoon rechts (in plaats van value, bijv. jersey icon)
- `className` (optional): string - Extra CSS classes voor de list item container
- `onClick` (optional): function - Click handler (maakt item klikbaar/interactief)

### Structuur
- **Links**: Avatar OF getal (leftValue heeft voorrang over avatar)
- **Midden**: Titel (vet) en subtitel (kleinere font) gestapeld
- **Rechts**: Getal (value) OF icoon (rightIcon heeft voorrang over value)

### Voorbeelden

#### Simpel list item met avatar, naam en punten
```jsx
<div className="tile-list">
  {riders.map((rider) => (
    <ListItem
      key={rider.id}
      avatarPhotoUrl={rider.photoUrl}
      avatarAlt={rider.name}
      avatarInitials={initialsFromFullName(rider.name)}
      title={rider.name}
      subtitle={rider.team}
      value={rider.points}
    />
  ))}
</div>
```

#### List item zonder avatar
```jsx
<ListItem
  title="Naam"
  subtitle="Extra info"
  value={123}
/>
```

#### List item zonder subtitel
```jsx
<ListItem
  avatarPhotoUrl="/photo.jpg"
  avatarAlt="Naam"
  avatarInitials="JD"
  title="Naam"
  value={456}
/>
```

#### Klikbaar list item
```jsx
<ListItem
  avatarPhotoUrl={rider.photoUrl}
  avatarAlt={rider.name}
  avatarInitials={initialsFromFullName(rider.name)}
  title={rider.name}
  subtitle={rider.team}
  value={rider.points}
  onClick={() => navigate(`/rider/${rider.id}`)}
/>
```

#### List item met alleen titel en getal (geen avatar, geen subtitel)
```jsx
<ListItem
  title="Totaal punten"
  value={1234}
/>
```

#### List item met positie nummer links (bijv. stand/ranking)
```jsx
<div className="tile-list">
  {standings.map((standing) => (
    <ListItem
      key={standing.participantId}
      leftValue={standing.rank}
      title={standing.teamName}
      value={standing.totalPoints}
    />
  ))}
</div>
```

#### List item met icoon rechts (bijv. jersey icon)
```jsx
<ListItem
  avatarPhotoUrl={rider.photoUrl}
  avatarAlt={rider.name}
  avatarInitials={initialsFromFullName(rider.name)}
  title={rider.name}
  subtitle={rider.team}
  rightIcon={
    <div className="jersey-icon" title="Gele trui">
      <img src="/Truien/geletrui.svg" alt="Gele trui" />
    </div>
  }
/>
```

#### List item met positie links en icoon rechts
```jsx
<ListItem
  leftValue={1}
  title="Team Naam"
  subtitle="Extra info"
  rightIcon={<img src="/icon.svg" alt="Icon" />}
/>
```

### Styling
- Gebruik `tile-list` class op de container voor automatische dividers tussen items
- ListItem heeft automatisch padding en border-bottom styling
- Avatar is standaard 48x48px (kan worden overschreven met custom CSS)
- Left value (positie) is 16px, min-width 30px
- Titel is 16px, subtitel is 14px
- Getal rechts is 15px, rechts uitgelijnd met min-width 80px
- Right icon is 32x32px container

### Legacy patterns
**NOOIT** meer gebruiken:
- ❌ `.points-rider-item` met handmatige HTML structuur
- ❌ `.rider-item` met handmatige HTML structuur
- ❌ `.standings-item` met handmatige HTML structuur
- ❌ Handmatige avatar + info + value structuur

**ALTIJD** gebruiken:
- ✅ `ListItem` component voor alle list items met avatar/titel/subtitel/getal structuur
- ✅ `tile-list` class op de container voor automatische dividers
