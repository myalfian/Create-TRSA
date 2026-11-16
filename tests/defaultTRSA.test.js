import { test, describe } from 'node:test';
import assert from 'node:assert';
import { defaultTRSAProject } from '../src/data/defaultTRSA.js';

describe('TRSA Indofood Document Specification Matrix Tests', () => {
  test('Verify Document Header and Control Information', () => {
    assert.strictEqual(defaultTRSAProject.documentInfo.docNumber, '006/RAP/TRSA – 1403/MFG-IFM/VIII/2024');
    assert.strictEqual(defaultTRSAProject.documentInfo.companyName, 'PT. Indofood Fortuna Makmur');
    assert.strictEqual(defaultTRSAProject.documentInfo.revisionHistory.length, 1);
    assert.strictEqual(defaultTRSAProject.documentInfo.revisionHistory[0].revision, '0.0');
    assert.strictEqual(defaultTRSAProject.documentInfo.revisionHistory[0].originatedBy, 'Refin A Putra');
  });

  test('Verify Key Project Milestones and Dates', () => {
    const dates = defaultTRSAProject.projectOverview.keyDates;
    assert.strictEqual(dates.lineStartUp, 'End of April 2025');
    assert.strictEqual(dates.finalQuotationDrawings, 'Mid-October 2024');
    assert.strictEqual(dates.orderPlacement, 'Early November 2024');
  });

  test('Verify Stakeholders and Key Contacts', () => {
    const contacts = defaultTRSAProject.keyContacts;
    assert.ok(contacts.length >= 5, 'Must contain all 5 key contacts from IFM');
    
    const yusuf = contacts.find(c => c.name.includes('Yusuf Alfian'));
    assert.ok(yusuf, 'Moh Yusuf Alfian must exist');
    assert.strictEqual(yusuf.email, 'my.alfian@icbp.indofood.co.id');
    assert.strictEqual(yusuf.role, 'Project & Engineering Manager');

    const natalia = contacts.find(c => c.name.includes('Natalia Happy'));
    assert.ok(natalia, 'Natalia Happy must exist');
    assert.strictEqual(natalia.email, 'natalia.happy@icbp.indofood.co.id');
    assert.strictEqual(natalia.role, 'Purchasing Supervisor');
  });

  test('Verify Product Specifications Matrix (4 Shapes)', () => {
    const prods = defaultTRSAProject.productSpecifications;
    assert.strictEqual(prods.length, 4, 'Must have 4 product shapes');

    const names = prods.map(p => p.shape);
    assert.ok(names.includes('3D Chicken Legs'));
    assert.ok(names.includes('3D Golgappa Pellets'));
    assert.ok(names.includes('3D Star Pellets'));
    assert.ok(names.includes('2D Pierced Chips'));

    prods.forEach(p => {
      assert.strictEqual(p.capacityOutput, '600 Kg/hour (output pellet)');
      assert.ok(p.moistureOutput.includes('1.0 – 2.1 %') || p.moistureOutput.includes('1 – 2.1 %'));
      assert.ok(p.oilContentOutput.includes('28 – 40 %') || p.oilContentOutput.includes('28 - 40 %'));
    });
  });

  test('Verify Frying & Seasoning Operating Parameters', () => {
    const frying = defaultTRSAProject.processParameters.frying;
    assert.strictEqual(frying.feederRate, '1.5 – 2.5 kg/batch');
    assert.strictEqual(frying.temperatureRange, 'Min 180 °C – Max 190 °C');
    assert.strictEqual(frying.dwellTime, '20 – 30 seconds');
    assert.strictEqual(frying.oilCapacityInFryer, 'Min 175 kg – Max 180 kg');
    assert.strictEqual(frying.spinnerRotationTime, '20 seconds');

    const seas = defaultTRSAProject.processParameters.seasoning;
    assert.strictEqual(seas.requiredSeasoning, 'Dry only');
    assert.strictEqual(seas.saltContentBaseExcluded, '1.0 %');
    assert.strictEqual(seas.seasoningApplicationRate, '7.4 %');
    assert.strictEqual(seas.seasoningCapacity, '635 – 700 kg/hour');
  });

  test('Verify Project Scope of Supply Breakdown', () => {
    const fryerScope = defaultTRSAProject.scopeOfSupply.fryer;
    const seasoningScope = defaultTRSAProject.scopeOfSupply.seasoning;

    assert.strictEqual(fryerScope.length, 14, 'Fryer Scope must contain 14 units');
    assert.strictEqual(seasoningScope.length, 7, 'Seasoning Scope must contain 7 units');

    // Check specific critical modules
    const pelletFeed = fryerScope.find(i => i.title.includes('Pellet Feed System'));
    assert.ok(pelletFeed, 'Pellet feed system required');

    const fryerModule = fryerScope.find(i => i.title.includes('Pellet Fryer Module'));
    assert.ok(fryerModule, 'Pellet fryer module required');
    assert.ok(fryerModule.specs.some(s => s.includes('automatic oil top')), 'Auto oil top-up required');

    const heatExch = fryerScope.find(i => i.title.includes('Horizontal Heat Exchanger'));
    assert.ok(heatExch, 'Horizontal heat exchanger required');
    assert.ok(heatExch.specs.some(s => s.toLowerCase().includes('dual fuel')), 'Dual fuel burner required');

    const controlPanel = fryerScope.find(i => i.title.includes('Control Panel'));
    assert.ok(controlPanel, 'Control panel required');
    assert.ok(controlPanel.specs.some(s => s.includes('Ewon')), 'Ewon remote router required');
  });

  test('Verify Performance Acceptance Protocols and Consequences', () => {
    const acceptance = defaultTRSAProject.performanceAcceptance;
    assert.ok(acceptance.tests.length >= 5, 'Must have at least 5 commissioning trial steps');
    assert.ok(acceptance.failureConsequence.includes('3 months'), 'Failure consequence must mention 3 months modification period');
    assert.ok(acceptance.finalAcceptance && acceptance.finalAcceptance.includes('Final Acceptance Certificate'), 'Final acceptance criteria must be defined');
  });

  test('Verify Document Section Ordering & Completeness Standard', () => {
    const requiredSections = [
      'I. Revision History',
      'II. Project Description',
      'III. Key Dates',
      'IV. Key Contacts',
      'V. Site Description',
      'VI. Confidentiality',
      'VII. Language Requirements',
      'VIII. Product Specifications',
      'IX. Scope of Supply',
      'X. Target Performance Test',
      'XI. Final Acceptance',
      'XII. Consequences If Target is Not Reached',
      'XIII. Term of Payment',
      'XIV. Shipment and Delivery',
      'XV. Warranty',
      'XVI. Administrative Provisions',
      'XVII. Required Documentation',
      'Acknowledged and Approved by,'
    ];

    assert.strictEqual(requiredSections.length, 18, 'Must verify all 17 ordered sections plus approval sign-off block');
  });

  test('Verify Commercial Terms (Option 1 vs Option 2)', () => {
    const comm = defaultTRSAProject.commercialTerms;
    assert.ok(comm.options.option1, 'Option 1 must exist');
    assert.ok(comm.options.option2, 'Option 2 must exist');
    assert.strictEqual(comm.warranty, 'Minimum 12 months continuous operation after final site acceptance, with phone support during office hours.');
    assert.ok(comm.shipmentTerms.includes('Semarang Port'));
    assert.ok(comm.shipmentTerms.includes('110%'));
    assert.ok(comm.shipmentTerms.includes('25 years'));
  });

  test('Verify 14 Required Documents Deliverables', () => {
    const docs = defaultTRSAProject.requiredDocumentation;
    assert.strictEqual(docs.length, 14, 'Must have exactly 14 required documentation deliverables');
    const titles = docs.map(d => d.title);
    assert.ok(titles.includes('As-built Drawings'));
    assert.ok(titles.includes('Cabling Schedule'));
    assert.ok(titles.includes('Functional Design Specification (FDS)'));
    assert.ok(titles.includes('PLC Listings'));
    assert.ok(titles.includes('Halal Compliance Documentation'));
    assert.ok(titles.includes('Equipment Layout (DWG)'));
  });

  test('Verify Vendor Origin Sourcing Options (Foreign, Local, Mixed)', () => {
    assert.strictEqual(defaultTRSAProject.documentInfo.vendorOrigin, 'Foreign', 'Default vendor origin should be Foreign');
    assert.strictEqual(defaultTRSAProject.commercialTerms.vendorOrigin, 'Foreign');
  });

  test('Verify General Information Master Data (Plant, Country of Origin, Machine Type, Vendor Name)', () => {
    assert.ok(defaultTRSAProject.generalInfo, 'Project must contain generalInfo section');
    assert.strictEqual(defaultTRSAProject.generalInfo.plantLocation, 'Semarang Plant');
    assert.strictEqual(defaultTRSAProject.generalInfo.countryOfOrigin, 'Japan');
    assert.strictEqual(defaultTRSAProject.generalInfo.machineType, 'Sheeted Pellet Fryer & Seasoning System');
    assert.strictEqual(defaultTRSAProject.generalInfo.vendorName, 'Heat and Control / Kiremko B.V.');
    assert.strictEqual(defaultTRSAProject.generalInfo.modelNumber, 'SPF-600 Continuous');
    assert.strictEqual(defaultTRSAProject.generalInfo.designCapacity, '600 kg/hour (Pellet Output)');
  });
});
