# NPWS Shapefiles Database

**Source:** https://www.npws.ie/maps-and-data/habitat-and-species-data

**Total:** 29 files, 565 MB

**Downloaded:** 2026-02-03

---

## Part 1 - Flora (11 files)

| Category | File                       | Size   |
| -------- | -------------------------- | ------ |
| Flora    | fpo-2022.zip               | 1.2 MB |
| Flora    | saltmarsh-2006-2008.zip    | 8.8 MB |
| Flora    | coastal-lagoons.zip        | 1.1 MB |
| Flora    | seacliff-survey.zip        | 2.5 MB |
| Flora    | native-woodlands.zip       | 4.0 MB |
| Flora    | ancient-woodland.zip       | 2.7 MB |
| Flora    | juniper-survey.zip         | 7.8 MB |
| Flora    | semi-natural-grassland.zip | 36 MB  |
| Flora    | limestone-pavement.zip     | 7.3 MB |
| Flora    | sand-dunes.zip             | 8.1 MB |
| Flora    | orchid-survey.zip          | 2.2 MB |

**Download Links:**

- https://www.npws.ie/sites/default/files/general/FPO%202022%20records%20v%201.0%202023.zip
- https://www.npws.ie/sites/default/files/general/saltmarsh-monitoring-project-2006-2008.zip
- https://www.npws.ie/sites/default/files/general/inventory-of-coastal-lagoons.zip
- https://www.npws.ie/sites/default/files/general/national-seacliff-survey-2009-2011.zip
- https://www.npws.ie/sites/default/files/general/nsnw.zip
- https://www.npws.ie/sites/default/files/general/ancient-long-established-woodland.zip
- https://www.npws.ie/sites/default/files/general/national-juniper-survey.zip
- https://www.npws.ie/sites/default/files/general/0202_ISGS13_grassland_20150225.zip
- https://www.npws.ie/sites/default/files/general/0601_NSLP09_Limestone_pavement_20150226.zip
- https://www.npws.ie/sites/default/files/general/0701_SDMN11_Sand_Dune_Monitoring_upload_0.zip
- https://www.npws.ie/sites/default/files/general/1402_ORCH14_01.zip

---

## Part 2 - Mammals, Amphibians, Birds (11 files)

| Category   | File                           | Size   |
| ---------- | ------------------------------ | ------ |
| Mammal     | badger-survey.zip              | 328 KB |
| Mammal     | bat-lesser-horseshoe.zip       | 54 KB  |
| Mammal     | pine-marten.zip                | 36 KB  |
| Mammal     | otter-survey-2010.zip          | 981 KB |
| Mammal     | otter-survey-2004.zip          | 32 KB  |
| Mammal     | otter-survey-1982.zip          | 138 KB |
| Mammal     | hare-survey.zip                | 71 KB  |
| Amphibian  | frog-survey.zip                | 971 KB |
| Freshwater | margaritifera-pearl-mussel.zip | 4.1 MB |
| Bird       | kingfisher.zip                 | 169 KB |
| Bird       | seabird-foraging.zip           | 3.5 MB |

**Download Links:**

- https://www.npws.ie/sites/default/files/general/Badger_survey_1989_1995_GIS_1.zip
- https://www.npws.ie/sites/default/files/general/Lesser%20horseshoe%20bat%20data%20NPWS_0.zip
- https://www.npws.ie/sites/default/files/general/Pine_marten_NPWS_data_1.zip
- https://www.npws.ie/sites/default/files/general/National_Otter_Survey_2010_2011_1.zip
- https://www.npws.ie/sites/default/files/general/Otter_Survey_2004_2005_GIS_0.zip
- https://www.npws.ie/sites/default/files/general/Otter_Survey_1980_1981_0.zip
- https://www.npws.ie/sites/default/files/general/Hare_Survey_2006_2007_GIS.zip
- https://www.npws.ie/sites/default/files/general/National_Frog_Survey_of_Ireland_2010_2011_GIS_2.zip
- https://www.npws.ie/sites/default/files/general/Margaritifera_sensitive_areas_2020_v10.zip
- https://www.npws.ie/sites/default/files/general/Kingfisher_survey_2010_GIS_1.zip
- https://www.npws.ie/sites/default/files/general/SBRF21.zip

---

## Part 3 - Habitats (7 files)

| Category | File                      | Size   |
| -------- | ------------------------- | ------ |
| Habitat  | coastal-monitoring.zip    | 5.3 MB |
| Habitat  | commonage-areas.zip       | 15 MB  |
| Habitat  | grasslands-2015-2017.zip  | 20 MB  |
| Habitat  | grasslands-2006.zip       | 6.4 MB |
| Habitat  | floodplain-grasslands.zip | 5.7 MB |
| Habitat  | alluvial-woodland.zip     | 80 MB  |
| Habitat  | reef-inventory.zip        | 329 MB |

**Download Links:**

- https://www.npws.ie/sites/default/files/general/coastal-monitoring-project-2004-2006.zip
- https://www.npws.ie/sites/default/files/general/commonage-dec-12.zip
- https://www.npws.ie/sites/default/files/general/ISGS15_01.zip
- https://www.npws.ie/sites/default/files/general/GMNP06.zip
- https://www.npws.ie/sites/default/files/general/SCAL20_01.zip
- https://www.npws.ie/sites/default/files/general/AWLR19_01.zip
- https://www.npws.ie/sites/default/files/general/NPWS_1170_reef_inventory_2023.zip

---

## Data Structure

Each shapefile ZIP contains:

- `.shp` - Shape geometry
- `.dbf` - Attribute database
- `.shx` - Shape index
- `.prj` - Projection info
- `.doc/.pdf` - Metadata documentation

## Common Fields

| Field                       | Description          | Example                               |
| --------------------------- | -------------------- | ------------------------------------- |
| `Latin_Name` / `LatinName`  | Scientific name      | Martes martes                         |
| `CommonName`                | English name         | Pine Marten                           |
| `Gridref_IG` / `IG_Gridref` | Irish Grid Reference | N5807                                 |
| `Location` / `Loc_Name`     | Location description | Ballybrittas, Co. Laois               |
| `Year`                      | Survey year          | 2010                                  |
| `SurveyName`                | Survey name          | National Pine Marten Survey 2005/2006 |

## Usage

These shapefiles are used to enhance AI prompts with official NPWS survey data:

1. Convert project boundary to Irish Grid Reference
2. Query shapefiles for matching records within buffer zone
3. Add protected species/habitat info to AI context
4. Generate enriched ecological assessments

## License

Data provided by National Parks & Wildlife Service (NPWS), Ireland.
For official use and ecological assessments.
