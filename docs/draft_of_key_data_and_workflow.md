Dulra is developing an end-to-end ecological management platform designed to unify project lifecycles, from initial scoping to statutory delivery. By standardising workflows and automating data-heavy tasks, Dulra enables ecological firms to reduce lead times, maintain rigorous quality control, and ensure legislative compliance across all reporting standards.
To drive this efficiency, the platform utilises a GIS-Integration that we believe is needed to transfer data to help the ecologist with the desk research, field survey and the end report. . This process integrates data directly from external GIS tools into the Dulra platform, creating a seamless thread of data that informs the Desk Study, Field Survey digital forms, and helps to AI auto-generate the final Preliminary Ecological Appraisal (PEA).
Using the PEA as our foundational report, we are mapping the "Data Journey" to understand the specific spatial and qualitative attributes required at each phase:
GIS:
Desk Research: 
Field Survey: 
Reporting: 

The "Data Journey" for a PEA
To build this platform, we must categorise how data transforms through these four stages:
1. The GIS & Desk Study Interface
At this stage, the ecologists has completed GIS work for the project and data will be pushed into the Dulra platform The goal is to identify what data or components(copy of the map etc) is created in the GIS that is needed for the desk research, field survey and the report.
Some map based desktop research likely to be undertaken outside of platform - for example review of 
National Biodiversity Data Centre (NBDC) (Lists of previous flora / fauna records in proximity to the site. ), 
EPA catchments data (catchments.ie), 
review of old 6 inch mapping (OSI - geohive - all OSI datasets available for viewing - I can only imagine very expensive to get licensing to have these available within your platform) and 
aerial photography from different periods (OSI have aerials from 1995 to very 2020 but again licensing an issue with them -  google maps have a good aerial time series available), 
NPWS protected species . cant imagine it is possible - practical to bring in all this data hosted by others into your platform…?  Dont think there is any move towards being able to integrate NBDC data into third party platforms..? 
GIS will need distance measurement tool and other widgets on the map (turn on and off layers, change basemaps etc).
Data Category
Specific Dataset
Platform Requirement
Basemaps
Aerial imagery
Open streets
Open topography
Google maps
Bing
OSI basemaps (licensing issue)
Townlands
Counties etc
To be able to switch between basemaps and to use them within final report maps.
Geocoding to allow you to seach based on address / eircode / townland etc.
Site boundary
Shapefile showing the extent of the site under consideration
Facilitate the import of the shapefile file from client.
View the site boundary in relation to ecological datasets
Create buffer zones around site boundary (e.g. what lies within 2km or 5km of site) to visualise connectivity with features of ecological interest in the surroundings.
Produce a map for inclusion in final report (site boundary overlain on basemap at appropriate scale - all maps to have scale-bar, legend, north arrow and title)
Designated sites
National dataset of designed sites.
NHAs
SACs
SPAs
Import and symbolise (shade as necessary) to visualise where the sites are in relation to study area.
Label the designated sites according to site name for producing map for reporting purposes.
Distance measurement tool and other widgets on the map (turn on and off layers, change basemaps etc).
Produce a map for inclusion in final report (site boundary, designated sites in proximity, a distance buffer around site boundary). May also wish to include watercourses (referred to below)
Aquatic environment
Rivers, Streams, and Lakes
As with designated sites above.
Also , as above may be useful to have ability to buffer rivers and streams to illustrate distances from watercourses.
Site specific ecological  datasets of particular relevance 
(not always required but may be useful in some instances - for example where previous habitat mapping may be available for an area from previous survey etc)
Various
May be shapefiles available for NPWS (such as conservation objective mapping, national survey outputs such as national grassland or woodland datasets etc)
Create maps for reports showing previous records in proximity to the site.
Project specific datasets
Create shapefiles for project (line, point, polygon) to facilitate mapping of ecological features throughout as the project proceeds. Preliminary features (such as likely habitats) can be drawn in advance of fieldwork based on outcome of desktop research / interpretation. Some surveyors would not necessarily start this process until after field visit.
We would have the following four shapefile datasets created before going into the field:
Habitat_polygon = for mapping area based habitats such as grassland, woodland, bog etc.
Habitat_line = for mapping linear habitats such as drains, hedges etc
Habitat_point: for habitats best mapped as points such as springs
Target_notes: we use these an awful lot in the field for general note recording. At desktop stage we might create notes to instruct surveyor (possible site access points, features visible on aerial that need to be checked etc). Within this file we would have a field called ‘category’ to define the type / category of note being recorded. Habitat / damage / flora / fauna / management / ownership / etc.. 
Create and write attribute data to the files. Standard data fields can be attached to the file by default (label, area, site name etc)  but ecologist should be able to add bespoke attribute data fields as they require.
Symbolise the data as required. Shading, labelling etc.
These datasets are editable and remain so throughout the project.
The map should be available via mobile devices to allow ecologist to edit the shapefile data in the field.
The preliminary desktop habitat map is not usually presented in report - unless it is a very high level project and no fieldwork proposed. This can be the case. If so it would be clear to the reader of report that the map was produced solely based on desktop sources.


