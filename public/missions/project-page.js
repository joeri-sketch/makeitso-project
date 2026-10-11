(() => {
  'use strict';

  const projectRoot = document.querySelector('[data-project]');
  const projectId = projectRoot?.dataset.project;
  const i18n = window.i18n;

  const ui = {
    en: {
      back: '← All sample missions', fictional: 'Fictional sample project · A creative direction concept, not commissioned client work.',
      heroTags: ['Brand strategy', 'Logo design', 'Website', 'Launch campaign'],
      briefKicker: '01 · The brief', briefTitle: ['A business with', 'room to grow.'],
      challenge: 'The challenge', opportunity: 'The opportunity', direction: 'The creative direction',
      brandKicker: '02 · Brand identity', brandTitle: ['A clear signal.', 'A brand of its own.'],
      brandIntro: 'A complete identity system brings the story to life across every customer touchpoint—from the first impression to the day-to-day details.',
      logoLabel: 'Primary logo · custom-designed', logoCaption: 'A flexible signature made for shopfronts, packaging and screens.',
      paletteLabel: 'THE COLOUR PALETTE', typeLabel: 'TYPOGRAPHY', headingFont: 'Display', bodyFont: 'Body',
      websiteKicker: '03 · Website design', websiteTitle: ['The brand,', 'in full flight.'],
      websiteIntro: 'A responsive website concept that makes the next step obvious, gives the brand room to shine and works beautifully from desktop to mobile.',
      websiteAddress: 'CONCEPT WEBSITE · PREVIEW', sampleNav: ['Our story', 'Menu', 'Visit us'],
      webFeatureTitle: ['Designed around', 'real customer needs.'],
      webNotes: [['Clear journey', 'Straightforward paths to the right information and next action.'], ['Responsive by design', 'A considered experience from large screens to mobile.'], ['Built for discovery', 'Useful content and clear structure help people find the business.']],
      campaignKicker: '04 · Launch campaign', campaignLabel: 'MAKE THE INTRODUCTION',
      campaignChannels: ['A campaign idea built for real-life moments', 'Consistent creative across social and search', 'Simple calls to action that turn interest into visits'],
      finalKicker: 'NEXT MISSION', finalTitle: ['Good ideas deserve', 'a proper launch.'],
      finalCopy: 'This is a fictional sample concept. Have a real business, brand or website in mind? Let’s build its next chapter together.',
      finalButton: 'Tell us about your project', nav: ['What we do', 'Mission log', 'About', 'Approach', 'FAQ', 'Hail us'],
      menuOpen: 'Open menu', menuClose: 'Close menu', footerButton: 'Start a project',
      footerNote: 'Powered by Earl Grey. Hot. Live long and prosper.', footerNav: 'Footer navigation',
      mainNav: 'Main navigation', mobileNav: 'Mobile navigation', footerCopyright: 'Fictional sample project.'
    },
    nl: {
      back: '← Alle voorbeeldmissies', fictional: 'Fictief voorbeeldproject · Creatief concept, geen werk in opdracht van een klant.',
      heroTags: ['Merkstrategie', 'Logodesign', 'Website', 'Lanceringscampagne'],
      briefKicker: '01 · De briefing', briefTitle: ['Een bedrijf met', 'groeiruimte.'],
      challenge: 'De uitdaging', opportunity: 'De kans', direction: 'De creatieve richting',
      brandKicker: '02 · Merkidentiteit', brandTitle: ['Een helder signaal.', 'Een eigen merk.'],
      brandIntro: 'Een compleet identiteitssysteem brengt het verhaal tot leven op elk contactmoment: van de eerste indruk tot de details van alledag.',
      logoLabel: 'Primair logo · op maat ontworpen', logoCaption: 'Een flexibel beeldmerk voor gevel, verpakking en scherm.',
      paletteLabel: 'HET KLEURENPALET', typeLabel: 'TYPOGRAFIE', headingFont: 'Koppen', bodyFont: 'Broodtekst',
      websiteKicker: '03 · Websiteontwerp', websiteTitle: ['Het merk,', 'helemaal tot leven.'],
      websiteIntro: 'Een responsive websiteconcept dat de volgende stap duidelijk maakt, het merk laat stralen en prettig werkt op desktop én mobiel.',
      websiteAddress: 'WEBCONCEPT · VOORBEELD', sampleNav: ['Ons verhaal', 'Assortiment', 'Bezoek ons'],
      webFeatureTitle: ['Ontworpen rond', 'echte klantbehoeften.'],
      webNotes: [['Heldere route', 'Meteen naar de juiste informatie en volgende stap.'], ['Responsive ontworpen', 'Een doordachte ervaring op groot scherm en mobiel.'], ['Goed vindbaar', 'Nuttige inhoud en heldere structuur helpen bezoekers het bedrijf vinden.']],
      campaignKicker: '04 · Lanceringscampagne', campaignLabel: 'EEN STERKE EERSTE INDRUK',
      campaignChannels: ['Een campagne-idee voor echte momenten', 'Herkenbare creatie op social en in zoekmachines', 'Duidelijke oproepen die interesse omzetten in bezoek'],
      finalKicker: 'VOLGENDE MISSIE', finalTitle: ['Goede ideeën verdienen', 'een sterke lancering.'],
      finalCopy: 'Dit is een fictief voorbeeldconcept. Heb je een echt bedrijf, merk of website in gedachten? Samen bouwen we aan het volgende hoofdstuk.',
      finalButton: 'Vertel over je project', nav: ['Wat we doen', 'Missielogboek', 'Over ons', 'Aanpak', 'FAQ', 'Contact'],
      menuOpen: 'Menu openen', menuClose: 'Menu sluiten', footerButton: 'Start een project',
      footerNote: 'Aangedreven door Earl Grey. Hot. Live long and prosper.', footerNav: 'Footernavigatie',
      mainNav: 'Hoofdnavigatie', mobileNav: 'Mobiele navigatie', footerCopyright: 'Fictief voorbeeldproject.'
    },
    fr: {
      back: '← Tous les projets exemples', fictional: 'Projet fictif · Concept créatif, réalisé sans commande d’un client.',
      heroTags: ['Stratégie de marque', 'Création de logo', 'Site web', 'Campagne de lancement'],
      briefKicker: '01 · Le brief', briefTitle: ['Une entreprise', 'prête à grandir.'],
      challenge: 'Le défi', opportunity: 'L’opportunité', direction: 'La direction créative',
      brandKicker: '02 · Identité de marque', brandTitle: ['Un signal clair.', 'Une marque unique.'],
      brandIntro: 'Un système d’identité complet fait vivre l’histoire à chaque point de contact, de la première impression aux détails du quotidien.',
      logoLabel: 'Logo principal · création sur mesure', logoCaption: 'Une signature flexible pour la vitrine, les emballages et les écrans.',
      paletteLabel: 'LA PALETTE DE COULEURS', typeLabel: 'TYPOGRAPHIE', headingFont: 'Titres', bodyFont: 'Texte courant',
      websiteKicker: '03 · Conception web', websiteTitle: ['La marque,', 'en pleine lumière.'],
      websiteIntro: 'Un concept de site responsive qui clarifie la prochaine étape, met la marque en valeur et fonctionne aussi bien sur ordinateur que sur mobile.',
      websiteAddress: 'SITE CONCEPT · APERÇU', sampleNav: ['Notre histoire', 'La carte', 'Nous trouver'],
      webFeatureTitle: ['Conçu autour', 'des vrais besoins.'],
      webNotes: [['Parcours clair', 'Accès direct aux bonnes informations et à la suite.'], ['Responsive dès le départ', 'Une expérience soignée sur grand écran comme sur mobile.'], ['Pensé pour être trouvé', 'Un contenu utile et une structure claire aident à trouver l’entreprise.']],
      campaignKicker: '04 · Campagne de lancement', campaignLabel: 'FAIRE UNE PREMIÈRE IMPRESSION',
      campaignChannels: ['Une idée de campagne ancrée dans le réel', 'Une création cohérente sur les réseaux et dans la recherche', 'Des appels à l’action qui transforment l’intérêt en visite'],
      finalKicker: 'PROCHAINE MISSION', finalTitle: ['Les bonnes idées méritent', 'un vrai lancement.'],
      finalCopy: 'Ce concept est fictif. Vous avez une vraie entreprise, une marque ou un site en tête ? Créons ensemble son prochain chapitre.',
      finalButton: 'Parlons de votre projet', nav: ['Nos services', 'Journal de mission', 'À propos', 'Approche', 'FAQ', 'Contact'],
      menuOpen: 'Ouvrir le menu', menuClose: 'Fermer le menu', footerButton: 'Démarrer un projet',
      footerNote: 'Propulsé par Earl Grey. Hot. Longue vie et prospérité.', footerNav: 'Navigation de pied de page',
      mainNav: 'Navigation principale', mobileNav: 'Navigation mobile', footerCopyright: 'Projet exemple fictif.'
    }
  };

  const projects = {
    'nova-bakery': {
      colors: ['#ef8751', '#793b35', '#ffd27c', '#fff3dd'],
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1500&q=85',
      imageAlt: {
        en: 'Artisan sourdough and seeded loaves fresh from the bakery oven',
        nl: 'Ambachtelijke zuurdesem- en meergranenbroden vers uit de oven',
        fr: 'Pains au levain et pains aux graines tout juste sortis du four'
      },
      logo: 'nova',
      locales: {
        en: {
          name: 'Nova Bakery', short: 'Nova', kind: 'Independent neighbourhood bakery',
          first: 'Fresh from', second: 'the oven.',
          lead: 'A neighbourhood bakery built around early mornings, good ingredients and the simple pleasure of sharing something warm.',
          challenge: 'A new local bakery needs to stand out on a busy high street and give people a reason to make it part of their daily routine.',
          opportunity: 'Make the craft visible: honest ingredients, bread baked each morning and a welcoming counter that feels part of the neighbourhood.',
          direction: 'A warm, modern identity pairs a confident wordmark with a small rising-sun mark. Earthy bakery tones and bright citrus accents make the brand feel both crafted and fresh.',
          logoNote: 'The rising sun is a small nod to early starts and warm loaves. The strong wordmark stays readable on a paper bag, a window or a phone.',
          personality: 'Warm · generous · freshly made',
          websiteHero: 'A better morning starts here.',
          websiteLead: 'Slow-fermented sourdough, buttery pastries and good coffee—made fresh in the neighbourhood every morning.',
          websiteButton: 'See what’s baking',
          webCards: [['Made fresh daily', 'A changing counter of bread and pastries, baked here each morning.'], ['Know your baker', 'A short story about the people, ingredients and craft behind every loaf.'], ['Plan a visit', 'Opening hours, location and a simple way to get in touch.']],
          campaignTitle: 'Make the morning ritual local.',
          campaignCopy: 'Introduce Nova with a week of neighbourhood tastings, window graphics and warm, close-up food photography. Keep the story consistent online: what came out of the oven today, who made it and when to drop by.',
          paletteNames: ['Oven clay', 'Roast cocoa', 'Morning butter', 'Flour paper'],
          subline: 'BAKED FRESH · SHARED DAILY'
        },
        nl: {
          name: 'Nova Bakkerij', short: 'Nova', kind: 'Zelfstandige buurtbakker',
          first: 'Vers uit', second: 'de oven.',
          lead: 'Een buurtbakkerij voor vroege ochtenden, goede ingrediënten en het eenvoudige plezier van iets warms delen.',
          challenge: 'Een nieuwe buurtbakker moet opvallen in een drukke winkelstraat en mensen een reden geven om er dagelijks langs te gaan.',
          opportunity: 'Laat het vakmanschap zien: eerlijke ingrediënten, brood dat elke ochtend vers wordt gebakken en een warme buurtwinkel.',
          direction: 'Een warme, moderne identiteit combineert een krachtig woordmerk met een kleine zonsopgang. Aardse bakkerskleuren met frisse citrusaccenten voelen ambachtelijk én nieuw.',
          logoNote: 'De opkomende zon verwijst naar vroege starts en warme broden. Het stevige woordmerk blijft leesbaar op een broodzak, etalage of telefoon.',
          personality: 'Warm · gul · vers gemaakt',
          websiteHero: 'Een betere ochtend begint hier.',
          websiteLead: 'Langzaam gerezen zuurdesem, boterrijke koffiekoeken en goede koffie—elke ochtend vers in de buurt gemaakt.',
          websiteButton: 'Bekijk wat er bakt',
          webCards: [['Elke dag vers', 'Een wisselend aanbod brood en gebak, hier iedere ochtend gebakken.'], ['Leer de bakker kennen', 'Een kort verhaal over de mensen, ingrediënten en het vak achter elk brood.'], ['Plan je bezoek', 'Openingsuren, locatie en een eenvoudige manier om contact op te nemen.']],
          campaignTitle: 'Maak van de ochtend een buurtmoment.',
          campaignCopy: 'Introduceer Nova met proeverijen in de buurt, raamdecoratie en warme foodfotografie. Vertel online steeds hetzelfde verhaal: wat kwam er vandaag uit de oven, wie maakte het en wanneer kun je langskomen?',
          paletteNames: ['Ovenklei', 'Cacaobruin', 'Ochtendboter', 'Bloempapier'],
          subline: 'VERS GEBAKKEN · ELKE DAG GEDEELD'
        },
        fr: {
          name: 'Boulangerie Nova', short: 'Nova', kind: 'Boulangerie indépendante de quartier',
          first: 'Tout juste sorti', second: 'du four.',
          lead: 'Une boulangerie de quartier dédiée aux petits matins, aux bons ingrédients et au plaisir simple de partager quelque chose de chaud.',
          challenge: 'Une nouvelle boulangerie doit se distinguer dans une rue animée et donner envie de l’intégrer à son quotidien.',
          opportunity: 'Montrer le savoir-faire : des ingrédients sincères, du pain cuit chaque matin et un comptoir accueillant, ancré dans le quartier.',
          direction: 'Une identité chaleureuse et actuelle associe un mot-symbole affirmé à un petit soleil levant. Des tons de boulangerie naturels et des accents citronnés évoquent le savoir-faire et la fraîcheur.',
          logoNote: 'Le soleil levant évoque les départs matinaux et le pain chaud. Le mot-symbole reste lisible sur un sachet, une vitrine ou un téléphone.',
          personality: 'Chaleureux · généreux · frais',
          websiteHero: 'Une belle matinée commence ici.',
          websiteLead: 'Levain lentement fermenté, viennoiseries au beurre et bon café, préparés frais chaque matin dans le quartier.',
          websiteButton: 'Voir les fournées',
          webCards: [['Fait frais chaque jour', 'Une sélection changeante de pains et de viennoiseries, cuits ici chaque matin.'], ['Rencontrer votre boulanger', 'Une histoire courte sur les personnes, les ingrédients et le savoir-faire.'], ['Préparer sa visite', 'Horaires, adresse et un moyen simple de nous contacter.']],
          campaignTitle: 'Faire du matin un rituel de quartier.',
          campaignCopy: 'Présenter Nova avec une semaine de dégustations locales, une vitrine soignée et une photographie chaleureuse. En ligne, raconter la même histoire : que sort-il du four aujourd’hui, qui l’a préparé et quand passer ?',
          paletteNames: ['Argile du four', 'Cacao torréfié', 'Beurre du matin', 'Papier farine'],
          subline: 'Cuit frais · À partager chaque jour'
        }
      }
    },
    'move-studio': {
      colors: ['#7658df', '#292151', '#d9fa82', '#f3f0ff'],
      image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1500&q=85',
      imageAlt: {
        en: 'Bright independent fitness studio with strength training equipment',
        nl: 'Lichte onafhankelijke fitnessstudio met krachttrainingsmateriaal',
        fr: 'Studio de fitness indépendant et lumineux avec équipements de musculation'
      },
      logo: 'move',
      locales: {
        en: {
          name: 'Move Studio', short: 'move', kind: 'Independent movement and strength studio',
          first: 'Find your', second: 'strong.',
          lead: 'A neighbourhood training studio where expert coaching meets an open door, good energy and a community that moves together.',
          challenge: 'Fitness can feel intimidating. A new studio needs to show what makes its approach personal, supportive and worth trying.',
          opportunity: 'Lead with people, not pressure: small-group coaching, adaptable sessions and familiar faces at every level.',
          direction: 'An energetic identity uses a custom motion-mark built from a continuous path. Deep violet gives it confidence; electric lime adds a spark of movement.',
          logoNote: 'The linked strokes in the symbol suggest a path through motion and progress. The compact wordmark works on a studio wall, a shirt or an app icon.',
          personality: 'Encouraging · energetic · human',
          websiteHero: 'Stronger feels better together.',
          websiteLead: 'Small-group strength and movement classes, coached with care and shaped around real people.',
          websiteButton: 'Find your first class',
          webCards: [['See the timetable', 'Simple class details, levels and availability without the guesswork.'], ['Meet the coaches', 'Real people, coaching styles and what to expect from your first visit.'], ['Book your place', 'A clear, mobile-friendly route from class discovery to booking.']],
          campaignTitle: 'Make the first session feel easy.',
          campaignCopy: 'A friendly “your first class” campaign pairs coach introductions with short demonstrations and member stories. Local search and social point to a simple trial booking, with clear details on what to bring and what happens next.',
          paletteNames: ['Studio violet', 'Night plum', 'Movement lime', 'Soft chalk'],
          subline: 'MOVE AT YOUR PACE · TOGETHER'
        },
        nl: {
          name: 'Move Studio', short: 'move', kind: 'Zelfstandige studio voor beweging en kracht',
          first: 'Vind je', second: 'eigen kracht.',
          lead: 'Een buurtstudio waar deskundige coaching samenkomt met een open deur, goede energie en een community die samen beweegt.',
          challenge: 'Fitness kan intimiderend aanvoelen. Een nieuwe studio moet laten zien wat de aanpak persoonlijk, toegankelijk en de moeite waard maakt.',
          opportunity: 'Zet mensen centraal, niet de druk: kleine groepen, aanpasbare trainingen en vertrouwde gezichten op elk niveau.',
          direction: 'Een energieke identiteit gebruikt een eigen bewegingssymbool, opgebouwd uit één doorlopende lijn. Diep violet geeft vertrouwen; elektrisch limegroen brengt beweging.',
          logoNote: 'De verbonden lijnen in het symbool verbeelden een route door beweging en vooruitgang. Het compacte woordmerk werkt op de studiowand, een shirt of app-icoon.',
          personality: 'Motiverend · energiek · menselijk',
          websiteHero: 'Samen sterker voelt beter.',
          websiteLead: 'Kleinschalige kracht- en bewegingslessen, met aandacht gecoacht voor echte mensen.',
          websiteButton: 'Vind je eerste les',
          webCards: [['Bekijk het rooster', 'Heldere lesinformatie, niveaus en beschikbaarheid zonder giswerk.'], ['Ontmoet de coaches', 'De mensen, hun aanpak en wat je kunt verwachten bij je eerste bezoek.'], ['Reserveer je plek', 'Een duidelijke, mobielvriendelijke route van les ontdekken tot boeken.']],
          campaignTitle: 'Maak de eerste training laagdrempelig.',
          campaignCopy: 'Een vriendelijke “je eerste les”-campagne combineert kennismakingen met coaches, korte demonstraties en ledenverhalen. Lokale zoekresultaten en social leiden naar een proefles met heldere info over wat je meeneemt en wat er daarna gebeurt.',
          paletteNames: ['Studioviolet', 'Nachtpruim', 'Beweeglime', 'Zacht krijt'],
          subline: 'BEWEEG OP JOUW TEMPO · SAMEN'
        },
        fr: {
          name: 'Move Studio', short: 'move', kind: 'Studio indépendant de mouvement et de renforcement',
          first: 'Trouvez votre', second: 'force.',
          lead: 'Un studio de quartier où un coaching expert rencontre un accueil ouvert, une belle énergie et une communauté qui bouge ensemble.',
          challenge: 'Le fitness peut intimider. Un nouveau studio doit montrer ce qui rend son approche personnelle, encourageante et accessible.',
          opportunity: 'Mettre les personnes au centre, sans pression : petits groupes, séances adaptables et visages familiers à chaque niveau.',
          direction: 'Une identité énergique s’appuie sur un symbole de mouvement dessiné d’un trait continu. Le violet profond inspire confiance ; le lime électrique apporte l’élan.',
          logoNote: 'Les lignes reliées évoquent le mouvement et le progrès. Le mot-symbole compact fonctionne sur un mur, un t-shirt ou une icône d’application.',
          personality: 'Encourageant · énergique · humain',
          websiteHero: 'Plus forts, ensemble.',
          websiteLead: 'Des cours de renforcement et de mouvement en petits groupes, encadrés avec attention et pensés pour chacun.',
          websiteButton: 'Trouver mon premier cours',
          webCards: [['Voir le planning', 'Des informations claires sur les cours, les niveaux et les places disponibles.'], ['Rencontrer les coachs', 'Leurs parcours, leur approche et le déroulement de votre première visite.'], ['Réserver sa place', 'Un parcours clair et mobile, de la découverte du cours à la réservation.']],
          campaignTitle: 'Faciliter la première séance.',
          campaignCopy: 'Une campagne accueillante autour du “premier cours” associe présentations des coachs, démonstrations courtes et témoignages. La recherche locale et les réseaux mènent vers une séance découverte, avec des explications simples sur la suite.',
          paletteNames: ['Violet studio', 'Prune nuit', 'Lime mouvement', 'Craie douce'],
          subline: 'À VOTRE RYTHME · ENSEMBLE'
        }
      }
    },
    'roam-rental': {
      colors: ['#36a4aa', '#174354', '#f2be69', '#fff5df'],
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1500&q=85',
      imageAlt: {
        en: 'Modern car on a scenic road, ready for a weekend trip',
        nl: 'Moderne auto op een mooie weg, klaar voor een weekenduitstap',
        fr: 'Voiture moderne sur une route panoramique, prête pour le week-end'
      },
      logo: 'roam',
      locales: {
        en: {
          name: 'Roam Car Rental', short: 'roam', kind: 'Independent car rental for local trips and weekends',
          first: 'Take the', second: 'scenic route.',
          lead: 'A local car rental company for spontaneous weekends, practical errands and the freedom to take the long way round.',
          challenge: 'Rental choices can be confusing, with unclear costs and too many steps between finding a car and getting the keys.',
          opportunity: 'Make the experience feel straightforward from the first click: useful vehicle details, transparent essentials and a confident booking path.',
          direction: 'A crisp travel-inspired identity pairs a route-shaped “R” with a sturdy wordmark. Coastal teal, deep blue and warm sand balance trust with a sense of escape.',
          logoNote: 'The single-line route in the “R” becomes a compact road icon. The identity scales from vehicle decals to booking confirmations and digital maps.',
          personality: 'Open-road · reliable · uncomplicated',
          websiteHero: 'Your next stop is yours to choose.',
          websiteLead: 'The right car for a quick errand, a family visit or an unplanned weekend away. Clear options, ready when you are.',
          websiteButton: 'Find your car',
          webCards: [['Choose the right ride', 'Compare useful vehicle details, passenger space and luggage capacity.'], ['Know before you book', 'Clear pickup information and the essentials customers need up front.'], ['Reserve in a few steps', 'A focused booking flow designed for phones as well as desktops.']],
          campaignTitle: 'Put the next trip within reach.',
          campaignCopy: 'A “where will you go?” launch pairs a fresh fleet shoot with short local itineraries. Search captures people already looking for a rental; social inspires the weekend plan. Every route leads to available cars and straightforward booking details.',
          paletteNames: ['Coastal teal', 'Deep current', 'Golden sand', 'Route paper'],
          subline: 'GO YOUR WAY · TAKE THE LONG WAY'
        },
        nl: {
          name: 'Roam Autoverhuur', short: 'roam', kind: 'Zelfstandige autoverhuur voor uitstappen en weekends',
          first: 'Kies de', second: 'mooie route.',
          lead: 'Een lokaal autoverhuurbedrijf voor spontane weekends, praktische ritten en de vrijheid om eens om te rijden.',
          challenge: 'Een huurauto kiezen kan verwarrend zijn, met onduidelijke kosten en te veel stappen tussen zoeken en vertrekken.',
          opportunity: 'Maak het vanaf de eerste klik eenvoudig: nuttige autogegevens, heldere voorwaarden en een vlotte boekingsroute.',
          direction: 'Een frisse, reisinspirerende identiteit combineert een routevormige “R” met een stevig woordmerk. Kustturkoois, diepblauw en warm zand balanceren vertrouwen met avontuur.',
          logoNote: 'De route in de “R” vormt ook een compact wegenicoon. De identiteit werkt op autobelettering, boekingsbevestigingen en digitale kaarten.',
          personality: 'Avontuurlijk · betrouwbaar · eenvoudig',
          websiteHero: 'Jij kiest waar de weg naartoe gaat.',
          websiteLead: 'De juiste auto voor een snelle boodschap, familiebezoek of spontaan weekendje weg. Duidelijke opties, klaar wanneer jij dat bent.',
          websiteButton: 'Vind je auto',
          webCards: [['Kies de juiste wagen', 'Vergelijk nuttige details, zitplaatsen en bagageruimte.'], ['Weet wat je boekt', 'Heldere ophaalinfo en de belangrijkste voorwaarden vooraf.'], ['Reserveer in enkele stappen', 'Een gericht boekingsproces voor mobiel en desktop.']],
          campaignTitle: 'Breng de volgende trip dichtbij.',
          campaignCopy: 'Een “waar rijd jij naartoe?”-lancering combineert nieuwe vlootfotografie met korte routes in de buurt. Zoekadvertenties bereiken wie al een auto zoekt; social inspireert een weekendplan. Elke route leidt naar beschikbare wagens en heldere boekingsinfo.',
          paletteNames: ['Kustturkoois', 'Diep water', 'Gouden zand', 'Routepapier'],
          subline: 'GA JE EIGEN WEG · RIJD OM'
        },
        fr: {
          name: 'Roam Location Auto', short: 'roam', kind: 'Location de voitures indépendante pour les sorties et week-ends',
          first: 'Prenez la', second: 'route panoramique.',
          lead: 'Une société locale de location pour les week-ends spontanés, les trajets pratiques et la liberté de prendre le chemin des détours.',
          challenge: 'Louer une voiture peut sembler compliqué : coûts peu clairs et trop d’étapes avant de récupérer les clés.',
          opportunity: 'Simplifier dès le premier clic : informations utiles sur les véhicules, conditions transparentes et réservation fluide.',
          direction: 'Une identité inspirée du voyage associe un “R” dessiné comme une route à un mot-symbole solide. Le turquoise côtier, le bleu profond et le sable chaleureux allient confiance et évasion.',
          logoNote: 'Le tracé continu du “R” devient un petit pictogramme routier. L’identité se décline sur les véhicules, les confirmations et les cartes numériques.',
          personality: 'Évasion · fiable · simple',
          websiteHero: 'Votre prochaine étape est à vous.',
          websiteLead: 'La bonne voiture pour une course rapide, une visite en famille ou un week-end improvisé. Des choix clairs, quand vous le souhaitez.',
          websiteButton: 'Trouver une voiture',
          webCards: [['Choisir le bon modèle', 'Comparer les caractéristiques, les places et le volume de bagages.'], ['Tout savoir avant de réserver', 'Des informations claires sur le retrait et les points essentiels.'], ['Réserver en quelques étapes', 'Un parcours de réservation conçu pour mobile et ordinateur.']],
          campaignTitle: 'Rendre le prochain voyage accessible.',
          campaignCopy: 'Une campagne “où irez-vous ?” associe de nouvelles photos de la flotte à des idées d’itinéraires locaux. La recherche répond aux besoins de location ; les réseaux inspirent le week-end. Chaque parcours mène aux voitures disponibles et à une réservation simple.',
          paletteNames: ['Turquoise côtier', 'Courant profond', 'Sable doré', 'Papier de route'],
          subline: 'SUIVEZ VOTRE ROUTE · PRENEZ LE DÉTOUR'
        }
      }
    }
  };

  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  const logoMark = (kind) => {
    if (kind === 'nova') return '<svg class="brand-logo-mark" viewBox="0 0 64 64" fill="none" aria-hidden="true"><circle cx="32" cy="32" r="25" fill="currentColor" opacity=".14"/><path d="M18 42a14 14 0 0 1 28 0" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M32 10v8m-18 1 6 5m30-5-6 5M10 34h7m30 0h7" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M22 45h20" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>';
    if (kind === 'move') return '<svg class="brand-logo-mark" viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M11 39c8-22 18-27 29-22 8 4 9 13 14 12" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="m43 17 12 12-15 1" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 49h40" stroke="currentColor" stroke-width="5" stroke-linecap="round" opacity=".58"/></svg>';
    return '<svg class="brand-logo-mark" viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M15 49c0-15 7-27 21-34 7-4 13-4 16-4" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="m43 10 10 1-2 10" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="15" cy="49" r="7" fill="currentColor"/><circle cx="52" cy="49" r="5" fill="currentColor" opacity=".6"/></svg>';
  };

  function render() {
    if (!projectRoot || !projects[projectId]) {
      if (projectRoot) projectRoot.innerHTML = '<section class="project-section dark"><div class="project-wrap"><h1>Project not found</h1><a href="/#missions">Return to sample missions</a></div></section>';
      return;
    }

    const project = projects[projectId];
    const language = i18n?.lang || 'en';
    const copy = project.locales[language] || project.locales.en;
    const labels = ui[language] || ui.en;
    const [primary, deep, accent, paper] = project.colors;
    const vars = `--project-color:${primary};--project-deep:${deep};--project-accent:${accent};--project-paper:${paper}`;
    const photo = escape(project.image);
    const logo = `${logoMark(project.logo)}<span>${escape(copy.name)}</span>`;

    document.documentElement.lang = language;
    document.documentElement.style.setProperty('--project-color', primary);
    document.title = `${copy.name} — ${labels.brandKicker.split(' · ')[1]} & Website Concept | Make It So`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', copy.lead);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', primary);

    projectRoot.innerHTML = `
      <section class="project-hero" style="${vars}" aria-labelledby="project-title">
        <div class="project-hero-copy">
          <a class="project-back" href="/#missions">${escape(labels.back)}</a>
          <p class="project-eyebrow">${escape(copy.kind)} · ${escape(labels.fictional.split('·')[0].trim())}</p>
          <h1 id="project-title">${escape(copy.first)}<br><span>${escape(copy.second)}</span></h1>
          <p class="project-hero-lead">${escape(copy.lead)}</p>
          <div class="project-tag-row">${labels.heroTags.map((tag) => `<span class="project-tag">${escape(tag)}</span>`).join('')}</div>
        </div>
        <div class="project-hero-art">
          <div class="project-photo-frame"><img src="${photo}" alt="${escape(copy.imageAlt || project.imageAlt[language] || project.imageAlt.en)}" fetchpriority="high"></div>
          <span class="project-stamp">${escape(copy.subline)}</span>
        </div>
      </section>
      <p class="project-notice">${escape(labels.fictional)}</p>
      <div class="project-strip" aria-label="${escape(labels.heroTags.join(', '))}">
        <article><strong>${escape(copy.name)}</strong><span>${escape(copy.kind)}</span></article>
        <article><strong>${escape(labels.heroTags[0])}</strong><span>${escape(copy.personality)}</span></article>
        <article><strong>${escape(labels.heroTags[2])}</strong><span>${escape(labels.webNotes[2][0])}</span></article>
      </div>

      <section class="project-section light" id="brief" style="${vars}">
        <div class="project-wrap">
          <div class="project-section-head">
            <div><p class="project-section-kicker">${escape(labels.briefKicker)}</p><h2>${escape(labels.briefTitle[0])}<br><span>${escape(labels.briefTitle[1])}</span></h2></div>
            <p>${escape(copy.lead)}</p>
          </div>
          <div class="project-story-grid">
            ${[[labels.challenge, copy.challenge], [labels.opportunity, copy.opportunity], [labels.direction, copy.direction]].map(([title, body], index) => `
              <article class="project-story-card"><span class="story-number">0${index + 1}</span><h3>${escape(title)}</h3><p>${escape(body)}</p></article>`).join('')}
          </div>
        </div>
      </section>

      <section class="project-section dark" id="brand" style="${vars}">
        <div class="project-wrap">
          <div class="project-section-head">
            <div><p class="project-section-kicker">${escape(labels.brandKicker)}</p><h2>${escape(labels.brandTitle[0])}<br><span>${escape(labels.brandTitle[1])}</span></h2></div>
            <p>${escape(labels.brandIntro)}</p>
          </div>
          <div class="project-brandboard">
            <article class="brand-lockup">
              <p class="project-section-kicker">${escape(labels.logoLabel)}</p>
              <div class="brand-logo">${logo}</div>
              <p>${escape(copy.logoNote)}</p>
              <span class="brand-secondary">${escape(copy.subline)}</span>
            </article>
            <article class="brand-system">
              <div class="brand-system-top"><h3>${escape(copy.name)}<br>${escape(labels.paletteLabel)}</h3><p>${escape(copy.personality)}</p></div>
              <div class="palette">${project.colors.map((color, index) => `<div class="swatch" style="background:${color};color:${index === 2 || index === 3 ? deep : '#fff'}"><span>${escape(copy.paletteNames[index])}</span><small>${escape(color.toUpperCase())}</small></div>`).join('')}</div>
              <div class="brand-type">
                <div><strong>${escape(copy.name)}</strong><span>${escape(labels.typeLabel)} · ${escape(labels.headingFont)} · Outfit</span></div>
                <div><strong style="font-family:var(--font-body);font-size:1.05rem;letter-spacing:0">Aa Bb Cc 123</strong><span>${escape(labels.typeLabel)} · ${escape(labels.bodyFont)} · DM Sans</span></div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="project-section light" id="website" style="${vars}">
        <div class="project-wrap">
          <div class="project-section-head">
            <div><p class="project-section-kicker">${escape(labels.websiteKicker)}</p><h2>${escape(labels.websiteTitle[0])}<br><span>${escape(labels.websiteTitle[1])}</span></h2></div>
            <p>${escape(labels.websiteIntro)}</p>
          </div>
          <div class="website-showcase">
            <div class="browser-window">
              <div class="browser-bar"><i class="browser-dot"></i><i class="browser-dot"></i><i class="browser-dot"></i><span class="browser-address">${escape(copy.short.toLowerCase().replaceAll(' ', '') + '.example')} · ${escape(labels.websiteAddress)}</span></div>
              <div class="mock-site">
                <div class="mock-site-copy">
                  <div class="mock-site-brand">${logoMark(project.logo)} <span>${escape(copy.name)}</span></div>
                  <small>${escape(copy.kind)}</small>
                  <h3>${escape(copy.websiteHero)}</h3>
                  <p>${escape(copy.websiteLead)}</p>
                  <span class="mock-site-button">${escape(copy.websiteButton)} →</span>
                </div>
                <div class="mock-site-image">
                  <img src="${photo}" alt="" loading="lazy" decoding="async">
                  <div class="mock-site-card"><strong>${escape(copy.personality.split(' · ')[0])}</strong><span>${escape(copy.subline)}</span></div>
                </div>
              </div>
            </div>
          </div>
          <div class="website-notes">
            ${copy.webCards.map(([title, description]) => `<article class="website-note"><strong>${escape(title)}</strong><span>${escape(description)}</span></article>`).join('')}
          </div>
        </div>
      </section>

      <section class="project-section dark" id="marketing" style="${vars}">
        <div class="project-wrap">
          <div class="project-campaign">
            <div class="project-campaign-copy">
              <p class="project-section-kicker">${escape(labels.campaignKicker)} · ${escape(labels.campaignLabel)}</p>
              <h2>${escape(copy.campaignTitle)}</h2>
              <p>${escape(copy.campaignCopy)}</p>
            </div>
            <ul class="campaign-channels">
              ${labels.campaignChannels.map((channel, index) => `<li class="campaign-channel"><b>0${index + 1}</b>${escape(channel)}</li>`).join('')}
            </ul>
          </div>
        </div>
      </section>

      <section class="project-close" style="${vars}">
        <p class="project-section-kicker">${escape(labels.finalKicker)}</p>
        <h2>${escape(labels.finalTitle[0])}<br><span style="color:${accent}">${escape(labels.finalTitle[1])}</span></h2>
        <p>${escape(labels.finalCopy)}</p>
        <a class="btn btn-orange btn-lg" href="/#contact">${escape(labels.finalButton)} <span class="chip" aria-hidden="true">→</span></a>
      </section>`;

    document.querySelectorAll('.project-nav, .project-mobile-nav, .project-footer .foot-top nav').forEach((nav) => {
      nav.querySelectorAll('a').forEach((link, index) => {
        if (labels.nav[index]) link.textContent = labels.nav[index];
      });
      nav.setAttribute('aria-label', nav.classList.contains('project-nav') ? labels.mainNav :
        nav.classList.contains('project-mobile-nav') ? labels.mobileNav : labels.footerNav);
    });
    document.querySelectorAll('.project-footer .foot-top .btn').forEach((button) => {
      button.childNodes[0].textContent = labels.footerButton + ' ';
    });
    const footerCopyright = document.querySelector('.project-footer .foot-bottom > span:first-child');
    const footerYear = document.querySelector('#project-year');
    if (footerCopyright && footerYear) {
      footerCopyright.innerHTML = `© <span id="project-year">${escape(footerYear.textContent)}</span> Make It So. ${escape(labels.footerCopyright)}`;
    }
    const footerNote = document.querySelector('.project-footer .foot-bottom span:last-child');
    if (footerNote) footerNote.textContent = labels.footerNote;
    const currentMenuButton = document.querySelector('.project-dock .menu-btn');
    currentMenuButton?.setAttribute('aria-label', currentMenuButton.getAttribute('aria-expanded') === 'true' ? labels.menuClose : labels.menuOpen);
  }

  if (projectRoot) {
    const currentYear = document.querySelector('#project-year');
    if (currentYear) currentYear.textContent = String(new Date().getFullYear());
    const menuButton = document.querySelector('.project-dock .menu-btn');
    const mobileNav = document.querySelector('.project-mobile-nav');
    menuButton?.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? (ui[i18n?.lang || 'en'] || ui.en).menuClose : (ui[i18n?.lang || 'en'] || ui.en).menuOpen);
      mobileNav?.classList.toggle('open', open);
    });
    mobileNav?.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        menuButton?.setAttribute('aria-expanded', 'false');
        mobileNav.classList.remove('open');
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', (ui[i18n?.lang || 'en'] || ui.en).menuOpen);
        mobileNav?.classList.remove('open');
        menuButton.focus();
      }
    });
    render();
    i18n?.onChange(render);
  }
})();
