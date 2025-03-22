import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { location, image } from '$lib/server/db/schema';
import { tipo } from '$lib/server/db/schema.js';

// Sample data for development
const sampleLocations = [
  {
    name: 'Biblioteca Comunale Morante',
    description: 'Biblioteca pubblica con ampi spazi di studio e collezione di libri moderni.',
    latitude: 41.856,
    longitude: 12.473,
    street: 'Via Adolfo Cozza, 7',
    municipio: 'I',
    tipo: 'Biblioteca/Aula Studio',
    managedby: 'Comune di Roma',
    link: 'https://www.bibliocom-morante.it'
  },
  {
    name: 'Centro Giovani Esquilino',
    description: 'Spazio dedicato ai giovani con laboratori creativi e sale per attività ricreative.',
    latitude: 41.895,
    longitude: 12.502,
    street: 'Via Principe Amedeo, 184',
    municipio: 'I',
    tipo: 'Centro di Aggregazione Giovanile',
    managedby: 'Associazione Culturale Roma Giovani',
    link: 'https://www.centrogiovaniroma.it'
  },
  {
    name: 'Centro Famiglie Villa Lais',
    description: 'Centro di supporto per famiglie con bambini, offre consulenze e attività ricreative.',
    latitude: 41.873,
    longitude: 12.518,
    street: 'Via Tommaso Fortifiocca, 71',
    municipio: 'VII',
    tipo: 'Centro Famiglia',
    managedby: 'Cooperativa Sociale Horizon',
    link: 'https://www.centrofamiglie-villalais.it'
  },
  {
    name: 'Spazio Creativo Testaccio',
    description: 'Hub culturale con spazi per mostre, eventi e workshop artistici.',
    latitude: 41.878,
    longitude: 12.476,
    street: 'Via Galvani, 87',
    municipio: 'I',
    tipo: 'Altro',
    managedby: 'Fondazione Artisti Romani',
    link: 'https://www.spaziocreativotestaccio.org'
  },
  {
    name: 'Biblioteca Flaminia',
    description: 'Biblioteca di quartiere con sezione specializzata in letteratura per ragazzi.',
    latitude: 41.925,
    longitude: 12.469,
    street: 'Via Fracassini, 9',
    municipio: 'II',
    tipo: 'Biblioteca/Aula Studio',
    managedby: 'Sistema Biblioteche di Roma',
    link: 'https://www.bibliotechediroma.it/flaminia'
  },
  {
    name: 'Centro Giovani Ponte Milvio',
    description: 'Centro ricreativo con campi sportivi e sale musicali per i giovani del quartiere.',
    latitude: 41.935,
    longitude: 12.477,
    street: 'Via Capoprati, 12',
    municipio: 'XV',
    tipo: 'Centro di Aggregazione Giovanile',
    managedby: 'Associazione Sport e Cultura',
    link: 'https://www.centrogiovanipontemilvio.it'
  },
  {
    name: 'Spazio Famiglia EUR',
    description: 'Centro servizi per famiglie con attività di sostegno alla genitorialità.',
    latitude: 41.828,
    longitude: 12.465,
    street: 'Viale Europa, 98',
    municipio: 'IX',
    tipo: 'Centro Famiglia',
    managedby: 'Cooperativa Sociale Nuovi Orizzonti',
    link: 'https://www.spaziofamiglia-eur.it'
  },
  {
    name: 'Hub Culturale Ostiense',
    description: 'Ex fabbrica riconvertita in spazio polifunzionale per eventi culturali.',
    latitude: 41.861,
    longitude: 12.484,
    street: 'Via Ostiense, 106',
    municipio: 'VIII',
    tipo: 'Altro',
    managedby: 'Associazione Culturale Metropoli',
    link: 'https://www.hubostiense.org'
  },
  {
    name: 'Biblioteca Marconi',
    description: 'Moderna biblioteca con ampi spazi di studio e connessione internet gratuita.',
    latitude: 41.849,
    longitude: 12.478,
    street: 'Via Gerolamo Cardano, 135',
    municipio: 'XI',
    tipo: 'Biblioteca/Aula Studio',
    managedby: 'Comune di Roma',
    link: 'https://www.bibliotecamarconi.it'
  },
  {
    name: 'Centro Giovani Trastevere',
    description: 'Centro di aggregazione con laboratori artistici e sala prove musicali.',
    latitude: 41.885,
    longitude: 12.469,
    street: 'Via della Lungaretta, 23',
    municipio: 'I',
    tipo: 'Centro di Aggregazione Giovanile',
    managedby: 'Cooperativa Sociale Il Ponte',
    link: 'https://www.centrogiovani-trastevere.it'
  },
  {
    name: 'Centro per Famiglie Prenestino',
    description: 'Servizi di supporto per genitori e bambini con attività ludico-educative.',
    latitude: 41.893,
    longitude: 12.544,
    street: 'Via Prenestina, 468',
    municipio: 'V',
    tipo: 'Centro Famiglia',
    managedby: 'Associazione Famiglia e Minori',
    link: 'https://www.centrofamiglieprenestino.org'
  },
  {
    name: 'Coworking Pigneto',
    description: 'Spazio di lavoro condiviso con sale riunioni e area eventi.',
    latitude: 41.889,
    longitude: 12.528,
    street: 'Via del Pigneto, 75',
    municipio: 'V',
    tipo: 'Altro',
    managedby: 'Pigneto Innovation Hub',
    link: 'https://www.coworkingpigneto.com'
  },
  {
    name: 'Biblioteca Gianicolense',
    description: 'Biblioteca storica con importante collezione di testi antichi e sala conferenze.',
    latitude: 41.876,
    longitude: 12.456,
    street: 'Via Odescalchi, 45',
    municipio: 'XII',
    tipo: 'Biblioteca/Aula Studio',
    managedby: 'Sistema Biblioteche di Roma',
    link: 'https://www.bibliogianicolense.it'
  },
  {
    name: 'Centro Giovani Quadraro',
    description: 'Spazio dedicato ai giovani con attività sportive e laboratori multimediali.',
    latitude: 41.865,
    longitude: 12.547,
    street: 'Via dei Quintili, 21',
    municipio: 'VII',
    tipo: 'Centro di Aggregazione Giovanile',
    managedby: 'Associazione Giovani in Movimento',
    link: 'https://www.centroquadraro.it'
  },
  {
    name: 'Centro Famiglia Trieste-Salario',
    description: 'Centro di ascolto e supporto per genitori con sportello psicologico.',
    latitude: 41.921,
    longitude: 12.519,
    street: 'Viale Somalia, 108',
    municipio: 'II',
    tipo: 'Centro Famiglia',
    managedby: 'Cooperativa Sociale Aurora',
    link: 'https://www.centrofamigliasalario.it'
  },
  {
    name: 'Officina delle Arti Montesacro',
    description: 'Spazio polivalente per corsi d\'arte e artigianato artistico.',
    latitude: 41.945,
    longitude: 12.526,
    street: 'Via Monte Ruggero, 39',
    municipio: 'III',
    tipo: 'Altro',
    managedby: 'Associazione Arti e Mestieri',
    link: 'https://www.officinamontesacro.it'
  },
  {
    name: 'Biblioteca Casa dei Bimbi',
    description: 'Biblioteca specializzata in letteratura per l\'infanzia con spazi gioco.',
    latitude: 41.857,
    longitude: 12.542,
    street: 'Via Libero Leonardi, 153',
    municipio: 'VII',
    tipo: 'Biblioteca/Aula Studio',
    managedby: 'Fondazione Leggere per Crescere',
    link: 'https://www.casadeibimbi.org'
  },
  {
    name: 'Centro Giovani San Lorenzo',
    description: 'Centro ricreativo con sale per musica, arte e videomaking per giovani artisti.',
    latitude: 41.901,
    longitude: 12.516,
    street: 'Via dei Volsci, 59',
    municipio: 'II',
    tipo: 'Centro di Aggregazione Giovanile',
    managedby: 'Cooperativa Sociale Artemisia',
    link: 'https://www.centrogiovaniroma.net'
  },
  {
    name: 'Centro Famiglie Ostia',
    description: 'Centro di supporto alla genitorialità con servizi di mediazione familiare.',
    latitude: 41.731,
    longitude: 12.276,
    street: 'Viale Vasco de Gama, 186',
    municipio: 'X',
    tipo: 'Centro Famiglia',
    managedby: 'Associazione Famiglie Insieme',
    link: 'https://www.centrofamiglieostia.it'
  },
  {
    name: 'Laboratori Urbani Garbatella',
    description: 'Spazi di rigenerazione urbana con orti comunitari e attività per il quartiere.',
    latitude: 41.862,
    longitude: 12.492,
    street: 'Piazza Bartolomeo Romano, 8',
    municipio: 'VIII',
    tipo: 'Altro',
    managedby: 'Associazione Rinascita Urbana',
    link: 'https://www.laburbani.org'
  },
  {
    name: 'Biblioteca Valle Aurelia',
    description: 'Biblioteca moderna con collezione multimediale e spazi per lo studio di gruppo.',
    latitude: 41.903,
    longitude: 12.439,
    street: 'Via di Valle Aurelia, 129',
    municipio: 'XIII',
    tipo: 'Biblioteca/Aula Studio',
    managedby: 'Sistema Biblioteche di Roma',
    link: 'https://www.biblioroma.it/valleaurelia'
  },
  {
    name: 'Centro Giovani Corviale',
    description: 'Centro sociale con campi sportivi e sala multimediale per i giovani del quartiere.',
    latitude: 41.840,
    longitude: 12.433,
    street: 'Via Poggio Verde, 389',
    municipio: 'XI',
    tipo: 'Centro di Aggregazione Giovanile',
    managedby: 'Associazione Nuove Opportunità',
    link: 'https://www.centrogiovanicoviale.org'
  },
  {
    name: 'Centro per le Famiglie Casilino',
    description: 'Centro di accoglienza per famiglie con sportello ascolto e consulenza legale.',
    latitude: 41.876,
    longitude: 12.567,
    street: 'Via Casilina, 1101',
    municipio: 'VI',
    tipo: 'Centro Famiglia',
    managedby: 'Cooperativa Sociale Insieme',
    link: 'https://www.centrofamigliecasilino.it'
  },
  {
    name: 'FabLab Roma',
    description: 'Laboratorio di fabbricazione digitale con stampanti 3D e corsi di progettazione.',
    latitude: 41.899,
    longitude: 12.494,
    street: 'Via Marsala, 29',
    municipio: 'I',
    tipo: 'Altro',
    managedby: 'Associazione Makers Italia',
    link: 'https://www.fablabroma.org'
  },
  {
    name: 'Biblioteca Aldo Fabrizi',
    description: 'Biblioteca di quartiere con archivio storico locale e spazi per bambini.',
    latitude: 41.914,
    longitude: 12.551,
    street: 'Via Tronto, 19',
    municipio: 'IV',
    tipo: 'Biblioteca/Aula Studio',
    managedby: 'Comune di Roma',
    link: 'https://www.biblioaldofabrizi.it'
  },
  {
    name: 'Centro Giovani Cinecittà',
    description: 'Centro culturale con sala cinema e laboratori di produzione audiovisiva.',
    latitude: 41.852,
    longitude: 12.562,
    street: 'Via Tuscolana, 1055',
    municipio: 'VII',
    tipo: 'Centro di Aggregazione Giovanile',
    managedby: 'Associazione Cinema Giovane',
    link: 'https://www.cinegiovanicinecitta.it'
  },
  {
    name: 'Centro Famiglia Primavalle',
    description: 'Centro di supporto per famiglie con bambini piccoli e attività intergenerazionali.',
    latitude: 41.909,
    longitude: 12.418,
    street: 'Via Pietro Maffi, 45',
    municipio: 'XIV',
    tipo: 'Centro Famiglia',
    managedby: 'Associazione Famiglia è Futuro',
    link: 'https://www.centrofamiglieprimavalle.org'
  },
  {
    name: 'Parco Urbano Educativo Centocelle',
    description: 'Area verde attrezzata con percorsi didattici e spazio eventi all\'aperto.',
    latitude: 41.881,
    longitude: 12.566,
    street: 'Via Casilina, 712',
    municipio: 'V',
    tipo: 'Altro',
    managedby: 'Associazione Parchi Educativi',
    link: 'https://www.parcocentocelle.it'
  },
  {
    name: 'Aula Studio Monteverde',
    description: 'Spazio di studio con connessione wi-fi gratuita e zona ristoro.',
    latitude: 41.873,
    longitude: 12.449,
    street: 'Via di Donna Olimpia, 30',
    municipio: 'XII',
    tipo: 'Biblioteca/Aula Studio',
    managedby: 'Associazione Studenti Uniti',
    link: 'https://www.aulastudiomonteverde.it'
  }
];

