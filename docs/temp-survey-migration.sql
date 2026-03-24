-- Survey template default_fields migration
-- Generated from lib/config/survey-field-definitions.ts
-- Each UPDATE inlines the weatherSection() output and the full function return value.

-- ============================================================================
-- 1. bat_survey (from batSurveyDefaults)
-- ============================================================================
UPDATE survey_templates SET default_fields = '{
  "sections": [
    {
      "id": "bat_category",
      "title": "Survey Details",
      "description": "Bat survey sub-type and timing",
      "enabled": true,
      "fields": [
        {
          "id": "bc_type",
          "label": "Survey Sub-type",
          "key": "bat_survey_type",
          "type": "select",
          "required": true,
          "options": [
            { "value": "pra", "label": "Preliminary Roost Assessment" },
            { "value": "emergence", "label": "Emergence/Re-entry Survey" },
            { "value": "activity_transect", "label": "Activity Transect Survey" },
            { "value": "static_detector", "label": "Static Detector Survey" }
          ]
        },
        {
          "id": "bc_sunset",
          "label": "Sunset Time",
          "key": "sunset_time",
          "type": "time",
          "required": false
        },
        {
          "id": "bc_sunrise",
          "label": "Sunrise Time",
          "key": "sunrise_time",
          "type": "time",
          "required": false
        },
        {
          "id": "bc_start",
          "label": "Survey Start",
          "key": "bat_survey_start",
          "type": "time",
          "required": false,
          "helpText": "Relative to sunset for emergence surveys"
        },
        {
          "id": "bc_end",
          "label": "Survey End",
          "key": "bat_survey_end",
          "type": "time",
          "required": false
        }
      ]
    },
    {
      "id": "weather",
      "title": "Weather Conditions",
      "description": "Record site conditions at time of survey",
      "enabled": true,
      "fields": [
        {
          "id": "w_temp",
          "label": "Temperature",
          "key": "temperature_c",
          "type": "number",
          "required": false,
          "placeholder": "e.g. 14",
          "unit": "\u00b0C",
          "min": -20,
          "max": 50
        },
        {
          "id": "w_wind_speed",
          "label": "Wind Speed",
          "key": "wind_speed_kmh",
          "type": "number",
          "required": false,
          "placeholder": "e.g. 15",
          "unit": "km/h",
          "min": 0,
          "max": 200
        },
        {
          "id": "w_wind_dir",
          "label": "Wind Direction",
          "key": "wind_direction",
          "type": "select",
          "required": false,
          "options": [
            { "value": "N", "label": "North" },
            { "value": "NE", "label": "North-East" },
            { "value": "E", "label": "East" },
            { "value": "SE", "label": "South-East" },
            { "value": "S", "label": "South" },
            { "value": "SW", "label": "South-West" },
            { "value": "W", "label": "West" },
            { "value": "NW", "label": "North-West" }
          ]
        },
        {
          "id": "w_cloud",
          "label": "Cloud Cover",
          "key": "cloud_cover_pct",
          "type": "number",
          "required": false,
          "placeholder": "e.g. 60",
          "unit": "%",
          "min": 0,
          "max": 100
        },
        {
          "id": "w_precip",
          "label": "Precipitation",
          "key": "precipitation",
          "type": "select",
          "required": false,
          "options": [
            { "value": "none", "label": "None" },
            { "value": "light_rain", "label": "Light Rain" },
            { "value": "moderate_rain", "label": "Moderate Rain" },
            { "value": "heavy_rain", "label": "Heavy Rain" },
            { "value": "drizzle", "label": "Drizzle" },
            { "value": "sleet", "label": "Sleet" },
            { "value": "snow", "label": "Snow" }
          ]
        },
        {
          "id": "w_visibility",
          "label": "Visibility",
          "key": "visibility",
          "type": "select",
          "required": false,
          "options": [
            { "value": "good", "label": "Good (>1km)" },
            { "value": "moderate", "label": "Moderate (200m-1km)" },
            { "value": "poor", "label": "Poor (<200m)" }
          ]
        }
      ]
    },
    {
      "id": "bat_equipment",
      "title": "Equipment",
      "description": "Bat detection equipment used",
      "enabled": true,
      "fields": [
        {
          "id": "be_detector",
          "label": "Detector Model",
          "key": "detector_model",
          "type": "text",
          "required": false,
          "placeholder": "e.g. Batlogger M, Anabat Swift"
        },
        {
          "id": "be_settings",
          "label": "Detector Settings",
          "key": "detector_settings",
          "type": "text",
          "required": false,
          "placeholder": "e.g. Full spectrum, auto-record"
        },
        {
          "id": "be_torch",
          "label": "Torch / IR Camera",
          "key": "torch_ir_camera",
          "type": "text",
          "required": false,
          "placeholder": "e.g. IR video camera, endoscope"
        }
      ]
    },
    {
      "id": "bat_results",
      "title": "Bat Activity Records",
      "description": "Summary of bat passes and identifications",
      "enabled": true,
      "fields": [
        {
          "id": "br_species",
          "label": "Bat Species",
          "key": "bat_species_observed",
          "type": "text",
          "required": false,
          "placeholder": "e.g. Common Pipistrelle, Leisler''s"
        },
        {
          "id": "br_passes",
          "label": "Total Bat Passes",
          "key": "total_bat_passes",
          "type": "number",
          "required": false,
          "min": 0
        },
        {
          "id": "br_activity",
          "label": "Activity Type",
          "key": "bat_activity_type",
          "type": "select",
          "required": false,
          "options": [
            { "value": "commuting", "label": "Commuting" },
            { "value": "foraging", "label": "Foraging" },
            { "value": "social", "label": "Social Calls" },
            { "value": "emergence", "label": "Emergence" },
            { "value": "swarming", "label": "Swarming" }
          ]
        },
        {
          "id": "br_roost",
          "label": "Roost Potential",
          "key": "roost_potential",
          "type": "select",
          "required": false,
          "options": [
            { "value": "confirmed", "label": "Confirmed Roost" },
            { "value": "high", "label": "High Potential" },
            { "value": "moderate", "label": "Moderate Potential" },
            { "value": "low", "label": "Low Potential" },
            { "value": "negligible", "label": "Negligible" }
          ]
        },
        {
          "id": "br_notes",
          "label": "Activity Notes",
          "key": "bat_activity_notes",
          "type": "textarea",
          "required": false
        }
      ]
    }
  ],
  "methodologyGuidance": "Follow BCIreland / Collins (2016) guidelines. Emergence surveys: start 15 mins before sunset, continue for 2 hours. Activity transects: walked at steady pace using a bat detector.",
  "requiredEquipment": [
    "Bat detector",
    "Torch",
    "High-visibility vest",
    "GPS unit",
    "Recording sheets"
  ]
}' WHERE survey_type = 'bat_survey';

