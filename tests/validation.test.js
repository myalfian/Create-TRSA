import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultTRSAProject } from '../src/data/defaultTRSA.js';
import {
  validateField,
  validateProject,
  validateStep,
  getFieldError
} from '../src/js/validationService.js';

function cloneDefaultProject() {
  return JSON.parse(JSON.stringify(defaultTRSAProject));
}

test('Real-Time Validation Engine', async (t) => {
  await t.test('defaultTRSAProject passes full validation with zero errors', () => {
    const project = cloneDefaultProject();
    const res = validateProject(project);
    assert.equal(res.valid, true);
    assert.equal(res.totalErrors, 0);
    assert.equal(res.errors.length, 0);
    for (let s = 1; s <= 6; s++) {
      assert.equal(res.byStep[s].length, 0);
    }
  });

  await t.test('Step 1 mandatory corporate specification fields report grouped errors when invalid', () => {
    const project = cloneDefaultProject();
    project.documentInfo.title = 'Bad';
    project.documentInfo.subTitle = '';
    project.documentInfo.docNumber = 'INVALID-123';
    project.generalInfo.vendorName = '__custom__';
    project.generalInfo.equipmentModels[0].modelNumber = '';
    project.generalInfo.equipmentModels[0].designCapacity = '';
    project.documentInfo.revisionHistory[0].date = '15-08-2024';

    const res = validateProject(project);
    assert.equal(res.valid, false);
    assert.ok(res.byStep[1].length >= 7);
    assert.ok(getFieldError(res, 'documentInfo.title'));
    assert.ok(getFieldError(res, 'documentInfo.subTitle'));
    assert.ok(getFieldError(res, 'documentInfo.docNumber'));
    assert.ok(getFieldError(res, 'generalInfo.vendorName'));
    assert.ok(getFieldError(res, 'generalInfo.equipmentModels.0.modelNumber'));
    assert.ok(getFieldError(res, 'generalInfo.equipmentModels.0.designCapacity'));
    assert.ok(getFieldError(res, 'revision.0.date'));
  });

  await t.test('Step 2 email format, contact fields, and site description validate accurately', () => {
    const project = cloneDefaultProject();
    project.keyContacts[0].email = 'not-an-email';
    project.keyContacts[0].name = '';
    project.siteDescription.invoiceRecipient = '';
    project.siteDescription.deliveryPort = '';
    project.siteDescription.address = 'Short';

    const stepRes = validateStep(project, 2);
    assert.equal(stepRes.valid, false);
    assert.equal(stepRes.count, 5);
    assert.match(getFieldError(stepRes, 'contact.0.email'), /valid email/i);
    assert.ok(getFieldError(stepRes, 'contact.0.name'));
    assert.ok(getFieldError(stepRes, 'siteDescription.invoiceRecipient'));
    assert.ok(getFieldError(stepRes, 'siteDescription.deliveryPort'));
    assert.ok(getFieldError(stepRes, 'siteDescription.address'));

    // Fixing email clears email error immediately via validateField
    assert.equal(validateField('contact.0.email', 'engineer@icbp.indofood.co.id').valid, true);
  });

  await t.test('Step 3 product specifications and process parameters validate accurately', () => {
    const project = cloneDefaultProject();
    project.productSpecifications[0].shape = '';
    project.productSpecifications[0].capacityOutput = '';
    project.processParameters.frying.temperatureRange = '';
    project.processParameters.seasoning.seasoningApplicationRate = '';

    const stepRes = validateStep(project, 3);
    assert.equal(stepRes.valid, false);
    assert.equal(stepRes.count, 4);
    assert.ok(getFieldError(stepRes, 'product.0.shape'));
    assert.ok(getFieldError(stepRes, 'product.0.capacityOutput'));
    assert.ok(getFieldError(stepRes, 'processParameters.frying.temperatureRange'));
    assert.ok(getFieldError(stepRes, 'processParameters.seasoning.seasoningApplicationRate'));
  });

  await t.test('Step 4 scope of supply, Step 5 hygiene/commissioning, and Step 6 commercial/sign-off validate accurately', () => {
    const project = cloneDefaultProject();
    project.scopeOfSupply.fryer[0].title = '';
    project.scopeOfSupply.seasoning[0].qty = '';
    project.hygieneAndQuality.foodContactMaterial = '';
    project.performanceAcceptance.commissioningDuration = '';
    project.commercialTerms.selectedPaymentOption = 'Invalid Option';
    project.signOff.seller.companyName = '';
    project.signOff.seller.name = '';
    project.signOff.seller.position = '';
    project.signOff.purchaser.name = '';

    const full = validateProject(project);
    assert.equal(full.valid, false);
    assert.equal(full.byStep[4].length, 2);
    assert.equal(full.byStep[5].length, 2);
    assert.equal(full.byStep[6].length, 4);
    assert.ok(getFieldError(full, 'scope.fryer.0.title'));
    assert.ok(getFieldError(full, 'scope.seasoning.0.qty'));
    assert.ok(getFieldError(full, 'hygieneAndQuality.foodContactMaterial'));
    assert.ok(getFieldError(full, 'performanceAcceptance.commissioningDuration'));
    assert.ok(getFieldError(full, 'commercialTerms.selectedPaymentOption'));
    assert.ok(getFieldError(full, 'signOff.seller.companyName'));
    assert.ok(getFieldError(full, 'signOff.seller.name'));
    assert.ok(getFieldError(full, 'signOff.purchaser.name'));
  });

  await t.test('validateField validates individual fields dynamically in real time', () => {
    assert.equal(validateField('documentInfo.title', '').valid, false);
    assert.equal(validateField('documentInfo.title', 'ABC').valid, false);
    assert.equal(validateField('documentInfo.title', 'Fryer & Seasoning Line Spec').valid, true);
    assert.equal(validateField('generalInfo.countryOriginForeign', '', { category: 'Foreign' }).valid, false);
    assert.equal(validateField('generalInfo.countryOriginForeign', '', { category: 'Local' }).valid, true);
    assert.equal(validateField('revision.0.date', '2024-08-15').valid, true);
  });
});
