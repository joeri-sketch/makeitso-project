import test from 'node:test';
import assert from 'node:assert/strict';
import { setLanguage, translateMarkup, translateText } from '../public/admin/i18n.js';

test('admin Dutch translations cover dynamic text and preserve markup', () => {
  setLanguage('nl');
  assert.equal(translateText('Welcome back, Ellen.'), 'Welkom terug, Ellen.');
  assert.equal(translateText('created client “Northstar”'), 'heeft klant “Northstar” aangemaakt');
  assert.equal(translateText('Progress is calculated from work items (2/4 complete).'), 'De voortgang wordt berekend op basis van taken (2/4 afgerond).');
  assert.equal(translateText('To do'), 'Te doen');
  assert.equal(
    translateMarkup('<table><tbody><tr><td>Clients</td><td>__MIS_SLOT_1__</td></tr></tbody></table>'),
    '<table><tbody><tr><td>Klanten</td><td>__MIS_SLOT_1__</td></tr></tbody></table>'
  );
  assert.equal(
    translateMarkup('<p>Welcome back, __MIS_SLOT_2__.</p>'),
    '<p>Welkom terug, __MIS_SLOT_2__.</p>'
  );
});

test('admin English mode preserves the source interface strings', () => {
  setLanguage('en');
  assert.equal(translateText('Dashboard'), 'Dashboard');
  assert.equal(translateMarkup('<p>Clients</p>'), '<p>Clients</p>');
  setLanguage('nl');
});

test('admin navigation, attention and mobile table hints have Dutch labels', () => {
  setLanguage('nl');
  assert.equal(translateText('Work'), 'Werk');
  assert.equal(translateText('Finances'), 'Financiën');
  assert.equal(translateText('Needs attention'), 'Aandacht nodig');
  assert.equal(translateText('Overdue milestones'), 'Achterstallige mijlpalen');
  assert.equal(translateText('Contracts'), 'Contracten');
  assert.equal(translateText('Swipe horizontally to see more →'), 'Veeg horizontaal om meer te zien →');
});

test('admin theme choices have Dutch labels', () => {
  setLanguage('nl');
  assert.equal(translateText('Theme'), 'Thema');
  assert.equal(translateText('Classic'), 'Klassiek');
  assert.equal(translateText('Mission Control'), 'Mission Control');
  assert.equal(translateText('Orbit Glass'), 'Orbit Glass');
});

test('Orbit Glass dashboard labels translate with dynamic admin data', () => {
  setLanguage('nl');
  assert.equal(translateText('Your orbit, at a glance'), 'Je studio, in één oogopslag');
  assert.equal(translateText('Everything in motion, Ellen.'), 'Alles in beweging, Ellen.');
  assert.equal(translateText('3 items need attention'), '3 items vragen aandacht');
  assert.equal(translateText('Projects in your orbit'), 'Projecten in jouw universum');
  assert.equal(translateText('Latest updates'), 'Laatste updates');
});

test('admin dialogs and account details have Dutch labels', () => {
  setLanguage('nl');
  assert.equal(translateText('Client portal access'), 'Toegang tot het klantenportaal');
  assert.equal(translateText('Invitation links are one-time and expire after 7 days. Share them with the client yourself.'), 'Uitnodigingslinks kunnen één keer worden gebruikt en verlopen na 7 dagen. Deel ze zelf met de klant.');
  assert.equal(translateText('Last check: 26 Oct 2026'), 'Laatste controle: 26 Oct 2026');
  assert.equal(translateText('Issue invoice'), 'Factuur versturen');
  assert.equal(translateText('Show archived'), 'Gearchiveerde items tonen');
  assert.equal(translateText('← All clients'), '← Alle klanten');
  assert.equal(translateMarkup('<h3>Media services &amp; access</h3>'), '<h3>Mediaservices en toegang</h3>');
});
