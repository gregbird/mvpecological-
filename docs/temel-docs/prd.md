Product Requirements Document (PRD):
Version: 1.1
Status: Draft / Ready for Review
Link to prototype:https://dulraecological.bolt.host/admin/dashboard

1. Executive Summary
   Dulra’s Ecological platform is a specialised, end-to-end project management and data consolidation platform designed for ecological consultancies. The platform streamlines the entire project lifecycle—from Desk Research and Field Surveys to Automated Reporting. By centralising historical project data, uploading or integrating data from GIS tools such as ArcGIS Online, and leveraging AI for report generation, Dulra aims to reduce time & effort in creating ecological projects by 30% and ensure high-quality, consistent deliverables.
   Our approach to AI is to view it as an essential assistant. We aim for the AI to function as a:

Trainable Assistant
Grows smarter as you feed it knowledge
Autonomous Agent
Operates systems on your behalf
Living Intelligence
Learns, adapts, and evolves
Your Digital Team
Works independently, reports back

This document outlines a strategic approach to developing the platform, emphasising a layered "lasagna" methodology that integrates Workflow, Artificial Intelligence (AI), and Geographic Information Systems (GIS) components. The core objective is to build a product by incrementally developing these key areas, with a strong focus on reliable data and user experience.
Core Product Vision
The product aims to streamline complex processes through a robust workflow, enhance data analysis and report generation with AI, and provide comprehensive spatial intelligence via GIS.
Workflow Foundation
The development prioritises a top-down workflow approach, establishing a high-level foundation that covers the entire end-to-end process. Initially, this "zeroth layer" will manage actions outside the system, akin to a sophisticated task management tool. Subsequent layers will enable specific actions directly within the application. This workflow will integrate AI for information gathering during desk research and GIS for mapping, while field research will leverage agentic AI and mobile interactions for richer data collection.
Three-Part AI Implementation
The AI component is designed as a 3-part system:
Desk Research: A critical aspect of AI implementation is ensuring data reliability. The system will utilise trusted sources like NPWS and catchments.ie, stored in an enriched database, to prevent AI "hallucination" often caused by unreliable training data. There is a clear need to restrict AI data sources, potentially through a custom "restricted browser" tool, to specific, graded web pages.
Field Research: based on the findings in the desk research a draft survey will be created
Report draftsman: By utilising specialised prose generation and automated, context-aware, the platform handles the heavy lifting of initial drafting, data aggregation, and draft report creating. This vital synergy between machine efficiency and human, professional expertise is the core to a successful platform. It ensures that the ecologist’s subjective, professional opinion, their deep institutional knowledge, and their critical judgment remain the undisputed central pillar of every single report, finding, and recommendation.

GIS Integration and Data Management
GIS integration will focus on creating a common interface for various GIS tools, rather than attempting to integrate every single one. The system will support the import and integration of data in formats like GeoJSON, accommodating site boundaries, linear features, polygons, and grid information. This will enable the mapping of habitat terms and facilitate the upload of external GIS data (e.g., from ArcGIS) for report generation. The minimum data requirement for GIS includes site boundaries, convertible to grid information, or even central point coordinates to populate species and habitat data.
Key Challenges and Solutions
GIS Integration Complexity: Acknowledging the diverse GIS tools used, the strategy is to build a common interface rather than attempting full integration with every tool.
AI Hallucination: To combat this, AI will be restricted to reliable data sources from an enriched database, with research into limiting external tool access.

2. Target Audience & User Personas
   Persona
   Goals
   Pain Points
   Patrick (Senior Management)
   High-level oversight, real-time progress review of 7 team members, reducing "handholding when colleagues are creating reports."
   Manual progress tracking, inconsistent report quality, difficulty accessing past project data.
   Ecologist / Field Surveyor
   Efficient data collection, quick desk research, automated report drafting.
   Repetitive data entry, offline connectivity issues in the field, tedious manual reporting.
   External Specialist
   Providing niche data (e.g., Hydrology) for specific projects.
   Friction in data handover, inconsistent formatting.

3. Product Strategy & Success Metrics
   Core Objective: Reduce the time and effort spent on manual desk research and report writing. Standardisation of reports and process to ensure the highest quality of reports being created
   Success Metric (KPI): 30% reduction in time/effort for Desk Research and Final Reporting within the first 6 months.

4. Functional Requirements
   4.1 Project Management & Dashboard

This feature allows the management to oversee the progress of all projects, with up to 12 stages (should differ depending on report type) for each project it allows the management to see how long it takes for each stage. The team members should be able to request input from a colleague to review the progress and for 3rd parties to provide data and opinion for a project.
Assessment Workflow Guide: A 3-phase visual tracker (Desk Research, Field Research, Reporting).
With up to multi sub stages in each category
Active Assessments: Dashboard cards showing Project Name, Site Code, Team member, and Status.
Status Legend: Not Started, In Progress, Completed, Needs Review (Orange), Blocked (Red).
Project Creation: \* Fields: Project Name, Client, Date Deadline, Survey Type (EIA, AA, Protected Species, etc.), Estimated time/Budget, Scope. With text fields and re write with AI -> Objective, expectation
Alerts: Visual indicator if current progress exceeds the "Estimated Days" allocated during creation.
4.2 The "All Projects" Database (Knowledge Retrieval)
Feature: Project History & Analysis

