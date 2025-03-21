<script>
  import { onMount } from 'svelte';
  
  let projectData = {
    title: "I Nostri Spazi",
    subtitle: "Spazi per i Giovani e Diritto allo Studio",
    description: "Un progetto della Consulta Provinciale degli Studenti di Roma per mappare e valorizzare gli spazi dedicati ai giovani",
    sections: [
      {
        title: "Il Progetto",
        content: "I Nostri Spazi è un'iniziativa creata dalla Commissione 'Diritto allo Studio' della Consulta Provinciale degli Studenti di Roma, in collaborazione con il Comune di Roma. Il progetto mira a identificare e connettere gli spazi dedicati ai giovani presenti sul territorio romano."
      },
      {
        title: "Obiettivi",
        content: "Mappare i Centri di Aggregazione e gli spazi studio esistenti, analizzare la loro distribuzione sul territorio, migliorare l'accesso allo studio e fornire strumenti utili per supportare gli studenti della provincia di Roma."
      },
      
      {
        title: "Impatto",
        content: "CPS Mappatura Roma vuole democratizzare l'accesso agli spazi di studio e aggregazione, valorizzando centri meno conosciuti e favorendo la partecipazione giovanile. La mappa prodotta rappresenta uno strumento concreto per studenti, famiglie e istituzioni educative della provincia."
      }
    ],
    stats: [
      { value: "85+", label: "Spazi mappati" },
      { value: "15", label: "Municipi coinvolti" },
      { value: "8", label: "Tipologie di spazi" },
      { value: "3.200", label: "Studenti coinvolti" }
    ]
  };
  
  onMount(() => {
    // Eventuale codice da eseguire al caricamento della pagina
  });
</script>

<svelte:head>
  <title>{projectData.title} - Il Progetto</title>
  <meta name="description" content={projectData.description} />
</svelte:head>

<!-- Hero Section -->
<section class="hero">
  <div class="hero-overlay"></div>
  <div class="hero-content">
    <h1>{projectData.title}</h1>
    <h2>{projectData.subtitle}</h2>
    <p class="hero-description">{projectData.description}</p>
    <div class="hero-buttons">
      <a href="#overview" class="btn primary">Scopri il progetto</a>
      <a href="/" class="btn secondary">Esplora la mappa</a>
    </div>
  </div>
</section>