2. Desk research to Field Survey 
The desk research tells us what might be there. We then create "Survey Targets" to verify on-site.
The GIS map created above for desktop research and the various datasets should be available to the ecologist on their mobile device. Nice to have ability to view all datasets but the most critical would be the site boundary and the  project specific datasets (habitats and target note files) - which need to be editable by the field survey team. Table would be as above
Data Category
Specific Dataset
Platform Requirement
Site boundary
As above
To view in field - surveyor should be able to turn on this layer
Designated sites
As above
To view in field - surveyor should be able to turn on this layer
Aquatic environment
As above
To view in field - surveyor should be able to turn on this layer
Site specific ecological  datasets of particular relevance
As above
To view in field - surveyor should be able to turn on this layer
Project specific datasets
As above
Habitats_polygon
Habitats_linear
Habitats_point
Survey_tareget_notes
To edit in the field. -  - geometry & attribute data
Create features  - geometry & attribute data
Update features - geometry & attribute data
Delete features -  - geometry & attribute data




3. Field Survey Structure (The Digital Form)
The data gathered during the desk study should "push" specific prompts to the surveyor’s mobile device.
For PEA - this can be very simple and just relate to the project specific datasets above as below table.
Would be good to have a quadrat or relevé option available to supplement the map data below that surveyor could collect if they thought worthwhile- however not generally needed for a PEA type survey.
Data Category
Specific Dataset
Platform Requirement
Habitats
Habitats_polygon
Habitat category (FOSSITT) - (required)
Habitat category (EU ANNEX CODE)
Area - auto calculates
Survey Method - codes according to Smith et al 2011
Listed species
Condition - can be a scale 1 to 5 (poor to excellent)
Evaluation - (low local, high local, county, national, international)
Threats - EU codes

Comment - free text (predictive)
Photo ID
or Photo attachment
Surveyor (user log in)
Timestamp
Habitats
Habitats_linear
Habitats
Habitats_point
Survey target notes
Target_notes
Category of note - selectable from defined list / domain
Surveyor - auto generated by user
Time stamp
Comment - Predictive text, multiline text box…
Photo ID
or Photo attachment


3. The PEA Report Output
As we understand, the "End Product" must follow the CIEEM (Chartered Institute of Ecology and Environmental Management) structure. A streamlined platform should create a report with the below sections based on the previous steps: Also what are typical the attached files sent to the client and also the attached files for the projects that would be kept in the database?
Typical Deliverables From our Projects:
Final report incl Appendices.
GIS files created by us during the project.
High res photos relevant to the project. 
Vast majority of clients just want final reports and don’t request anything else.
However, the likes of NPWS usually request all project data and associated meta-data coming from the project. They issue a resource catalogue requirement to us when delivering projects and these can take days or even weeks to pull together on larger projects. 