-- ============================================================================
-- 2. bird_survey (from birdSurveyDefaults)
-- ============================================================================
UPDATE survey_templates SET default_fields = '{
  "sections": [
    {
      "id": "bird_category",
      "title": "Survey Details",
      "description": "Bird survey sub-type and methodology",
      "enabled": true,
      "fields": [
        {
          "id": "bdc_type",
          "label": "Survey Sub-type",
          "key": "bird_survey_type",
          "type": "select",
          "required": true,
          "options": [
            { "value": "breeding", "label": "Breeding Bird Survey" },
            { "value": "wintering", "label": "Wintering Bird Survey" },
            { "value": "vantage_point", "label": "Vantage Point Survey" },
            { "value": "transect", "label": "Transect Survey" },
            { "value": "point_count", "label": "Point Count Survey" }
          ]
        },
        {
          "id": "bdc_method",
          "label": "Methodology",
          "key": "bird_methodology",
          "type": "select",
          "required": false,
          "options": [
            { "value": "cbc", "label": "Common Bird Census (CBC)" },
            { "value": "bto_bbs", "label": "BTO Breeding Bird Survey" },
            { "value": "wetland_counts", "label": "Wetland Bird Counts (IWeBS)" },
            { "value": "vantage_point", "label": "Vantage Point (SNH guidance)" },
            { "value": "other", "label": "Other" }
          ]
        }
      ]
    },
    {
      "id": "weather",
      "title": "Weather Conditions",
      "description": "Record site conditions at time of survey",
      "enabled": true,
      "fields": [
        {
          "id": "w_temp",
          "label": "Temperature",
          "key": "temperature_c",
          "type": "number",
          "required": false,
          "placeholder": "e.g. 14",
          "unit": "\u00b0C",
          "min": -20,
          "max": 50
        },
        {
          "id": "w_wind_speed",
          "label": "Wind Speed",
          "key": "wind_speed_kmh",
          "type": "number",
          "required": false,
          "placeholder": "e.g. 15",
          "unit": "km/h",
          "min": 0,
          "max": 200
        },
        {
          "id": "w_wind_dir",
          "label": "Wind Direction",
          "key": "wind_direction",
          "type": "select",
          "required": false,
          "options": [
            { "value": "N", "label": "North" },
            { "value": "NE", "label": "North-East" },
            { "value": "E", "label": "East" },
            { "value": "SE", "label": "South-East" },
            { "value": "S", "label": "South" },
            { "value": "SW", "label": "South-West" },
            { "value": "W", "label": "West" },
            { "value": "NW", "label": "North-West" }
          ]
        },
        {
          "id": "w_cloud",
          "label": "Cloud Cover",
          "key": "cloud_cover_pct",
          "type": "number",
          "required": false,
          "placeholder": "e.g. 60",
          "unit": "%",
          "min": 0,
          "max": 100
        },
        {
          "id": "w_precip",
          "label": "Precipitation",
          "key": "precipitation",
          "type": "select",
          "required": false,
          "options": [
            { "value": "none", "label": "None" },
            { "value": "light_rain", "label": "Light Rain" },
            { "value": "moderate_rain", "label": "Moderate Rain" },
            { "value": "heavy_rain", "label": "Heavy Rain" },
            { "value": "drizzle", "label": "Drizzle" },
            { "value": "sleet", "label": "Sleet" },
            { "value": "snow", "label": "Snow" }
          ]
        },
        {
          "id": "w_visibility",
          "label": "Visibility",
          "key": "visibility",
          "type": "select",
          "required": false,
          "options": [
            { "value": "good", "label": "Good (>1km)" },
            { "value": "moderate", "label": "Moderate (200m-1km)" },
            { "value": "poor", "label": "Poor (<200m)" }
          ]
        }
      ]
    },
    {
      "id": "bird_results",
      "title": "Bird Records",
      "description": "Species recorded during survey",
      "enabled": true,
      "fields": [
        {
          "id": "bdr_species",
          "label": "Species",
          "key": "bird_species",
          "type": "text",
          "required": false,
          "placeholder": "e.g. Barn Owl, Peregrine Falcon"
        },
        {
          "id": "bdr_count",
          "label": "Count",
          "key": "bird_count",
          "type": "number",
          "required": false,
          "min": 0
        },
        {
          "id": "bdr_activity",
          "label": "Activity",
          "key": "bird_activity",
          "type": "select",
          "required": false,
          "options": [
            { "value": "singing", "label": "Singing" },
            { "value": "calling", "label": "Calling" },
            { "value": "display", "label": "Display" },
            { "value": "nest_building", "label": "Nest Building" },
            { "value": "feeding", "label": "Feeding" },
            { "value": "in_flight", "label": "In Flight" },
            { "value": "roosting", "label": "Roosting" }
          ]
        },
        {
          "id": "bdr_direction",
          "label": "Flight Direction",
          "key": "flight_direction",
          "type": "select",
          "required": false,
          "options": [
            { "value": "N", "label": "North" },
            { "value": "NE", "label": "NE" },
            { "value": "E", "label": "East" },
            { "value": "SE", "label": "SE" },
            { "value": "S", "label": "South" },
            { "value": "SW", "label": "SW" },
            { "value": "W", "label": "West" },
            { "value": "NW", "label": "NW" }
          ]
        },
        {
          "id": "bdr_distance",
          "label": "Distance Band",
          "key": "bird_distance_band",
          "type": "select",
          "required": false,
          "options": [
            { "value": "0-25", "label": "0-25m" },
            { "value": "25-100", "label": "25-100m" },
            { "value": "100-200", "label": "100-200m" },
            { "value": "200+", "label": ">200m" }
          ]
        },
        {
          "id": "bdr_notes",
          "label": "Notes",
          "key": "bird_notes",
          "type": "textarea",
          "required": false
        }
      ]
    }
  ],
  "methodologyGuidance": "Follow BirdWatch Ireland / BTO methodology. Breeding surveys: 3 visits April-June. Wintering surveys: monthly October-March. Record all birds seen or heard with BTO activity codes.",
  "requiredEquipment": [
    "Binoculars",
    "Telescope (optional)",
    "GPS unit",
    "Recording sheets",
    "Bird field guide"
  ]
}' WHERE survey_type = 'bird_survey';

