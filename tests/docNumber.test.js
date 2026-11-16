// Setup minimal headless DOM environment for Node
globalThis.window = { 
  addEventListener: () => {}, 
  removeEventListener: () => {}, 
  scrollTo: () => {} 
};
globalThis.localStorage = { 
  getItem: () => null, 
  setItem: () => null 
};
globalThis.document = { 
  getElementById: () => null, 
  querySelectorAll: () => [] 
};

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { 
  toRomanMonth, 
  fromRomanMonth, 
  getInitials, 
  getNextSequenceNumber, 
  getPlantCode, 
  generateTRSANumber, 
  parseTRSANumber 
} from '../src/js/app.js';
import { defaultTRSAProject } from '../src/data/defaultTRSA.js';

describe('TRSA Document Control Number Specification Tests', () => {
  test('Roman Numeral Month Conversion (I to XII)', () => {
    assert.strictEqual(toRomanMonth(1), 'I');
    assert.strictEqual(toRomanMonth(2), 'II');
    assert.strictEqual(toRomanMonth(3), 'III');
    assert.strictEqual(toRomanMonth(4), 'IV');
    assert.strictEqual(toRomanMonth(5), 'V');
    assert.strictEqual(toRomanMonth(6), 'VI');
    assert.strictEqual(toRomanMonth(7), 'VII');
    assert.strictEqual(toRomanMonth(8), 'VIII');
    assert.strictEqual(toRomanMonth(9), 'IX');
    assert.strictEqual(toRomanMonth(10), 'X');
    assert.strictEqual(toRomanMonth(11), 'XI');
    assert.strictEqual(toRomanMonth(12), 'XII');

    assert.strictEqual(fromRomanMonth('VIII'), 8);
    assert.strictEqual(fromRomanMonth('XI'), 11);
    assert.strictEqual(fromRomanMonth('I'), 1);
    assert.strictEqual(fromRomanMonth('XII'), 12);
  });

  test('Creator Initials Extraction (Capitalized)', () => {
    assert.strictEqual(getInitials('Refin A Putra'), 'RAP');
    assert.strictEqual(getInitials('Moh Yusuf Alfian'), 'MYA');
    assert.strictEqual(getInitials('Natalia Happy'), 'NH');
    assert.strictEqual(getInitials('Budi Santoso'), 'BS');
    assert.strictEqual(getInitials('Ahmad Dani'), 'AD');
  });

  test('Next Sequence Number Calculation', () => {
    const mockProjects = [
      { documentInfo: { docNumber: '006/RAP/TRSA – 1403/MFG-IFM/VIII/2024' } },
      { documentInfo: { docNumber: '003/MYA/TRSA – 1402/ENG-IFM/III/2024' } }
    ];
    assert.strictEqual(getNextSequenceNumber(mockProjects), '007');

    const emptyProjects = [];
    assert.strictEqual(getNextSequenceNumber(emptyProjects), '001');
  });

  test('Plant Code Resolution', () => {
    assert.strictEqual(getPlantCode('Semarang Plant'), '1402');
    assert.strictEqual(getPlantCode('Cikupa Plant'), '1403');
    assert.strictEqual(getPlantCode('Semarang'), '1402');
  });

  test('Generate Standard Indofood TRSA Number Format', () => {
    // Exact format match: 006/RAP/TRSA – 1403/MFG-IFM/VIII/2024
    const generated = generateTRSANumber({
      seq: '006',
      creatorName: 'Refin A Putra',
      plantCode: '1403',
      dept: 'MFG',
      date: '2024-08-30'
    });
    assert.strictEqual(generated, '006/RAP/TRSA \u2013 1403/MFG-IFM/VIII/2024');

    // New project with plant 1402 (Semarang)
    const newGen = generateTRSANumber({
      seq: '007',
      creatorName: 'Moh Yusuf Alfian',
      plantCode: '1402',
      dept: 'ENG',
      date: '2026-11-15'
    });
    assert.strictEqual(newGen, '007/MYA/TRSA \u2013 1402/ENG-IFM/XI/2026');
  });

  test('Parse Existing TRSA Number into Constituent Segments', () => {
    const parsed = parseTRSANumber('006/RAP/TRSA – 1403/MFG-IFM/VIII/2024');
    assert.ok(parsed, 'Must successfully parse valid TRSA number');
    assert.strictEqual(parsed.seq, '006');
    assert.strictEqual(parsed.initials, 'RAP');
    assert.strictEqual(parsed.trsa, 'TRSA');
    assert.strictEqual(parsed.plantCode, '1403');
    assert.strictEqual(parsed.dept, 'MFG');
    assert.strictEqual(parsed.ifm, 'IFM');
    assert.strictEqual(parsed.romanMonth, 'VIII');
    assert.strictEqual(parsed.year, '2024');
  });

  test('Parse TRSA Number with Standard Hyphen or En-Dash', () => {
    const parsedHyphen = parseTRSANumber('007/MYA/TRSA - 1402/ENG-IFM/XI/2026');
    assert.ok(parsedHyphen, 'Must parse hyphen format');
    assert.strictEqual(parsedHyphen.seq, '007');
    assert.strictEqual(parsedHyphen.initials, 'MYA');
    assert.strictEqual(parsedHyphen.plantCode, '1402');
    assert.strictEqual(parsedHyphen.dept, 'ENG');
    assert.strictEqual(parsedHyphen.romanMonth, 'XI');
    assert.strictEqual(parsedHyphen.year, '2026');
  });
});
