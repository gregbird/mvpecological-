/**
 * Habitat-Species Mapping for Smart Scoping
 *
 * Maps FOSSITT habitat codes to potential protected/notable species
 * that may be present. Used to generate field survey recommendations
 * based on desk study findings.
 *
 * Reference: Heritage Council FOSSITT Guide (2000)
 */

export interface SpeciesRecommendation {
  species: string
  scientificName: string
  reason: string
  priority: 'high' | 'medium' | 'low'
  surveyType: string
  optimalMonths: string[]
  protectionStatus: string[]
}

export interface HabitatSpeciesMapping {
  habitatName: string
  habitatCategory: string
  species: SpeciesRecommendation[]
}

/**
 * Core habitat-species mapping based on FOSSITT codes
 * This maps habitats to species that are likely to use them
 */
export const habitatSpeciesMapping: Record<string, HabitatSpeciesMapping> = {
  // ========== FRESHWATER (FW) ==========
  FW1: {
    habitatName: 'Eroding/Upland Rivers',
    habitatCategory: 'Freshwater',
    species: [
      {
        species: 'Otter',
        scientificName: 'Lutra lutra',
        reason: 'Key foraging habitat, may have holts along banks',
        priority: 'high',
        surveyType: 'Otter Survey',
        optimalMonths: [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ],
        protectionStatus: ['Annex II', 'Annex IV', 'Wildlife Acts'],
      },
      {
        species: 'Atlantic Salmon',
        scientificName: 'Salmo salar',
        reason: 'Spawning rivers in upland areas',
        priority: 'high',
        surveyType: 'Fish Survey',
        optimalMonths: ['Oct', 'Nov', 'Dec'],
        protectionStatus: ['Annex II', 'Annex V'],
      },
      {
        species: 'Freshwater Pearl Mussel',
        scientificName: 'Margaritifera margaritifera',
        reason: 'Clean upland rivers are key habitat',
        priority: 'high',
        surveyType: 'FWPM Survey',
        optimalMonths: ['Jun', 'Jul', 'Aug', 'Sep'],
        protectionStatus: ['Annex II', 'Annex V', 'Wildlife Acts'],
      },
      {
        species: 'Dipper',
        scientificName: 'Cinclus cinclus',
        reason: 'Resident on clean rivers',
        priority: 'medium',
        surveyType: 'Bird Survey',
        optimalMonths: ['Mar', 'Apr', 'May', 'Jun'],
        protectionStatus: ['Amber Listed'],
      },
    ],
  },

  FW2: {
    habitatName: 'Depositing/Lowland Rivers',
    habitatCategory: 'Freshwater',
    species: [
      {
        species: 'Otter',
        scientificName: 'Lutra lutra',
        reason: 'Key foraging habitat, holts in riverbanks',
        priority: 'high',
        surveyType: 'Otter Survey',
        optimalMonths: [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ],
        protectionStatus: ['Annex II', 'Annex IV', 'Wildlife Acts'],
      },
      {
        species: 'Kingfisher',
        scientificName: 'Alcedo atthis',
        reason: 'Nesting in riverbanks, fishing in calm waters',
        priority: 'high',
        surveyType: 'Bird Survey',
        optimalMonths: ['Apr', 'May', 'Jun', 'Jul'],
        protectionStatus: ['Annex I', 'Wildlife Acts'],
      },
      {
        species: 'Lamprey species',
        scientificName: 'Lampetra spp. / Petromyzon marinus',
        reason: 'Sandy/silty substrates for ammocoete larvae',
        priority: 'medium',
        surveyType: 'Fish Survey',
        optimalMonths: ['May', 'Jun', 'Jul', 'Aug'],
        protectionStatus: ['Annex II'],
      },
      {
        species: 'White-clawed Crayfish',
        scientificName: 'Austropotamobius pallipes',
        reason: 'Native crayfish in clean rivers',
        priority: 'medium',
        surveyType: 'Aquatic Survey',
        optimalMonths: ['Jul', 'Aug', 'Sep'],
        protectionStatus: ['Annex II', 'Wildlife Acts'],
      },
    ],
  },

  FW3: {
    habitatName: 'Canals',
    habitatCategory: 'Freshwater',
    species: [
      {
        species: 'Otter',
        scientificName: 'Lutra lutra',
        reason: 'Uses canals as movement corridors',
        priority: 'medium',
        surveyType: 'Otter Survey',
        optimalMonths: [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ],
        protectionStatus: ['Annex II', 'Annex IV', 'Wildlife Acts'],
      },
      {
        species: 'Bats',
        scientificName: 'Chiroptera',
        reason: 'Foraging over water, bridges as roosts',
        priority: 'medium',
        surveyType: 'Bat Survey',
        optimalMonths: ['May', 'Jun', 'Jul', 'Aug', 'Sep'],
        protectionStatus: ['Annex IV', 'Wildlife Acts'],
      },
    ],
  },

  FW4: {
    habitatName: 'Drainage Ditches',
    habitatCategory: 'Freshwater',
    species: [
      {
        species: 'Smooth Newt',
        scientificName: 'Lissotriton vulgaris',
        reason: 'Breeding habitat in slow-moving ditches',
        priority: 'medium',
        surveyType: 'Amphibian Survey',
        optimalMonths: ['Mar', 'Apr', 'May', 'Jun'],
        protectionStatus: ['Wildlife Acts'],
      },
      {
        species: 'Common Frog',
        scientificName: 'Rana temporaria',
        reason: 'Breeding in wet ditches',
        priority: 'low',
        surveyType: 'Amphibian Survey',
        optimalMonths: ['Feb', 'Mar', 'Apr', 'May'],
        protectionStatus: ['Wildlife Acts'],
      },
    ],
  },

  FL1: {
    habitatName: 'Dystrophic Lakes',
    habitatCategory: 'Freshwater',
    species: [
      {
        species: 'Common Scoter',
        scientificName: 'Melanitta nigra',
        reason: 'Breeding on oligotrophic lakes',
        priority: 'high',
        surveyType: 'Waterbird Survey',
        optimalMonths: ['Apr', 'May', 'Jun', 'Jul'],
        protectionStatus: ['Annex I', 'Red Listed'],
      },
    ],
  },

  FL2: {
    habitatName: 'Oligotrophic Lakes',
    habitatCategory: 'Freshwater',
    species: [
      {
        species: 'Arctic Char',
        scientificName: 'Salvelinus alpinus',
        reason: 'Cold, deep oligotrophic lakes',
        priority: 'high',
        surveyType: 'Fish Survey',
        optimalMonths: ['Sep', 'Oct', 'Nov'],
        protectionStatus: ['Wildlife Acts'],
      },
      {
        species: 'Common Scoter',
        scientificName: 'Melanitta nigra',
        reason: 'Breeding on large oligotrophic lakes',
        priority: 'high',
        surveyType: 'Waterbird Survey',
        optimalMonths: ['Apr', 'May', 'Jun', 'Jul'],
        protectionStatus: ['Annex I', 'Red Listed'],
      },
    ],
  },

  FL3: {
    habitatName: 'Mesotrophic Lakes',
    habitatCategory: 'Freshwater',
    species: [
      {
        species: 'Otter',
        scientificName: 'Lutra lutra',
        reason: 'Productive lakes for foraging',
        priority: 'high',
        surveyType: 'Otter Survey',
        optimalMonths: [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ],
        protectionStatus: ['Annex II', 'Annex IV', 'Wildlife Acts'],
      },
      {
        species: 'Wintering Waterbirds',
        scientificName: 'Various',
        reason: 'Key habitat for wildfowl',
        priority: 'high',
        surveyType: 'I-WeBS Count',
        optimalMonths: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
        protectionStatus: ['Annex I (various)'],
      },
    ],
  },

  FL4: {
    habitatName: 'Eutrophic Lakes',
    habitatCategory: 'Freshwater',
    species: [
      {
        species: 'Wintering Waterbirds',
        scientificName: 'Various',
        reason: 'Productive lakes attract wildfowl',
        priority: 'high',
        surveyType: 'I-WeBS Count',
        optimalMonths: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
        protectionStatus: ['Annex I (various)'],
      },
    ],
  },

  // ========== WOODLAND (WN/WD/WS) ==========
  WN1: {
    habitatName: 'Oak-Birch-Holly Woodland',
    habitatCategory: 'Woodland',
    species: [
      {
        species: 'Bats',
        scientificName: 'Chiroptera',
        reason: 'Roosting in mature trees, foraging in woodland',
        priority: 'high',
        surveyType: 'Bat Survey',
        optimalMonths: ['May', 'Jun', 'Jul', 'Aug', 'Sep'],
        protectionStatus: ['Annex IV', 'Wildlife Acts'],
      },
      {
        species: 'Red Squirrel',
        scientificName: 'Sciurus vulgaris',
        reason: 'Native woodland species',
        priority: 'medium',
        surveyType: 'Mammal Survey',
        optimalMonths: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
        protectionStatus: ['Wildlife Acts'],
      },
      {
        species: 'Pine Marten',
        scientificName: 'Martes martes',
        reason: 'Woodland predator, den sites in trees',
        priority: 'medium',
        surveyType: 'Mammal Survey',
        optimalMonths: [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ],
        protectionStatus: ['Annex V', 'Wildlife Acts'],
      },
      {
        species: 'Badger',
        scientificName: 'Meles meles',
        reason: 'Sett habitat in woodland banks',
        priority: 'high',
        surveyType: 'Badger Survey',
        optimalMonths: ['Feb', 'Mar', 'Apr'],
        protectionStatus: ['Wildlife Acts'],
      },
    ],
  },

  WN2: {
    habitatName: 'Oak-Ash-Hazel Woodland',
    habitatCategory: 'Woodland',
    species: [
      {
        species: 'Bats',
        scientificName: 'Chiroptera',
        reason: 'Roosting in mature trees, foraging in woodland',
        priority: 'high',
        surveyType: 'Bat Survey',
        optimalMonths: ['May', 'Jun', 'Jul', 'Aug', 'Sep'],
        protectionStatus: ['Annex IV', 'Wildlife Acts'],
      },
      {
        species: 'Badger',
        scientificName: 'Meles meles',
        reason: 'Suitable sett habitat in woodland',
        priority: 'high',
        surveyType: 'Badger Survey',
        optimalMonths: ['Feb', 'Mar', 'Apr'],
        protectionStatus: ['Wildlife Acts'],
      },
      {
        species: 'Kerry Slug',
        scientificName: 'Geomalacus maculosus',
        reason: 'Oak woodland in SW Ireland',
        priority: 'medium',
        surveyType: 'Invertebrate Survey',
        optimalMonths: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
        protectionStatus: ['Annex II', 'Annex IV'],
      },
    ],
  },

  WN4: {
    habitatName: 'Wet Willow-Alder-Ash Woodland',
    habitatCategory: 'Woodland',
    species: [
      {
        species: 'Otter',
        scientificName: 'Lutra lutra',
        reason: 'Riparian woodland provides cover',
        priority: 'high',
        surveyType: 'Otter Survey',
        optimalMonths: [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ],
        protectionStatus: ['Annex II', 'Annex IV', 'Wildlife Acts'],
      },
      {
        species: 'Bats',
        scientificName: 'Chiroptera',
        reason: 'Foraging over water and in wet woodland',
        priority: 'high',
        surveyType: 'Bat Survey',
        optimalMonths: ['May', 'Jun', 'Jul', 'Aug', 'Sep'],
        protectionStatus: ['Annex IV', 'Wildlife Acts'],
      },
    ],
  },

  WN5: {
    habitatName: 'Riparian Woodland',
    habitatCategory: 'Woodland',
    species: [
      {
        species: 'Otter',
        scientificName: 'Lutra lutra',
        reason: 'Key riparian habitat, holt sites',
        priority: 'high',
        surveyType: 'Otter Survey',
        optimalMonths: [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ],
        protectionStatus: ['Annex II', 'Annex IV', 'Wildlife Acts'],
      },
      {
        species: 'Kingfisher',
        scientificName: 'Alcedo atthis',
        reason: 'Nesting in riverbanks within riparian woodland',
        priority: 'high',
        surveyType: 'Bird Survey',
        optimalMonths: ['Apr', 'May', 'Jun', 'Jul'],
        protectionStatus: ['Annex I', 'Wildlife Acts'],
      },
    ],
  },

  WS1: {
    habitatName: 'Scrub',
    habitatCategory: 'Woodland',
    species: [
      {
        species: 'Badger',
        scientificName: 'Meles meles',
        reason: 'Dense scrub provides sett cover',
        priority: 'medium',
        surveyType: 'Badger Survey',
        optimalMonths: ['Feb', 'Mar', 'Apr'],
        protectionStatus: ['Wildlife Acts'],
      },
      {
        species: 'Nesting Birds',
        scientificName: 'Various',
        reason: 'Dense cover for breeding passerines',
        priority: 'medium',
        surveyType: 'Breeding Bird Survey',
        optimalMonths: ['Apr', 'May', 'Jun'],
        protectionStatus: ['Wildlife Acts'],
      },
    ],
  },

  // ========== LINEAR HABITATS (WL) ==========
  WL1: {
    habitatName: 'Hedgerows',
    habitatCategory: 'Linear',
    species: [
      {
        species: 'Badger',
        scientificName: 'Meles meles',
        reason: 'Sett habitat in hedgerow banks',
        priority: 'high',
        surveyType: 'Badger Survey',
        optimalMonths: ['Feb', 'Mar', 'Apr'],
        protectionStatus: ['Wildlife Acts'],
      },
      {
        species: 'Hedgehog',
        scientificName: 'Erinaceus europaeus',
        reason: 'Foraging and nesting habitat in hedgerows',
        priority: 'medium',
        surveyType: 'Mammal Survey',
        optimalMonths: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
        protectionStatus: ['Wildlife Acts'],
      },
      {
        species: 'Nesting Birds',
        scientificName: 'Various',
        reason: 'Key breeding habitat for passerines, including Yellowhammer',
        priority: 'medium',
        surveyType: 'Breeding Bird Survey',
        optimalMonths: ['Apr', 'May', 'Jun'],
        protectionStatus: ['Wildlife Acts'],
      },
      {
        species: 'Bats',
        scientificName: 'Chiroptera',
        reason: 'Commuting corridors, foraging along edges',
        priority: 'medium',
        surveyType: 'Bat Survey',
        optimalMonths: ['May', 'Jun', 'Jul', 'Aug', 'Sep'],
        protectionStatus: ['Annex IV', 'Wildlife Acts'],
      },
    ],
  },

  WL2: {
    habitatName: 'Treelines',
    habitatCategory: 'Linear',
    species: [
      {
        species: 'Bats',
        scientificName: 'Chiroptera',
        reason: 'Roosting in mature trees, commuting corridors',
        priority: 'high',
        surveyType: 'Bat Survey',
        optimalMonths: ['May', 'Jun', 'Jul', 'Aug', 'Sep'],
        protectionStatus: ['Annex IV', 'Wildlife Acts'],
      },
      {
        species: 'Nesting Birds',
        scientificName: 'Various',
        reason: 'Breeding habitat for corvids, raptors, songbirds',
        priority: 'medium',
        surveyType: 'Breeding Bird Survey',
        optimalMonths: ['Mar', 'Apr', 'May', 'Jun'],
        protectionStatus: ['Wildlife Acts'],
      },
    ],
  },

  // ========== GRASSLAND (GS/GA) ==========
  GS1: {
    habitatName: 'Dry Calcareous/Neutral Grassland',
    habitatCategory: 'Grassland',
    species: [
      {
        species: 'Marsh Fritillary',
        scientificName: 'Euphydryas aurinia',
        reason: "If Devil's-bit Scabious present",
        priority: 'high',
        surveyType: 'Butterfly Survey',
        optimalMonths: ['May', 'Jun'],
        protectionStatus: ['Annex II'],
      },
      {
        species: 'Ground-nesting Birds',
        scientificName: 'Various',
        reason: 'Skylark, Meadow Pipit habitat',
        priority: 'medium',
        surveyType: 'Breeding Bird Survey',
        optimalMonths: ['Apr', 'May', 'Jun'],
        protectionStatus: ['Amber Listed'],
      },
    ],
  },

  GS2: {
    habitatName: 'Dry Meadows and Grassy Verges',
    habitatCategory: 'Grassland',
    species: [
      {
        species: 'Irish Hare',
        scientificName: 'Lepus timidus hibernicus',
        reason: 'Foraging and resting habitat',
        priority: 'low',
        surveyType: 'Mammal Survey',
        optimalMonths: [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ],
        protectionStatus: ['Annex V', 'Wildlife Acts'],
      },
    ],
  },

  GS4: {
    habitatName: 'Wet Grassland',
    habitatCategory: 'Grassland',
    species: [
      {
        species: 'Curlew',
        scientificName: 'Numenius arquata',
        reason: 'Key breeding habitat for waders',
        priority: 'high',
        surveyType: 'Breeding Wader Survey',
        optimalMonths: ['Apr', 'May', 'Jun'],
        protectionStatus: ['Annex II (SPA)', 'Red Listed'],
      },
      {
        species: 'Lapwing',
        scientificName: 'Vanellus vanellus',
        reason: 'Breeding habitat in wet fields',
        priority: 'high',
        surveyType: 'Breeding Wader Survey',
        optimalMonths: ['Mar', 'Apr', 'May', 'Jun'],
        protectionStatus: ['Red Listed'],
      },
      {
        species: 'Snipe',
        scientificName: 'Gallinago gallinago',
        reason: 'Breeding and wintering habitat',
        priority: 'medium',
        surveyType: 'Wader Survey',
        optimalMonths: ['Mar', 'Apr', 'May', 'Jun'],
        protectionStatus: ['Amber Listed'],
      },
      {
        species: 'Marsh Fritillary',
        scientificName: 'Euphydryas aurinia',
        reason: "Wet grassland with Devil's-bit Scabious",
        priority: 'high',
        surveyType: 'Butterfly Survey',
        optimalMonths: ['May', 'Jun'],
        protectionStatus: ['Annex II'],
      },
    ],
  },

  GA1: {
    habitatName: 'Improved Agricultural Grassland',
    habitatCategory: 'Grassland',
    species: [
      {
        species: 'Irish Hare',
        scientificName: 'Lepus timidus hibernicus',
        reason: 'Foraging on improved grassland',
        priority: 'low',
        surveyType: 'Mammal Survey',
        optimalMonths: [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ],
        protectionStatus: ['Annex V', 'Wildlife Acts'],
      },
      {
        species: 'Badger',
        scientificName: 'Meles meles',
        reason: 'Foraging on pasture, setts in field margins',
        priority: 'medium',
        surveyType: 'Badger Survey',
        optimalMonths: ['Feb', 'Mar', 'Apr'],
        protectionStatus: ['Wildlife Acts'],
      },
    ],
  },

  // ========== PEATLAND (PB/PF) ==========
  PB1: {
    habitatName: 'Raised Bog',
    habitatCategory: 'Peatland',
    species: [
      {
        species: 'Irish Hare',
        scientificName: 'Lepus timidus hibernicus',
        reason: 'Uses bog habitat',
        priority: 'medium',
        surveyType: 'Mammal Survey',
        optimalMonths: [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ],
        protectionStatus: ['Annex V', 'Wildlife Acts'],
      },
      {
        species: 'Greenland White-fronted Goose',
        scientificName: 'Anser albifrons flavirostris',
        reason: 'Wintering on bog habitat',
        priority: 'high',
        surveyType: 'Wintering Bird Survey',
        optimalMonths: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
        protectionStatus: ['Annex I', 'Red Listed'],
      },
    ],
  },

  PB2: {
    habitatName: 'Upland Blanket Bog',
    habitatCategory: 'Peatland',
    species: [
      {
        species: 'Red Grouse',
        scientificName: 'Lagopus lagopus hibernicus',
        reason: 'Irish subspecies on upland bog',
        priority: 'high',
        surveyType: 'Breeding Bird Survey',
        optimalMonths: ['Apr', 'May', 'Jun'],
        protectionStatus: ['Red Listed'],
      },
      {
        species: 'Golden Plover',
        scientificName: 'Pluvialis apricaria',
        reason: 'Breeding on upland bog',
        priority: 'high',
        surveyType: 'Breeding Wader Survey',
        optimalMonths: ['Apr', 'May', 'Jun'],
        protectionStatus: ['Annex I'],
      },
      {
        species: 'Merlin',
        scientificName: 'Falco columbarius',
        reason: 'Breeding on upland bog/heath',
        priority: 'high',
        surveyType: 'Raptor Survey',
        optimalMonths: ['Apr', 'May', 'Jun', 'Jul'],
        protectionStatus: ['Annex I', 'Amber Listed'],
      },
    ],
  },

  PB3: {
    habitatName: 'Lowland Blanket Bog',
    habitatCategory: 'Peatland',
    species: [
      {
        species: 'Greenland White-fronted Goose',
        scientificName: 'Anser albifrons flavirostris',
        reason: 'Wintering on Atlantic bog',
        priority: 'high',
        surveyType: 'Wintering Bird Survey',
        optimalMonths: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
        protectionStatus: ['Annex I', 'Red Listed'],
      },
    ],
  },

  PF1: {
    habitatName: 'Rich Fen and Flush',
    habitatCategory: 'Peatland',
    species: [
      {
        species: 'Marsh Fritillary',
        scientificName: 'Euphydryas aurinia',
        reason: "Fen habitat with Devil's-bit Scabious",
        priority: 'high',
        surveyType: 'Butterfly Survey',
        optimalMonths: ['May', 'Jun'],
        protectionStatus: ['Annex II'],
      },
      {
        species: 'Vertigo snails',
        scientificName: 'Vertigo spp.',
        reason: 'Whorl snails in fen habitat',
        priority: 'high',
        surveyType: 'Invertebrate Survey',
        optimalMonths: ['May', 'Jun', 'Jul', 'Aug', 'Sep'],
        protectionStatus: ['Annex II'],
      },
    ],
  },

  // ========== HEATH (HH) ==========
  HH1: {
    habitatName: 'Dry Siliceous Heath',
    habitatCategory: 'Heath',
    species: [
      {
        species: 'Common Lizard',
        scientificName: 'Zootoca vivipara',
        reason: 'Basking on dry heath',
        priority: 'medium',
        surveyType: 'Reptile Survey',
        optimalMonths: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
        protectionStatus: ['Wildlife Acts'],
      },
      {
        species: 'Nightjar',
        scientificName: 'Caprimulgus europaeus',
        reason: 'Breeding on lowland heath',
        priority: 'high',
        surveyType: 'Crepuscular Bird Survey',
        optimalMonths: ['May', 'Jun', 'Jul'],
        protectionStatus: ['Annex I'],
      },
    ],
  },

  HH3: {
    habitatName: 'Wet Heath',
    habitatCategory: 'Heath',
    species: [
      {
        species: 'Marsh Fritillary',
        scientificName: 'Euphydryas aurinia',
        reason: "If Devil's-bit Scabious present",
        priority: 'high',
        surveyType: 'Butterfly Survey',
        optimalMonths: ['May', 'Jun'],
        protectionStatus: ['Annex II'],
      },
    ],
  },

  // ========== BUILDINGS & STRUCTURES (BL) ==========
  BL3: {
    habitatName: 'Buildings and Artificial Surfaces',
    habitatCategory: 'Built',
    species: [
      {
        species: 'Bats',
        scientificName: 'Chiroptera',
        reason: 'Roosting in buildings, especially old structures',
        priority: 'high',
        surveyType: 'Bat Survey',
        optimalMonths: ['May', 'Jun', 'Jul', 'Aug', 'Sep'],
        protectionStatus: ['Annex IV', 'Wildlife Acts'],
      },
      {
        species: 'Barn Owl',
        scientificName: 'Tyto alba',
        reason: 'Nesting in old farm buildings',
        priority: 'high',
        surveyType: 'Barn Owl Survey',
        optimalMonths: ['Mar', 'Apr', 'May', 'Jun', 'Jul'],
        protectionStatus: ['Red Listed', 'Wildlife Acts'],
      },
      {
        species: 'Swallow',
        scientificName: 'Hirundo rustica',
        reason: 'Nesting in outbuildings',
        priority: 'medium',
        surveyType: 'Breeding Bird Survey',
        optimalMonths: ['Apr', 'May', 'Jun', 'Jul'],
        protectionStatus: ['Amber Listed'],
      },
      {
        species: 'House Martin',
        scientificName: 'Delichon urbicum',
        reason: 'Nesting under eaves',
        priority: 'medium',
        surveyType: 'Breeding Bird Survey',
        optimalMonths: ['May', 'Jun', 'Jul', 'Aug'],
        protectionStatus: ['Amber Listed'],
      },
    ],
  },

  // ========== COASTAL (CM/CS/CB) ==========
  CM1: {
    habitatName: 'Lower Salt Marsh',
    habitatCategory: 'Coastal',
    species: [
      {
        species: 'Wintering Waterbirds',
        scientificName: 'Various',
        reason: 'Feeding and roosting habitat',
        priority: 'high',
        surveyType: 'I-WeBS Count',
        optimalMonths: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
        protectionStatus: ['Annex I (various)'],
      },
      {
        species: 'Natterjack Toad',
        scientificName: 'Epidalea calamita',
        reason: 'Coastal dune slacks in Kerry/Wexford',
        priority: 'high',
        surveyType: 'Amphibian Survey',
        optimalMonths: ['Apr', 'May', 'Jun'],
        protectionStatus: ['Annex IV', 'Wildlife Acts'],
      },
    ],
  },

  CS1: {
    habitatName: 'Rocky Sea Cliffs',
    habitatCategory: 'Coastal',
    species: [
      {
        species: 'Chough',
        scientificName: 'Pyrrhocorax pyrrhocorax',
        reason: 'Nesting on coastal cliffs',
        priority: 'high',
        surveyType: 'Bird Survey',
        optimalMonths: ['Mar', 'Apr', 'May', 'Jun'],
        protectionStatus: ['Annex I', 'Amber Listed'],
      },
      {
        species: 'Peregrine Falcon',
        scientificName: 'Falco peregrinus',
        reason: 'Nesting on cliff faces',
        priority: 'high',
        surveyType: 'Raptor Survey',
        optimalMonths: ['Mar', 'Apr', 'May', 'Jun'],
        protectionStatus: ['Annex I', 'Green Listed'],
      },
    ],
  },

  CD1: {
    habitatName: 'Embryonic Dunes',
    habitatCategory: 'Coastal',
    species: [
      {
        species: 'Little Tern',
        scientificName: 'Sternula albifrons',
        reason: 'Breeding on sand/shingle',
        priority: 'high',
        surveyType: 'Colonial Seabird Survey',
        optimalMonths: ['May', 'Jun', 'Jul'],
        protectionStatus: ['Annex I', 'Amber Listed'],
      },
    ],
  },

  CD2: {
    habitatName: 'Marram Dunes',
    habitatCategory: 'Coastal',
    species: [
      {
        species: 'Natterjack Toad',
        scientificName: 'Epidalea calamita',
        reason: 'Dune slacks in Kerry/Wexford',
        priority: 'high',
        surveyType: 'Amphibian Survey',
        optimalMonths: ['Apr', 'May', 'Jun'],
        protectionStatus: ['Annex IV', 'Wildlife Acts'],
      },
    ],
  },
}

