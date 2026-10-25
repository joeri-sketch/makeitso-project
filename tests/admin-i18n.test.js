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
