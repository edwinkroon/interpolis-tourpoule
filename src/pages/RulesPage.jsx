import React from 'react';
import { useNavigate } from 'react-router-dom';

export function RulesPage() {
  const navigate = useNavigate();

  return (
    <>
      <div id="build-info" className="build-info" />
      <header className="header">
        <div className="header-content page">
          <div className="grid">
            <div className="col-12">
              <div className="header-top">
                <a
                  href="#"
                  className="back-link"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/home.html');
                  }}
                >
                  <img src="/assets/arrow.svg" alt="" className="back-arrow" aria-hidden="true" />
                  <span>Terug</span>
                </a>
                <div className="header-title">Interpolis tourspel</div>
              </div>
            </div>
            <div className="col-12">
              <div className="header-welcome-section">
                <h1 className="welcome-heading">Spelregels</h1>
                <div className="header-illustration">
                  <img src="/assets/headerillustration.svg" alt="Fiets illustratie" className="illustration-svg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content page">
        <div className="grid">
          <div className="col-12">
            <div className="rules-container">
              <section className="rules-section">
                <h2 className="rules-title">Spelregels Tourploeg.nl</h2>
                <ol className="rules-list">
                  <li>Aanmeldingen moeten uiterlijk zaterdag 5 juli 2025 om 12.00u. binnen zijn;</li>
                  <li>Een ploeg kan hierna niet meer worden gewijzigd;</li>
                  <li>
                    Iedere ploeg bestaat uit 12 wielrenners die zowel bij elke etappe als aan het einde van de Tour de
                    France punten kunnen scoren voor je ploeg;
                  </li>
                  <li>
                    Als een renner tijdens de Tour de France uitvalt, kan er geen vervanger worden ingezet (net als bij
                    echte wielerploegen). De gescoorde punten van de uitgevallen renner blijven wel staan;
                  </li>
                  <li>
                    Omdat de officiële Tour de France-deelnemerslijst pas een dag voor de start bekend wordt gemaakt,
                    is de samengestelde ploeg onder voorbehoud. Blijkt een renner niet mee te doen, dan dient de
                    deelnemer zelf uiterlijk 5 juli 2025 om 12.00u. een vervanger te selecteren;
                  </li>
                  <li>
                    Indien een renner betrokken raakt bij dopingperikelen worden alle behaalde punten van de betreffende
                    renner geschrapt. Dit geldt ook als de dopingperikelen vóór de Tour de France zijn ontstaan en ook
                    als de in opspraak geraakte renner vrijwillig de Tour de France verlaat. Bij twijfel over het
                    toepassen van deze spelregel beslist de spelleiding, waarbij een zeer afgewogen beslissing zal
                    worden genomen. De uitslagen van alle andere renners blijven in een dergelijk geval onveranderd (en
                    schuiven niet door vanwege het wegvallen van een renner);
                  </li>
                  <li>Diskwalificaties na het einde van de Tour de France worden niet meegenomen in de uitslag van Tourploeg.nl;</li>
                  <li>Indien daar aanleiding toe is kan de spelleiding besluiten een etappe te laten vervallen;</li>
                  <li>
                    Bij de truien gaan de punten naar de leider in het betreffende klassement (geel: algemeen klassement,
                    groen: puntenklassement, bolletjes: bergklassement, wit: jongerenklassement). Deze punten worden
                    gescoord direct na afloop van een etappe. Gescoorde punten voor een dagtrui blijven gewoon staan als
                    de betreffende renner de daaropvolgende dag niet meer van start kan gaan (dopinggevallen uitgezonderd).
                  </li>
                  <li>
                    Na de laatste etappe worden er geen dagpunten toegekend aan de gele, groene, bolletjes- en witte trui.
                    Wel worden dan de punten voor de eindstanden bij de truien toegekend;
                  </li>
                  <li>Alle uitslagen worden overgenomen van de officiële Tour de France-website;</li>
                  <li>
                    Indien een etappe door de Tour-organisatie wordt geneutraliseerd, zal die etappe niet meetellen bij
                    het spel. Truien zullen die dag (voor zover mogelijk) wél meetellen;
                  </li>
                  <li>
                    Wanneer de spelregels geen duidelijke oplossing bieden, beslist de spelleiding. Hierbij zullen
                    weloverwogen beslissingen worden genomen; het vriendelijke verzoek deze beslissingen te accepteren.
                    Bedenk bij dit alles: het is maar een spelletje.
                  </li>
                </ol>
              </section>

              <section className="rules-section">
                <h2 className="rules-title">Puntentelling</h2>

                <div className="points-section">
                  <h3 className="points-subtitle">Elke etappe</h3>
                  <div className="points-table-container">
                    <table className="points-table">
                      <thead>
                        <tr>
                          <th>Plaats</th>
                          <th>Punten</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>1e plaats</td>
                          <td>30 punten</td>
                        </tr>
                        <tr>
                          <td>2e plaats</td>
                          <td>15 punten</td>
                        </tr>
                        <tr>
                          <td>3e plaats</td>
                          <td>12 punten</td>
                        </tr>
                        <tr>
                          <td>4e plaats</td>
                          <td>9 punten</td>
                        </tr>
                        <tr>
                          <td>5e plaats</td>
                          <td>8 punten</td>
                        </tr>
                        <tr>
                          <td>6e plaats</td>
                          <td>7 punten</td>
                        </tr>
                        <tr>
                          <td>7e plaats</td>
                          <td>6 punten</td>
                        </tr>
                        <tr>
                          <td>8e plaats</td>
                          <td>5 punten</td>
                        </tr>
                        <tr>
                          <td>9e plaats</td>
                          <td>4 punten</td>
                        </tr>
                        <tr>
                          <td>10e plaats</td>
                          <td>3 punten</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="points-table-container">
                    <table className="points-table">
                      <thead>
                        <tr>
                          <th>Trui</th>
                          <th>Punten</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Drager gele trui</td>
                          <td>10 punten</td>
                        </tr>
                        <tr>
                          <td>Drager groene trui</td>
                          <td>5 punten</td>
                        </tr>
                        <tr>
                          <td>Drager bolletjestrui</td>
                          <td>5 punten</td>
                        </tr>
                        <tr>
                          <td>Drager witte trui</td>
                          <td>3 punten</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="points-section">
                  <h3 className="points-subtitle">Het eindklassement</h3>
                  <div className="points-table-container">
                    <table className="points-table">
                      <thead>
                        <tr>
                          <th>Plaats</th>
                          <th>Punten</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['1e plaats', '150 punten'],
                          ['2e plaats', '75 punten'],
                          ['3e plaats', '50 punten'],
                          ['4e plaats', '40 punten'],
                          ['5e plaats', '35 punten'],
                          ['6e plaats', '30 punten'],
                          ['7e plaats', '28 punten'],
                          ['8e plaats', '26 punten'],
                          ['9e plaats', '24 punten'],
                          ['10e plaats', '22 punten'],
                          ['11e plaats', '20 punten'],
                          ['12e plaats', '18 punten'],
                          ['13e plaats', '17 punten'],
                          ['14e plaats', '16 punten'],
                          ['15e plaats', '15 punten'],
                          ['16e plaats', '14 punten'],
                          ['17e plaats', '13 punten'],
                          ['18e plaats', '12 punten'],
                          ['19e plaats', '11 punten'],
                          ['20e plaats', '10 punten'],
                        ].map(([place, pts]) => (
                          <tr key={place}>
                            <td>{place}</td>
                            <td>{pts}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="points-section">
                  <h3 className="points-subtitle">Eindstanden truien</h3>

                  <div className="points-table-container">
                    <table className="points-table">
                      <thead>
                        <tr>
                          <th>Groene trui</th>
                          <th>Punten</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>1e plaats</td>
                          <td>40 punten</td>
                        </tr>
                        <tr>
                          <td>2e plaats</td>
                          <td>20 punten</td>
                        </tr>
                        <tr>
                          <td>3e plaats</td>
                          <td>10 punten</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="points-table-container">
                    <table className="points-table">
                      <thead>
                        <tr>
                          <th>Bolletjestrui</th>
                          <th>Punten</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>1e plaats</td>
                          <td>40 punten</td>
                        </tr>
                        <tr>
                          <td>2e plaats</td>
                          <td>20 punten</td>
                        </tr>
                        <tr>
                          <td>3e plaats</td>
                          <td>10 punten</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="points-table-container">
                    <table className="points-table">
                      <thead>
                        <tr>
                          <th>Witte trui</th>
                          <th>Punten</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>1e plaats</td>
                          <td>20 punten</td>
                        </tr>
                        <tr>
                          <td>2e plaats</td>
                          <td>10 punten</td>
                        </tr>
                        <tr>
                          <td>3e plaats</td>
                          <td>5 punten</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
