// Default TRSA Template preloaded with PT Indofood Fortuna Makmur Specification
export const defaultTRSAProject = {
  id: "trsa-006-ifm-2024",
  documentInfo: {
    title: "Tender Requirements and Specification Agreement",
    subTitle: "For Supply of Sheeted Pellet Fryer & Seasoning System",
    docNumber: "006/RAP/TRSA – 1403/MFG-IFM/VIII/2024",
    status: "Published", // Draft, Under Review, Tender Published, Bid Received, Awarded
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
    confidentialityClause: "All information disclosed within this document and during the course of this project shall be treated as confidential and proprietary. The recipient agrees to maintain the confidentiality of this information and not to disclose it to any third party without the prior written consent of PT. Indofood Fortuna Makmur.",
    languageRequirement: "All site installation equipment and software (OIT) should be in English. Label on control panels and operator interface panel will be in English. OIT screens are to be in English selection."
  },
  keyContacts: [
    {
      id: "c1",
      name: "Moh Yusuf Alfian",
      role: "Project & Engineering Manager",
      companyAddress: "PT. Indofood Fortuna Makmur Cikupa, Jalan Bhumimas II No. 5 Kawasan Industri dan Pergudangan Cikupamas RT 01 RW 03 Kampung Telaga, Cikupa - Banten",
      email: "my.alfian@icbp.indofood.co.id",
      isPrimary: true
    },
    {
      id: "c2",
      name: "Natalia Happy",
      role: "Purchasing Supervisor",
      companyAddress: "PT. Indofood Fortuna Makmur Semarang, Jalan Tambak Aji IV No.10, Tambakaji, Kec. Ngaliyan, Kota Semarang, Jawa Tengah 50185",
      email: "natalia.happy@icbp.indofood.co.id",
      isPrimary: true
    },
    {
      id: "c3",
      name: "Murdani",
      role: "Project & Engineering",
      companyAddress: "PT. Indofood Fortuna Makmur Cikupa",
      email: "m.murdani@icbp.indofood.co.id",
      isPrimary: false
    },
    {
      id: "c4",
      name: "Ayodya Maulana Gunoro",
      role: "Project & Engineering",
      companyAddress: "PT. Indofood Fortuna Makmur Cikupa",
      email: "ayodya.gunoro@icbp.indofood.co.id",
      isPrimary: false
    },
    {
      id: "c5",
      name: "Dany Taufiq Alim Ansori",
      role: "Project & Engineering",
      companyAddress: "PT. Indofood Fortuna Makmur Cikupa",
      email: "dany.ansori@icbp.indofood.co.id",
      isPrimary: false
    }
  ],
  siteDescription: {
    invoiceRecipient: "PT Indofood Fortuna Makmur",
    address: "Jalan Tambak Aji IV Nomor 10, Tambakaji, Kecamatan Ngaliyan, Kota Semarang, Jawa Tengah 50185, Indonesia",
    purchasingAttn: [
      { name: "Natalia Happy", email: "natalia.happy@icbp.indofood.co.id" },
      { name: "Yanuar Ari Wibowo", email: "yanuar.wibowo@icbp.indofood.co.id" }
    ],
    deliveryPort: "Semarang Port (CIF/CIP)",
    customClearanceNote: "Indofood will handle custom clearance in the Indonesian port after receiving final original shipping documents. If the goods arrive before documents, any demurrage/storage cost will be charged to The Seller."
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
    ]
  },
  utilityRequirements: {
    electrical: "Voltage: 3P 380 VAC / 1P 220 VAC 50 Hz (Consumption to be declared by Seller in kW)",
    compressedAir: "Indofood supplies piping. Seller supplies pressure regulator & filter. (Consumption l/hr and pressure to be filled)",
    gasSupply: "Indofood supplies piping. Seller supplies gas train, regulator, filter, and safety valves.",
    panels: "2 main electrical panels (1 for fryer, 1 for seasoning) made of SUS304 with safety isolator switches."
  },
  hygieneAndQuality: {
    foodContactMaterial: "Stainless Steel 304 or certified food-grade materials for all parts in contact with product.",
    designStandards: "Hygienic design: smooth, accessible, cleanable, self-draining surfaces in wet process areas; no penetrates holes/nuts; piping with zero dead ends.",
    certificatesRequired: [
      "Calibration certificate for each measuring device (temperature, pressure, weight, etc.)",
      "Food grade certificate for all material touching product (Teflon, hose, belts, seals)",
      "Material Safety Data Sheet (MSDS) / Material Certificates"
    ]
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
    finalAcceptance: "Final Site Acceptance will be certified upon successful completion of the continuous 7-hour capability trial meeting all throughput (600 kg/h), moisture (1.0–2.1%, L-C-R ≤0.3%), oil uptake (28–40%), and seasoning consistency criteria. Both Seller and Indofood representatives shall execute the official Final Acceptance Certificate.",
    failureConsequence: "If The Seller cannot achieve target performance, Seller must rectify and modify within 3 months. All extra costs for modification, replacement machines, and raw materials must be borne by The Seller."
  },
  commercialTerms: {
    selectedPaymentOption: "Option 1", // Option 1 or Option 2
    options: {
      option1: {
        title: "Option 1 (Standard L/C & T/T)",
        breakdown: [
          { percent: "85%", method: "L/C against Shipping Documents" },
          { percent: "10%", method: "T/T after machine running (not later than 60 days from B/L date)" },
          { percent: "5%", method: "T/T 3 months after machine running (not later than 120 days from B/L date)" }
        ]
      },
      option2: {
        title: "Option 2 (Down Payment with Bank Guarantee)",
        breakdown: [
          { percent: "30%", method: "Down Payment Counter with Bank Guarantee" },
          { percent: "55%", method: "L/C payable prior to shipping" },
          { percent: "10%", method: "After Machine Running" },
          { percent: "5%", method: "T/T Retention 3 Months after machine running" }
        ]
      }
    },
    vendorOrigin: "Foreign",
    engineeringServicesPayment: "100% by T/T after machine running with signed acceptance certificate.",
    shipmentTerms: "CIF / CIP Semarang Port, Indonesia. Endorsed Marine Insurance ICC A/AIR for at least 110% invoice value payable to Bank Central Asia (BCA) in Jakarta. Carrying vessel must not be older than 25 years.",
    warranty: "Minimum 12 months continuous operation after final site acceptance, with phone support during office hours.",
  },
  legalAndTaxProvisions: [
    {
      title: "Cost Quotation Separation",
      description: "The Seller shall provide separate quotations for Equipment and Engineering Services costs."
    },
    {
      title: "Duty Exemption Documentation",
      description: "For equipment from countries with Economic Partnership Agreements (EPA), Seller must furnish Form DGT/exemption prior to demurrage expiry, or incurrence is deducted from contract value."
    },
    {
      title: "Withholding Tax (PPh 26 / Double Tax Treaty)",
      description: "Indonesian withholding tax (PPh 26) of 20% applies to services. If valid DGT Form is provided, treaty rates apply (e.g., 5% Switzerland, 7.5% Germany, 10% India/Luxembourg, 0% for applicable treaties)."
    },
    {
      title: "Permanent Establishment (PMK 35/2019)",
      description: "Exceeding 6 months cumulative service stay in 1 year requires Indonesian NPWP & Permanent Establishment (BUT), subject to PPh 23 (approx 4%). Otherwise 20% PPh 26 applies."
    },
    {
      title: "Visas & Engineer Expenses",
      description: "Dispatched engineers must possess valid Indonesian working visas. Indonesian visa costs borne by IFM; home country visa by Seller. Daily allowance, flights, insurance borne by Seller; local Indonesian lodging & transport borne by IFM."
    },
    {
      title: "Value Added Tax (PPN & PPh Local)",
      description: "Subject to Indonesian tax laws (PP No. 44 Tahun 2022 Pasal 23 ayat 2). Invoices must include original Kwitansi affixed with official Materai (stamp duty)."
    }
  ],
  requiredDocumentation: [
    { id: 1, title: "As-built Drawings", desc: "As-built control panel drawings", required: true },
    { id: 2, title: "Cabling Schedule", desc: "Detailed cabling schedule and conduit layout", required: true },
    { id: 3, title: "Functional Design Specification (FDS)", desc: "Complete Functional Design Specification", required: true },
    { id: 4, title: "Software Design Specifications", desc: "Comprehensive software and PLC architecture specifications", required: true },
    { id: 5, title: "PLC Listings", desc: "Fully annotated PLC ladder/code listings", required: true },
    { id: 6, title: "PLC and HMI Code and Licenses", desc: "Copy of complete PLC code, HMI runtime files, and associated software licenses", required: true },
    { id: 7, title: "Operational Manual", desc: "Comprehensive operational manual for equipment in English", required: true },
    { id: 8, title: "Maintenance Manual", desc: "Mechanical and electrical maintenance manual with troubleshooting guides", required: true },
    { id: 9, title: "Operator Work Instructions", desc: "Detailed step-by-step SOP / working instructions for line operators", required: true },
    { id: 10, title: "Recommended Spare Parts List", desc: "List of recommended critical and consumable spare parts for 1-2 years", required: true },
    { id: 11, title: "Recommended Maintenance Schedule", desc: "Periodic preventative maintenance timetable (daily, weekly, monthly, annual)", required: true },
    { id: 12, title: "Calibration Certificates", desc: "Calibration certificates for all temperature, pressure, flow, and weight measuring devices", required: true },
    { id: 13, title: "Halal Compliance Documentation", desc: "Halal certificate or formal Statement Letter confirming non-halal contact exclusion", required: true },
    { id: 14, title: "Equipment Layout (DWG)", desc: "Layout drawings including top view, elevation, sections, and interface boundaries in DWG format", required: true }
  ],
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