-- ============================================================================
-- 3. mammal_survey (from mammalSurveyDefaults)
-- ============================================================================
UPDATE survey_templates SET default_fields = '{
  "sections": [
    {
      "id": "weather",
      "title": "Weather Conditions",
      "description": "Record site conditions at time of survey",
      "enabled": true,
      "fields": [
        {
          "id": "w_temp",
          "label": "Temperature",
          "key": "temperature_c",
          "type": "number",
          "required": false,
          "placeholder": "e.g. 14",
          "unit": "\u00b0C",
          "min": -20,
          "max": 50
        },
        {
          "id": "w_wind_speed",
          "label": "Wind Speed",
          "key": "wind_speed_kmh",
          "type": "number",
          "required": false,
          "placeholder": "e.g. 15",
          "unit": "km/h",
          "min": 0,
          "max": 200
        },
        {
          "id": "w_wind_dir",
          "label": "Wind Direction",
          "key": "wind_direction",
          "type": "select",
          "required": false,
          "options": [
            { "value": "N", "label": "North" },
            { "value": "NE", "label": "North-East" },
            { "value": "E", "label": "East" },
            { "value": "SE", "label": "South-East" },
            { "value": "S", "label": "South" },
            { "value": "SW", "label": "South-West" },
            { "value": "W", "label": "West" },
            { "value": "NW", "label": "North-West" }
          ]
        },
        {
          "id": "w_cloud",
          "label": "Cloud Cover",
          "key": "cloud_cover_pct",
          "type": "number",
          "required": false,
          "placeholder": "e.g. 60",
          "unit": "%",
          "min": 0,
          "max": 100
        },
        {
          "id": "w_precip",
          "label": "Precipitation",
          "key": "precipitation",
          "type": "select",
          "required": false,
          "options": [
            { "value": "none", "label": "None" },
            { "value": "light_rain", "label": "Light Rain" },
            { "value": "moderate_rain", "label": "Moderate Rain" },
            { "value": "heavy_rain", "label": "Heavy Rain" },
            { "value": "drizzle", "label": "Drizzle" },
            { "value": "sleet", "label": "Sleet" },
            { "value": "snow", "label": "Snow" }
          ]
        },
        {
          "id": "w_visibility",
          "label": "Visibility",
          "key": "visibility",
          "type": "select",
          "required": false,
          "options": [
            { "value": "good", "label": "Good (>1km)" },
            { "value": "moderate", "label": "Moderate (200m-1km)" },
            { "value": "poor", "label": "Poor (<200m)" }
          ]
        }
      ]
    },
    {
      "id": "mammal_target",
      "title": "Target Species",
      "description": "Species being surveyed for",
      "enabled": true,
      "fields": [
        {
          "id": "mt_species",
          "label": "Target Species",
          "key": "mammal_target_species",
          "type": "multi-select",
          "required": true,
          "options": [
            { "value": "badger", "label": "Badger" },
            { "value": "otter", "label": "Otter" },
            { "value": "pine_marten", "label": "Pine Marten" },
            { "value": "red_squirrel", "label": "Red Squirrel" },
            { "value": "irish_hare", "label": "Irish Hare" },
            { "value": "deer", "label": "Deer" },
            { "value": "hedgehog", "label": "Hedgehog" },
            { "value": "stoat", "label": "Stoat" }
          ]
        }
      ]
    },
    {
      "id": "mammal_evidence",
      "title": "Evidence Records",
      "description": "Signs and evidence of mammal activity",
      "enabled": true,
      "fields": [
        {
          "id": "me_type",
          "label": "Evidence Type",
          "key": "mammal_evidence_type",
          "type": "select",
          "required": false,
          "options": [
            { "value": "sett", "label": "Sett/Burrow" },
            { "value": "holt", "label": "Holt" },
            { "value": "spraint", "label": "Spraint/Droppings" },
            { "value": "tracks", "label": "Tracks/Footprints" },
            { "value": "hair", "label": "Hair Trace" },
            { "value": "feeding", "label": "Feeding Signs" },
            { "value": "den", "label": "Den" },
            { "value": "visual", "label": "Visual Sighting" },
            { "value": "camera_trap", "label": "Camera Trap" }
          ]
        },
        {
          "id": "me_activity",
          "label": "Activity Level",
          "key": "mammal_activity_level",
          "type": "select",
          "required": false,
          "options": [
            { "value": "active", "label": "Active (current use)" },
            { "value": "inactive", "label": "Inactive" },
            { "value": "partially_active", "label": "Partially Active" },
            { "value": "unknown", "label": "Unknown" }
          ]
        },
        {
          "id": "me_count",
          "label": "Number of Entrances/Signs",
          "key": "mammal_sign_count",
          "type": "number",
          "required": false,
          "min": 0
        },
        {
          "id": "me_notes",
          "label": "Notes",
          "key": "mammal_evidence_notes",
          "type": "textarea",
          "required": false
        }
      ]
    }
  ],
  "methodologyGuidance": "Survey all suitable habitat within the study area. For badger: search for setts, latrines, paths. For otter: search riverbanks for holts, spraints, slides.",
  "targetSpecies": ["Badger", "Otter", "Pine Marten", "Red Squirrel"],
  "requiredEquipment": ["GPS unit", "Measuring tape", "Camera", "Recording sheets"]
}' WHERE survey_type = 'mammal_survey';

