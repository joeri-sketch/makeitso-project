import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const wordmark = path.join(root, 'public', 'brand', 'make-it-so-wordmark.png');
const seller = {
  name: 'MAKE IT SO BV',
  companyNumber: 'BE1030043889',
  address: 'Stichelendries 47A, 9340 Oordegem, België',
  email: 'joeri@bastiaen.be',
  representative: 'Bastiaen Joeri, zaakvoerder'
};
const colors = {
  navy: '#07103a',
  ink: '#17203b',
  muted: '#66708a',
  blue: '#0b3bff',
  orange: '#ff6a1f',
  pale: '#f4f6ff',
  line: '#e2e6fa',
  white: '#ffffff'
};
const euro = (amount) => new Intl.NumberFormat('nl-BE', {
  style: 'currency',
  currency: 'EUR'
}).format(Number(amount));
const date = (value) => value
  ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })
  : 'Niet opgegeven';
const clean = (value, fallback = 'Niet opgegeven in het klantprofiel') => String(value || '').trim() || fallback;

function collectPdf(doc) {
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  return finished;
}

export async function generateContractPdf({ client, contact, project, quote }) {
  if (!fs.existsSync(wordmark)) throw new Error('The Make It So wordmark is missing.');

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 88, right: 54, bottom: 72, left: 54 },
    bufferPages: true,
    compress: false,
    info: {
      Title: `Samenwerking overeenkomst - ${project.name}`,
      Author: seller.name,
      Subject: 'Projectovereenkomst digitale en marketingdiensten'
    }
  });
  const finished = collectPdf(doc);
  const left = 54;
  const right = doc.page.width - 54;
  const width = right - left;
  const moneyLines = quote?.items?.length
    ? quote.items.map((item) => `${item.description} - ${item.quantity} x ${euro(item.unit_price)} excl. btw`)
    : ['Uitvoering op basis van bestede uren aan € 50,00 excl. btw per uur.'];
  const grandTotal = quote
    ? euro((Number(quote.subtotal_cents) + Number(quote.vat_cents)) / 100)
    : null;

  function keepSpace(height = 46) {
    if (doc.y + height > doc.page.height - doc.page.margins.bottom) doc.addPage();
  }

  function paragraph(text, { size = 9.3, color = colors.ink, bold = false, after = 7 } = {}) {
    keepSpace(34);
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(color)
      .text(text, { width, lineGap: 2.5 });
    doc.moveDown(after / 12);
  }

  function section(number, title, text) {
    keepSpace(66);
    const y = doc.y;
    doc.roundedRect(left, y, 26, 22, 6).fill(colors.blue);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(colors.white)
      .text(String(number).padStart(2, '0'), left, y + 7, { width: 26, align: 'center', lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(12).fillColor(colors.navy)
      .text(title, left + 36, y + 3, { width: width - 36, lineBreak: false });
    doc.y = y + 32;
    paragraph(text);
  }

  function field(label, value) {
    keepSpace(29);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(colors.muted)
      .text(label.toLocaleUpperCase('nl-BE'), left, doc.y, { width, lineBreak: false });
    const y = doc.y + 12;
    const text = clean(value);
    const height = Math.max(24, doc.heightOfString(text, { width: width - 18, font: 'Helvetica', fontSize: 9 }) + 12);
    doc.roundedRect(left, y, width, height, 5).fill(colors.pale).stroke(colors.line);
    doc.font('Helvetica').fontSize(9).fillColor(colors.ink)
      .text(text, left + 9, y + 6, { width: width - 18 });
    doc.y = y + height + 9;
  }

  function subheading(text) {
    keepSpace(30);
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(colors.navy)
      .text(text, left, doc.y, { width });
    doc.moveDown(0.4);
  }

  // Cover and live project/client details from the dashboard.
  doc.roundedRect(left, 94, width, 120, 13).fill(colors.navy);
  doc.rect(left, 94, 5, 120).fill(colors.orange);
  doc.image(wordmark, left + 20, 111, { fit: [135, 34] });
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#c5c9ed')
    .text('MAKE IT SO  /  SAMENWERKING OVEREENKOMST', left + 20, 155, { characterSpacing: 1 });
  doc.font('Helvetica-Bold').fontSize(20).fillColor(colors.white)
    .text('Projectovereenkomst', left + 20, 174);
  doc.font('Helvetica').fontSize(9).fillColor('#e2e4f3')
    .text('Digitale producten, websites en marketingdiensten', left + 20, 198);
  doc.y = 232;
  paragraph(`Opgesteld op ${date(new Date().toISOString())} voor project ${project.name}.`, {
    size: 8.5, color: colors.muted, after: 8
  });

  subheading('PARTIJEN');
  field('Dienstverlener', seller.name);
  field('Ondernemingsnummer', seller.companyNumber);
  field('Maatschappelijke zetel', seller.address);
  field('E-mail', seller.email);
  field('Vertegenwoordigd door', seller.representative);
  field('Opdrachtgever', `${clean(client.legal_form, '')} ${client.company_name}`.trim());
  field('Ondernemings- / btw-nummer', client.company_number || client.vat_number);
  field('Maatschappelijke zetel', [client.address_line1, client.address_line2, [client.postal_code, client.city].filter(Boolean).join(' '), client.country === 'BE' ? 'België' : client.country].filter(Boolean).join(', '));
  field('E-mail', client.email);
  if (contact?.name) {
    field('Contactpersoon', `${contact.name}${contact.role ? ` - ${contact.role}` : ''}`);
    if (contact.email) field('E-mail contactpersoon', contact.email);
  }

  subheading('OPDRACHT IN HET KORT');
  field('Project', project.name);
  field('Type opdracht', project.category);
  field('Streefdatum', date(project.target_date));
  field('Offerte', quote ? `${quote.quote_number || 'Offerte'} - ${quote.title}` : 'Geen gekoppelde offerte; uurtarief volgens projectafspraken');
  if (project.description) paragraph(`Projectomschrijving: ${project.description}`);
  if (project.next_step) paragraph(`Eerstvolgende stap: ${project.next_step}`);
  if (quote?.introduction) paragraph(`Offerteomschrijving: ${quote.introduction}`);

  subheading('SCOPE EN VERGOEDING');
  moneyLines.forEach((line) => paragraph(`- ${line}`, { size: 8.8, after: 4 }));
  if (quote) {
    paragraph(`Subtotaal excl. btw: ${euro(Number(quote.subtotal_cents) / 100)}`, { bold: true, size: 9, after: 3 });
    paragraph(`Btw: ${euro(Number(quote.vat_cents) / 100)}   |   Totaal incl. btw: ${grandTotal}`, { bold: true, size: 9, after: 5 });
    if (quote.terms) paragraph(`Aanvullende offertevoorwaarden: ${quote.terms}`, { size: 8.5 });
  } else {
    paragraph('De facturatie gebeurt op basis van de werkelijk gepresteerde uren. De opdrachtgever ontvangt een omschrijving van de geleverde prestaties op de factuur.', {
      size: 8.7, after: 6
    });
  }

  section(1, 'Overeenkomst en projectomvang',
    'Deze overeenkomst omvat de hierboven vermelde opdracht en, indien van toepassing, de geselecteerde offerte. De offerte-items, projectomschrijving en eventuele uitdrukkelijk vermelde projectvoorwaarden leggen de afgesproken scope vast. Eigen inkoopvoorwaarden gelden alleen na schriftelijke aanvaarding door beide Partijen.');
  section(2, 'Meerwerk en wijzigingen',
    'Werk buiten de hierboven vastgelegde scope, waaronder bijkomende pagina’s, functies, integraties, campagnes, revisies of wijzigingen na goedkeuring, wordt aangerekend aan € 50,00 excl. btw per uur. Make It So meldt de verwachte impact waar redelijkerwijs mogelijk vooraf. Meerwerk start na schriftelijk akkoord van de opdrachtgever. Zonder akkoord wordt het bijkomende werk niet uitgevoerd.');
  section(3, 'Samenwerking en planning',
    'De opdrachtgever bezorgt tijdig correcte informatie, materiaal, toegangen, feedback en beslissingen en duidt een contactpersoon aan. De opdrachtgever staat in voor de rechten op aangeleverd materiaal en controleert de juistheid van teksten, prijzen, claims en wettelijke vermeldingen. De streefdatum is afhankelijk van tijdige input en goedkeuring. Vertraging door ontbrekende input of beslissingen verschuift de planning redelijkerwijs.');
  section(4, 'Oplevering en goedkeuring',
    'Make It So meldt wanneer een overeengekomen onderdeel klaarstaat voor beoordeling. De opdrachtgever meldt concrete afwijkingen van de afgesproken scope binnen vijf werkdagen. Aantoonbare afwijkingen worden binnen redelijke termijn hersteld. Gewijzigde wensen zijn meerwerk. Een onderdeel geldt als aanvaard na schriftelijke goedkeuring of ingebruikname, behalve voor verborgen gebreken en voor zover dwingend recht anders bepaalt.');
  section(5, 'Facturatie en betaling',
    'Facturen zijn betaalbaar binnen 14 kalenderdagen na factuurdatum, tenzij op de factuur of in de geselecteerde offerte een andere termijn staat. Bedragen zijn exclusief btw tenzij uitdrukkelijk anders vermeld. Een factuurbetwisting gebeurt gemotiveerd en schriftelijk binnen tien kalenderdagen; het niet-betwiste gedeelte blijft betaalbaar. Op laattijdige B2B-betalingen zijn de toepasselijke wettelijke interesten en invorderingsvergoedingen van toepassing.');
  section(6, 'Opschorting en beëindiging',
    'Bij een vervallen en onbetaalde factuur kan Make It So, na een schriftelijke herinnering en een redelijke termijn om alsnog te betalen, de betrokken werkzaamheden tijdelijk opschorten. De planning wordt verlengd met de opschorting en een redelijke herstarttermijn. Elke Partij kan de overeenkomst beëindigen bij een wezenlijke tekortkoming die niet binnen 15 kalenderdagen na schriftelijke ingebrekestelling is hersteld. Bij beëindiging betaalt de opdrachtgever het tot dan toe uitgevoerde werk, goedgekeurd meerwerk en niet-annuleerbare projectkosten.');
  section(7, 'Intellectuele eigendom',
    'Rechten op specifiek voor deze opdracht gemaakte eindresultaten worden, voor zover wettelijk overdraagbaar, aan de opdrachtgever overgedragen na volledige betaling van de verschuldigde bedragen. Die overdracht geldt wereldwijd en voor de wettelijke beschermingsduur voor reproductie, publicatie, gebruik voor de bedrijfsactiviteiten van de opdrachtgever en aanpassing van de betaalde eindresultaten. De vergoeding voor deze overdracht is inbegrepen in de projectvergoeding. Bestaande tools, methodes, kennis en herbruikbare componenten van Make It So blijven van Make It So; de opdrachtgever krijgt daarop een blijvende, niet-exclusieve licentie voor zover opgenomen in het eindresultaat. Derde-partijmateriaal blijft onder de eigen licentievoorwaarden vallen.');
  section(8, 'Gebruik van AI',
    'Make It So kan AI-toepassingen inzetten om analyse, ontwerp, ontwikkeling, content en werkprocessen te ondersteunen en te optimaliseren. AI ondersteunt het werk; de output wordt waar passend door een mens beoordeeld en verwerkt. Make It So voert geen vertrouwelijke informatie of persoonsgegevens van de opdrachtgever in een externe AI-dienst in zonder voorafgaande toestemming of andere geldige instructie en passende waarborgen. De opdrachtgever blijft verantwoordelijk voor de definitieve goedkeuring van inhoud, claims en publicaties.');
  section(9, 'Privacy en vertrouwelijkheid',
    'Partijen gebruiken vertrouwelijke informatie uitsluitend voor deze opdracht en beschermen die met redelijke zorg. Elke Partij leeft de privacywetgeving na voor de verwerkingen waarvoor zij verantwoordelijk is. Als Make It So persoonsgegevens namens de opdrachtgever verwerkt, leggen Partijen vóór die verwerking de vereiste afspraken over gegevensverwerking vast.');
  section(10, 'Hosting, onderhoud en garanties',
    'Hosting, domeinen, externe licenties, doorlopende ondersteuning en onderhoud zijn niet inbegrepen tenzij ze uitdrukkelijk in de opdracht of offerte staan. Make It So voert het overeengekomen werk professioneel uit en herstelt aantoonbare afwijkingen van de specificaties binnen een redelijke termijn. De beschikbaarheid van externe platformen valt buiten de controle van Make It So.');
  section(11, 'Aansprakelijkheid en overmacht',
    'Voor zover wettelijk toegestaan is een Partij alleen aansprakelijk voor voorzienbare, rechtstreekse schade die het onmiddellijke gevolg is van een toerekenbare tekortkoming. Aansprakelijkheid voor indirecte schade is uitgesloten voor zover de wet dit toestaat. De totale aansprakelijkheid van Make It So is, voor zover wettelijk toegestaan, beperkt tot de vergoeding voor deze opdracht. Deze beperking geldt niet waar dwingend recht beperking verbiedt. Een Partij is niet aansprakelijk voor vertraging door omstandigheden buiten haar redelijke controle en meldt die omstandigheden zo spoedig mogelijk.');
  section(12, 'Toepasselijk recht en akkoord',
    'Op deze overeenkomst is Belgisch recht van toepassing. Partijen proberen geschillen eerst in onderling overleg op te lossen; daarna gelden de wettelijke bevoegdheidsregels. Wijzigingen zijn alleen geldig wanneer beide Partijen ze schriftelijk bevestigen. Door ondertekening bevestigen Partijen akkoord te gaan met deze overeenkomst en de hierboven opgenomen project- en offertegegevens. De ondertekening via het portaal registreert de goedkeuring en wordt niet voorgesteld als een gekwalificeerde elektronische handtekening.');

  keepSpace(150);
  subheading('ONDERTEKENING');
  paragraph('Opgemaakt in twee exemplaren of digitaal goedgekeurd. Beide Partijen ontvangen een exemplaar.', { size: 8.5, color: colors.muted });
  const signatureY = doc.y;
  const column = width / 2 - 12;
  for (const [x, label] of [[left, 'OPDRACHTGEVER'], [left + width / 2 + 12, 'MAKE IT SO BV']]) {
    doc.roundedRect(x, signatureY, column, 95, 8).fill(colors.pale);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(colors.navy).text(label, x + 11, signatureY + 11, { width: column - 22 });
    doc.font('Helvetica').fontSize(8).fillColor(colors.muted).text('Naam en functie', x + 11, signatureY + 31);
    doc.moveTo(x + 11, signatureY + 49).lineTo(x + column - 11, signatureY + 49).stroke(colors.line);
    doc.text('Datum en handtekening', x + 11, signatureY + 60);
    doc.moveTo(x + 11, signatureY + 81).lineTo(x + column - 11, signatureY + 81).stroke(colors.line);
  }
  doc.y = signatureY + 108;

  const pages = doc.bufferedPageRange();
  for (let index = pages.start; index < pages.start + pages.count; index++) {
    doc.switchToPage(index);
    doc.save();
    doc.image(wordmark, left, 27, { fit: [98, 24] });
    doc.font('Helvetica-Bold').fontSize(7).fillColor(colors.muted)
      .text('DIENSTENOVEREENKOMST  /  MAKE IT SO BV', right - 210, 36, { width: 210, align: 'right' });
    doc.moveTo(left, 63).lineTo(right, 63).lineWidth(0.6).stroke(colors.line);
    doc.moveTo(left, doc.page.height - 51).lineTo(right, doc.page.height - 51).lineWidth(0.6).stroke(colors.line);
    doc.font('Helvetica').fontSize(7).fillColor(colors.muted)
      .text(`${client.company_name}  /  ${project.name}`, left, doc.page.height - 40, { width: width - 45, lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(7).fillColor(colors.muted)
      .text(String(index + 1).padStart(2, '0'), right - 28, doc.page.height - 40, { width: 28, align: 'right', lineBreak: false });
    doc.restore();
  }

  doc.end();
  return finished;
}