Data Category
Specific Dataset
Platform Requirement
Site boundary
As above
Create map of site overlain on basemap at appropriate scale  to include in final report. Legend, north arrow, scale, title all need to be included.
Designated sites
As above
Create map showing connectivity between project site and surrounding designated sites at appropriate scale   to include in final report. Legend, north arrow, scale, title all need to be included.
Aquatic features
As above
Create map showing connectivity to aquatic features at appropriate scale  to include in final report. Legend, north arrow, scale, title all need to be included.
Habitat map
As above
3 habitat shapefiles + target note file
Create habitat map of the site at appropriate scale to include in final report. Legend, north arrow, scale, title all need to be included.
This will include a selection of target notes that are referenced in a table presented in the report. Labelled according to note number so can be cross referenced.
Site specific ecological  datasets of particular relevance
As above
Not always required but sometimes may wish to show the project site in relation to other previously recorded data in the surroundings.


This is the standard professional layout for an Irish PEA.
I. Introduction
Project description and site location.
This should follow a strict structure:
Townland
Area in ha (site extent)
Site location (landscape setting), nearest town
Landcover
Land management and land use of site and surroundings
Physical characteristics: altitude, topography, notable features (rivers / lakes etc)
Statement of surveyor competence (CIEEM membership/experience).
II. Methodology
Desk study sources.
Field survey dates and weather conditions (critical for validity).
Survey constraints and limitations (e.g., "Survey conducted in December; some flora may be dormant").
III. Results

@greg@glasfuture.com my feeling is that the desktop review informs each ot the headings below.. desktop review suggests w x and y ... following field surveys we found z.
So we present our understanding of habitats within and surrounding the site which is informed by a combined desktop and field surveys..

Designated sites
Usually include a map and associated table showing nearest designated sites. High level summary info on each site (site name, site code, designation)
Other non-designated sites
Desk review might often identify non-designated sites that have a recognised ecological interest but not formally designated. Worth including a section on these. Examples might be locally important IWeBS sites, wetland sites previously identified not designated etc
Habitat Descriptions: Detailed breakdown of Fossitt codes found on-site.
Discussion on the main habitats within the site -  flora composition, management, threats, condition, ecological value, potential value to fauna etc.
This section can be hard going… although AI is helping - scientific species names etc.. each habitat encountered on site should be described according to above characters.
For a PEA probably not needed but sometimes a table showing data from a representative relevé or quadrat can be useful when describing vegetation.


FFauna: Evidence of protected species or suitable habitat. (sub-sections: terrestrial mammals, bats, birds, reptiles and amphibians, invertebrates (or everything after birds could be “Other fauna”)
Flora:  rare and protected plant species.
Invasive species


IV. Evaluation
Significance: Why does this site matter?
Impacts not always relevant within PEA - may depend on scope. I’d be inclined to keep the PEA simple and strictly to appraise the ecological interest of the site rather than having to include impact assessment - which would require another section above setting out the details of the proposed development… or whatever it is that might give rise to impacts. By keeping it as a baseline ecological appraisal the report can be used to inform many different types of projects not just development-led / planning related projects.
I suggest that after ecological evaluation we include following sections:
Discussion
Depending on the scope of the project the discussion may centre around potential effects of development, potential as a nature conservation area / biodversity area, amenity area, 
 
V. Recommendations (The "Next Steps")

Further Surveys: (e.g., "A dusk emergence bat survey is required between May and August").

As above I think maybe better to not focus in on proposed development - the PEA could be to inform a lot of projects other than developments. Agree that for some it may be relevant to recommend around AA, mitigation, etc ..  another key recommendation could be a constraints mapping or opportunities mapping… 
VI. Appendices
Habitat Map: (The GIS-produced map with Fossitt codes).
Site Photographs: High-quality images of key ecological features.
Species lists
Perhaps some additional background on methodology (e.g. system used for evaluation - NRA 2009)
We often include habitat map and photos within body of report rather than appendices.





