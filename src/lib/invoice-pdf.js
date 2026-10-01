import PDFDocument from 'pdfkit';

const money = (cents) => new Intl.NumberFormat('en-BE', { style: 'currency', currency: 'EUR' }).format(Number(cents) / 100);

function address(details) {
  return [
    details.legal_name || details.company_name,
    details.address_line1,
    details.address_line2,
    [details.postal_code, details.city].filter(Boolean).join(' '),
    details.country
  ].filter(Boolean);
}

export function invoicePdf(invoice) {
  const doc = new PDFDocument({ size: 'A4', margin: 52, info: { Title: `Invoice ${invoice.invoice_number}` } });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.fontSize(22).font('Helvetica-Bold').text('INVOICE', { align: 'right' });
  doc.moveDown();
  doc.fontSize(12).text(invoice.seller_snapshot.legal_name || '');
  doc.font('Helvetica').fontSize(9);
  address(invoice.seller_snapshot).slice(1).forEach((line) => doc.text(line));
  if (invoice.seller_snapshot.vat_number) doc.text(`VAT: ${invoice.seller_snapshot.vat_number}`);
  if (invoice.seller_snapshot.company_number) doc.text(`Company no.: ${invoice.seller_snapshot.company_number}`);
  if (invoice.seller_snapshot.email) doc.text(invoice.seller_snapshot.email);
  doc.moveDown();

  const recipientTop = doc.y;
  doc.font('Helvetica-Bold').fontSize(10).text('Bill to');
  doc.font('Helvetica').fontSize(10);
  address(invoice.client_snapshot).forEach((line) => doc.text(line));
  if (invoice.client_snapshot.vat_number) doc.text(`VAT: ${invoice.client_snapshot.vat_number}`);
  doc.font('Helvetica-Bold').fontSize(10).text(`Invoice ${invoice.invoice_number}`, 340, recipientTop);
  doc.font('Helvetica').fontSize(10)
    .text(`Issue date: ${invoice.issue_date}`, 340)
    .text(`Due date: ${invoice.due_date}`, 340);
  doc.moveDown(2);
  doc.font('Helvetica-Bold').fontSize(14).text(invoice.title);
  if (invoice.notes) doc.font('Helvetica').fontSize(9).text(invoice.notes, { width: 500 });
  doc.moveDown();

  const tableTop = doc.y;
  const columns = { description: 52, quantity: 310, price: 365, vat: 430, total: 490 };
  doc.font('Helvetica-Bold').fontSize(8);
  doc.text('Description', columns.description, tableTop);
  doc.text('Qty', columns.quantity, tableTop, { width: 40, align: 'right' });
  doc.text('Unit price', columns.price, tableTop, { width: 55, align: 'right' });
  doc.text('VAT', columns.vat, tableTop, { width: 35, align: 'right' });
  doc.text('Total', columns.total, tableTop, { width: 55, align: 'right' });
  doc.moveTo(52, tableTop + 15).lineTo(545, tableTop + 15).strokeColor('#cbd2e8').stroke();

  let y = tableTop + 22;
  doc.font('Helvetica').fontSize(8);
  for (const item of invoice.items) {
    if (y > 700) {
      doc.addPage();
      y = 52;
    }
    const baseCents = Math.round(Number(item.quantity) * Number(item.unit_price) * 100);
    const vatCents = Math.round(Number(item.quantity) * Number(item.unit_price) * Number(item.vat_rate));
    doc.text(item.description, columns.description, y, { width: 245 });
    doc.text(String(item.quantity), columns.quantity, y, { width: 40, align: 'right' });
    doc.text(money(Math.round(Number(item.unit_price) * 100)), columns.price, y, { width: 55, align: 'right' });
    doc.text(`${item.vat_rate}%`, columns.vat, y, { width: 35, align: 'right' });
    doc.text(money(baseCents + vatCents), columns.total, y, { width: 55, align: 'right' });
    y = Math.max(doc.y, y + 16) + 5;
  }
  doc.moveTo(350, y).lineTo(545, y).strokeColor('#cbd2e8').stroke();
  y += 10;
  doc.fontSize(9);
  doc.text(`Subtotal: ${money(invoice.subtotal_cents)}`, 350, y, { width: 195, align: 'right' });
  y += 15;
  doc.text(`VAT: ${money(invoice.vat_cents)}`, 350, y, { width: 195, align: 'right' });
  y += 17;
  doc.font('Helvetica-Bold').fontSize(11);
  doc.text(`Total: ${money(invoice.total_cents)}`, 350, y, { width: 195, align: 'right' });
  y += 22;
  doc.font('Helvetica').fontSize(9);
  doc.text(`Paid: ${money(invoice.paid_cents)}    Balance due: ${money(invoice.balance_cents)}`, 52, y);
  if (invoice.seller_snapshot.iban) {
    doc.moveDown();
    doc.font('Helvetica-Bold').text('Bank transfer');
    doc.font('Helvetica').text(`IBAN: ${invoice.seller_snapshot.iban}`);
  }
  if (invoice.seller_snapshot.payment_instructions) doc.text(invoice.seller_snapshot.payment_instructions, { width: 500 });
  doc.end();
  return finished;
}