/**
 * Get all species recommendations for a list of habitat codes
 */
export function getSpeciesForHabitats(habitatCodes: string[]): SpeciesRecommendation[] {
  const allSpecies: SpeciesRecommendation[] = []
  const seen = new Set<string>()

  for (const code of habitatCodes) {
    const mapping = habitatSpeciesMapping[code]
    if (mapping) {
      for (const species of mapping.species) {
        // Deduplicate by scientific name
        if (!seen.has(species.scientificName)) {
          seen.add(species.scientificName)
          allSpecies.push(species)
        }
      }
    }
  }

  // Sort by priority (high first)
  return allSpecies.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

/**
 * Get habitat name from FOSSITT code
 */
export function getHabitatName(code: string): string | null {
  return habitatSpeciesMapping[code]?.habitatName || null
}

/**
 * Calculate priority based on multiple factors
 */
export function calculateSpeciesPriority(
  baseSpecies: SpeciesRecommendation,
  gbifRecordCount: number,
  distanceToRecords: number,
  nearDesignatedSite: boolean,
  siteHasQualifyingInterest: boolean
): 'high' | 'medium' | 'low' {
  let score = 0

  // Base priority score
  if (baseSpecies.priority === 'high') score += 3
  else if (baseSpecies.priority === 'medium') score += 2
  else score += 1

  // GBIF records boost
  if (gbifRecordCount > 0) score += 2
  if (gbifRecordCount > 5) score += 1

  // Distance to records
  if (distanceToRecords < 2)
    score += 2 // Within 2km
  else if (distanceToRecords < 5) score += 1 // Within 5km

  // Designated site context
  if (nearDesignatedSite) score += 1
  if (siteHasQualifyingInterest) score += 2

  // Annex II/IV species get automatic boost
  if (
    baseSpecies.protectionStatus.includes('Annex II') ||
    baseSpecies.protectionStatus.includes('Annex IV')
  ) {
    score += 2
  }

  if (score >= 8) return 'high'
  if (score >= 5) return 'medium'
  return 'low'
}
