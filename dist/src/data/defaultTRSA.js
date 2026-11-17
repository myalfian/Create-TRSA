import {
  PLANT_MATRIX_PROFILES,
  DOCUMENT_SUBMISSION_COMPLIANCE,
  CONFIDENTIALITY_STANDARD,
  LANGUAGE_REQUIREMENT_STANDARD,
  SERVICES_SCOPE_STANDARD,
  ANCILLARIES_LOGISTICS_STANDARD,
  TECHNICAL_HYGIENIC_REQUIREMENTS_12,
  CONTROL_SYSTEM_ACCESS_RIGHTS,
  FINAL_ACCEPTANCE_RULES,
  REMEDIES_CONSEQUENCES_STANDARD,
  MATRIX_EQUIPMENT_PAYMENT_BREAKDOWN,
  MATRIX_ENGINEERING_SERVICES_PAYMENT,
  INVOICING_AND_BG_CONDITIONS,
  SHIPMENT_DELIVERY_ITEMS_5,
  WARRANTY_STANDARD,
  REQUIRED_DOCUMENTATION_13,
  APPENDICES_6,
  resolveContactsForPlant,
  buildLegalAndTaxProvisions,
  getShipmentTermsForMatrix
} from '../js/trsaMatrixService.js';

const plant1403Contacts = resolveContactsForPlant('1403');
const plant1403Profile = PLANT_MATRIX_PROFILES['1403'];