<!-- Quick Stats -->
<section class="stats-container">
  <div class="stats-grid">
    {#each projectData.stats as stat}
      <div class="stat-item">
        <div class="stat-value">{stat.value}</div>
        <div class="stat-label">{stat.label}</div>
      </div>
    {/each}
  </div>
</section>

<!-- Main Content -->
<div class="project-container">
  <section id="overview" class="project-overview">
    <h2 class="section-title">Panoramica</h2>
    <div class="overview-content">
      <div class="text-content">
        <p>CPS Mappatura nasce dall'esigenza di comprendere e connettere il ricco ecosistema italiano di centri di produzione del sapere, dalle università ai laboratori indipendenti, dalle biblioteche agli spazi di innovazione sociale.</p>
        <p>Questa mappatura rappresenta il primo passo verso la creazione di una rete di conoscenza distribuita e accessibile che possa valorizzare il patrimonio intellettuale del nostro territorio.</p>
      </div>
      <div class="image-container">
        <div class="infographic-placeholder">
          <p>Infografica: Ecosistema CPS</p>
        </div>
      </div>
    </div>
  </section>
  
  {#each projectData.sections as section, i}
    <section class="project-section" id={section.title.toLowerCase().replace(/\s+/g, '-')}>
      <h2 class="section-title">{section.title}</h2>
      <div class="section-content {i % 2 === 0 ? 'even' : 'odd'}">
        <div class="text-content">
          <p>{section.content}</p>
        </div>
        <div class="image-container">
          <div class="infographic-placeholder">
            <p>Infografica: {section.title}</p>
          </div>
        </div>
      </div>
    </section>
  {/each}
  
  <section class="project-timeline">
    <h2 class="section-title">Fasi del Progetto</h2>
    <div class="timeline-container">
      <div class="timeline">
        <div class="timeline-item">
          <div class="timeline-marker"></div>
          <h3>Fase 1: Ricerca Preliminare</h3>
          <p>Definizione dei criteri di mappatura e identificazione dei primi centri</p>
        </div>
        <div class="timeline-item">
          <div class="timeline-marker"></div>
          <h3>Fase 2: Raccolta Dati</h3>
          <p>Somministrazione questionari e interviste ai centri selezionati</p>
        </div>
        <div class="timeline-item">
          <div class="timeline-marker"></div>
          <h3>Fase 3: Analisi</h3>
          <p>Elaborazione dei dati e creazione delle prime visualizzazioni</p>
        </div>
        <div class="timeline-item">
          <div class="timeline-marker"></div>
          <h3>Fase 4: Pubblicazione</h3>
          <p>Lancio della piattaforma e diffusione dei risultati</p>
        </div>
      </div>
    </div>
  </section>
  
  <section class="methodology">
    <h2 class="section-title">La nostra metodologia</h2>
    <div class="methodology-container">
      <div class="methodology-image">
        <div class="infographic-placeholder tall">
          <p>Infografica: Metodologia di ricerca</p>
        </div>
      </div>
      <div class="methodology-content">
        <p>La nostra metodologia combina diverse tecniche di ricerca:</p>
        <ul>
          <li><strong>Analisi documentale</strong> - Studio di pubblicazioni e report esistenti</li>
          <li><strong>Questionari strutturati</strong> - Raccolta dati quantitativi</li>
          <li><strong>Interviste in profondità</strong> - Approfondimento qualitativo</li>
          <li><strong>Mapping partecipativo</strong> - Coinvolgimento delle comunità locali</li>
          <li><strong>Analisi di rete</strong> - Studio delle interconnessioni tra centri</li>
        </ul>
      </div>
    </div>
  </section>
  
  <section class="cta-section">
    <h2 class="section-title">Partecipa al progetto</h2>
    <p>Sei parte di un centro di produzione del sapere o conosci realtà che dovrebbero essere mappate?</p>
    <div class="cta-buttons">
      <a href="/contatti" class="btn primary">Segnala un centro</a>
      <a href="/documenti" class="btn secondary">Consulta le linee guida</a>
    </div>
  </section>
</div>

<style>
  /* General Styles */
  :global(body) {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    margin: 0;
    padding: 0;
  }
  
  /* Hero Section */
  .hero {
    position: relative;
    height: 80vh;
    min-height: 500px;
    background-image: url('/images/placeholder-hero.jpg');
    background-size: cover;
    background-position: center;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  
  .hero-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1;
  }
  
  .hero-content {
    position: relative;
    z-index: 2;
    max-width: 800px;
    padding: 2rem;
  }
  
  .hero h1 {
    font-size: 3.5rem;
    margin-bottom: 0.5rem;
    font-weight: 800;
  }
  
  .hero h2 {
    font-size: 1.8rem;
    margin-bottom: 1.5rem;
    font-weight: 400;
  }
  
  .hero-description {
    font-size: 1.2rem;
    margin-bottom: 2rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }
  
  .hero-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }
  
  /* Stats Section */
  .stats-container {
    background-color: #f8f9fa;
    padding: 3rem 1rem;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }
  
  .stat-item {
    text-align: center;
  }
  
  .stat-value {
    font-size: 2.5rem;
    font-weight: 700;
    color: #2d5ca6;
    margin-bottom: 0.5rem;
  }
  
  .stat-label {
    font-size: 1.1rem;
    color: #555;
  }
  
  /* Main Content */
  .project-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 4rem 2rem;
  }
  
  .section-title {
    font-size: 2.2rem;
    margin-bottom: 2rem;
    position: relative;
    padding-bottom: 0.5rem;
  }
  
  .section-title::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 80px;
    height: 4px;
    background-color: #2d5ca6;
  }
  
  .project-overview, .project-section, .project-timeline, .methodology, .cta-section {
    margin-bottom: 5rem;
  }
  
  .overview-content, .section-content {
    display: flex;
    gap: 3rem;
    align-items: center;
  }
  
  .section-content.odd {
    flex-direction: row-reverse;
  }
  
  .text-content, .image-container {
    flex: 1;
  }
  
  .text-content p {
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
  }
  
  .infographic-placeholder {
    background-color: #f0f4f8;
    border: 2px dashed #cfd8e3;
    border-radius: 8px;
    padding: 5rem 2rem;
    text-align: center;
    color: #6c757d;
    font-style: italic;
  }
  
  .infographic-placeholder.tall {
    padding: 8rem 2rem;
  }
  
  /* Timeline */
  .timeline-container {
    margin-top: 3rem;
  }
  
  .timeline {
    position: relative;
    padding: 2rem 0;
  }
  
  .timeline::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    height: 100%;
    background-color: #e9ecef;
  }
  
  .timeline-item {
    position: relative;
    padding-left: 3rem;
    padding-bottom: 2rem;
  }
  
  .timeline-marker {
    position: absolute;
    left: -8px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background-color: #2d5ca6;
    border: 4px solid white;
  }
  
  .timeline-item h3 {
    margin-bottom: 0.5rem;
    font-size: 1.3rem;
  }
  
  /* Methodology */
  .methodology-container {
    display: flex;
    gap: 3rem;
    align-items: center;
  }
  
  .methodology-image, .methodology-content {
    flex: 1;
  }
  
  .methodology-content ul {
    padding-left: 1.5rem;
  }
  
  .methodology-content li {
    margin-bottom: 1rem;
  }
  
  /* CTA Section */
  .cta-section {
    text-align: center;
    background-color: #f8f9fa;
    padding: 3rem;
    border-radius: 12px;
  }
  
  .cta-section p {
    font-size: 1.2rem;
    margin-bottom: 2rem;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;
  }
  
  .cta-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }
  
  /* Buttons */
  .btn {
    display: inline-block;
    padding: 0.8rem 1.8rem;
    border-radius: 50px;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.3s ease;
    text-align: center;
  }
  
  .btn.primary {
    background-color: #2d5ca6;
    color: white;
    border: 2px solid #2d5ca6;
  }
  
  .btn.primary:hover {
    background-color: #234980;
    border-color: #234980;
  }
  
  .btn.secondary {
    background-color: transparent;
    color: #2d5ca6;
    border: 2px solid #2d5ca6;
  }
  
  .btn.secondary:hover {
    background-color: rgba(45, 92, 166, 0.1);
  }
  
  /* Responsive Adjustments */
  @media (max-width: 900px) {
    .hero h1 {
      font-size: 2.8rem;
    }
    
    .hero h2 {
      font-size: 1.5rem;
    }
    
    .overview-content, .section-content, .section-content.odd, .methodology-container {
      flex-direction: column;
    }
    
    .image-container, .methodology-image {
      margin-top: 2rem;
    }
    
    .hero-buttons, .cta-buttons {
      flex-direction: column;
      gap: 1rem;
    }
    
    .btn {
      width: 100%;
    }
  }
  
  @media (max-width: 600px) {
    .hero h1 {
      font-size: 2.2rem;
    }
    
    .hero {
      min-height: 400px;
    }
    
    .stats-grid {
      grid-template-columns: 1fr 1fr;
    }
    
    .section-title {
      font-size: 1.8rem;
    }
  }
</style>