-- ============================================================================
-- 4. aquatic_survey (from aquaticSurveyDefaults)
-- ============================================================================
UPDATE survey_templates SET default_fields = '{
  "sections": [
    {
      "id": "weather",
      "title": "Weather Conditions",
      "description": "Record site conditions at time of survey",
      "enabled": true,
      "fields": [
        {
          "id": "w_temp",
          "label": "Temperature",
          "key": "temperature_c",
          "type": "number",
          "required": false,
          "placeholder": "e.g. 14",
          "unit": "\u00b0C",
          "min": -20,
          "max": 50
        },
        {
          "id": "w_wind_speed",
          "label": "Wind Speed",
          "key": "wind_speed_kmh",
          "type": "number",
          "required": false,
          "placeholder": "e.g. 15",
          "unit": "km/h",
          "min": 0,
          "max": 200
        },
        {
          "id": "w_wind_dir",
          "label": "Wind Direction",
          "key": "wind_direction",
          "type": "select",
          "required": false,
          "options": [
            { "value": "N", "label": "North" },
            { "value": "NE", "label": "North-East" },
            { "value": "E", "label": "East" },
            { "value": "SE", "label": "South-East" },
            { "value": "S", "label": "South" },
            { "value": "SW", "label": "South-West" },
            { "value": "W", "label": "West" },
            { "value": "NW", "label": "North-West" }
          ]
        },
        {
          "id": "w_cloud",
          "label": "Cloud Cover",
          "key": "cloud_cover_pct",
          "type": "number",
          "required": false,
          "placeholder": "e.g. 60",
          "unit": "%",
          "min": 0,
          "max": 100
        },
        {
          "id": "w_precip",
          "label": "Precipitation",
          "key": "precipitation",
          "type": "select",
          "required": false,
          "options": [
            { "value": "none", "label": "None" },
            { "value": "light_rain", "label": "Light Rain" },
            { "value": "moderate_rain", "label": "Moderate Rain" },
            { "value": "heavy_rain", "label": "Heavy Rain" },
            { "value": "drizzle", "label": "Drizzle" },
            { "value": "sleet", "label": "Sleet" },
            { "value": "snow", "label": "Snow" }
          ]
        },
        {
          "id": "w_visibility",
          "label": "Visibility",
          "key": "visibility",
          "type": "select",
          "required": false,
          "options": [
            { "value": "good", "label": "Good (>1km)" },
            { "value": "moderate", "label": "Moderate (200m-1km)" },
            { "value": "poor", "label": "Poor (<200m)" }
          ]
        }
      ]
    },
    {
      "id": "aquatic_site",
      "title": "Water Body Details",
      "description": "Characteristics of the water body surveyed",
      "enabled": true,
      "fields": [
        {
          "id": "as_type",
          "label": "Water Body Type",
          "key": "water_body_type",
          "type": "select",
          "required": true,
          "options": [
            { "value": "river", "label": "River" },
            { "value": "stream", "label": "Stream" },
            { "value": "lake", "label": "Lake" },
            { "value": "pond", "label": "Pond" },
            { "value": "canal", "label": "Canal" },
            { "value": "estuary", "label": "Estuary" },
            { "value": "ditch", "label": "Drainage Ditch" }
          ]
        },
        {
          "id": "as_width",
          "label": "Channel Width",
          "key": "channel_width_m",
          "type": "number",
          "required": false,
          "unit": "m",
          "min": 0
        },
        {
          "id": "as_depth",
          "label": "Average Depth",
          "key": "average_depth_m",
          "type": "number",
          "required": false,
          "unit": "m",
          "min": 0
        },
        {
          "id": "as_substrate",
          "label": "Substrate",
          "key": "substrate_type",
          "type": "select",
          "required": false,
          "options": [
            { "value": "bedrock", "label": "Bedrock" },
            { "value": "boulder", "label": "Boulder" },
            { "value": "cobble", "label": "Cobble" },
            { "value": "gravel", "label": "Gravel" },
            { "value": "sand", "label": "Sand" },
            { "value": "silt", "label": "Silt/Mud" }
          ]
        }
      ]
    },
    {
      "id": "water_quality",
      "title": "Water Quality Indicators",
      "description": "In-situ water quality measurements",
      "enabled": true,
      "fields": [
        {
          "id": "wq_ph",
          "label": "pH",
          "key": "water_ph",
          "type": "number",
          "required": false,
          "min": 0,
          "max": 14
        },
        {
          "id": "wq_do",
          "label": "Dissolved Oxygen",
          "key": "dissolved_oxygen_mgl",
          "type": "number",
          "required": false,
          "unit": "mg/L",
          "min": 0
        },
        {
          "id": "wq_conductivity",
          "label": "Conductivity",
          "key": "conductivity_us",
          "type": "number",
          "required": false,
          "unit": "\u00b5S/cm",
          "min": 0
        },
        {
          "id": "wq_turbidity",
          "label": "Turbidity",
          "key": "turbidity",
          "type": "select",
          "required": false,
          "options": [
            { "value": "clear", "label": "Clear" },
            { "value": "slightly_turbid", "label": "Slightly Turbid" },
            { "value": "turbid", "label": "Turbid" },
            { "value": "very_turbid", "label": "Very Turbid" }
          ]
        }
      ]
    },
    {
      "id": "aquatic_species",
      "title": "Species Records",
      "description": "Aquatic species observations",
      "enabled": true,
      "fields": [
        {
          "id": "aq_method",
          "label": "Sampling Method",
          "key": "aquatic_sampling_method",
          "type": "select",
          "required": false,
          "options": [
            { "value": "kick_sample", "label": "Kick Sampling" },
            { "value": "sweep", "label": "Sweep Net" },
            { "value": "electrofishing", "label": "Electrofishing" },
            { "value": "visual", "label": "Visual Survey" },
            { "value": "trap", "label": "Trapping" }
          ]
        },
        {
          "id": "aq_species",
          "label": "Species Recorded",
          "key": "aquatic_species_recorded",
          "type": "textarea",
          "required": false,
          "placeholder": "List species observed..."
        },
        {
          "id": "aq_notes",
          "label": "Notes",
          "key": "aquatic_survey_notes",
          "type": "textarea",
          "required": false
        }
      ]
    }
  ],
  "methodologyGuidance": "Follow EPA guidelines for aquatic surveys. Record water quality parameters in-situ. For kick sampling: 3-minute kick sample in riffle habitat.",
  "requiredEquipment": [
    "Waders",
    "Kick net",
    "Water quality meter",
    "Sample containers",
    "GPS unit"
  ]
}' WHERE survey_type = 'aquatic_survey';

