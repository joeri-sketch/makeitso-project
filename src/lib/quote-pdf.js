import PDFDocument from 'pdfkit';

const money = (cents) => new Intl.NumberFormat('en-BE', { style: 'currency', currency: 'EUR' }).format(Number(cents) / 100);

function address(details) {
  return [
    details.legal_name || details.company_name,
    details.address_line1 || details.client_address_line1,
    details.address_line2 || details.client_address_line2,
    [details.postal_code || details.client_postal_code, details.city || details.client_city].filter(Boolean).join(' '),
    details.country || details.client_country
  ].filter(Boolean);
}

export function quotePdf(quote) {
  const doc = new PDFDocument({ size: 'A4', margin: 52, info: { Title: `Quote ${quote.quote_number}` } });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.fontSize(22).font('Helvetica-Bold').text('QUOTE', { align: 'right' });
  doc.moveDown();
  doc.fontSize(12).text(quote.seller.legal_name || '');
  doc.font('Helvetica').fontSize(9);
  address(quote.seller).slice(1).forEach((line) => doc.text(line));
  if (quote.seller.vat_number) doc.text(`VAT: ${quote.seller.vat_number}`);
  if (quote.seller.company_number) doc.text(`Company no.: ${quote.seller.company_number}`);
  if (quote.seller.email) doc.text(quote.seller.email);
  doc.moveDown();

  const recipientTop = doc.y;
  doc.font('Helvetica-Bold').fontSize(10).text('Prepared for');
  doc.font('Helvetica').fontSize(10);
  address({
    company_name: quote.company_name,
    client_address_line1: quote.client_address_line1,
    client_address_line2: quote.client_address_line2,
    client_postal_code: quote.client_postal_code,
    client_city: quote.client_city,
    client_country: quote.client_country
  }).forEach((line) => doc.text(line));
  if (quote.client_vat_number) doc.text(`VAT: ${quote.client_vat_number}`);
  doc.font('Helvetica-Bold').fontSize(10).text(`Quote ${quote.quote_number}`, 340, recipientTop);
  doc.font('Helvetica').fontSize(10).text(`Valid until: ${quote.valid_until || 'No expiry date'}`, 340);
  doc.moveDown(2);
  doc.font('Helvetica-Bold').fontSize(14).text(quote.title);
  if (quote.introduction) doc.font('Helvetica').fontSize(9).text(quote.introduction, { width: 500 });
  doc.moveDown();

  const columns = { description: 52, quantity: 335, price: 390, vat: 455, total: 500 };
  const tableTop = doc.y;
  doc.font('Helvetica-Bold').fontSize(8);
  doc.text('Description', columns.description, tableTop);
  doc.text('Qty', columns.quantity, tableTop, { width: 35, align: 'right' });
  doc.text('Unit price', columns.price, tableTop, { width: 55, align: 'right' });
  doc.text('VAT', columns.vat, tableTop, { width: 35, align: 'right' });
  doc.text('Total', columns.total, tableTop, { width: 45, align: 'right' });
  doc.moveTo(52, tableTop + 15).lineTo(545, tableTop + 15).strokeColor('#cbd2e8').stroke();

  let y = tableTop + 22;
  doc.font('Helvetica').fontSize(8);
  let subtotalCents = 0;
  let vatCents = 0;
  for (const item of quote.items) {
    if (y > 700) {
      doc.addPage();
      y = 52;
    }
    const baseCents = Math.round(Number(item.quantity) * Number(item.unit_price) * 100);
    const itemVatCents = Math.round(Number(item.quantity) * Number(item.unit_price) * Number(item.vat_rate));
    subtotalCents += baseCents;
    vatCents += itemVatCents;
    const top = y;
    doc.text(item.description, columns.description, top, { width: 270 });
    doc.text(String(item.quantity), columns.quantity, top, { width: 35, align: 'right' });
    doc.text(money(Math.round(Number(item.unit_price) * 100)), columns.price, top, { width: 55, align: 'right' });
    doc.text(`${item.vat_rate}%`, columns.vat, top, { width: 35, align: 'right' });
    doc.text(money(baseCents + itemVatCents), columns.total, top, { width: 45, align: 'right' });
    y = Math.max(doc.y, top + 16) + 5;
  }
  doc.moveTo(350, y).lineTo(545, y).strokeColor('#cbd2e8').stroke();
  y += 10;
  doc.fontSize(9).text(`Subtotal: ${money(subtotalCents)}`, 350, y, { width: 195, align: 'right' });
  y += 15;
  doc.text(`VAT: ${money(vatCents)}`, 350, y, { width: 195, align: 'right' });
  y += 17;
  doc.font('Helvetica-Bold').fontSize(11).text(`Total: ${money(subtotalCents + vatCents)}`, 350, y, { width: 195, align: 'right' });
  if (quote.terms) {
    doc.moveDown(3);
    doc.font('Helvetica-Bold').fontSize(10).text('Terms');
    doc.font('Helvetica').fontSize(9).text(quote.terms, { width: 500 });
  }
  doc.end();
  return finished;
}
