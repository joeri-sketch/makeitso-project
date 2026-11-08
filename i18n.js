/* ==========================================================
   MAKE IT SO — translations (English · Nederlands · Français)
   Each row is [English, Dutch, French]. The English text is the key,
   so the HTML stays plain, readable English.
   The brand phrase "Make it so." is deliberately kept as-is in every language.
   ========================================================== */
(() => {
  'use strict';

  const NB = '\u00a0'; // non-breaking space (French punctuation)

  const ROWS = [
    // ----- page meta -----
    ['Make It So — Creative Marketing Agency', 'Make It So — Creatief marketingbureau', 'Make It So — Agence de marketing créatif'],
    ['Make It So is a creative marketing agency. Brand strategy, content, paid media and web experiences that make brands impossible to ignore.',
      'Make It So is een creatief marketingbureau. Merkstrategie, content, online adverteren en webervaringen waar merken niet omheen kunnen.',
      'Make It So est une agence de marketing créatif. Stratégie de marque, contenu, publicité en ligne et expériences web qui rendent les marques impossibles à ignorer.'],
    ['Make it so. Watch it launch. Brand, content, media and web for brands that refuse to blend in.',
      'Make it so. Lanceer jouw succes. Merk, content, media en web voor merken die niet in de massa willen opgaan.',
      'Make it so. Regardez-le décoller. Marque, contenu, médias et web pour les marques qui refusent de se fondre dans la masse.'],

    // ----- accessibility labels -----
    ['Skip to content', 'Naar de inhoud', 'Aller au contenu'],
    ['Loading', 'Laden', 'Chargement'],
    ['Language', 'Taal', 'Langue'],
    ['Make It So, back to top', 'Make It So, terug naar boven', 'Make It So, retour en haut'],
    ['Make It So home', 'Make It So startpagina', 'Make It So accueil'],
    ['Quick navigation', 'Snelnavigatie', 'Navigation rapide'],
    ['Main navigation', 'Hoofdnavigatie', 'Navigation principale'],
    ['Footer navigation', 'Voettekstnavigatie', 'Navigation de pied de page'],
    ['Open menu', 'Menu openen', 'Ouvrir le menu'],
    ['Close menu', 'Menu sluiten', 'Fermer le menu'],
    ['Replay the conversation', 'Gesprek opnieuw afspelen', 'Rejouer la conversation'],
    ['A sample conversation with the Make It So bridge', 'Een voorbeeldgesprek met de Make It So-brug', 'Un exemple de conversation avec la passerelle Make It So'],
    ['The Make It So robot assistant: a sleek robot whose screen face shows expressions, wearing an indigo jacket and holding a cup of tea',
      'De Make It So-robotassistent: een strakke robot met een scherm als gezicht dat emoties toont, in een indigokleurig jasje en met een kopje thee',
      'L\'assistant robot Make It So : un robot élégant dont l\'écran affiche des expressions, en veste indigo et tenant une tasse de thé'],

    // ----- navigation -----
    ['Departments', 'Afdelingen', 'Départements'],
    ['Missions', 'Missies', 'Missions'],
    ['Mission log', 'Missielogboek', 'Journal de mission'],
    ['Process', 'Aanpak', 'Méthode'],
    ['Hail us', 'Contact', 'Contact'],
    ['Client login', 'Klantlogin', 'Connexion client'],
    ['Engage', 'Vooruit', 'Engagez'],
    ['Build a PC', 'Bouw een pc', 'Configurer un PC'],

    // ----- PC configurator -----
    ['PC configurator · Make It So', 'PC-configurator · Make It So', 'Configurateur PC · Make It So'],
    ['One choice at a time. We’ll explain each part and keep your custom gaming PC on track.', 'Eén keuze tegelijk. We leggen elk onderdeel uit en helpen je een gaming-pc op maat samen te stellen.', 'Un choix à la fois. Nous expliquons chaque composant et vous aidons à configurer votre PC gaming.'],
    ['Captain\'s log · Your build bay', 'Kapiteinslogboek · Jouw buildruimte', 'Journal du capitaine · Votre atelier'],
    ['Build components', 'Onderdelen kiezen', 'Choisir les composants'],
    ['Build your PC.', 'Bouw je pc.', 'Configurez votre PC.'],
    ['Choose components', 'Onderdelen kiezen', 'Choisir les composants'],
    ['Review your build', 'Controleer je build', 'Vérifiez votre configuration'],
    ['Request a quote', 'Een offerte aanvragen', 'Demander un devis'],
    ['Step {current} of {total}', 'Stap {current} van {total}', 'Étape {current} sur {total}'],
    ['Part {number}', 'Onderdeel {number}', 'Composant {number}'],
    ['Final check', 'Laatste controle', 'Dernière vérification'],
    ['Choose one option', 'Kies één optie', 'Choisissez une option'],
    ['Optional add-on', 'Optionele toevoeging', 'Option facultative'],
    ['Next component', 'Volgend onderdeel', 'Composant suivant'],
    ['Previous', 'Vorige', 'Précédent'],
    ['Which processor should power your PC?', 'Welke processor moet je pc aandrijven?', 'Quel processeur fera tourner votre PC ?'],
    ['The processor runs game logic and background tasks. More cores help when you game, stream and multitask at once.', 'De processor verwerkt game-logica en taken op de achtergrond. Meer cores helpen als je gamet, streamt en tegelijk andere apps gebruikt.', 'Le processeur gère la logique des jeux et les tâches en arrière-plan. Plus de cœurs aident si vous jouez, diffusez et faites plusieurs choses à la fois.'],
    ['How much graphics power do you need?', 'Hoeveel grafische kracht heb je nodig?', 'De quelle puissance graphique avez-vous besoin ?'],
    ['The graphics card draws your games. A stronger one can deliver sharper detail and smoother frame rates at higher resolutions.', 'De videokaart toont je games. Een krachtiger model geeft meer detail en soepelere beelden op hogere resoluties.', 'La carte graphique affiche vos jeux. Un modèle plus puissant offre plus de détails et une animation plus fluide en haute résolution.'],
    ['Which motherboard should connect your parts?', 'Welk moederbord verbindt je onderdelen?', 'Quelle carte mère reliera vos composants ?'],
    ['The motherboard links the processor, memory and storage. These boards support your chosen CPU and DDR5 memory.', 'Het moederbord verbindt de processor, het geheugen en de opslag. Deze borden ondersteunen je gekozen CPU en DDR5-geheugen.', 'La carte mère relie le processeur, la mémoire et le stockage. Ces modèles prennent en charge le CPU choisi et la mémoire DDR5.'],
    ['How much memory should your PC have?', 'Hoeveel geheugen moet je pc hebben?', 'Quelle quantité de mémoire pour votre PC ?'],
    ['Memory keeps active games and apps ready. 32 GB suits most gaming; 64 GB gives extra room for heavy multitasking and creation.', 'Geheugen houdt actieve games en apps klaar. 32 GB volstaat voor de meeste games; 64 GB biedt extra ruimte voor multitasking en creatief werk.', 'La mémoire garde les jeux et applis actifs à disposition. 32 Go conviennent à la plupart des jeux ; 64 Go offrent plus de marge pour le multitâche et la création.'],
    ['How much room do you need for games?', 'Hoeveel ruimte heb je nodig voor games?', 'De combien d’espace avez-vous besoin pour vos jeux ?'],
    ['Storage holds your games, apps and files. NVMe SSDs load quickly; choose more capacity for a larger game library.', 'Opslag bewaart je games, apps en bestanden. NVMe-ssd’s laden snel; kies meer capaciteit voor een grotere gamebibliotheek.', 'Le stockage conserve vos jeux, applis et fichiers. Les SSD NVMe chargent rapidement ; choisissez une plus grande capacité pour une vaste bibliothèque.'],
    ['What colour should your case be?', 'Welke kleur moet je behuizing hebben?', 'Quelle couleur pour votre boîtier ?'],
    ['The case protects your components and helps airflow. These colour choices use the same case and cooling layout.', 'De behuizing beschermt je onderdelen en voert warmte af. Elke kleur heeft dezelfde behuizing en koeling.', 'Le boîtier protège vos composants et favorise la circulation de l’air. Toutes les couleurs ont le même boîtier et le même refroidissement.'],
    ['Which operating system would you like?', 'Welk besturingssysteem wil je?', 'Quel système d’exploitation souhaitez-vous ?'],
    ['Windows supports the widest range of PC games and apps. Ubuntu is a free, open-source Linux option; check game compatibility before choosing it.', 'Windows ondersteunt de meeste pc-games en apps. Ubuntu is een gratis, open-source Linux-optie; controleer vooraf of je games ermee werken.', 'Windows prend en charge le plus grand choix de jeux et d’applis PC. Ubuntu est une option Linux gratuite et open source ; vérifiez la compatibilité de vos jeux avant de le choisir.'],
    ['Do you need Microsoft 365?', 'Heb je Microsoft 365 nodig?', 'Avez-vous besoin de Microsoft 365 ?'],
    ['Add Microsoft 365 Personal for Word, Excel, PowerPoint and 1 TB of cloud storage. It is an optional annual subscription.', 'Voeg Microsoft 365 Personal toe voor Word, Excel, PowerPoint en 1 TB cloudopslag. Dit is een optioneel jaarabonnement.', 'Ajoutez Microsoft 365 Personnel pour Word, Excel, PowerPoint et 1 To de stockage cloud. Il s’agit d’un abonnement annuel facultatif.'],
    ['Would you like to add a monitor?', 'Wil je een monitor toevoegen?', 'Souhaitez-vous ajouter un écran ?'],
    ['A higher resolution looks sharper; a higher refresh rate makes motion feel smoother. Choose a display that suits your games and graphics card.', 'Een hogere resolutie oogt scherper; een hogere verversingssnelheid maakt beweging vloeiender. Kies een monitor die past bij je games en videokaart.', 'Une résolution plus élevée offre une image plus nette ; une fréquence de rafraîchissement élevée rend les mouvements plus fluides. Choisissez un écran adapté à vos jeux et à votre carte graphique.'],
    ['Processor', 'Processor', 'Processeur'],
    ['Graphics card', 'Videokaart', 'Carte graphique'],
    ['Motherboard', 'Moederbord', 'Carte mère'],
    ['Memory', 'Geheugen', 'Mémoire'],
    ['Storage', 'Opslag', 'Stockage'],
    ['Case colour', 'Kleur van de behuizing', 'Couleur du boîtier'],
    ['Operating system', 'Besturingssysteem', 'Système d’exploitation'],
    ['Microsoft 365', 'Microsoft 365', 'Microsoft 365'],
    ['Microsoft 365 Personal', 'Microsoft 365 Personal', 'Microsoft 365 Personnel'],
    ['Monitor (optional)', 'Monitor (optioneel)', 'Écran (facultatif)'],
      ['Black', 'Zwart', 'Noir'],
      ['White', 'Wit', 'Blanc'],
      ['Blue', 'Blauw', 'Bleu'],
      ['Purple', 'Paars', 'Violet'],
      ['No monitor', 'Geen monitor', 'Pas d’écran'],
    ['6 cores · AM5', '6 cores · AM5', '6 cœurs · AM5'],
    ['8 cores · AM5 · Gaming pick', '8 cores · AM5 · Gamingfavoriet', '8 cœurs · AM5 · Idéal pour jouer'],
    ['12 cores · AM5', '12 cores · AM5', '12 cœurs · AM5'],
    ['8 GB · 1080p gaming', '8 GB · gamen in 1080p', '8 Go · jeux en 1080p'],
    ['12 GB · 1440p gaming', '12 GB · gamen in 1440p', '12 Go · jeux en 1440p'],
    ['16 GB · High-performance gaming', '16 GB · gaming met hoge prestaties', '16 Go · jeux haute performance'],
    ['AM5 · Wi-Fi 7 · DDR5', 'AM5 · wifi 7 · DDR5', 'AM5 · Wi-Fi 7 · DDR5'],
    ['2 × 16 GB · Dual channel', '2 × 16 GB · dual channel', '2 × 16 Go · double canal'],
    ['2 × 32 GB · Dual channel', '2 × 32 GB · dual channel', '2 × 32 Go · double canal'],
    ['PCIe 4.0 · Up to 7,000 MB/s', 'PCIe 4.0 · Tot 7.000 MB/s', 'PCIe 4.0 · Jusqu’à 7 000 Mo/s'],
    ['Mid-tower · Tempered glass', 'Mid-tower · Gehard glas', 'Moyen tour · Verre trempé'],
    ['Licensed and ready to use', 'Met licentie, direct klaar voor gebruik', 'Sous licence, prêt à l’emploi'],
    ['Open-source · No licence cost', 'Open source · Geen licentiekosten', 'Open source · Sans frais de licence'],
    ['I already have a display', 'Ik heb al een monitor', 'J’ai déjà un écran'],
    ['1440p · IPS · Adaptive sync', '1440p · IPS · Adaptieve synchronisatie', '1440p · IPS · Synchronisation adaptative'],
    ['2160p · IPS · Adaptive sync', '2160p · IPS · Adaptieve synchronisatie', '2160p · IPS · Synchronisation adaptative'],
    ['Word, Excel, PowerPoint and 1 TB cloud storage', 'Word, Excel, PowerPoint en 1 TB cloudopslag', 'Word, Excel, PowerPoint et 1 To de stockage cloud'],
    ['Choose a display', 'Kies een monitor', 'Choisissez un écran'],
    ['Your build', 'Jouw build', 'Votre configuration'],
    ['Saved on this device', 'Opgeslagen op dit apparaat', 'Enregistré sur cet appareil'],
    ['Live build preview', 'Live buildvoorbeeld', 'Aperçu de la configuration'],
    ['Build bay online', 'Buildruimte online', 'Atelier en ligne'],
    ['All selected parts are compatible', 'Alle gekozen onderdelen zijn compatibel', 'Tous les composants sélectionnés sont compatibles'],
    ['Some selected parts need review', 'Controleer de compatibiliteit van enkele onderdelen', 'Certains composants doivent être vérifiés'],
    ['Included', 'Inbegrepen', 'Inclus'],
    ['Estimated total', 'Geschat totaal', 'Total estimé'],
    ['Per year', 'Per jaar', 'Par an'],
    ['Sample prices incl. VAT · EUR', 'Voorbeeldprijzen incl. btw · EUR', 'Prix indicatifs TTC · EUR'],
    ['Prices shown are estimates for this mock catalog and may change.', 'De getoonde bedragen zijn schattingen voor deze voorbeeldcatalogus en kunnen wijzigen.', 'Les prix affichés sont des estimations pour ce catalogue indicatif et peuvent changer.'],
    ['Send build request', 'Vraag deze pc aan', 'Demander cette configuration'],
    ['Reset build', 'Configuratie wissen', 'Réinitialiser la configuration'],
    ['Your choices and estimated price update as you go.', 'Je keuzes en geschatte prijs worden tijdens het samenstellen bijgewerkt.', 'Vos choix et le prix estimé se mettent à jour au fur et à mesure.'],
    ['Custom gaming PC build request', 'Offerteaanvraag voor een gaming-pc op maat', 'Demande de devis pour un PC gaming sur mesure'],
    ['Hello, I would like a quote for this custom PC build:', 'Hallo, ik ontvang graag een offerte voor deze pc-configuratie:', 'Bonjour, je souhaiterais recevoir un devis pour cette configuration PC :'],
    ['Annual subscription', 'Jaarabonnement', 'Abonnement annuel'],
    ['Please confirm availability and final pricing.', 'Bevestig de beschikbaarheid en definitieve prijs.', 'Merci de confirmer la disponibilité et le prix final.'],
    ['Here’s everything you selected. Your request opens in your email app so our team can confirm availability and final pricing.', 'Dit zijn al je keuzes. Je aanvraag opent in je e-mailapp, zodat ons team de beschikbaarheid en definitieve prijs kan bevestigen.', 'Voici vos choix. Votre demande s’ouvrira dans votre messagerie afin que notre équipe confirme la disponibilité et le prix final.'],

    // ----- hero -----
    ['Captain\'s log ·', 'Kapiteinslogboek ·', 'Journal du capitaine ·'],
    ['Stardate', 'Sterrendatum', 'Date stellaire'],
    ['Watch it launch', 'Lanceer jouw succes', 'Regardez-le décoller'],
    ['Make It So is a creative marketing agency for brands that refuse to blend in. Strategy, content and campaigns — plotted fast, launched boldly, measured honestly.',
      'Make It So is een creatief marketingbureau voor merken die niet in de massa willen opgaan. Strategie, content en campagnes — snel uitgestippeld, gedurfd gelanceerd, eerlijk gemeten.',
      'Make It So est une agence de marketing créatif pour les marques qui refusent de se fondre dans la masse. Stratégie, contenu et campagnes — tracés vite, lancés avec audace, mesurés en toute honnêteté.'],
    ['See the mission log', 'Bekijk het missielogboek', 'Voir le journal de mission'],
    ['days from brief', 'dagen van briefing', 'jours du brief'],
    ['to live campaign', 'tot live campagne', 'à la campagne en ligne'],
    ['reply time on', 'reactietijd op', 'délai de réponse à'],
    ['every message', 'elk bericht', 'chaque message'],
    ['boring decks.', 'saaie presentaties.', 'présentations ennuyeuses.'],
    ['Ever.', 'Nooit.', 'Jamais.'],

    // ----- chat card -----
    ['Bridge online', 'Brug online', 'Passerelle en ligne'],
    ['Hailing frequencies open', 'Kanalen geopend', 'Canaux ouverts'],
    ['Engaged ✦', 'Koers gezet ✦', 'En route ✦'],
    ['We launch in three weeks and nobody knows us yet.', 'We lanceren over drie weken en niemand kent ons nog.', 'Nous lançons dans trois semaines et personne ne nous connaît encore.'],
    ['Course plotted: brand, launch film and paid social, live in 14 days.',
      'Koers uitgezet: merk, lanceerfilm en betaalde social, live binnen 14 dagen.',
      `Cap fixé${NB}: marque, film de lancement et social payant, en ligne sous 14 jours.`],
    ['Wait, that\'s it? That was fast.', 'Wacht, is dat alles? Dat ging snel.', `Attendez, c'est tout${NB}? C'était rapide.`],
    ['Say the magic words…', 'Zeg de toverwoorden…', 'Dites les mots magiques…'],

    // ----- ticker + tags shared with cards -----
    ['Brand strategy', 'Merkstrategie', 'Stratégie de marque'],
    ['Social campaigns', 'Social campagnes', 'Campagnes sociales'],
    ['Launch films', 'Lanceerfilms', 'Films de lancement'],
    ['Paid media', 'Online adverteren', 'Publicité en ligne'],
    ['Web design', 'Webdesign', 'Design web'],
    ['Copywriting', 'Copywriting', 'Rédaction'],
    ['Influencers', 'Influencers', 'Influenceurs'],
    ['Analytics', 'Analytics', 'Analyses'],

    // ----- departments -----
    ['01 · Departments', '01 · Afdelingen', '01 · Départements'],
    ['Every department.', 'Elke afdeling.', 'Chaque département.'],
    ['One crew.', 'Eén team.', 'Un seul équipage.'],
    ['From the first spark of an idea to the campaign that everyone is talking about — one small, senior team, zero hand-offs.',
      'Van de eerste vonk van een idee tot de campagne waar iedereen over praat — één klein, ervaren team, nul overdrachten.',
      'De la première étincelle d\'une idée à la campagne dont tout le monde parle — une petite équipe senior, zéro relais.'],

    ['Brand & strategy', 'Merk & strategie', 'Marque & stratégie'],
    ['Positioning, naming, identity and a voice that sounds like nobody else.',
      'Positionering, naamgeving, identiteit en een stem die op niemand anders lijkt.',
      'Positionnement, naming, identité et une voix qui ne ressemble à aucune autre.'],
    ['Positioning', 'Positionering', 'Positionnement'],
    ['Identity', 'Identiteit', 'Identité'],
    ['Tone of voice', 'Tone of voice', 'Ton de marque'],

    ['Social & content', 'Social & content', 'Réseaux & contenu'],
    ['Scroll-stopping content and communities that keep the conversation going.',
      'Content die de scroll stopt en communities die het gesprek gaande houden.',
      'Du contenu qui arrête le scroll et des communautés qui font vivre la conversation.'],
    ['Content', 'Content', 'Contenu'],
    ['Creators', 'Creators', 'Créateurs'],

    ['Ads tuned weekly and reported honestly.',
      'Advertenties die we wekelijks optimaliseren en eerlijk rapporteren.',
      'Des annonces optimisées chaque semaine et un reporting honnête.'],
    ['Paid social', 'Betaalde social', 'Social payant'],
    ['Search', 'Zoekmachines', 'Recherche'],

    ['Web & landing pages', 'Web & landingspagina\'s', 'Web & pages d\'atterrissage'],
    ['Fast, beautiful pages built to turn attention into action.',
      'Snelle, mooie pagina\'s die aandacht omzetten in actie.',
      'Des pages rapides et belles, conçues pour transformer l\'attention en action.'],
    ['Websites', 'Websites', 'Sites web'],

    ['Video & motion', 'Video & motion', 'Vidéo & motion'],
    ['Launch films, reels and motion graphics with cinematic swagger.',
      'Lanceerfilms, reels en motion graphics met een filmische swagger.',
      'Films de lancement, reels et motion design avec un vrai panache cinématographique.'],

    ['Growth & analytics', 'Groei & analyse', 'Croissance & analyse'],
    ['Dashboards, experiments and insight, so every decision has data behind it.',
      'Dashboards, experimenten en inzichten, zodat elke beslissing op data rust.',
      'Tableaux de bord, expériences et analyses, pour que chaque décision s\'appuie sur des données.'],
    ['Dashboards', 'Dashboards', 'Tableaux de bord'],
    ['A/B tests', 'A/B-tests', 'Tests A/B'],

    // ----- mission log -----
    ['02 · Mission log', '02 · Missielogboek', '02 · Journal de mission'],
    ['Sample missions,', 'Voorbeeldmissies,', 'Exemples de missions,'],
    ['boldly designed.', 'gedurfd ontworpen.', 'conçues avec audace.'],
    ['Fictional sample projects showing how we could build brands, websites and campaigns for real businesses.',
      'Fictieve voorbeeldprojecten die laten zien hoe we merken, websites en campagnes voor echte bedrijven kunnen bouwen.',
      'Des projets fictifs qui montrent comment nous pouvons créer des marques, des sites web et des campagnes pour de vraies entreprises.'],
    ['Sample mission · Launch campaign', 'Voorbeeldmissie · Lanceringscampagne', 'Exemple de mission · Campagne de lancement'],
    ['Sample mission · Brand & content', 'Voorbeeldmissie · Merk & content', 'Exemple de mission · Marque & contenu'],
    ['Sample mission · Brand & web', 'Voorbeeldmissie · Merk & web', 'Exemple de mission · Marque & web'],
    ['A neighborhood bakery builds a recognizable brand around fresh bread, local ingredients and the daily ritual of stopping by.',
      'Een buurtbakker bouwt aan een herkenbaar merk rond vers brood, lokale ingrediënten en het dagelijkse bezoek aan de winkel.',
      'Une boulangerie de quartier crée une marque reconnaissable autour du pain frais, des produits locaux et du rituel quotidien de la visite.'],
    ['A local rental company makes choosing a car and planning a weekend away feel as effortless as the drive itself.',
      'Een lokaal verhuurbedrijf maakt een auto kiezen en een weekendje weg plannen net zo makkelijk als de rit zelf.',
      'Une société de location locale rend le choix d’une voiture et l’organisation d’un week-end aussi simples que le trajet lui-même.'],
    ['A neighborhood training studio turns expert coaching and an encouraging atmosphere into a fitness brand people want to belong to.',
      'Een buurtstudio maakt van deskundige begeleiding en een motiverende sfeer een fitnessmerk waar mensen bij willen horen.',
      'Un studio de quartier transforme un coaching expert et une ambiance encourageante en une marque fitness à laquelle on a envie d’appartenir.'],
    ['Project highlights', 'Project in beeld', 'Points forts du projet'],
    ['Brand identity', 'Merkidentiteit', 'Identité de marque'],
    ['Packaging', 'Verpakking', 'Emballage'],
    ['Local launch', 'Lokale lancering', 'Lancement local'],
    ['Visual identity', 'Visuele identiteit', 'Identité visuelle'],
    ['Photo direction', 'Fotografieconcept', 'Direction photo'],
    ['Booking website', 'Boekingswebsite', 'Site de réservation'],
    ['Fleet photography', 'Vlootfotografie', 'Photos de la flotte'],
    ['01 / BRAND LAUNCH', '01 / MERKLANCERING', '01 / LANCEMENT DE MARQUE'],
    ['02 / BRAND & COMMUNITY', '02 / MERK & COMMUNITY', '02 / MARQUE & COMMUNAUTÉ'],
    ['03 / DIGITAL EXPERIENCE', '03 / DIGITALE ERVARING', '03 / EXPÉRIENCE NUMÉRIQUE'],
    ['BAKED FRESH. SHARED DAILY.', 'VERS GEBAKKEN. ELKE DAG GEDEELD.', 'Cuit frais. À partager chaque jour.'],
    ['STRONGER IN GOOD COMPANY', 'SAMEN STA JE STERKER', 'PLUS FORTS ENSEMBLE'],
    ['YOUR NEXT STOP IS YOURS TO CHOOSE', 'KIES ZELF JE VOLGENDE BESTEMMING', 'CHOISISSEZ VOTRE PROCHAINE ÉTAPE'],
    ['FIND YOUR PACE', 'VIND JE EIGEN TEMPO', 'TROUVEZ VOTRE RYTHME'],
    ['MOVE STUDIO · TRAIN TOGETHER', 'MOVE STUDIO · TRAIN SAMEN', 'MOVE STUDIO · ENTRAÎNONS-NOUS'],
    ['ROAM CAR RENTAL · GO YOUR WAY', 'ROAM AUTOVERHUUR · GA JE EIGEN WEG', 'ROAM LOCATION AUTO · SUIVEZ VOTRE ROUTE'],
    ['NOVA BAKERY · OORDEGEM', 'NOVA BAKKERIJ · OORDEGEM', 'NOVA BOULANGERIE · OORDEGEM'],
    ['Fresh from', 'Vers uit', 'Tout juste sorti'],
    ['the oven.', 'de oven.', 'du four.'],
    ['Take the', 'Kies de', 'Prenez la'],
    ['scenic route.', 'mooie route.', 'route panoramique.'],
    ['Nova Bakery', 'Nova Bakkerij', 'Boulangerie Nova'],
    ['Brand refresh', 'Merkvernieuwing', 'Refonte de marque'],
    ['Freshly baked artisan loaves arranged in a neighborhood bakery', 'Ambachtelijke broden vers uit de oven in een buurtbakkerij', 'Pains artisanaux fraîchement cuits dans une boulangerie de quartier'],
    ['Modern boutique fitness studio with strength training equipment', 'Moderne boutique-fitnessstudio met krachttrainingsmateriaal', 'Studio de fitness boutique moderne avec appareils de musculation'],
    ['Modern sports car photographed on a scenic road', 'Moderne sportwagen op een schilderachtige weg', 'Voiture de sport moderne photographiée sur une route pittoresque'],
    ['Roam Car Rental', 'Roam Autoverhuur', 'Roam Location Auto'],
    ['Move Studio', 'Move Studio', 'Move Studio'],
    ['A neighborhood bakery gets a distinctive identity and a fresh, welcoming storefront for its daily regulars.',
      'Een buurtbakker krijgt een herkenbare identiteit en een frisse, uitnodigende winkel voor vaste klanten.',
      'Une boulangerie de quartier se dote d’une identité reconnaissable et d’une boutique accueillante pour ses habitués.'],
    ['A local rental company makes choosing a car and planning a weekend away feel as effortless as the drive itself.',
      'Een lokaal verhuurbedrijf maakt een auto kiezen en een weekendje weg plannen net zo makkelijk als de rit zelf.',
      'Une société de location locale rend le choix d’une voiture et l’organisation d’un week-end aussi simples que le trajet lui-même.'],
    ['A neighborhood training studio turns expert coaching and an encouraging atmosphere into a fitness brand people want to belong to.',
      'Een buurtstudio maakt van deskundige begeleiding en een motiverende sfeer een fitnessmerk waar mensen bij willen horen.',
      'Un studio de quartier transforme un coaching expert et une ambiance encourageante en une marque fitness à laquelle on a envie d’appartenir.'],

    // ----- process -----
    ['03 · Warp factor', '03 · Warpsnelheid', '03 · Vitesse de distorsion'],
    ['From idea to warp speed', 'Van idee naar warpsnelheid', 'De l\'idée à la vitesse de distorsion'],
    ['in four moves.', 'in vier stappen.', 'en quatre étapes.'],
    ['Scan', 'Scannen', 'Scanner'],
    ['We dig into your brand, audience and rivals to find the gap nobody is flying into.',
      'We duiken in je merk, doelgroep en concurrenten om de ruimte te vinden waar niemand naartoe vliegt.',
      'Nous explorons votre marque, votre public et vos concurrents pour trouver le vide où personne ne s\'aventure.'],
    ['Plot the course', 'Koers uitzetten', 'Tracer la route'],
    [`One sharp strategy: message, channels, budget and a timeline you can hold us to.`,
      'Één scherpe strategie: boodschap, kanalen, budget en een planning waar je ons aan kunt houden.',
      `Une stratégie précise${NB}: message, canaux, budget et un calendrier auquel vous pouvez nous tenir.`],
    ['Content, campaigns and web experiences built fast, tested hard and launched on schedule.',
      'Content, campagnes en webervaringen: snel gebouwd, grondig getest en op tijd gelanceerd.',
      `Contenu, campagnes et expériences web${NB}: conçus vite, testés à fond et lancés dans les délais.`],
    ['Log & learn', 'Loggen & leren', 'Noter & apprendre'],
    ['Clear reporting, honest insight and the next move already on the whiteboard.',
      'Heldere rapportage, eerlijke inzichten en de volgende zet staat al op het whiteboard.',
      'Un reporting clair, des analyses honnêtes et le prochain coup déjà au tableau.'],

    // ----- contact -----
    ['04 · Hailing frequencies open', '04 · Kanalen geopend', '04 · Canaux ouverts'],
    ['Ready to', 'Klaar voor', 'Prêt à'],
    ['engage', 'de start', 'décoller'],
    ['?', '?', `${NB}?`],
    ['Tell us what you\'re building. We reply within a day with a few first ideas — no deck, no obligation.',
      'Vertel ons wat je aan het bouwen bent. Binnen een dag reageren we met een paar eerste ideeën — geen presentatie, geen verplichtingen.',
      'Dites-nous ce que vous construisez. Nous répondons sous un jour avec quelques premières idées — sans présentation, sans engagement.'],
    ['Your name', 'Je naam', 'Votre nom'],
    ['Email', 'E-mail', 'E-mail'],
    ['you@company.com', 'jij@bedrijf.nl', 'vous@entreprise.fr'],
    ['What\'s the mission?', 'Wat is de missie?', `Quelle est la mission${NB}?`],
    ['A launch, a rebrand, a campaign that needs to be unmissable…',
      'Een lancering, een rebranding, een campagne die onmisbaar moet zijn…',
      'Un lancement, un rebranding, une campagne qui doit être incontournable…'],
    ['Send transmission', 'Verstuur transmissie', 'Envoyer la transmission'],
    ['Opening your mail app… if nothing happens, email hello@makeitso.studio directly.',
      'Je e-mailapp wordt geopend… gebeurt er niets, mail dan rechtstreeks naar hello@makeitso.studio.',
      'Ouverture de votre application de messagerie… si rien ne se passe, écrivez directement à hello@makeitso.studio.'],
    ['New mission from {name}', 'Nieuwe missie van {name}', 'Nouvelle mission de {name}'],

    // ----- footer -----
    ['Make It So. Creative marketing agency.', 'Make It So. Creatief marketingbureau.', 'Make It So. Agence de marketing créatif.'],
    ['Admin login', 'Admin login', 'Connexion admin'],
    ['Powered by Earl Grey. Hot. Live long and prosper.', 'Aangedreven door Earl Grey. Heet. Leef lang en voorspoedig.', 'Propulsé par du thé Earl Grey. Chaud. Longue vie et prospérité.']
  ];

  const LANGS = ['en', 'nl', 'fr'];
  const norm = (s) => s.replace(/\s+/g, ' ').trim();

  const dict = new Map();
  for (const [en, nl, fr] of ROWS) dict.set(norm(en), { en, nl, fr });

  // unit suffix for the animated "24h" counter
  const SUFFIX = { h: { en: 'h', nl: 'u', fr: ' h' } };

  const ATTRS = ['aria-label', 'placeholder', 'data-placeholder', 'alt'];
  const META = ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]'];

  const textOriginals = new WeakMap();
  const attrOriginals = new WeakMap();
  const listeners = [];
  let lang = 'en';
  let titleOriginal = null;

  const lookup = (key, to) => {
    const entry = dict.get(norm(key));
    return entry ? entry[to] : null;
  };

  function t(key, vars) {
    let out = lookup(key, lang) || key;
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, v);
    return out;
  }

  function applyText() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/.test(p.tagName)) return NodeFilter.FILTER_REJECT;
        return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const original = textOriginals.get(node) ?? node.nodeValue;
      if (!dict.has(norm(original))) continue;
      textOriginals.set(node, original);
      const lead = original.match(/^\s*/)[0];
      const trail = original.match(/\s*$/)[0];
      node.nodeValue = lead + (lookup(original, lang) || norm(original)) + trail;
    }
  }

  function applyAttributes() {
    for (const attr of ATTRS) {
      for (const el of document.querySelectorAll(`[${attr}]`)) {
        const saved = attrOriginals.get(el) || {};
        const original = saved[attr] ?? el.getAttribute(attr);
        if (!dict.has(norm(original))) continue;
        saved[attr] = original;
        attrOriginals.set(el, saved);
        el.setAttribute(attr, lookup(original, lang) || original);
      }
    }
    for (const sel of META) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const saved = attrOriginals.get(el) || {};
      const original = saved.content ?? el.getAttribute('content');
      saved.content = original;
      attrOriginals.set(el, saved);
      el.setAttribute('content', lookup(original, lang) || original);
    }
    if (titleOriginal === null) titleOriginal = document.title;
    document.title = lookup(titleOriginal, lang) || titleOriginal;
  }

  function applySuffixes() {
    for (const el of document.querySelectorAll('[data-suffix]')) {
      if (!el.dataset.suffixKey) el.dataset.suffixKey = el.dataset.suffix;
      const map = SUFFIX[el.dataset.suffixKey];
      if (!map) continue;
      el.dataset.suffix = map[lang];
      const digits = el.textContent.match(/^\d+/);
      if (digits) el.textContent = digits[0] + map[lang];
    }
  }

  function set(next, { persist = true } = {}) {
    if (!LANGS.includes(next)) next = 'en';
    lang = next;
    document.documentElement.lang = lang;
    applyText();
    applyAttributes();
    applySuffixes();
    document.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
    });
    if (persist) { try { localStorage.setItem('mis-lang', lang); } catch (e) { /* storage unavailable */ } }
    listeners.forEach((fn) => fn(lang));
  }

  function detect() {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(fromUrl)) return fromUrl;
    try { const saved = localStorage.getItem('mis-lang'); if (LANGS.includes(saved)) return saved; } catch (e) { /* ignore */ }
    const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return LANGS.includes(browser) ? browser : 'en';
  }

  window.i18n = {
    t,
    set,
    get lang() { return lang; },
    onChange(fn) { listeners.push(fn); }
  };

  document.querySelectorAll('[data-lang]').forEach((btn) => btn.addEventListener('click', () => set(btn.dataset.lang)));

  const initial = detect();
  if (initial !== 'en') set(initial, { persist: false });
})();