// Default TRSA Template preloaded with PT Indofood Fortuna Makmur Specification Matrix
export const defaultTRSAProject = {
  id: "trsa-006-ifm-2024",
  createdAt: "2024-08-30T08:00:00.000Z",
  updatedAt: "2024-08-30T08:00:00.000Z",
  documentInfo: {
    title: "Tender Requirements and Specification Agreement",
    subTitle: "For Supply of Sheeted Pellet Fryer & Seasoning System",
    docNumber: "006/RAP/TRSA – 1403/MFG-IFM/VIII/2024",
    status: "Published", // Draft, Approved, Under Review, Published
    category: "Food Processing Machinery",
    plantLocation: "Semarang Plant",
    vendorOrigin: "Foreign", // "Foreign" | "Local" | "Mixed"
    companyName: "PT. Indofood Fortuna Makmur",
    revisionHistory: [
      {
        revision: "0.0",
        description: "First Document",
        originatedBy: "Refin A Putra",
        date: "2024-08-30"
      }
    ]
  },
  generalInfo: {
    plantLocation: "Semarang Plant",
    countryOriginCategory: "Foreign",
    countryOriginForeign: "Japan",
    countryOfOrigin: "Japan",
    equipmentType: "Frying System",
    machineType: "Frying System",
    vendorName: "Heat and Control / Kiremko B.V.",
    modelNumber: "SPF-600 Continuous",
    designCapacity: "600 kg/hour (Pellet Output)",
    equipmentModels: [
      {
        id: "eq-1",
        modelNumber: "SPF-600 Continuous",
        designCapacity: "600 kg/hour (Pellet Output)"
      }
    ],
    targetCommissioning: "End of April 2025"
  },
  projectOverview: {
    description: "The purpose of this project is to supply one (1) Frying System and one (1) Seasoning System for Sheeted Pellet Lines Snacks, conforming to the product specifications of PT Indofood Fortuna Makmur Semarang.",
    keyDates: {
      lineStartUp: "End of April 2025",
      finalQuotationDrawings: "Mid-October 2024",
      orderPlacement: "Early November 2024"
    },
    confidentialityClause: CONFIDENTIALITY_STANDARD,
    languageRequirement: LANGUAGE_REQUIREMENT_STANDARD
  },
  keyContacts: JSON.parse(JSON.stringify(plant1403Contacts.contacts)),
  siteDescription: {
    invoiceRecipient: plant1403Profile.invoiceRecipient,
    address: plant1403Profile.address,
    purchasingAttn: JSON.parse(JSON.stringify(plant1403Profile.purchasingAttn)),
    deliveryPort: plant1403Profile.deliveryPort,
    customClearanceNote: plant1403Profile.customClearanceNote,
    documentSubmissionCompliance: DOCUMENT_SUBMISSION_COMPLIANCE
  },
  productSpecifications: [
    {
      id: "prod-1",
      shape: "3D Chicken Legs",
      description: "Cereal or potato based pellets, two layers 3D chicken leg shapes, perforated surface",
      dimensionInput: "30 - 35 mm x 10 - 13 mm ± 2mm",
      dimensionOutput: "NA (Expanded 3D shape)",
      capacityOutput: "600 Kg/hour (output pellet)",
      bulkDensityInput: "300 - 330 g/l",
      bulkDensityOutput: "40 - 70 g/l",
      moistureInput: "10.0 – 11.5 %",
      moistureOutput: "1.0 – 2.1 % (L-C-R gap ≤ 0.3%)",
      oilContentInput: "N/A",
      oilContentOutput: "28 – 40 %"
    },
    {
      id: "prod-2",
      shape: "3D Golgappa Pellets",
      description: "Cereal based pellets, two layers 3D oval shape, Flat surface",
      dimensionInput: "30 - 35 mm x 20 - 25 mm ± 2mm",
      dimensionOutput: "NA (Puffed hollow sphere)",
      capacityOutput: "600 Kg/hour (output pellet)",
      bulkDensityInput: "300 - 330 g/l",
      bulkDensityOutput: "40 - 70 g/l",
      moistureInput: "10.0 – 11.5 %",
      moistureOutput: "1.0 – 2.1 %",
      oilContentInput: "N/A",
      oilContentOutput: "28 – 40 %"
    },
    {
      id: "prod-3",
      shape: "3D Star Pellets",
      description: "Cereal or potato based pellets, double layers flower/star shape, solid surface",
      dimensionInput: "25 - 30 mm x 15 - 25 mm ± 2mm",
      dimensionOutput: "NA (Expanded 3D star)",
      capacityOutput: "600 Kg/hour (output pellet)",
      bulkDensityInput: "280 - 300 g/l",
      bulkDensityOutput: "NA",
      moistureInput: "10.0 – 11.5 %",
      moistureOutput: "1.0 – 2.1 %",
      oilContentInput: "N/A",
      oilContentOutput: "28 – 40 %"
    },
    {
      id: "prod-4",
      shape: "2D Pierced Chips",
      description: "Cereal or potato based pellets, single layers round chips, perforated surface",
      dimensionInput: "30 - 35 mm x 10 - 13 mm ± 2mm",
      dimensionOutput: "NA (Fried mesh chip)",
      capacityOutput: "600 Kg/hour (output pellet)",
      bulkDensityInput: "300 - 330 g/l",
      bulkDensityOutput: "40 - 70 g/l",
      moistureInput: "10.0 – 11.5 %",
      moistureOutput: "1.0 – 2.1 %",
      oilContentInput: "N/A",
      oilContentOutput: "28 – 40 %"
    }
  ],
  processParameters: {
    frying: {
      feederRate: "1.5 – 2.5 kg/batch",
      temperatureRange: "Min 180 °C – Max 190 °C",
      dwellTime: "20 – 30 seconds",
      oilCapacityInFryer: "Min 175 kg – Max 180 kg",
      spinnerRotationTime: "20 seconds",
      hopperGateOpening: "Min 8.5 cm – Max 12 cm"
    },
    seasoning: {
      requiredSeasoning: "Dry only",
      seasoningType: "Dry seasoning powder",
      saltContentBaseExcluded: "1.0 %",
      seasoningApplicationRate: "7.4 %",
      seasoningCapacity: "635 – 700 kg/hour"
    }
  },
  scopeOfSupply: {
    fryer: [
      {
        itemNumber: 1,
        title: "Pellet Feed System - ground level type",
        qty: "1 (one) unit",
        specs: [
          "Polymer flighted belt",
          "Conveyor frame with discharge chute, access door including safety switch at bottom section, safety mesh covers",
          "Vibratory feed conveyor with controller, safety mesh covers",
          "Upgrade vibratory conveyor to weighing feeder",
          "Fines screen and catch tray",
          "Product holding hopper (>70 L)",
          "Safety covers and support frame on castors",
          "J-boxes and wiring included",
          "All material, construction, cover, and product-contact must be Stainless Steel 304"
        ]
      },
      {
        itemNumber: 2,
        title: "Pellet Fryer Module",
        qty: "1 (one) unit",
        specs: [
          "Unitized pan design with automated screw hoists",
          "Fryer hood including CIP (Clean-in-Place) system",
          "3 x drain conveyors, drives equipped with stainless steel drip pan",
          "Stainless steel belt with carbon steel side chain",
          "Slip legs for leveling the fryer at installation",
          "All material, construction, cover, and touched product must be Stainless Steel 304",
          "Electrical system included with automatic oil top system (level transmitter and top-up mechanism)",
          "Electrical system included with automatic mixed oil top up system (fresh oil and used oil)",
          "Included with oil quantity magnetic flow meter for fast fill and top up oil"
        ]
      },
      {
        itemNumber: 3,
        title: "Drum Pre-Fryer",
        qty: "1 (one) unit",
        specs: [
          "60 mesh screen and 1 x spare screen included",
          "Air-knife with channel blower screen cleaning",
          "Fines removal auger",
          "Stainless steel construction"
        ]
      },
      {
        itemNumber: 4,
        title: "Horizontal Heat Exchanger Module",
        qty: "1 (one) unit",
        specs: [
          "Dual fuel burner system (Gas and Fuel Oil)",
          "Digital flow meter for gas and fuel oil",
          "Gas train (isolating valve, filter, double valve, pressure regulator, gas butterfly, high-low pressure switch / valve proofing)",
          "Oil regulator and oil filter included",
          "Stainless steel frame, casing, and tubes",
          "Fully modulating burner with push-button control panel",
          "Venturi meter (gas flow) and stack stub with flange connection"
        ]
      },
      {
        itemNumber: 5,
        title: "Main Oil Pump",
        qty: "1 (one) unit",
        specs: ["Cast iron construction with drive", "Stainless steel base", "Integrated vapour eliminator"]
      },
      {
        itemNumber: 6,
        title: "Flow Meter in Oil Circulation System",
        qty: "1 (one) unit",
        specs: ["Inline high-accuracy magnetic flow meter for continuous oil flow monitoring"]
      },
      {
        itemNumber: 7,
        title: "Oil Transfer Pump",
        qty: "1 (one) unit",
        specs: ["Gear type, 30 USGPM capacity", "Drive with stainless steel base"]
      },
      {
        itemNumber: 8,
        title: "Interconnecting Pipework",
        qty: "1 (one) lot",
        specs: [
          "Stainless steel pipe and flanges",
          "Valves 50NB and smaller: Stainless steel",
          "Valves over 50NB: Cast iron (pipework to oil tank excluded as per tender article VII-1.3-k)"
        ]
      },
      {
        itemNumber: 9,
        title: "Exhaust Stack for Fryer and CTHX",
        qty: "1 (one) lot",
        specs: ["Drawings only provided by Seller; fabrication by Purchaser/IFM"]
      },
      {
        itemNumber: 10,
        title: "De-Oiling Inspection Shaker Vibratory Conveyor",
        qty: "1 (one) unit",
        specs: [
          "Vibratory de-oiling shaker conveyor",
          "Includes oil accumulator and pump to transfer oil back into drum filter"
        ]
      },
      {
        itemNumber: 11,
        title: "Control Panel and Wiring (Fryer)",
        qty: "1 (one) unit",
        specs: [
          "Electrical Control Panel, 400 V - 50 Hz – 3-Phase, SUS304 enclosure",
          "PLC control with minimal 17-inch Operator Interface (HMI)",
          "PLC programming fully configured to specification",
          "Ewon Remote Access Router included (customer provides Internet) for commissioning and troubleshooting",
          "Machine pre-wiring from devices to J-Boxes using stainless steel conduits"
        ]
      },
      {
        itemNumber: 12,
        title: "Fryer Platform",
        qty: "1 (one) set",
        specs: ["All material must be Stainless Steel 304", "Included design, engineering drawing, and fabrication"]
      },
      {
        itemNumber: 13,
        title: "Fryer Stack & KHX Drawings",
        qty: "1 (one) lot",
        specs: ["Engineering drawings only for Stack and Heat Exchanger interfaces"]
      },
      {
        itemNumber: 14,
        title: "Ancillaries, Testing & Commissioning (Fryer)",
        qty: "1 (one) lot",
        specs: [
          "Comprehensive documentation package and tag identification for all valves and electrical circuits",
          "Loading, crating, packing CIF to Semarang port",
          "Interfacing, shop test, disassembly before shipment",
          "Supervised installation and commissioning on site",
          "Operator training course and maintenance personnel diagnostic training"
        ]
      }
    ],
    seasoning: [
      {
        itemNumber: 1,
        title: "Infeed System",
        qty: "1 (one) unit",
        specs: [
          "Feed / control conveyor and weigh conveyor",
          "Full Stainless Steel 304 construction for all main parts and structural supports"
        ]
      },
      {
        itemNumber: 2,
        title: "Tumble Drum",
        qty: "1 (one) unit",
        specs: [
          "Drum capacity: 635 – 700 kg/hr",
          "Manual angle adjustment",
          "Stainless steel 304 drum docking station, infeed and outfeed dust covers, and outfeed product chute",
          "Mobile design on heavy-duty lockable castors"
        ]
      },
      {
        itemNumber: 3,
        title: "Seasoning Controls (PLC Software & Panel)",
        qty: "1 (one) unit",
        specs: [
          "Full PLC equipment and pre-configured control software",
          "Stainless steel 304 panel enclosure equipped with air conditioner and Digital Power Meter",
          "Analogue signals 4-20mA current loop between PLC and field instrumentation",
          "Comprehensive cabling schedule detailing cable types, sizing, and runs"
        ]
      },
      {
        itemNumber: 4,
        title: "Seasoning Application System",
        qty: "1 (one) set",
        specs: [
          "Metering screw feeder with stainless powder hopper",
          "Seasoning screw and matching front plate + Salt screw and matching front plate",
          "Stainless C-frame support structure",
          "Loss-in-Weight precise dosing control",
          "Scarf feeder (960mm length) with stainless outfeed product chute"
        ]
      },
      {
        itemNumber: 5,
        title: "Screw Bulk Fill System with Auger Screw Elevator",
        qty: "1 (one) unit",
        specs: [
          "Spiro-flow filling system with Allen Bradley controls",
          "UHMWPE tube, screw conveyor 3.5M; Model 55 St/St Round Spiral @ 4000mm",
          "Operator Access Platform (Skid) - Design & manufacturing drawing only"
        ]
      },
      {
        itemNumber: 6,
        title: "Control - Panel View (Seasoning)",
        qty: "1 (one) unit",
        specs: [
          "PLC Control based on AB - ControlLogix Platform",
          "HMI 17-inch touch display",
          "CompactLogix L43 PLC with 2 Ethernet communication cards",
          "Main isolator switch and standard pre-installed software",
          "Circuit breakers for up to 12 remote power devices / IO points"
        ]
      },
      {
        itemNumber: 7,
        title: "Ancillaries, Testing & Training (Seasoning)",
        qty: "1 (one) lot",
        specs: [
          "Documentation, valve and wire tagging, CIF Semarang crating",
          "Shop testing and disassembly",
          "Supervised installation, commissioning, operator and maintenance training courses"
        ]
      }
    ],
    servicesScope: JSON.parse(JSON.stringify(SERVICES_SCOPE_STANDARD)),
    ancillariesAndLogistics: [...ANCILLARIES_LOGISTICS_STANDARD],
    controlSystemAccess: JSON.parse(JSON.stringify(CONTROL_SYSTEM_ACCESS_RIGHTS))
  },
  utilityRequirements: {
    electrical: "Voltage: 3P 380 VAC / 1P 220 VAC 50 Hz (Consumption to be declared by Seller in kW)",
    compressedAir: "Indofood supplies piping. Seller supplies pressure regulator & filter. (Consumption l/hr and pressure to be filled)",
    gasSupply: "Indofood supplies piping. Seller supplies gas train, regulator, filter, and safety valves.",
    panels: "2 main electrical panels (1 for fryer, 1 for seasoning) made of SUS304 (min IP65) with lockable safety isolator switches."
  },
  hygieneAndQuality: {
    foodContactMaterial: "Minimum Certified Stainless Steel 304 (SUS304) or certified food-grade materials (FDA / EU 1935/2004 + EN 10204 3.1) for all product-contact parts.",
    designStandards: "EHEDG / 3-A compliant hygienic design: smooth, crevice-free, seal-welded frames, zero dead-leg drainable piping, IP65 SUS304 enclosures, IE3 motors (IEC 60034-30-1), lockable isolators, drip/grease pans, and interlocked safety guards.",
    certificatesRequired: [
      "Valid calibration certificates (with documented calibration points) for every measuring instrument (temperature, pressure, flow, load cells/weight sensors)",
      "Valid food-grade compliance certificates (FDA or EU 1935/2004) for non-metallic contact parts (PTFE/Teflon, gaskets, hoses)",
      "Mill Test Certificates (EN 10204 3.1) plus SDS/MSDS for metallic contact components"
    ],
    generalTechnicalHygienic12: JSON.parse(JSON.stringify(TECHNICAL_HYGIENIC_REQUIREMENTS_12))
  },
  performanceAcceptance: {
    commissioningDuration: "2 hours per product (excluding setup/prep time). Moisture & oil checked ex-cooling conveyor.",
    tests: [
      {
        step: "1. Fryer Setting & Starting Up",
        observation: "Verification of oil level vs volume; Setting frying temp (compare panel vs actual); Conveyor & paddle speed stability; Output evaluation at 600 kg/h.",
        target: "Output: 600 kg/h. Continuous running 7-hour capability trial once parameters stable."
      },
      {
        step: "2. 7-Hour Capability Trial",
        observation: "Check moisture surface of pellet; Record frying temp (inlet, outlet, delta T); Check oil FFA; Check ex-frying quality.",
        target: "Sampling per 4 minutes in 1 hour period (15 times sampling per hour)."
      },
      {
        step: "3. Ex-Frying Quality Standards",
        observation: "Take 200g sample of ex-frying pellet. Analyze moisture & fat content.",
        target: "Moisture: 1.0 – 2.1% (*Left-Center-Right gap ≤ 0.3%). Oil Content: 28 – 40%."
      },
      {
        step: "4. Pellet Defect & Sensory Analysis",
        observation: "Visually check 200g pellet, group and weigh defects in %, analyze sensory attributes (Appearance, Aroma, Taste, Texture - Ok/Not Ok).",
        target: "Zero critical defects; all sensory attributes evaluated Ok; 15 samplings/hour."
      },
      {
        step: "5. Seasoning System Acceptance",
        observation: "Hopper level 10cm, screw applicator alignment, salt content %SA sampling 200g per 4 min (15 times/hour).",
        target: "Salt content: 1.0% (base excluded); Application rate: 7.4%; Seasoning capacity: 635 – 700 kg/h."
      }
    ],
    finalAcceptance: "Final Site Acceptance (SAT) will be certified only after continuous reliable operation, comprehensive FAT/SAT Operator & Maintenance training evidenced by signed training attendance sheets, formal FAC execution, and recording of any pending items on a binding Snag List (Punch List) with corrective action plans, PIC, and completion timelines prior to final sign-off.",
    finalAcceptanceChecklist: JSON.parse(JSON.stringify(FINAL_ACCEPTANCE_RULES)),
    failureConsequence: "1. Rectification Period: Seller shall undertake all corrective actions—repairs, modifications, or machine/component replacement—within three (3) months from Buyer's failure notification, bearing all associated costs including raw materials consumed during re-testing. 2. Rejection & Full Refund: Should target performance remain unmet after 3 months, Seller shall refund 100% of all payments released by Buyer and dismantle/remove the equipment from Buyer's premises at Seller's sole expense and risk.",
    remediesAndConsequences: JSON.parse(JSON.stringify(REMEDIES_CONSEQUENCES_STANDARD))
  },
  commercialTerms: {
    selectedPaymentOption: "Matrix Standard", // Matrix Standard, Option 1, or Option 2
    matrixEquipmentSchedule: JSON.parse(JSON.stringify(MATRIX_EQUIPMENT_PAYMENT_BREAKDOWN)),
    options: {
      matrixStandard: {
        title: "IFM Compliance Matrix Standard (T/T & SWIFT APBG)",
        breakdown: JSON.parse(JSON.stringify(MATRIX_EQUIPMENT_PAYMENT_BREAKDOWN))
      },
      option1: {
        title: "Option 1 (Standard L/C & T/T)",
        breakdown: [
          { percent: "85%", method: "L/C against Shipping Documents" },
          { percent: "10%", method: "T/T after machine running (not later than 60 calendar days from B/L date)" },
          { percent: "5%", method: "T/T 3 months after machine running (not later than 150 calendar days from B/L date)" }
        ]
      },
      option2: {
        title: "Option 2 (Down Payment with Bank Guarantee)",
        breakdown: [
          { percent: "30%", method: "Down Payment via T/T against irrevocable SWIFT/Telex Advance Payment Bank Guarantee" },
          { percent: "55%", method: "Progress Payment via T/T against original commercial invoice & complete shipping documents" },
          { percent: "10%", method: "Commissioning T/T upon trial run + signed Acceptance Certificate (or <= 60 calendar days from B/L)" },
          { percent: "5%", method: "Retention T/T 3 Months after machine running & FAC (or <= 150 calendar days from B/L)" }
        ]
      }
    },
    vendorOrigin: "Foreign",
    engineeringServicesPayment: MATRIX_ENGINEERING_SERVICES_PAYMENT,
    invoicingAndBankGuarantee: [...INVOICING_AND_BG_CONDITIONS],
    shipmentTerms: getShipmentTermsForMatrix('1403', 'Foreign'),
    shipmentItems: JSON.parse(JSON.stringify(SHIPMENT_DELIVERY_ITEMS_5)),
    warranty: WARRANTY_STANDARD
  },
  legalAndTaxProvisions: buildLegalAndTaxProvisions('1403', 'Foreign'),
  requiredDocumentation: JSON.parse(JSON.stringify(REQUIRED_DOCUMENTATION_13)),
  appendices: JSON.parse(JSON.stringify(APPENDICES_6)),
  signOff: {
    seller: {
      companyName: "PT. Global Machinery Solutions / OEM Partner",
      quotationNo: "GMS-TRSA-IFM-2024-089",
      date: "2024-10-15",
      name: "Alexander Vance",
      position: "Commercial Director",
      signed: true
    },
    purchaser: {
      companyName: "PT. Indofood Fortuna Makmur",
      name: "Moh Yusuf Alfian",
      position: "Project & Engineering Manager",
      date: "2024-10-18",
      signed: true
    }
  }
};