Ecological firms possess a valuable resource in the data and reports from their completed projects. This feature empowers users to search, analyse, and leverage the information contained within these existing project reports. This functionality will be accessible both independently and within the context of a current project.

Search & Filter: Search past projects by Habitat Type, Species, Flora, or Sectoral Type (e.g., Housing, Forestry, Wind).
Internal Precedent: Users can review and "Attach" findings or map layers from historical projects to a new project to accelerate desk research.
4.3 GIS data & Desk Research
Ecologists initiate a project by first creating a project map using ARCGIS or QGIS. This map is crucial for defining the site boundaries, pinpointing areas of interest for the field survey, and potentially delineating the habitats present within the site. These maps will be included in the finalised after the field research and inserted into the report.

GIS Data Import and Review

The Dulra platform must support the import of boundary, linear, and polygon data from the user's GIS tool. Upon upload, this data will be replicated within Mapbox to facilitate desktop searches.

Search results will be presented to the user, who will have the option to review the relevant data within Dulra. The system will use coordinates from the search results to display the data on the map within the Dulra user interface. The UI must provide functionality for the user to review the search data and either save or remove it.

GIS map Data upload
ArcGIS Online & QGIS: Primary tool for spatial data. Must allow data upload/selection of key types (boundary, liner (points of interest), features (habitats),).
Single View Aggregator: Pull external data layers from NPWS, EPA, Marine Institute, and River/Stream data into one pane.
Site Boundary Definition: Import Shapefiles or manually draw a "Red Line" boundary.
GIS tool may need a distance measurement tool and other widgets on the map (turn on and off layers, change basemaps etc).
Here the ecologists will search existing projects reports and will search certain websites to gain key information about the site, habitats etc. this key information better informs the ecologists on the given site. The ecologist wants to save the key data for the field survey and report.
Project History & Analysis - as 4.2 feature allow the user to search, save, edit data
External Data Gathering: Capability to search and save findings from the National Biodiversity Data Centre and other key repositories directly into the project folder. Based on a number of filters
Data search Considerations
National Biodiversity Data Centre (NBDC) (Lists of previous flora / fauna records in proximity to the site.,
EPA catchments data (catchments.ie),
Aerial time series
NPWS protected species here csv format with Grid references
NPWS protected and special area shapefiles here
Once the application returns the necessary site boundary information, users can review the summarised (headline) data. Detailed information will be accessible by clicking an expansion icon located at the end of each four-line paragraph.
Users will have the options to save, perform deeper research, or remove the retrieved information.-----Proposed Desk Research Workflow
Ecologist Input: The ecologist provides the site boundary details.
Dulra Processing: Dulra converts the boundary details into a grid reference and other necessary parameters.
Dulra then queries its core database to gather information on:
Protected Species:
Fauna (Animal life)
Flora (Plant life)
NPWS & European Sites: Designations and protected areas.
AI Generation: Dulra incorporates this core database information, along with the ecologist's input, into a controlled prompt for the AI-powered Large Language Model (LLM).
Information Return: Dulra returns the generated information, providing links to key sources (any saved information that would be used in the report the links to this information should be auto saved footnotes and appendix links)The ecologist can then take the following actions:
Save: Stores the information for future reference.
Edit: Allows the ecologist to modify the information before saving it.
Deep Research: Prompts the LLM to conduct further investigation into a specific piece of data.
Remove: Deletes the information from the current desk research session.
Audit Requirement:

It is critical that the Dulra platform maintains a comprehensive audit trail of all information returned and every action taken by the ecologists. This audit log must record the: project name, ecologist, date, time, and type of action performed.

The UI for the start of the Desk research should be something similar to the below:

The UI for the information returner for the Desk research should be something similar to the below:

4.5 Mobile Field Survey (Offline-First)
Ecologists will conduct field surveys and have the option to use their own tools or Dulra's features for data collection.

List of Surveys: -> https://docs.google.com/document/d/1vSC-NaISyddHMS4lB6i_BZ0meS0r4q7334aCGhG3Xkk/edit?tab=t.0#heading=h.eti8udqmz2lb

If using Dulra's field survey, they can choose from a predefined list of surveys, edit it beforehand, save it, and send it to their mobile device or email. Once in the field, they can complete the survey offline and/or add new fields as needexxd.
If the ecologists is using their own field survey (paper or an app) Dulra will need to allow for the import of this data from their field survey.
Upload
Image recognition tool

Options for Dulra Field Survey
Configuration: Desktop-defined survey templates (e.g., habitat survey, NatureScot, Relevé, Qulart etc) deployed to mobile.
Metadata: Auto-capture Surveyor, Date, Time; manual entry for Weather (Wind, Frost, Cloud, etc.).
Data Collection: \* Target Notes: Georeferenced points + photos.
Relevé Sampling: Structured digital forms (Slope, Bare Soil, Species List).
Standard Calculations: NatureScot formulas integrated directly into the digital form.
Geolocation & Sync: High-precision GPS with manual "ID Pin" fallback. Requirement: Must support full offline data entry with background sync once a connection is restored.
If the ecologists is using a 3rd party field survey, Dulra must allow for data integration
Survey 123
Monitoring tools with ai
Remote sensing
Austic
Camera trap etc Al
4.6 AI-Powered Reporting & Post-Survey
The core value of the Dulra tool lies in its ability to rapidly generate a comprehensive end report. For each section, Dulra will provide a pre-drafted template that the ecologist can review, edit, or delete, subsequently adding findings from desk and field research, and the final map creation. This functionality will significantly streamline data processing, resulting in a comprehensive report, written in English and adhering to Irish spelling and terminology.
List of Surveys: -> https://docs.google.com/document/d/1vSC-NaISyddHMS4lB6i_BZ0meS0r4q7334aCGhG3Xkk/edit?tab=t.0#heading=h.eti8udqmz2lb
Key Requirements for the AI Tool:
Structure Adherence: The AI must utilize the firm's existing report structure for the specific project type, including the expected length for each section, avoiding unnecessary verbosity ("waffle").
Input Guidance: The tool must highlight to the ecologists which report sections require further input or are missing critical data.
Report Formatting: The final report must include the ecologist firm's logo, a cover page matching existing reports, and a list of contents.
Data Visualization: When desk or field survey data is provided, the tool must parse it, offering the ecologist options for preferred display, such as graphs or pie charts.
Mapping and Commentary: Maps must be displayed alongside photographs and accompanying opinions. Ecologists must be able to title and provide their opinion, which the AI report tool should rephrase for coherence but never alter the original substance of the opinion.
Quality Control: A critical quality control step is required after report generation, necessitating approval by an ecologist or a team member to fulfill the audit process.
AI Report Draftsman: An LLM-powered tool that accesses the project’s desk research, field data, and the "All Projects Database."
Capabilities: Generates prose based on field notes, ensuring the tone and structure match company standards.
Workflow: Data Quality Check → Statistical Analysis → AI Draft Generation → Peer Review → Final Report.

5. Technical Specifications
   5.1 System Architecture & Integration
   GIS: data upload ability with a later version of an API integration with ArcGIS Online.
   Cloud: Real-time sync between Mobile (Tablet/Phone) and Desktop.
   Security: Audit Trail logging every change and user action.
   5.2 User Access Control
   Project Team: Any member added to a project can edit formulas or templates for that specific project.
   Allow multi team member to work on a project or limit what stage they can have input on
   External Specialists: Restricted "Contributor" access for CSV/Excel uploads (e.g., Hydrology data).
6. AI: Prompt Library
   This library defines the System Prompts that govern how the AI interprets specific datasets. These prompts are "hard-coded" into the backend; the user simply clicks "Generate Draft," and the system selects the correct template based on the Survey Type selected during project creation.

6.1 Template: Preliminary Ecological Appraisal (PEA)
Focus: High-level summary, habitat mapping, and further survey recommendations.
System Role: You are an Ecologist conducting a baseline site assessment.
Task: Draft the "Baseline Conditions" and "Evaluation" sections.
Inputs:
Primary Data: {fossitt_habitat_codes}, {target_notes}, {species_list}
Reference: {historical_precedents_from_database}
Writing Constraints:
Fossitt Integration: Every habitat mentioned must include its alphanumeric code (e.g., Improved Agricultural Grassland (GA1)).
Comparative Analysis: Compare current {species_list} against {historical_precedents_from_database} to identify any loss or gain in biodiversity.
Recommendation Logic: If an Annex I habitat is identified, the draft must automatically generate a "Requirement for Further Survey" subsection.

7. Prompt Logic: The "Ecological Opinion" Input
   To prevent the AI from making subjective decisions, the interface includes an Ecologist’s Opinion Box before generation.
   User Input (Ecologist)
   AI Transformation (Report Draft)
   "Found a badger sett, looks recently used, 3 active entrances."
   "A confirmed badger (Meles meles) sett was identified at [Location ID]. The presence of fresh bedding and clear entrances indicates the sett is currently active and of high ecological value."
   "Site is mostly low-value grass, but the hedgerow on the North is diverse."
   "The majority of the site is comprised of Improved Agricultural Grassland (GA1) of low local importance. However, the hedgerow (WL1) along the northern boundary exhibits high species richness and serves as a vital ecological corridor."

8. Profitability Dashboard Logic
   This section addresses Patrick's requirement to track real-time financial health.
   8.1 The "Efficiency Ratio" Formula
   The system calculates a "Profitability Score" for every project using the following logic:
   $$\text{Profitability Score} = \frac{\text{Estimated Budget (Days)} \times \text{Daily Rate}}{\text{Total Hours Logged} + \text{AI Processing Time Factor}}$$
   8.2 Real-Time Visual Indicators
   Green: Project is <50% of budget and in the "Reporting" phase.
   Yellow: Project is at 80% budget but only in "Field Survey" phase (requires manual intervention).
   Red: Project has exceeded estimated days.