const sampleImages = [
  {
    locationIndex: 0,
    url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b',
    caption: 'Sala principale della Biblioteca Morante'
  },
  {
    locationIndex: 0,
    url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b',
    caption: 'Area studio della Biblioteca Morante'
  },
  {
    locationIndex: 1,
    url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b',
    caption: 'Ingresso del Centro Giovani Esquilino'
  },
  {
    locationIndex: 2,
    url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b',
    caption: 'Spazio giochi del Centro Famiglie Villa Lais'
  },
  {
    locationIndex: 3,
    url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b',
    caption: 'Mostra d\'arte allo Spazio Creativo Testaccio'
  },
  {
    locationIndex: 4,
    url: 'hthttps://images.unsplash.com/photo-1580582932707-520aed937b7b',
    caption: 'Scaffali della Biblioteca Flaminia'
  },
  {
    locationIndex: 5,
    url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b',
    caption: 'Campo sportivo del Centro Giovani Ponte Milvio'
  },
  {
    locationIndex: 9,
    url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b',
    caption: 'Sala lettura della Biblioteca Marconi'
  }
];

// Sample data for development
// create sample locations and data based on the schema

export async function GET() {
	try {
		// Clear existing data
		await db.delete(image);
		await db.delete(location);
		
		// Insert locations
		const locationResults = [];
		for (const loc of sampleLocations) {
			const result = await db.insert(location).values(loc).returning();
			locationResults.push(result[0]);
		}
		
		// Insert images
		for (const img of sampleImages) {
			await db.insert(image).values({
				locationId: locationResults[img.locationIndex].id,
				url: img.url,
				caption: img.caption
			});
		}
		
		return json({ success: true, message: 'Database seeded successfully' });
	} catch (error) {
		console.error('Error seeding database:', error);
		return json({ error: 'Failed to seed database' }, { status: 500 });
	}
}
