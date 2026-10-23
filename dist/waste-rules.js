// Instant waste rules and dustbin classifications for household objects.
export const WASTE_CATEGORIES = {
  WET: {
    name: 'Wet / Biodegradable Waste',
    bin: 'Food Waste Bin',
    color: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.4)',
    icon: '🟢',
    dustbin: 'Green Bin',
    note: 'Organic matter. Remove all plastic wrappers, stickers or bags first.'
  },
  DRY_RECYCLABLE: {
    name: 'Dry Recyclable Waste',
    bin: 'Dry Recycling Bin',
    color: '#3b82f6',
    glow: 'rgba(59, 130, 246, 0.4)',
    icon: '🔵',
    dustbin: 'Blue Bin',
    note: 'Empty, rinse away residue and let dry. Separate lids.'
  },
  GENERAL: {
    name: 'General Waste',
    bin: 'General Waste Bin',
    color: '#eab308',
    glow: 'rgba(234, 179, 8, 0.4)',
    icon: '🟡',
    dustbin: 'Black / Grey Bin',
    note: 'Non-recyclable packaging or food-soiled material.'
  },
  HAZARDOUS: {
    name: 'Hazardous / E-Waste',
    bin: 'Special Collection Desk',
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.4)',
    icon: '🔴',
    dustbin: 'Red / Special Bin',
    note: 'Must NOT go into campus bins. Bring to special waste collection.'
  }
};

// Explicit whitelist of ONLY useful household waste, packaging and discardable items.
// Non-waste items (persons, chairs, furniture, pets, vehicles, appliances) are strictly ignored.
export const ITEM_CLASSIFICATIONS={
 'clear plastic bottle':{category:'DRY_RECYCLABLE',label:'Plastic bottle'},'other plastic bottle':{category:'DRY_RECYCLABLE',label:'Plastic bottle'},'plastic bottle cap':{category:'DRY_RECYCLABLE',label:'Plastic cap'},'plastic lid':{category:'DRY_RECYCLABLE',label:'Plastic lid'},'drink can':{category:'DRY_RECYCLABLE',label:'Metal can'},'food can':{category:'DRY_RECYCLABLE',label:'Food tin'},'metal lid':{category:'DRY_RECYCLABLE',label:'Metal lid'},'normal paper':{category:'DRY_RECYCLABLE',label:'Paper · check clean/dry'},'magazine paper':{category:'DRY_RECYCLABLE',label:'Paper · check clean/dry'},'corrugated carton':{category:'DRY_RECYCLABLE',label:'Cardboard · check residue'},'glass bottle':{category:'GLASS',label:'Glass bottle'},'glass jar':{category:'GLASS',label:'Glass jar'},'food waste':{category:'WET',label:'Biodegradable food scraps'},'paper cup':{category:'GENERAL',label:'Mixed / lined paper cup'},'drink carton':{category:'GENERAL',label:'Mixed drink carton'},'crisp packet':{category:'GENERAL',label:'Multilayer wrapper'},'other plastic wrapper':{category:'GENERAL',label:'Plastic wrapper'},'plastic film':{category:'GENERAL',label:'Flexible plastic'},'single-use carrier bag':{category:'GENERAL',label:'Plastic bag'},'polypropylene bag':{category:'GENERAL',label:'Plastic bag'},'tissues':{category:'GENERAL',label:'Tissue · check soiling'},'battery':{category:'HAZARDOUS',label:'Battery · special collection'},
 'pizza box':{category:'CHECK',label:'Pizza box · check grease'},'broken glass':{category:'CHECK',label:'Broken glass · ask facilities'},'other plastic':{category:'CHECK',label:'Plastic · verify type'},'unlabeled litter':{category:'CHECK',label:'Waste · verify material'},'aerosol':{category:'CHECK',label:'Aerosol · ask facilities'},'styrofoam piece':{category:'CHECK',label:'Foam · guide check'},'aluminium foil':{category:'CHECK',label:'Foil · guide check'},'paper bag':{category:'CHECK',label:'Paper bag · guide check'},'cigarette':{category:'CHECK',label:'Cigarette · guide check'}
};
WASTE_CATEGORIES.GLASS={name:'Glass collection',bin:'Glass collection',dustbin:'Glass collection',color:'#a78bfa',icon:'🟣',glow:'transparent',note:'Sample guide R4: empty and rinse bottles or jars; separate lids.'};
WASTE_CATEGORIES.CHECK={name:'Needs confirmation',bin:'Check local guide',dustbin:'Guide check',color:'#94a3b8',icon:'⚪',glow:'transparent',note:'Material detected; disposal is not confirmed by the guide.'};
WASTE_CATEGORIES.WET.dustbin='Biodegradable';WASTE_CATEGORIES.DRY_RECYCLABLE.dustbin='Dry recycling';WASTE_CATEGORIES.GENERAL.dustbin='General waste';WASTE_CATEGORIES.HAZARDOUS.dustbin='Special collection';

// Explicit blocklist: Things that must NEVER be identified as waste
export const NON_WASTE_CLASSES = new Set([
  'person', 'face', 'hand',
  'chair', 'couch', 'bed', 'dining table', 'toilet',
  'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'bird',
  'car', 'truck', 'bus', 'train', 'motorcycle', 'bicycle', 'airplane', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench',
  'tv', 'laptop', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
  'umbrella', 'backpack', 'handbag', 'suitcase'
]);

export function classifyWasteObject(rawClass) {
  const key = String(rawClass || '').toLowerCase().trim();

  // If it's a person, furniture, animal or background item, immediately reject it
  if (NON_WASTE_CLASSES.has(key)) {
    return {
      recognized: false,
      isNonWaste: true,
      label: key,
      rawClass: key,
      category: 'Not Waste',
      bin: 'Ignored',
      dustbin: 'Ignored',
      color: '#64748b',
      glow: 'transparent',
      icon: '⚪',
      note: 'Not a waste item'
    };
  }

  const match = ITEM_CLASSIFICATIONS[key];
  if (match) {
    const categoryInfo = WASTE_CATEGORIES[match.category] || WASTE_CATEGORIES.GENERAL;
    return {
      recognized: true,
      isNonWaste: false,
      label: match.label,
      rawClass: key,
      category: categoryInfo.name,
      bin: match.bin || categoryInfo.bin,
      dustbin: categoryInfo.dustbin,
      color: categoryInfo.color,
      glow: categoryInfo.glow,
      icon: categoryInfo.icon,
      note: match.tip || categoryInfo.note
    };
  }

  // Any other random class not in the whitelist is ignored
  return {
    recognized: false,
    isNonWaste: false,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    rawClass: key,
    category: 'Needs Check',
    bin: 'Check Campus Guide or Gemini AI',
    dustbin: 'Ask AI ↗',
    color: '#94a3b8',
    glow: 'rgba(148, 163, 184, 0.35)',
    icon: '⚪',
    note: 'Tap Inspect to verify with Gemini AI'
  };
}
