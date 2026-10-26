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
  pale: '#f4f6fc',
  line: '#e2e6f0',
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
  const bottom = doc.page.height - doc.page.margins.bottom;
  const clientAddress = [
    client.address_line1,
    client.address_line2,
    [client.postal_code, client.city].filter(Boolean).join(' '),
    client.country === 'BE' ? 'België' : client.country
  ].filter(Boolean).join(', ');
  const quoteTotal = quote
    ? euro((Number(quote.subtotal_cents) + Number(quote.vat_cents)) / 100)
    : null;

  function keepSpace(height) {
    if (doc.y + height > bottom) doc.addPage();
  }

  function paragraph(text, { size = 9.5, color = colors.ink, bold = false, after = 7, x = left } = {}) {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(color)
      .text(text, x, doc.y, { width: right - x, lineGap: 3 });
    doc.moveDown(after / 12);
  }

  function section(number, title, text) {
    keepSpace(78);
    const y = doc.y;
    doc.roundedRect(left, y, 26, 24, 7).fill(colors.blue);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(colors.white)
      .text(String(number).padStart(2, '0'), left, y + 8, { width: 26, align: 'center', lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(12.5).fillColor(colors.navy)
      .text(title, left + 36, y + 4, { width: width - 36, lineBreak: false });
    doc.y = y + 34;
    paragraph(text, { x: left + 36 });
  }

  function sectionHeading(number, title) {
    keepSpace(42);
    const y = doc.y;
    doc.roundedRect(left, y, 26, 24, 7).fill(colors.blue);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(colors.white)
      .text(String(number).padStart(2, '0'), left, y + 8, { width: 26, align: 'center', lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(12.5).fillColor(colors.navy)
      .text(title, left + 36, y + 4, { width: width - 36, lineBreak: false });
    doc.y = y + 34;
  }

  function cardTextHeight(text, cardWidth) {
    return doc.heightOfString(text, {
      width: cardWidth - 28,
      font: 'Helvetica',
      fontSize: 8.8,
      lineGap: 2.5
    });
  }

  function partiesCard() {
    const gap = 14;
    const cardWidth = (width - gap) / 2;
    const sellerDetails = [
      seller.companyNumber,
      seller.address,
      seller.email,
      `Vertegenwoordigd door ${seller.representative}`
    ].join('\n');
    const clientDetails = [
      client.company_number || client.vat_number,
      clientAddress,
      client.email,
      contact?.name ? `Contactpersoon ${contact.name}${contact.role ? `, ${contact.role}` : ''}` : '',
      contact?.email && contact.email !== client.email ? contact.email : ''
    ].filter(Boolean).join('\n');
    const height = Math.max(108, cardTextHeight(sellerDetails, cardWidth), cardTextHeight(clientDetails, cardWidth)) + 48;
    keepSpace(height + 8);
    const y = doc.y;

    for (const [x, title, name, details] of [
      [left, 'DIENSTVERLENER', seller.name, sellerDetails],
      [left + cardWidth + gap, 'OPDRACHTGEVER', `${clean(client.legal_form, '')} ${client.company_name}`.trim(), clientDetails]
    ]) {
      doc.roundedRect(x, y, cardWidth, height, 10).fill(colors.pale);
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(colors.muted)
        .text(title, x + 14, y + 13, { width: cardWidth - 28, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(colors.navy)
        .text(name, x + 14, y + 28, { width: cardWidth - 28 });
      doc.font('Helvetica').fontSize(8.8).fillColor(colors.ink)
        .text(details, x + 14, y + 48, { width: cardWidth - 28, lineGap: 2.5 });
    }
    doc.y = y + height + 13;
  }

  function summaryGrid(fields) {
    const gap = 12;
    const cellWidth = (width - gap) / 2;
    for (let index = 0; index < fields.length; index += 2) {
      const row = fields.slice(index, index + 2);
      const heights = row.map((field) => {
        const text = clean(field.value);
        const valueHeight = doc.heightOfString(text, {
          width: cellWidth - 24,
          font: 'Helvetica',
          fontSize: 9.2
        });
        return Math.max(48, valueHeight + 31);
      });
      const height = Math.max(...heights);
      keepSpace(height + 7);
      const y = doc.y;
      row.forEach((field, columnIndex) => {
        const x = left + columnIndex * (cellWidth + gap);
        doc.roundedRect(x, y, cellWidth, height, 7).fill(colors.pale);
        doc.font('Helvetica-Bold').fontSize(7).fillColor(colors.muted)
          .text(field.label.toLocaleUpperCase('nl-BE'), x + 11, y + 8, {
            width: cellWidth - 22,
            lineBreak: false
          });
        doc.font('Helvetica').fontSize(9.2).fillColor(colors.ink)
          .text(clean(field.value), x + 11, y + 21, { width: cellWidth - 22 });
      });
      doc.y = y + height + 8;
    }
  }

  function quoteItems() {
    if (!quote?.items?.length) {
      keepSpace(58);
      doc.roundedRect(left, doc.y, width, 48, 7).fill(colors.pale);
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(colors.navy)
        .text('€ 50,00 excl. btw per uur', left + 13, doc.y + 10, { width: width - 26 });
      doc.font('Helvetica').fontSize(8.5).fillColor(colors.muted)
        .text('Facturatie op basis van werkelijk gepresteerde uren.', left + 13, doc.y + 26, { width: width - 26 });
      doc.y += 58;
      return;
    }

    for (const [index, item] of quote.items.entries()) {
      keepSpace(34);
      const y = doc.y;
      if (index % 2 === 0) doc.roundedRect(left, y, width, 25, 5).fill(colors.pale);
      doc.font('Helvetica').fontSize(8.8).fillColor(colors.ink)
        .text(item.description, left + 9, y + 7, { width: width - 216 });
      doc.text(`${item.quantity} x ${euro(item.unit_price)}`, right - 194, y + 7, {
        width: 100,
        align: 'right',
        lineBreak: false
      });
      doc.font('Helvetica-Bold').text(euro(Number(item.quantity) * Number(item.unit_price)), right - 84, y + 7, {
        width: 75,
        align: 'right',
        lineBreak: false
      });
      doc.y = y + 30;
    }
    paragraph(`Subtotaal excl. btw: ${euro(Number(quote.subtotal_cents) / 100)}   |   Btw: ${euro(Number(quote.vat_cents) / 100)}   |   Totaal incl. btw: ${quoteTotal}`, {
      size: 8.8,
      bold: true,
      after: 4
    });
  }

  function drawPageDecor() {
    const pages = doc.bufferedPageRange();
    const pageCount = pages.count;
    for (let index = pages.start; index < pages.start + pageCount; index++) {
      doc.switchToPage(index);
      const contentY = doc.y;
      const bottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 15;
      doc.save();
      doc.roundedRect(left, 25, 18, 18, 5).fill(colors.navy);
      doc.circle(left + 9, 34, 3).fill(colors.orange);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(colors.navy)
        .text('make it so', left + 25, 28, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(7).fillColor(colors.orange)
        .text('.', left + 73, 28, { lineBreak: false });
      doc.font('Helvetica').fontSize(7).fillColor(colors.muted)
        .text('DIGITALE & MARKETINGDIENSTEN', right - 180, 32, {
          width: 180,
          align: 'right',
          lineBreak: false
        });
      doc.moveTo(left, 57).lineTo(right, 57).lineWidth(0.6).stroke(colors.line);
      doc.moveTo(left, doc.page.height - 51).lineTo(right, doc.page.height - 51).lineWidth(0.6).stroke(colors.line);
      doc.font('Helvetica').fontSize(7).fillColor(colors.muted)
        .text('CONCEPT | BELGIE | LAAT JURIDISCH CONTROLEREN', left, doc.page.height - 40, {
          width: width - 45,
          lineBreak: false
        });
      doc.font('Helvetica-Bold').fontSize(7).fillColor(colors.muted)
        .text(String(index + 1).padStart(2, '0'), right - 28, doc.page.height - 40, {
          width: 28,
          align: 'right',
          lineBreak: false
        });
      doc.restore();
      doc.page.margins.bottom = bottomMargin;
      doc.y = contentY;
    }
  }

  doc.roundedRect(left, 84, width, 120, 13).fill(colors.navy);
  doc.rect(left, 84, 5, 120).fill(colors.orange);
  doc.image(wordmark, left + 20, 100, { fit: [135, 34] });
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#c5c9ed')
    .text('MAKE IT SO  /  CONTRACTTEMPLATE  /  BELGIE', left + 20, 145, { characterSpacing: 1 });
  doc.font('Helvetica-Bold').fontSize(20).fillColor(colors.white)
    .text('Samenwerking overeenkomst', left + 20, 164, { width: width - 40, lineBreak: false });
  doc.font('Helvetica').fontSize(9).fillColor('#e2e4f3')
    .text('Digitale producten, websites en marketingdiensten', left + 20, 188, { lineBreak: false });
  doc.y = 220;

  paragraph(`B2B-CONCEPT  |  ${date(new Date().toISOString()).toLocaleUpperCase('nl-BE')}`, {
    size: 7.5,
    color: colors.blue,
    bold: true,
    after: 3
  });
  paragraph(`Opgesteld voor project ${project.name}. Dit document bevat de project- en klantgegevens uit het platform en de voorwaarden voor de samenwerking.`, {
    size: 8.8,
    color: colors.muted,
    after: 8
  });

  sectionHeading(1, 'Partijen');
  partiesCard();
  paragraph('De dienstverlener en opdrachtgever worden afzonderlijk een Partij en samen de Partijen genoemd.', {
    size: 8.2,
    color: colors.muted,
    after: 8
  });

  sectionHeading(2, 'Opdracht in het kort');
  summaryGrid([
    { label: 'Project / referentie', value: project.name },
    { label: 'Type opdracht', value: project.category },
    { label: 'Offerte / projectbijlage', value: quote ? `${quote.quote_number || 'Offerte'} - ${quote.title}` : 'Geen gekoppelde offerte' },
    { label: 'Streefdatum', value: date(project.target_date) },
    { label: 'Projectomschrijving', value: project.description },
    ...(quote?.introduction ? [{ label: 'Offerteomschrijving', value: quote.introduction }] : [])
  ]);
  if (quote) {
    quoteItems();
    if (quote.terms) paragraph(`Offertevoorwaarden: ${quote.terms}`, { size: 8.5, color: colors.muted });
  } else {
    quoteItems();
  }

  section(3, 'Overeenkomst en projectomvang',
    'Deze overeenkomst omvat de hierboven vermelde opdracht en, indien van toepassing, de geselecteerde offerte. De offerte-items, projectomschrijving en eventuele uitdrukkelijk vermelde projectvoorwaarden leggen de afgesproken scope vast. Eigen inkoopvoorwaarden gelden alleen na schriftelijke aanvaarding door beide Partijen.');
  section(4, 'Meerwerk en wijzigingen',
    'Werk buiten de hierboven vastgelegde scope, waaronder bijkomende pagina’s, functies, integraties, campagnes, revisies of wijzigingen na goedkeuring, wordt aangerekend aan € 50,00 excl. btw per uur. Make It So meldt de verwachte impact waar redelijkerwijs mogelijk vooraf. Meerwerk start na schriftelijk akkoord van de opdrachtgever. Zonder akkoord wordt het bijkomende werk niet uitgevoerd.');
  section(5, 'Samenwerking en planning',
    'De opdrachtgever bezorgt tijdig correcte informatie, materiaal, toegangen, feedback en beslissingen en duidt een contactpersoon aan. De opdrachtgever staat in voor de rechten op aangeleverd materiaal en controleert de juistheid van teksten, prijzen, claims en wettelijke vermeldingen. De streefdatum is afhankelijk van tijdige input en goedkeuring. Vertraging door ontbrekende input of beslissingen verschuift de planning redelijkerwijs.');
  section(6, 'Oplevering en goedkeuring',
    'Make It So meldt wanneer een overeengekomen onderdeel klaarstaat voor beoordeling. De opdrachtgever meldt concrete afwijkingen van de afgesproken scope binnen vijf werkdagen. Aantoonbare afwijkingen worden binnen redelijke termijn hersteld. Gewijzigde wensen zijn meerwerk. Een onderdeel geldt als aanvaard na schriftelijke goedkeuring of ingebruikname, behalve voor verborgen gebreken en voor zover dwingend recht anders bepaalt.');
  section(7, 'Facturatie en betaling',
    'Facturen zijn betaalbaar binnen 14 kalenderdagen na factuurdatum, tenzij op de factuur of in de geselecteerde offerte een andere termijn staat. Bedragen zijn exclusief btw tenzij uitdrukkelijk anders vermeld. Een factuurbetwisting gebeurt gemotiveerd en schriftelijk binnen tien kalenderdagen; het niet-betwiste gedeelte blijft betaalbaar. Op laattijdige B2B-betalingen zijn de toepasselijke wettelijke interesten en invorderingsvergoedingen van toepassing.');
  section(8, 'Opschorting en beëindiging',
    'Bij een vervallen en onbetaalde factuur kan Make It So, na een schriftelijke herinnering en een redelijke termijn om alsnog te betalen, de betrokken werkzaamheden tijdelijk opschorten. De planning wordt verlengd met de opschorting en een redelijke herstarttermijn. Elke Partij kan de overeenkomst beëindigen bij een wezenlijke tekortkoming die niet binnen 15 kalenderdagen na schriftelijke ingebrekestelling is hersteld. Bij beëindiging betaalt de opdrachtgever het tot dan toe uitgevoerde werk, goedgekeurd meerwerk en niet-annuleerbare projectkosten.');
  section(9, 'Intellectuele eigendom',
    'Rechten op specifiek voor deze opdracht gemaakte eindresultaten worden, voor zover wettelijk overdraagbaar, aan de opdrachtgever overgedragen na volledige betaling van de verschuldigde bedragen. Die overdracht geldt wereldwijd en voor de wettelijke beschermingsduur voor reproductie, publicatie, gebruik voor de bedrijfsactiviteiten van de opdrachtgever en aanpassing van de betaalde eindresultaten. De vergoeding voor deze overdracht is inbegrepen in de projectvergoeding. Bestaande tools, methodes, kennis en herbruikbare componenten van Make It So blijven van Make It So; de opdrachtgever krijgt daarop een blijvende, niet-exclusieve licentie voor zover opgenomen in het eindresultaat. Derde-partijmateriaal blijft onder de eigen licentievoorwaarden vallen.');
  section(10, 'Gebruik van AI',
    'Make It So kan AI-toepassingen inzetten om analyse, ontwerp, ontwikkeling, content en werkprocessen te ondersteunen en te optimaliseren. AI ondersteunt het werk; de output wordt waar passend door een mens beoordeeld en verwerkt. Make It So voert geen vertrouwelijke informatie of persoonsgegevens van de opdrachtgever in een externe AI-dienst in zonder voorafgaande toestemming of andere geldige instructie en passende waarborgen. De opdrachtgever blijft verantwoordelijk voor de definitieve goedkeuring van inhoud, claims en publicaties.');
  section(11, 'Privacy en vertrouwelijkheid',
    'Partijen gebruiken vertrouwelijke informatie uitsluitend voor deze opdracht en beschermen die met redelijke zorg. Elke Partij leeft de privacywetgeving na voor de verwerkingen waarvoor zij verantwoordelijk is. Als Make It So persoonsgegevens namens de opdrachtgever verwerkt, leggen Partijen vóór die verwerking de vereiste afspraken over gegevensverwerking vast.');
  section(12, 'Hosting, onderhoud en garanties',
    'Hosting, domeinen, externe licenties, doorlopende ondersteuning en onderhoud zijn niet inbegrepen tenzij ze uitdrukkelijk in de opdracht of offerte staan. Make It So voert het overeengekomen werk professioneel uit en herstelt aantoonbare afwijkingen van de specificaties binnen een redelijke termijn. De beschikbaarheid van externe platformen valt buiten de controle van Make It So.');
  section(13, 'Aansprakelijkheid en overmacht',
    'Voor zover wettelijk toegestaan is een Partij alleen aansprakelijk voor voorzienbare, rechtstreekse schade die het onmiddellijke gevolg is van een toerekenbare tekortkoming. Aansprakelijkheid voor indirecte schade is uitgesloten voor zover de wet dit toestaat. De totale aansprakelijkheid van Make It So is, voor zover wettelijk toegestaan, beperkt tot de vergoeding voor deze opdracht. Deze beperking geldt niet waar dwingend recht beperking verbiedt. Een Partij is niet aansprakelijk voor vertraging door omstandigheden buiten haar redelijke controle en meldt die omstandigheden zo spoedig mogelijk.');
  keepSpace(150);
  section(14, 'Toepasselijk recht en akkoord',
    'Op deze overeenkomst is Belgisch recht van toepassing. Partijen proberen geschillen eerst in onderling overleg op te lossen; daarna gelden de wettelijke bevoegdheidsregels. Wijzigingen zijn alleen geldig wanneer beide Partijen ze schriftelijk bevestigen. Door ondertekening bevestigen Partijen akkoord te gaan met deze overeenkomst en de hierboven opgenomen project- en offertegegevens. De ondertekening via het portaal registreert de goedkeuring en wordt niet voorgesteld als een gekwalificeerde elektronische handtekening.');

  keepSpace(144);
  sectionHeading(15, 'Ondertekening');
  paragraph('Opgemaakt in twee exemplaren of digitaal goedgekeurd. Beide Partijen ontvangen een exemplaar.', {
    size: 8.8,
    color: colors.muted,
    after: 8
  });
  const signatureY = doc.y;
  const signatureGap = 14;
  const signatureWidth = (width - signatureGap) / 2;
  for (const [x, label] of [[left, 'OPDRACHTGEVER'], [left + signatureWidth + signatureGap, 'MAKE IT SO BV']]) {
    doc.roundedRect(x, signatureY, signatureWidth, 98, 9).fill(colors.pale);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(colors.navy)
      .text(label, x + 12, signatureY + 12, { width: signatureWidth - 24 });
    doc.font('Helvetica').fontSize(8).fillColor(colors.muted)
      .text('Naam en functie', x + 12, signatureY + 35);
    doc.moveTo(x + 12, signatureY + 55).lineTo(x + signatureWidth - 12, signatureY + 55).stroke(colors.line);
    doc.text('Datum en handtekening', x + 12, signatureY + 67);
    doc.moveTo(x + 12, signatureY + 88).lineTo(x + signatureWidth - 12, signatureY + 88).stroke(colors.line);
  }

  drawPageDecor();
  doc.end();
  return finished;
}
