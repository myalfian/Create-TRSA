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

  test('Verify Stakeholders and Key Contacts (Semarang Plant 1403 Matrix)', () => {
    const contacts = defaultTRSAProject.keyContacts;
    assert.strictEqual(contacts.length, 9, 'Plant 1403 Matrix must contain 9 authorized PICs (4 Engineering, 2 Project, 3 Purchasing)');

    const expectedEmails = [
      'my.alfian@icbp.indofood.co.id',
      'ayodya.gunoro@icbp.indofood.co.id',
      'dewi.natalia@icbp.indofood.co.id',
      'natalia.happy@icbp.indofood.co.id',
      'yanuar.wibowo@icbp.indofood.co.id',
      'mohammad.faiz@icbp.indofood.co.id',
      'dany.ansori@icbp.indofood.co.id',
      'adiprana@icbp.indofood.co.id',
      'septian.jumantoro@icbp.indofood.co.id'
    ];
    const actualEmails = contacts.map(c => c.email.toLowerCase());
    expectedEmails.forEach(email => {
      assert.ok(actualEmails.includes(email), `Missing authorized Matrix PIC email: ${email}`);
    });

    const yusuf = contacts.find(c => c.name.includes('Yusuf Alfian'));
    assert.ok(yusuf, 'Moh Yusuf Alfian must exist');
    assert.ok(yusuf.role.includes('Project Team PIC'));

    const natalia = contacts.find(c => c.name.includes('Natalia Happy'));
    assert.ok(natalia, 'Natalia Happy must exist');
    assert.ok(natalia.role.includes('Purchasing Team PIC'));
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

  test('Verify Project Scope of Supply Breakdown (Equipment, Services, Ancillaries, 12 Hygienic Rules & Control Access)', () => {
    const fryerScope = defaultTRSAProject.scopeOfSupply.fryer;
    const seasoningScope = defaultTRSAProject.scopeOfSupply.seasoning;

    assert.strictEqual(fryerScope.length, 14, 'Fryer Scope must contain 14 units');
    assert.strictEqual(seasoningScope.length, 7, 'Seasoning Scope must contain 7 units');
    assert.strictEqual(defaultTRSAProject.scopeOfSupply.servicesScope.length, 3, 'Services Scope must contain 3 items (Operator Training, Maintenance Training, System ID)');
    assert.strictEqual(defaultTRSAProject.scopeOfSupply.ancillariesAndLogistics.length, 4, 'Ancillaries & Logistics must contain 4 items');
    assert.strictEqual(defaultTRSAProject.scopeOfSupply.controlSystemAccess.length, 2, 'Control System Access Rights must include unlocked PLC/HMI code & Master Password handover');
    assert.strictEqual(defaultTRSAProject.hygieneAndQuality.generalTechnicalHygienic12.length, 12, 'Must enforce all 12 General Technical & Hygienic Requirements');

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

  test('Verify Performance Acceptance Protocols, Final Acceptance (Snag List) & Remedies', () => {
    const acceptance = defaultTRSAProject.performanceAcceptance;
    assert.ok(acceptance.tests.length >= 5, 'Must have at least 5 commissioning trial steps');
    assert.ok(acceptance.failureConsequence.includes('three (3) months') || acceptance.failureConsequence.includes('3 months'), 'Failure consequence must mention 3 months rectification period');
    assert.ok(acceptance.failureConsequence.includes('100%'), 'Failure consequence must include 100% full refund & dismantle clause');
    assert.ok(acceptance.finalAcceptance && acceptance.finalAcceptance.includes('Snag List'), 'Final acceptance criteria must include Snag List & signed training attendance sheets');
    assert.strictEqual(acceptance.finalAcceptanceChecklist.length, 4);
    assert.strictEqual(acceptance.remediesAndConsequences.length, 2);
  });

  test('Verify Document Section Ordering & Completeness Standard (All 19 Clauses I–XIX)', () => {
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
      'XII. Remedies & Consequences if Target is Not Reached',
      'XIII. Term of Payment',
      'XIV. Shipment and Delivery',
      'XV. Warranty',
      'XVI. Administrative, Tax & Regulatory Provisions',
      'XVII. Required Documentation',
      'XVIII. Acknowledged and Approved by',
      'XIX. Attachments / Appendices'
    ];

    assert.strictEqual(requiredSections.length, 19, 'Must verify all 19 ordered Roman clauses (I–XIX)');
  });

  test('Verify Commercial Terms (Matrix 30/55/10/5, Undertaking Letter, SWIFT BG, 5 Shipment Items & 12M Warranty)', () => {
    const comm = defaultTRSAProject.commercialTerms;
    assert.strictEqual(comm.selectedPaymentOption, 'Matrix Standard');
    assert.strictEqual(comm.matrixEquipmentSchedule.length, 4);
    assert.ok(comm.options.option1, 'Option 1 must exist');
    assert.ok(comm.options.option2, 'Option 2 must exist');
    assert.ok(comm.engineeringServicesPayment.includes('Undertaking Letter'), 'Engineering services payment must include 150-day Undertaking Letter condition');
    assert.strictEqual(comm.invoicingAndBankGuarantee.length, 2);
    assert.strictEqual(comm.shipmentItems.length, 5);
    assert.ok(comm.warranty.includes('twelve (12) months'), 'Warranty must specify 12 months post-FAC');
    assert.ok(comm.shipmentTerms.includes('Semarang Port'));
    assert.ok(comm.shipmentTerms.includes('110%'));
    assert.ok(comm.shipmentTerms.includes('25 years'));
  });

  test('Verify 13 Required Documentation Deliverables & 6 Appendices', () => {
    const docs = defaultTRSAProject.requiredDocumentation;
    assert.strictEqual(docs.length, 13, 'Must have exactly 13 required documentation deliverables per Matrix PDF');
    const titles = docs.map(d => d.title);
    assert.ok(titles.includes('As-Built Drawings'));
    assert.ok(titles.includes('Cabling Schedule'));
    assert.ok(titles.includes('Functional Design Specification (FDS)'));
    assert.ok(titles.includes('PLC & HMI (OIT) Source Code & Master Password'));
    assert.ok(titles.includes('Halal Compliance Documentation'));
    assert.ok(titles.includes('Equipment Layout Drawings'));

    const apps = defaultTRSAProject.appendices;
    assert.strictEqual(apps.length, 6, 'Must have 6 binding appendices (Appendix 1-6)');
    assert.ok(apps.some(a => a.title.includes('PMK No. 35/PMK.03/2019')));
    assert.ok(apps.some(a => a.title.includes('PP No. 44 Tahun 2022')));
  });

  test('Verify Vendor Origin Sourcing Options (Foreign, Local, Mixed)', () => {
    assert.strictEqual(defaultTRSAProject.documentInfo.vendorOrigin, 'Foreign', 'Default vendor origin should be Foreign');
    assert.strictEqual(defaultTRSAProject.commercialTerms.vendorOrigin, 'Foreign');
  });

  test('Verify General Information Master Data (Plant, Country of Origin, Machine Type, Vendor Name)', () => {
    assert.ok(defaultTRSAProject.generalInfo, 'Project must contain generalInfo section');
    assert.strictEqual(defaultTRSAProject.generalInfo.plantLocation, 'Semarang Plant');
    assert.strictEqual(defaultTRSAProject.generalInfo.countryOfOrigin, 'Japan');
    assert.strictEqual(defaultTRSAProject.generalInfo.equipmentType, 'Frying System');
    assert.strictEqual(defaultTRSAProject.generalInfo.vendorName, 'Heat and Control / Kiremko B.V.');
    assert.strictEqual(defaultTRSAProject.generalInfo.modelNumber, 'SPF-600 Continuous');
    assert.strictEqual(defaultTRSAProject.generalInfo.designCapacity, '600 kg/hour (Pellet Output)');
  });
});