-- ============================================================================
-- 5. botanical_survey (from botanicalSurveyDefaults)
-- ============================================================================
UPDATE survey_templates SET default_fields = '{
  "sections": [
    {
      "id": "weather",
      "title": "Weather Conditions",
      "description": "Record site conditions at time of survey",
      "enabled": true,
      "fields": [
        {
          "id": "w_temp",
          "label": "Temperature",
          "key": "temperature_c",
          "type": "number",
          "required": false,
          "placeholder": "e.g. 14",
          "unit": "\u00b0C",
          "min": -20,
          "max": 50
        },
        {
          "id": "w_wind_speed",
          "label": "Wind Speed",
          "key": "wind_speed_kmh",
          "type": "number",
          "required": false,
          "placeholder": "e.g. 15",
          "unit": "km/h",
          "min": 0,
          "max": 200
        },
        {
          "id": "w_wind_dir",
          "label": "Wind Direction",
          "key": "wind_direction",
          "type": "select",
          "required": false,
          "options": [
            { "value": "N", "label": "North" },
            { "value": "NE", "label": "North-East" },
            { "value": "E", "label": "East" },
            { "value": "SE", "label": "South-East" },
            { "value": "S", "label": "South" },
            { "value": "SW", "label": "South-West" },
            { "value": "W", "label": "West" },
            { "value": "NW", "label": "North-West" }
          ]
        },
        {
          "id": "w_cloud",
          "label": "Cloud Cover",
          "key": "cloud_cover_pct",
          "type": "number",
          "required": false,
          "placeholder": "e.g. 60",
          "unit": "%",
          "min": 0,
          "max": 100
        },
        {
          "id": "w_precip",
          "label": "Precipitation",
          "key": "precipitation",
          "type": "select",
          "required": false,
          "options": [
            { "value": "none", "label": "None" },
            { "value": "light_rain", "label": "Light Rain" },
            { "value": "moderate_rain", "label": "Moderate Rain" },
            { "value": "heavy_rain", "label": "Heavy Rain" },
            { "value": "drizzle", "label": "Drizzle" },
            { "value": "sleet", "label": "Sleet" },
            { "value": "snow", "label": "Snow" }
          ]
        },
        {
          "id": "w_visibility",
          "label": "Visibility",
          "key": "visibility",
          "type": "select",
          "required": false,
          "options": [
            { "value": "good", "label": "Good (>1km)" },
            { "value": "moderate", "label": "Moderate (200m-1km)" },
            { "value": "poor", "label": "Poor (<200m)" }
          ]
        }
      ]
    },
    {
      "id": "botanical_records",
      "title": "Species Records",
      "description": "Botanical species observations",
      "enabled": true,
      "fields": [
        {
          "id": "bt_species",
          "label": "Species Name",
          "key": "botanical_species",
          "type": "text",
          "required": false,
          "placeholder": "e.g. Dactylorhiza maculata"
        },
        {
          "id": "bt_abundance",
          "label": "Abundance (DAFOR)",
          "key": "botanical_abundance",
          "type": "select",
          "required": false,
          "options": [
            { "value": "D", "label": "Dominant" },
            { "value": "A", "label": "Abundant" },
            { "value": "F", "label": "Frequent" },
            { "value": "O", "label": "Occasional" },
            { "value": "R", "label": "Rare" }
          ]
        },
        {
          "id": "bt_habitat",
          "label": "Habitat",
          "key": "botanical_habitat",
          "type": "text",
          "required": false,
          "placeholder": "e.g. Wet grassland margin"
        },
        {
          "id": "bt_notes",
          "label": "Notes",
          "key": "botanical_notes",
          "type": "textarea",
          "required": false
        }
      ]
    },
    {
      "id": "rare_protected",
      "title": "Rare / Protected Species",
      "description": "Flora Protection Order or Red List species",
      "enabled": true,
      "fields": [
        {
          "id": "rp_species",
          "label": "Species",
          "key": "rare_species_name",
          "type": "text",
          "required": false
        },
        {
          "id": "rp_status",
          "label": "Protection Status",
          "key": "rare_species_status",
          "type": "select",
          "required": false,
          "options": [
            { "value": "fpo", "label": "Flora Protection Order" },
            { "value": "red_list", "label": "Red List" },
            { "value": "habitats_directive", "label": "Habitats Directive Annex" },
            { "value": "other", "label": "Other" }
          ]
        },
        {
          "id": "rp_count",
          "label": "Population Estimate",
          "key": "rare_species_count",
          "type": "text",
          "required": false,
          "placeholder": "e.g. ~50 individuals, 3 clumps"
        },
        {
          "id": "rp_notes",
          "label": "Notes",
          "key": "rare_species_notes",
          "type": "textarea",
          "required": false
        }
      ]
    }
  ],
  "methodologyGuidance": "Systematic walk of the study area recording all vascular plant species. Use DAFOR scale for abundance. Pay particular attention to Flora Protection Order species.",
  "requiredEquipment": [
    "Hand lens",
    "Plant press",
    "Camera",
    "GPS unit",
    "Flora identification guide"
  ]
}' WHERE survey_type = 'botanical_survey';
