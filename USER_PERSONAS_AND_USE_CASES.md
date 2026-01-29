# Dulra Platform: User Personas & Use Case Requirements

**Document Type:** Product Requirements - User-Centered Design
**Version:** 1.0
**Date:** December 2024
**Owner:** Product Management

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [User Personas](#user-personas)
3. [User Journeys](#user-journeys)
4. [Use Cases by Persona](#use-cases-by-persona)
5. [Jobs to Be Done](#jobs-to-be-done)
6. [User Stories](#user-stories)
7. [Success Metrics](#success-metrics)

---

## Executive Summary

### Problem Statement
Ecological consultancies face significant challenges in managing complex environmental assessment projects. Current workflows rely on disconnected tools (Excel, Word, email, shared drives) leading to:
- Data silos and version control issues
- Difficulty tracking project progress across distributed teams
- Risk of regulatory non-compliance due to missed steps
- Inefficient communication between field teams and office staff
- Time-consuming manual report compilation
- Limited visibility for clients into project status

### Solution Vision
Dulra provides a unified platform that streamlines ecological survey workflows from initial desk research through final report delivery, enabling teams to collaborate effectively, ensure compliance, and deliver projects faster.

### Target Market
- **Primary:** Small to medium ecological consultancies in Ireland (2-20 staff)
- **Secondary:** Larger environmental consultancies with ecology departments (20-100 staff)
- **Tertiary:** Independent ecological consultants

---

## User Personas

### Persona 1: Senior Ecologist (Admin/Project Manager)

**Name:** Dr. Sarah O'Brien
**Age:** 38
**Role:** Senior Ecologist & Director
**Organization:** GreenEarth Ecology Ltd (12 staff)
**Location:** Cork, Ireland

#### Background
- PhD in Conservation Biology
- 15 years experience in ecological consulting
- Manages 10-15 active projects simultaneously
- Responsible for business development and quality assurance
- Chartered Environmentalist (CEnv) with CIEEM
- Spends 40% time in office, 30% in field, 30% client meetings

#### Goals
- **Primary:** Deliver high-quality ecological assessments on time and within budget
- **Secondary:** Maintain compliance with Irish and EU environmental regulations
- **Tertiary:** Grow the business by taking on more projects without hiring significantly more staff
- **Personal:** Reduce evening and weekend work to achieve better work-life balance

#### Pain Points
- **Time Management:** Constantly switching between multiple projects, losing track of what stage each is at
- **Quality Control:** Difficult to review team members' work when data is scattered across email attachments and shared drives
- **Client Communication:** Clients frequently ask "what's the status?" requiring manual compilation of updates
- **Resource Allocation:** Hard to see who's available for new projects or overloaded
- **Compliance Risk:** Worried about missing critical assessment steps required by legislation
- **Manual Reporting:** Spends hours copying data from field sheets into Word reports

#### Technology Proficiency
- Advanced user of MS Office (Excel, Word)
- Comfortable with GIS software (QGIS, ArcGIS)
- Uses email heavily, less comfortable with modern collaboration tools
- Smartphone user but prefers desktop for "real work"

#### Behaviors
- Checks project status first thing every morning
- Reviews team submissions in batches (evenings, weekends)
- Prefers visual dashboards over detailed reports
- Makes decisions based on deadline pressure and client relationships
- Often works offline during site visits

#### Frustrations with Current Process
- "I spend more time managing spreadsheets than doing ecology"
- "Finding the latest version of a document is like archaeology"
- "I can't tell if we're on track until it's too late"
- "Onboarding new staff takes weeks because our 'system' is tribal knowledge"

#### Success Criteria
- Can see status of all projects in under 60 seconds
- Confident all regulatory requirements are being met
- Can delegate work knowing it will follow the correct process
- Reports generate automatically from field data
- Projects complete 20% faster

---

### Persona 2: Field Ecologist (Team Member)

**Name:** Conor Murphy
**Age:** 27
**Role:** Ecological Consultant
**Organization:** GreenEarth Ecology Ltd
**Location:** Based in Galway, works across Ireland

#### Background
- BSc in Ecology and Environmental Science
- 4 years field experience
- Specializes in bat surveys and breeding bird surveys
- Holds protected species survey licenses (bats, badgers)
- Spends 70% time in field, 20% data entry, 10% meetings
- Often works early mornings, evenings for survey timing requirements

#### Goals
- **Primary:** Complete assigned surveys accurately and efficiently
- **Secondary:** Advance career by taking on more complex assessments
- **Tertiary:** Minimize tedious data entry and admin work
- **Personal:** Finish work at reasonable hours during survey season

#### Pain Points
- **Data Entry Hell:** Spends evenings transcribing paper field notes into Excel
- **Disconnected Work:** Can't see if colleagues already surveyed nearby sites
- **Missing Context:** Often lacks background info about project objectives
- **Photo Management:** Photos scattered across phone, camera, laptop with no systematic naming
- **Double Work:** Records same species data multiple times in different formats
- **Equipment Juggling:** Carries tablet, GPS, camera, phone, paper notebooks
- **Limited Feedback:** Submits data but rarely hears if it was useful or complete

#### Technology Proficiency
- Comfortable with smartphones and mobile apps
- Basic GIS skills (can create simple maps)
- Uses WhatsApp and social media extensively
- Frustrated by clunky enterprise software
- Prefers apps that "just work" without training

#### Behaviors
- Records field notes in pocket notebook during surveys
- Takes 50-100 photos per survey
- Batches data entry for multiple surveys at once (leading to delays)
- Frequently works in areas with poor mobile signal
- Likes to review species records from previous surveys before going to field

#### Frustrations with Current Process
- "I spend more time on data entry than doing actual ecology"
- "My photos are a mess and I can't find specific observations later"
- "I write the same weather conditions in 10 different forms"
- "I don't know if my data was useful or if I should collect more"

#### Success Criteria
- Can record observations directly in the field on mobile device
- Photos automatically linked to correct survey and location
- Weather data auto-populated
- Works offline and syncs when back in office
- Gets feedback on data quality within 24 hours
- Spends 50% less time on data entry

---

### Persona 3: GIS Specialist (Team Member)

**Name:** Lisa Chen
**Age:** 32
**Role:** GIS Analyst
**Organization:** GreenEarth Ecology Ltd
**Location:** Cork office

#### Background
- MSc in GIS and Remote Sensing
- 7 years GIS experience in environmental sector
- Expert in QGIS, ArcGIS, spatial analysis
- Creates maps for 20-30 reports per month
- Works primarily in office (90% time)
- Often on tight deadlines for report submissions

#### Goals
- **Primary:** Produce accurate, professional maps for ecological reports
- **Secondary:** Streamline repetitive mapping tasks
- **Tertiary:** Make spatial data accessible to non-GIS colleagues
- **Personal:** Learn new spatial analysis techniques

#### Pain Points
- **Data Gathering:** Chasing field staff for GPS coordinates and survey polygons
- **Format Hell:** Receives data in incompatible formats (Excel, paper sketches, photos of maps)
- **Repetitive Work:** Creates same base maps repeatedly with minor variations
- **Last-Minute Requests:** "Can you just add these 5 species locations?" at 4:45pm
- **No Validation:** Discovers bad coordinates after spending hours on analysis
- **Version Chaos:** Multiple people editing shapefiles causing conflicts
- **Manual QC:** Manually checking if survey areas overlap designated sites

#### Technology Proficiency
- Expert GIS user (QGIS, ArcGIS Pro)
- Strong spatial database skills (PostGIS)
- Python scripting for automation
- Comfortable with web mapping frameworks
- Cloud storage power user

#### Behaviors
- Maintains personal library of base map templates
- Creates standardized symbology and layouts
- Prefers vector data over raster when possible
- Runs batch processes overnight
- Regularly checks data quality before analysis
- Documents spatial reference systems meticulously

#### Frustrations with Current Process
- "I spend half my time fixing bad coordinates before I can start mapping"
- "Everyone draws boundaries differently so nothing aligns"
- "By the time I finish the map, the field data has changed"
- "I'm the bottleneck because all spatial data flows through me"

#### Success Criteria
- Field staff can digitize survey areas directly on map interface
- All spatial data in consistent coordinate system (ITM)
- Real-time access to spatial data as it's collected
- Automated validation of coordinate ranges
- Standard map templates auto-populate from database
- 60% reduction in map production time

---

### Persona 4: Junior Ecologist (Team Member - Early Career)

**Name:** Emma Doyle
**Age:** 24
**Role:** Graduate Ecologist
**Organization:** GreenEarth Ecology Ltd
**Location:** Cork

#### Background
- BSc in Environmental Science (graduated 6 months ago)
- First job in ecological consulting
- Enthusiastic but limited field experience
- Learning survey methodologies and species identification
- fill in
- Eager to prove herself and gain experience

#### Goals
- **Primary:** Learn ecological survey techniques and build professional skills
- **Secondary:** Contribute meaningfully to project deliverables
- **Tertiary:** Develop species identification expertise
- **Personal:** Become a licensed protected species surveyor

#### Pain Points
- **Steep Learning Curve:** Overwhelmed by number of survey protocols and regulations
- **Fear of Mistakes:** Worried about recording incorrect species or missing important observations
- **Limited Mentorship:** Senior staff too busy to provide detailed guidance
- **Unclear Expectations:** Unsure what level of detail to record in field notes
- **No Reference Material:** Can't easily look up similar surveys for examples
- **Impostor Syndrome:** Feels less competent than experienced colleagues
- fill in

#### Technology Proficiency
- Digital native, comfortable with apps and cloud tools
- Limited GIS experience (intro course in university)
- Strong social media and communication skills
- Fast learner with new software
- Expects intuitive user interfaces

#### Behaviors
- Refers to field guides and apps constantly for species ID
- Takes extensive notes and photos to compensate for inexperience
- Seeks approval before submitting work
- Learns by observing senior colleagues
- Active in online ecology communities
- fill in

#### Frustrations with Current Process
- "I don't know if I'm recording the right information"
- "I can't find examples of how others completed similar surveys"
- "I'm afraid to ask too many questions"
- "The forms have fields I don't understand"

#### Success Criteria
- Clear guidance on what data to collect for each survey type
- Access to completed examples from similar projects
- Built-in validation to catch obvious errors
- Ability to mark observations as "uncertain" for senior review
- Learning resources embedded in workflow
- Positive feedback on data quality boosts confidence

---

### Persona 5: Environmental Consultant (Client)

**Name:** Michael Brennan
**Age:** 45
**Role:** Environmental Manager
**Organization:** Infrastructure Development Ltd
**Location:** Dublin

#### Background
- Managing environmental compliance for major infrastructure projects
- Hires 5-10 ecological consultancies per year
- Responsible for ensuring projects meet planning conditions
- Reports to project directors and planning authority
- Limited ecology expertise, relies on specialist consultants
- fill in

#### Goals
- **Primary:** Ensure ecological assessments meet regulatory requirements
- **Secondary:** Keep projects on schedule by avoiding ecology delays
- **Tertiary:** Demonstrate due diligence to planning authorities
- **Personal:** Avoid surprises that could derail project approvals

#### Pain Points
- **Black Box:** Consultants disappear for weeks with minimal updates
- **Status Anxiety:** Don't know if surveys are progressing or stalled
- **Late Deliverables:** Reports arrive late causing project delays
- **Quality Uncertainty:** Can't assess if work is thorough until final report
- **Communication Gaps:** Email chains with multiple people, unclear who's responsible
- **Budget Creep:** Additional surveys requested without clear justification
- fill in

#### Technology Proficiency
- Uses project management software (MS Project, Primavera)
- Comfortable with web portals and dashboards
- Email and video conferencing daily user
- Prefers visual status updates over technical reports
- fill in

#### Behaviors
- Reviews project dashboards daily
- Escalates quickly if deadlines at risk
- Wants evidence of work being done
- Appreciates proactive communication
- Values transparency and honesty over optimistic estimates
- fill in

#### Frustrations with Current Process
- "I have no visibility into what's actually happening"
- "I find out about delays too late to adjust the schedule"
- "I can't tell if we're getting good value for money"
- "Every consultant uses different reporting formats"

#### Success Criteria
- Real-time access to project status dashboard
- Clear timeline with milestones and completion dates
- Ability to see field survey photos and preliminary findings
- Automated alerts if project falls behind schedule
- Downloadable progress reports for project meetings
- Confidence that all regulatory requirements are being met

---

### Persona 6: Independent Ecological Consultant (Solo Practitioner)

**Name:** Patrick Fitzgerald
**Age:** 51
**Role:** Principal Ecological Consultant
**Organization:** Self-employed
**Location:** Kerry

#### Background
- 25 years experience in ecological consulting
- Former National Parks and Wildlife Service employee
- Expert in habitat assessment and Article 17 reporting
- Works on 3-5 projects simultaneously
- Subcontracted by larger consultancies for specialist assessments
- No administrative support staff

#### Goals
- **Primary:** Deliver high-quality specialist assessments efficiently
- **Secondary:** Maintain steady income stream
- **Tertiary:** Minimize administrative overhead
- **Personal:** Continue working flexibly into semi-retirement

#### Pain Points
- **Time Poverty:** Every hour on admin is an hour not earning
- **Client Coordination:** Multiple clients with different systems and requirements
- **Isolation:** Works alone without peer review or quality checking
- **Technology Overhead:** Can't justify expensive software licenses for part-time use
- **Data Management:** Years of survey data in unorganized folders
- **Professional Image:** Solo practitioners perceived as less capable than firms
- fill in

#### Technology Proficiency
- Comfortable with traditional desktop software
- Resistant to subscription-based tools
- Prefers simple, reliable technology
- Limited cloud adoption (security concerns)
- fill in

#### Behaviors
- Uses tried-and-tested workflows developed over decades
- Maintains detailed paper notebooks
- Creates custom Word report templates
- Archives projects in labeled folders
- Selective about which projects to accept
- fill in

#### Frustrations with Current Process
- "I waste time learning different systems for each client"
- "I can't afford enterprise software on a solo income"
- "My historical data is trapped in old file formats"
- "Clients don't trust solo consultants like they used to"

#### Success Criteria
- Single platform works for all clients
- Affordable pricing for occasional use
- Can maintain professional image competitive with larger firms
- Simple interface that doesn't require constant retraining
- Secure data storage without managing servers
- Export data in standard formats for archiving

---

## User Journeys

### Journey 1: Senior Ecologist - New Project Setup

**Scenario:** Sarah receives a call from a potential client about an EIA for a proposed wind farm development.

#### Current State Journey (Without Dulra)
1. **Initial Contact** - Client calls, Sarah takes notes on paper
2. **Scope Definition** - Multiple emails back and forth, creating proposal in Word
3. **Project Setup** - Creates new folder structure on shared drive
4. **Team Assignment** - Sends individual emails to assign team members
5. **Schedule Creation** - Builds timeline in Excel spreadsheet
6. **Tracking Setup** - Creates project tracking row in master spreadsheet
7. **Kickoff** - Schedules meeting to explain project to team

**Pain Points:** 2-3 hours of setup work, easy to forget steps, team unclear on their roles

**Emotional Journey:** Optimistic → Tedious → Anxious (did I forget anything?)

#### Future State Journey (With Dulra)
1. **Initial Contact** - Client calls, Sarah opens Dulra during conversation
2. **Quick Create** - Clicks "New Project", fills in project name, client, deadline
3. **Auto-Setup** - System creates 16-step workflow automatically
4. **Smart Assignment** - Platform suggests team members based on availability and skills
5. **One-Click Launch** - Clicks "Create Project" and workflow begins
6. **Notification** - Team automatically notified of assignments via platform
7. **Dashboard Update** - Project appears on all team members' dashboards

**Pain Points Resolved:** Setup in 10 minutes, nothing forgotten, team immediately aware

**Emotional Journey:** Optimistic → Efficient → Confident

---

### Journey 2: Field Ecologist - Conducting Bat Survey

**Scenario:** Conor needs to conduct a bat activity survey at dusk for the wind farm project.

#### Current State Journey (Without Dulra)
1. **Pre-Survey**
   - Searches email for project details
   - Prints survey form from shared drive
   - Checks weather forecast separately
   - Loads batteries, checks equipment

2. **Travel**
   - Drives to site with paper map
   - Arrives, realizes he forgot the site boundary coordinates
   - Improvises survey area

3. **Survey Execution**
   - Records observations in notebook with headlamp
   - Takes photos with camera (forgets to record photo waypoints)
   - Notes weather conditions on paper
   - Bat detector saves audio files to SD card

4. **Post-Survey**
   - Returns home late, too tired for data entry
   - Postpones data entry for 3 days
   - Finally transcribes notes into Excel
   - Uploads photos to shared drive (generic folder)
   - Emails Sarah that survey is "done"

5. **Follow-up**
   - Sarah emails back asking for weather data
   - Conor searches notebook, finds entry, replies by email
   - Realizes he forgot to note sunset time
   - Estimates from memory

**Pain Points:** 3 hours fieldwork + 2 hours admin, poor data quality, delayed submission

**Emotional Journey:** Prepared → Frustrated → Stressed → Guilty → Relieved (finally done)

#### Future State Journey (With Dulra)
1. **Pre-Survey**
   - Opens Dulra mobile app, sees assigned survey
   - Reviews site boundary on interactive map
   - Downloads offline map and project details
   - Checks equipment checklist in app

2. **Travel**
   - Navigate to site using app map with boundary overlay
   - Arrives, app shows survey area clearly
   - App auto-logs location and sunset time

3. **Survey Execution**
   - App prompts for weather conditions (temp, wind, cloud)
   - Records bat passes with time and location stamps
   - Takes photos directly in app (auto-tagged with GPS and timestamp)
   - Voice-to-text for quick behavior notes
   - App reminds to check survey end time

4. **Post-Survey**
   - Clicks "Complete Survey" before leaving site
   - Data syncs automatically when back in mobile coverage
   - Photos organized in project gallery
   - Sarah receives notification that survey completed

5. **Follow-up**
   - Sarah reviews data on desktop dashboard
   - Sees weather, timing, effort all recorded
   - Downloads species observation report
   - Approves survey, triggers next workflow step

**Pain Points Resolved:** 3 hours fieldwork + 15 min wrap-up, high data quality, immediate submission

**Emotional Journey:** Prepared → Confident → Efficient → Accomplished

---

### Journey 3: Client - Monitoring Project Progress

**Scenario:** Michael needs to report on ecological assessment status to his project director.

#### Current State Journey (Without Dulra)
1. **Request Status** - Emails Sarah asking for update
2. **Wait** - Sarah busy in field, responds next day
3. **Receive Update** - Email narrative "surveys ongoing, report draft in 2 weeks"
4. **Clarify** - Follows up asking which surveys are complete
5. **Second Wait** - Another day passes
6. **Second Response** - Sarah sends bullet point list
7. **Compile Report** - Michael manually types status into project report
8. **Meeting Question** - Director asks "are we on track for planning deadline?"
9. **Uncertainty** - Michael hedges "consultant says 2 weeks, should be fine"
10. **Surprise** - Two weeks later, report delayed, says "need one more survey"

**Pain Points:** 3-day turnaround for status, no visibility, surprises

**Emotional Journey:** Curious → Impatient → Mildly Annoyed → Uncertain → Blindsided → Angry

#### Future State Journey (With Dulra)
1. **Access Portal** - Logs into Dulra client portal
2. **View Dashboard** - Sees project overview immediately
   - Workflow progress: 9 of 16 steps complete (56%)
   - Current phase: Field Research
   - On track / At risk / Overdue status
3. **Drill Down** - Clicks on project card
4. **Review Details**
   - See which surveys completed (with dates)
   - See which surveys in progress
   - See uploaded field photos
   - View preliminary species list
5. **Export Report** - Clicks "Download Status Report" for project meeting
6. **Meeting Confidence** - Shows visual dashboard to director
   - "We're 56% complete, currently in field research phase"
   - "5 of 6 field surveys done, on track for report draft in 10 days"
7. **Proactive Alert** - Receives automated email next day
   - "Weather delay may impact deadline by 3 days"
   - Michael adjusts project schedule proactively

**Pain Points Resolved:** Instant status access, visual progress tracking, proactive alerts

**Emotional Journey:** Curious → Informed → Confident → In Control

---

## Use Cases by Persona

### Senior Ecologist (Admin) Use Cases

#### UC-1: Create New Project
**Actor:** Senior Ecologist
**Goal:** Set up a new ecological assessment project with proper structure
**Frequency:** 2-3 times per month

**Preconditions:**
- User has Admin role
- Client has agreed to project scope
- fill in

**Main Flow:**
1. User clicks "New Project" button
2. System displays project creation modal
3. User enters:
   - Project name
   - Client name
   - Survey type/methodology
   - Expected deadline
   - Project duration
4. System generates unique site code
5. System creates 16-step workflow automatically
6. System prompts for team assignments (optional)
7. User assigns team members to project
8. User clicks "Create Project"
9. System saves project and notifies assigned team members
10. System redirects to project dashboard

**Alternative Flows:**
- **A1:** User cancels creation - no project saved
- **A2:** User creates without team assignments - can assign later
- **A3:** Duplicate project name - system suggests unique name
- fill in

**Postconditions:**
- Project created in database
- Workflow steps initialized
- Team members notified
- Project appears on relevant dashboards

**Success Metrics:**
- Project creation time < 5 minutes
- 0% of projects missing workflow steps
- 90% of team members assigned at creation

**Business Value:**
- Ensures consistent project setup
- Reduces admin time by 75%
- Eliminates forgotten workflow steps

---

#### UC-2: Monitor Portfolio Health
**Actor:** Senior Ecologist
**Goal:** Quickly assess status of all active projects
**Frequency:** Daily (morning routine)

**Preconditions:**
- User has active projects
- Projects have workflow progress data

**Main Flow:**
1. User logs into platform
2. System displays dashboard with project overview
3. User views:
   - Total project count
   - Project status distribution (pie chart)
   - Timeline health indicators (traffic lights)
   - Projects at risk or overdue (highlighted)
4. User clicks project card to see details
5. System displays project workflow modal
6. User reviews phase completion and current step
7. User identifies bottlenecks or delays
8. User takes corrective action (reassign, extend deadline, etc.)

**Alternative Flows:**
- **A1:** No projects at risk - user reviews and proceeds with day
- **A2:** Multiple projects overdue - user triages by client priority
- fill in

**Postconditions:**
- User has complete situational awareness
- At-risk projects identified
- Action plan formulated

**Success Metrics:**
- Dashboard review time < 2 minutes
- 100% project status accuracy
- At-risk identification 5+ days before deadline

**Business Value:**
- Enables proactive project management
- Prevents deadline surprises
- Improves resource allocation decisions

---

#### UC-3: Review and Approve Team Work
**Actor:** Senior Ecologist
**Goal:** Quality check team member submissions before finalizing
**Frequency:** 2-3 times per week

**Preconditions:**
- Team member has completed workflow step
- Data has been submitted for review

**Main Flow:**
1. User receives notification of completed work
2. User navigates to project workflow
3. User identifies step marked "Needs Review"
4. User clicks to view submitted data
5. System displays relevant data (observations, maps, photos)
6. User reviews for:
   - Completeness
   - Accuracy
   - Regulatory compliance
7. User provides feedback or requests changes
8. User marks step as "Approved" or "Needs Revision"
9. System notifies team member of decision
10. If approved, next workflow step unlocks

**Alternative Flows:**
- **A1:** Data incomplete - user marks "Needs Revision" with comments
- **A2:** Data excellent - user marks "Approved" and adds praise
- **A3:** User delegates review to another senior staff member
- fill in

**Postconditions:**
- Quality assured data in system
- Team member receives feedback
- Workflow progresses (if approved)

**Success Metrics:**
- Review turnaround time < 24 hours
- 80% approval rate on first submission
- Documented audit trail of all reviews

**Business Value:**
- Maintains quality standards
- Provides mentorship to junior staff
- Creates defensible record for regulatory compliance

---

### Field Ecologist (Team Member) Use Cases

#### UC-4: Record Species Observation in Field
**Actor:** Field Ecologist
**Goal:** Capture species observation with location, photos, and notes during survey
**Frequency:** 20-50 times per field day

**Preconditions:**
- User assigned to project
- Survey session created
- Mobile device with GPS and camera
- fill in

**Main Flow:**
1. User opens mobile app at survey location
2. User selects active survey from list
3. User taps "Add Observation"
4. User searches for species (common or scientific name)
5. System displays species with identification tips
6. User confirms species
7. User enters observation details:
   - Count/abundance
   - Evidence type (for fauna)
   - DAFOR score (for flora)
   - Behavior notes
8. System auto-captures GPS location
9. User takes photo (optional)
10. System auto-tags photo with location and timestamp
11. User saves observation
12. System queues observation for sync

**Alternative Flows:**
- **A1:** Species not in database - user adds as "Other" with description
- **A2:** No GPS signal - user marks location manually on map
- **A3:** Multiple individuals of same species - user adjusts count
- **A4:** Offline mode - observation stored locally, syncs when connected
- fill in

**Postconditions:**
- Observation saved to database (or local queue)
- Photo linked to observation
- GPS coordinates recorded
- Timestamp captured

**Success Metrics:**
- Observation entry time < 60 seconds
- 95% observations include GPS coordinates
- 80% observations include photos
- 99% offline observations sync successfully

**Business Value:**
- Eliminates double data entry
- Improves data quality and completeness
- Reduces post-survey admin time by 60%

---

#### UC-5: Complete Daily Field Survey
**Actor:** Field Ecologist
**Goal:** Finalize field survey session with weather and effort data
**Frequency:** 1-2 times per day during survey season

**Preconditions:**
- User has created survey session
- Observations have been recorded
- fill in

**Main Flow:**
1. User opens active survey
2. System displays survey summary:
   - Number of observations recorded
   - Missing required fields (if any)
3. User enters/confirms weather conditions:
   - Temperature
   - Wind speed
   - Cloud cover
   - Precipitation
4. User enters survey effort:
   - Start time (auto-filled)
   - End time
   - Area covered
5. User adds general notes
6. User marks survey as "Complete"
7. System validates required fields
8. System saves survey and syncs data
9. System notifies project manager of completion

**Alternative Flows:**
- **A1:** Missing required data - system prevents completion, highlights missing fields
- **A2:** Weather API available - system suggests weather data from nearest station
- **A3:** User wants to continue survey next day - saves as "In Progress"
- fill in

**Postconditions:**
- Survey marked complete in database
- All observations finalized
- Workflow step updated
- Project manager notified

**Success Metrics:**
- Survey completion time < 3 minutes
- 95% surveys completed before leaving field
- 0% surveys missing required data

**Business Value:**
- Ensures complete survey metadata
- Provides immediate project visibility
- Reduces forgotten data collection

---

#### UC-6: Access Previous Survey Data Before Fieldwork
**Actor:** Field Ecologist
**Goal:** Review historical survey results from same or nearby sites
**Frequency:** Before each new survey (1-2 times per day during season)

**Preconditions:**
- Historical surveys exist in database
- User has access permissions

**Main Flow:**
1. User opens upcoming survey assignment
2. User taps "View Previous Surveys"
3. System displays surveys from:
   - Same project (if repeat visit)
   - Same site (if resurvey)
   - Nearby locations (within 1km)
4. User filters by:
   - Survey type
   - Date range
   - Species of interest
5. User reviews previous findings:
   - Species observed
   - Locations on map
   - Survey notes
   - Photos
6. User identifies areas of interest for today's survey
7. User downloads offline map with previous observations marked

**Alternative Flows:**
- **A1:** No previous surveys found - system shows blank map
- **A2:** User finds rare species record - adds to today's survey plan
- fill in

**Postconditions:**
- User informed of previous findings
- Prepared for focused survey
- Expectations set appropriately

**Success Metrics:**
- Historical data access time < 2 minutes
- 70% surveyors review previous data before field
- Improved rare species re-detection rate

**Business Value:**
- Increases survey efficiency
- Improves rare species monitoring
- Provides continuity between survey seasons

---

### GIS Specialist Use Cases

#### UC-7: Create Habitat Map from Field Polygons
**Actor:** GIS Specialist
**Goal:** Generate professional habitat map for report using field-digitized data
**Frequency:** 5-10 times per week

**Preconditions:**
- Field staff have digitized habitat boundaries
- Fossitt codes assigned to polygons
- Project has defined survey area

**Main Flow:**
1. User opens project in GIS mapping module
2. System displays all habitat polygons with Fossitt codes
3. User validates data quality:
   - Checks for gaps or overlaps
   - Verifies Fossitt codes are valid
   - Confirms polygons within survey area
4. System highlights any validation errors
5. User corrects errors or requests field staff revisions
6. User selects map template (habitat classification map)
7. System applies standard symbology for Fossitt codes
8. User customizes:
   - Map extent
   - Scale
   - Legend position
   - Title and labels
9. System generates map
10. User reviews and exports as PDF/PNG
11. User links map to project report

**Alternative Flows:**
- **A1:** Major errors found - user rejects dataset, notifies field staff
- **A2:** Non-standard habitat - user creates custom symbology
- **A3:** Client requests specific format - user adjusts template
- fill in

**Postconditions:**
- Professional map generated
- Map archived with project
- Report has correct habitat map

**Success Metrics:**
- Map production time reduced 60%
- 90% maps require no revisions
- Standard symbology used consistently

**Business Value:**
- Faster report turnaround
- Consistent, professional cartography
- Reduced GIS specialist bottleneck

---

#### UC-8: Validate Field-Collected Spatial Data
**Actor:** GIS Specialist
**Goal:** Ensure GPS coordinates and boundaries are accurate before analysis
**Frequency:** Daily during active fieldwork periods

**Preconditions:**
- Field data synced to database
- Survey area boundaries defined

**Main Flow:**
1. User receives notification of new spatial data
2. User opens data validation dashboard
3. System displays new data with automated checks:
   - Coordinates within Ireland
   - Points within project survey area
   - Reasonable accuracy values
   - Correct coordinate reference system
4. System flags issues:
   - Points with >50m GPS error
   - Points outside survey area
   - Polygons with self-intersections
5. User reviews flagged items
6. User categorizes issues:
   - Critical errors (fix immediately)
   - Minor issues (acceptable)
   - Requires field clarification
7. User contacts field staff for critical errors
8. User approves validated data for analysis
9. System marks data as "QA Approved"

**Alternative Flows:**
- **A1:** All data passes validation - user bulk approves
- **A2:** Systematic GPS error detected - user applies correction
- **A3:** Field staff unavailable - user makes best judgment
- fill in

**Postconditions:**
- Spatial data quality assured
- Errors documented and corrected
- Data ready for mapping and analysis

**Success Metrics:**
- Validation turnaround < 24 hours
- 80% data passes auto-validation
- Critical errors fixed within 48 hours

**Business Value:**
- Prevents analysis based on bad data
- Reduces rework and delays
- Improves overall data quality

---

### Junior Ecologist Use Cases

#### UC-9: Complete First Field Survey with Guidance
**Actor:** Junior Ecologist
**Goal:** Successfully conduct assigned survey following proper protocols
**Frequency:** 1-2 times per week (early career)

**Preconditions:**
- User assigned to survey
- Basic training completed
- Senior ecologist available for questions

**Main Flow:**
1. User opens assigned survey in mobile app
2. System displays survey protocol:
   - Objectives
   - Target species
   - Identification tips
   - Required data fields
3. User reviews protocol before departing
4. User arrives at site
5. System shows survey area boundary on map
6. User begins observations
7. For each observation:
   - User searches species name
   - System shows identification photos/tips
   - User records observation with required fields
   - System validates data entry (e.g., count must be > 0)
   - System provides confirmation "Observation saved"
8. User completes survey checklist:
   - Weather recorded ✓
   - Photos taken ✓
   - Survey notes added ✓
9. User marks survey "Complete"
10. System sends for senior review
11. User receives feedback within 24 hours

**Alternative Flows:**
- **A1:** User uncertain about species ID - marks as "Needs Verification"
- **A2:** User has question - sends message to senior from app
- **A3:** User makes mistake - system allows editing before completion
- fill in

**Postconditions:**
- Survey completed with required data
- Data submitted for review
- Junior gains confidence and experience

**Success Metrics:**
- 90% surveys completed without critical errors
- Average 1.5 corrections needed per first 10 surveys
- Junior confidence score improves over time
- fill in

**Business Value:**
- Faster onboarding of new staff
- Consistent data collection from all skill levels
- Reduced supervision burden on seniors
- fill in

---

#### UC-10: Learn from Example Surveys
**Actor:** Junior Ecologist
**Goal:** Study completed surveys to understand best practices
**Frequency:** 3-4 times per week during first 3 months

**Preconditions:**
- User has access to completed project library
- Example surveys flagged as "training quality"

**Main Flow:**
1. User opens learning/training section
2. System displays example surveys by type:
   - Bat activity surveys
   - Breeding bird surveys
   - Habitat assessments
   - fill in
3. User selects survey type they're learning
4. System shows 3-5 high-quality examples
5. User reviews example:
   - Survey setup and planning
   - Observation detail level
   - Photo quality and coverage
   - Notes and descriptions
6. User compares to their own draft survey
7. User identifies improvements needed
8. User updates their survey accordingly
9. User bookmarks example for future reference

**Alternative Flows:**
- **A1:** User requests feedback on specific observation
- **A2:** User asks senior to review alongside example
- fill in

**Postconditions:**
- Junior understands quality standards
- Self-improvement without constant supervision
- Consistent survey quality across team

**Success Metrics:**
- 80% juniors access training examples in first month
- Quality of junior surveys improves 40% after viewing examples
- Senior review time decreases over time
- fill in

**Business Value:**
- Scalable training without senior time investment
- Faster competency development
- Knowledge retention in organization
- fill in

---

### Client Use Cases

#### UC-11: Check Project Status Before Meeting
**Actor:** Environmental Consultant (Client)
**Goal:** Get current project status for upcoming project meeting
**Frequency:** 2-3 times per week during active projects

**Preconditions:**
- Client has portal access
- Project is active

**Main Flow:**
1. User logs into client portal
2. System displays all accessible projects
3. User selects project of interest
4. System displays project dashboard:
   - Overall progress (X of 16 steps complete)
   - Current workflow phase
   - Timeline status (on track / at risk / overdue)
   - Recent activity feed
   - Completed deliverables
5. User views completed survey count
6. User browses field photos gallery
7. User downloads preliminary species list
8. User clicks "Download Status Report"
9. System generates PDF with:
   - Progress summary
   - Completed milestones
   - Upcoming milestones
   - Key findings to date
10. User saves report for project meeting

**Alternative Flows:**
- **A1:** Project behind schedule - user contacts project manager
- **A2:** User needs more detail - user sends question through portal
- fill in

**Postconditions:**
- Client informed of current status
- Client has documentation for meeting
- Reduced unnecessary status emails

**Success Metrics:**
- 90% clients access portal weekly during active projects
- Status report downloads increase 300%
- Status inquiry emails decrease 70%

**Business Value:**
- Reduces consultant time on status updates
- Improves client satisfaction through transparency
- Demonstrates professionalism and organization

---

#### UC-12: Approve Survey Report for Submission
**Actor:** Environmental Consultant (Client)
**Goal:** Review and approve ecological report before planning submission
**Frequency:** Once per project at completion

**Preconditions:**
- Report completed and uploaded
- Client has review permissions
- fill in

**Main Flow:**
1. User receives email notification "Report ready for review"
2. User logs into client portal
3. System displays report with review status
4. User downloads draft report PDF
5. User reviews report offline
6. User returns to portal with feedback
7. User provides feedback via comment system:
   - General comments
   - Section-specific comments
   - Requests for changes
8. User marks review status:
   - "Approved - no changes"
   - "Approved - minor edits needed"
   - "Major revisions required"
9. System notifies consultant of review decision
10. If approved, system marks project workflow as complete

**Alternative Flows:**
- **A1:** Client needs clarification - requests meeting
- **A2:** Major changes needed - formal revision process begins
- **A3:** Client silent for 7 days - consultant receives reminder to follow up
- fill in

**Postconditions:**
- Review documented in system
- Consultant knows exact changes needed
- Audit trail of approval process

**Success Metrics:**
- Average review turnaround time < 5 business days
- 85% reports approved with minor or no changes
- Zero reports lost or overlooked
- fill in

**Business Value:**
- Formal approval process reduces disputes
- Faster project closeout
- Clear communication channel
- fill in

---

### Independent Consultant Use Cases

#### UC-13: Manage Multiple Client Projects in One Platform
**Actor:** Independent Ecological Consultant
**Goal:** Track all subcontracted projects regardless of client
**Frequency:** Daily workflow management

**Preconditions:**
- Consultant invited to multiple projects by different clients
- Each project has separate workflow

**Main Flow:**
1. User logs into platform
2. System displays unified dashboard with all assigned projects
3. Projects grouped/filtered by:
   - Client organization
   - Due date
   - Status
4. User views personal workload:
   - Surveys assigned to me
   - Reports in my queue
   - Upcoming deadlines
5. User switches between projects seamlessly
6. User completes work for Project A
7. User submits to Client A
8. User switches to Project B for different client
9. User accesses historical data from previous work
10. User leverages templates across all clients

**Alternative Flows:**
- **A1:** Conflicting deadlines - user negotiates extensions
- **A2:** Client uses different methodology - user adjusts workflow
- fill in

**Postconditions:**
- All projects managed in one place
- Consistent quality across all clients
- Professional image maintained

**Success Metrics:**
- 100% projects tracked in single platform
- Context switching time < 30 seconds
- Zero projects overlooked or forgotten
- fill in

**Business Value:**
- Enables solo practitioners to compete with firms
- Reduces technology overhead
- Increases billable time percentage
- fill in

---

#### UC-14: Build Personal Species Reference Library
**Actor:** Independent Ecological Consultant
**Goal:** Create reusable library of identified species with photos
**Frequency:** Ongoing throughout career

**Preconditions:**
- Years of survey data in platform
- Species observations with photos

**Main Flow:**
1. User accesses personal data library
2. System aggregates all species observations by user
3. User views species list with:
   - Total observation count
   - Date range of observations
   - Locations observed
   - Photos from field surveys
4. User curates best identification photos
5. User adds personal notes and field marks
6. User organizes by taxonomy or habitat
7. User creates custom field guide for reference
8. User shares selected records with NBDC
9. User uses library to train junior ecologists

**Alternative Flows:**
- **A1:** User exports species list for publication
- **A2:** User generates maps of rare species sightings over career
- fill in

**Postconditions:**
- Personal expertise captured and organized
- Historical data provides professional credibility
- Knowledge preserved for retirement/succession

**Success Metrics:**
- 95% observations include identification photos
- Personal species list grows 15% annually
- Historical data accessible within seconds
- fill in

**Business Value:**
- Demonstrates expertise to potential clients
- Personal data not locked in client systems
- Professional development and learning
- fill in

---

## Jobs to Be Done

### Functional Jobs

#### Job 1: "When I start a new project, I want to set up the complete workflow structure quickly, so I don't forget any critical steps and my team knows exactly what to do."
**Persona:** Senior Ecologist
**Current Solutions:** Excel checklists, email briefs, shared drive folders
**Gaps:** Inconsistent setup, forgotten steps, unclear assignments
**Success:** 5-minute setup, automatic notifications, zero missing steps

#### Job 2: "When I'm conducting field surveys, I need to record species observations with location and photos efficiently, so I can focus on surveying rather than paperwork."
**Persona:** Field Ecologist
**Current Solutions:** Paper notebooks, GPS unit, separate camera, Excel
**Gaps:** Multiple devices, double data entry, lost photos
**Success:** Single-device workflow, instant save, auto-tagging

#### Job 3: "When field staff collect spatial data, I need it to be in the correct format and coordinate system, so I can start mapping immediately without data cleanup."
**Persona:** GIS Specialist
**Current Solutions:** Multiple GPS units, Excel coordinates, hand-drawn sketches
**Gaps:** Format chaos, coordinate errors, time waste
**Success:** Standardized data, auto-validation, immediate mapping

#### Job 4: "When I'm learning survey techniques, I need clear examples and guidance, so I can build confidence and avoid mistakes that waste the team's time."
**Persona:** Junior Ecologist
**Current Solutions:** Shadowing seniors, field guides, trial and error
**Gaps:** Limited mentorship time, learning by mistakes
**Success:** Self-serve examples, inline guidance, validation

#### Job 5: "When I need to report project status to stakeholders, I need current progress data instantly, so I can respond confidently without chasing the consultant."
**Persona:** Client
**Current Solutions:** Email inquiries, phone calls, scheduled meetings
**Gaps:** Delays, outdated info, no visibility
**Success:** Real-time dashboard, self-service reports, alerts

#### Job 6: "When managing multiple client projects, I need a single system that works for everyone, so I can minimize administrative overhead and focus on billable ecology work."
**Persona:** Independent Consultant
**Current Solutions:** Each client's different system, personal spreadsheets
**Gaps:** Context switching, subscription costs, disorganization
**Success:** Unified platform, affordable pricing, cross-client efficiency

### Emotional Jobs

#### Job 7: "When reviewing my project portfolio, I want to feel in control and confident, not anxious about what I might have forgotten."
**Persona:** Senior Ecologist
**Pain:** Sunday night anxiety, constant feeling of "did I remember..."
**Desired Feeling:** Calm confidence, trust in the system

#### Job 8: "When submitting my field work, I want to feel proud of the quality, not embarrassed about gaps or errors."
**Persona:** Junior Ecologist
**Pain:** Impostor syndrome, fear of looking incompetent
**Desired Feeling:** Confidence, validation, growth

#### Job 9: "When my project deadline approaches, I want to feel assured it will be met, not stressed about potential delays."
**Persona:** Client
**Pain:** Deadline anxiety, surprise delays
**Desired Feeling:** Trust, peace of mind, control

### Social Jobs

#### Job 10: "When demonstrating my consultancy's capabilities to potential clients, I want to appear professional and organized, not amateur or chaotic."
**Persona:** Senior Ecologist, Independent Consultant
**Pain:** Losing bids to larger firms perceived as more competent
**Desired Perception:** Professional, reliable, technologically sophisticated

#### Job 11: "When working with regulatory authorities, I need to demonstrate thorough compliance with environmental legislation, not appear careless or cutting corners."
**Persona:** Senior Ecologist
**Pain:** Regulatory scrutiny, reputation risk
**Desired Perception:** Rigorous, compliant, credible

---

## User Stories

### Epic 1: Project Setup and Management

**US-1.1** As a senior ecologist, I want to create a new project in under 5 minutes, so I can respond quickly to client inquiries without administrative burden.
**Acceptance Criteria:**
- Project creation form has maximum 6 required fields
- System auto-generates site code based on naming convention
- Workflow steps created automatically on save
- Project appears on dashboard immediately

**US-1.2** As a senior ecologist, I want to assign team members with specific roles and permissions, so everyone knows their responsibilities and can access only relevant data.
**Acceptance Criteria:**
- Team member search by name or specialization
- Role assignment (Lead, Surveyor, Analyst, Reviewer)
- Automated notification sent on assignment
- Team member sees project on their personal dashboard

**US-1.3** As a senior ecologist, I want to view all my projects on a single dashboard with status indicators, so I can identify at-risk projects at a glance.
**Acceptance Criteria:**
- Dashboard shows all active projects
- Traffic light indicators (green, amber, red) based on timeline
- Quick filters by status, client, survey type
- Click project card to view details

**US-1.4** As an independent consultant, I want to see only projects I'm assigned to across multiple client organizations, so I can manage my workload without information overload.
**Acceptance Criteria:**
- Dashboard filtered to user's assignments only
- Projects grouped by client optionally
- Cross-organization search works seamlessly
- Consistent interface regardless of client organization

---

### Epic 2: Field Data Collection

**US-2.1** As a field ecologist, I want to record species observations on my mobile device, so I can eliminate paper notebooks and double data entry.
**Acceptance Criteria:**
- Mobile app works on iOS and Android
- Species searchable by common or Latin name
- GPS location captured automatically
- Photos can be attached to observations
- Works offline and syncs when connected

**US-2.2** As a field ecologist, I want to take photos that are automatically tagged with location, timestamp, and project, so I don't waste time organizing photos later.
**Acceptance Criteria:**
- Camera accessible within app
- Photo auto-linked to current survey
- GPS coordinates embedded in EXIF data
- Photos sync to project gallery automatically
- Photos viewable by project team immediately

**US-2.3** As a field ecologist, I want weather conditions auto-populated from weather API, so I don't have to carry a thermometer or manually record conditions.
**Acceptance Criteria:**
- System suggests weather from nearest weather station
- User can override suggested values
- Temperature, wind, cloud cover, precipitation captured
- Historical weather available if entered post-survey

**US-2.4** As a junior ecologist, I want to see species identification tips when recording observations, so I can improve my identification skills in the field.
**Acceptance Criteria:**
- Species profile includes identification photo
- Key field marks listed
- Similar species warnings shown
- Link to detailed species guide

**US-2.5** As a field ecologist, I want to mark observations as "uncertain" for senior review, so I'm not paralyzed by identification doubts.
**Acceptance Criteria:**
- "Needs Verification" flag available
- Observation saved despite uncertainty
- Senior ecologist receives notification
- Status changes to "Verified" or "Corrected" after review

---

### Epic 3: Spatial Data and Mapping

**US-3.1** As a field ecologist, I want to draw survey boundaries directly on an interactive map, so GIS staff receive accurate spatial data without re-digitizing.
**Acceptance Criteria:**
- Map interface with drawing tools (polygon, line, point)
- Base map shows project location
- GPS accuracy indicator visible
- Drawn features saved to PostGIS database
- Features appear in GIS specialist's view immediately

**US-3.2** As a GIS specialist, I want to receive field-digitized polygons in a consistent coordinate system, so I can start mapping without coordinate conversions.
**Acceptance Criteria:**
- All spatial data stored in Irish Transverse Mercator (ITM)
- System validates coordinates within Ireland bounding box
- GPS accuracy metadata preserved
- Notification when new spatial data arrives

**US-3.3** As a GIS specialist, I want to validate field GPS coordinates for obvious errors, so I can catch problems before spending time on analysis.
**Acceptance Criteria:**
- Automated validation checks:
  - Coordinates within project survey area
  - GPS accuracy < 50m
  - No duplicate points at same location/time
- Validation dashboard shows flagged records
- Bulk approve or individual review options
- Validation report exportable

**US-3.4** As a senior ecologist, I want to see all project spatial data on a single map view, so I can assess survey coverage and identify gaps.
**Acceptance Criteria:**
- Map displays site boundary, survey areas, observations
- Layer toggle for different feature types
- Color coding by habitat type or species group
- Export map as static image for reports

---

### Epic 4: Workflow and Progress Tracking

**US-4.1** As a senior ecologist, I want to see which workflow steps are complete, in progress, or blocked, so I can manage project progression proactively.
**Acceptance Criteria:**
- Visual workflow diagram with 16 steps
- Color-coded status indicators
- Dependency relationships shown
- Click step to view details and assigned person

**US-4.2** As a team member, I want to see only the workflow steps assigned to me, so I can focus on my tasks without confusion.
**Acceptance Criteria:**
- Personal task list filtered to my assignments
- Next actionable task highlighted
- Tasks grouped by project
- Due dates and priorities visible

**US-4.3** As a senior ecologist, I want to receive notifications when team members complete workflow steps, so I can stay informed without micromanaging.
**Acceptance Criteria:**
- Email notification on step completion
- In-app notification badge
- Notification preferences configurable
- Daily digest option available

**US-4.4** As a senior ecologist, I want to see overall project progress as a percentage, so I can quickly communicate status to clients.
**Acceptance Criteria:**
- Progress calculated as completed steps / total steps
- Progress bar visible on project card
- Phase-level progress (Desk, Field, Reporting)
- Timeline progress vs. work progress shown separately

**US-4.5** As a client, I want to view workflow progress without understanding ecological terminology, so I can assess project status in business terms.
**Acceptance Criteria:**
- Simple language descriptions
- Visual progress indicators
- "On Track" / "At Risk" / "Overdue" status
- Plain English milestone names

---

### Epic 5: Quality Assurance and Review

**US-5.1** As a senior ecologist, I want to mark workflow steps as "Needs Review" so data is checked before progressing to next steps.
**Acceptance Criteria:**
- "Submit for Review" action available to team members
- Step status changes to "Needs Review"
- Senior ecologist notified
- Next steps remain blocked until approved

**US-5.2** As a senior ecologist, I want to provide inline feedback on submitted work, so team members know exactly what to improve.
**Acceptance Criteria:**
- Comment system on observations, surveys, data
- Comments visible to submitter
- Email notification of new comments
- "Resolved" status for comments

**US-5.3** As a junior ecologist, I want to see feedback from my seniors on my submitted work, so I can learn and improve my skills.
**Acceptance Criteria:**
- Feedback accessible in app and via email
- Positive feedback as well as corrections
- Historical feedback viewable for learning
- Option to ask follow-up questions

---

### Epic 6: Client Communication and Transparency

**US-6.1** As a client, I want to log into a portal and see current project status, so I can stay informed without emailing the consultant.
**Acceptance Criteria:**
- Client portal with read-only access
- Current project status dashboard
- Completed milestones listed
- Upcoming milestones with dates

**US-6.2** As a client, I want to download progress reports for my project meetings, so I can share status with internal stakeholders.
**Acceptance Criteria:**
- "Download Status Report" button
- PDF generated with branding
- Includes progress summary, key findings, photos
- Report date-stamped and version controlled

**US-6.3** As a client, I want to receive automated alerts if project is at risk of missing deadline, so I can adjust plans proactively.
**Acceptance Criteria:**
- Alert triggered when progress < 70% and time elapsed > 70%
- Email sent to client contact
- Alert includes reason for delay and revised estimate
- Client can acknowledge alert in portal

**US-6.4** As a client, I want to view field survey photos in a gallery, so I can see evidence of work being done.
**Acceptance Criteria:**
- Photo gallery organized by survey date
- Photos tagged with location on map
- Thumbnail view with full-size option
- Download selected photos

---

### Epic 7: Learning and Knowledge Management

**US-7.1** As a junior ecologist, I want to access completed survey examples, so I can learn proper data collection standards.
**Acceptance Criteria:**
- Library of exemplar surveys by type
- Surveys marked as "training quality" by seniors
- Search by survey type or species
- Comparison view to see my work alongside example

**US-7.2** As an independent consultant, I want to build a personal species observation database, so I can reference my own sightings over my career.
**Acceptance Criteria:**
- "My Species" section shows all observations by user
- Filter by species, date range, location
- Export personal species list
- Generate career maps of rare species sightings

**US-7.3** As a team member, I want to search for observations of specific species across all projects, so I can learn habitat preferences and behavior.
**Acceptance Criteria:**
- Global search across accessible projects
- Results show observation details, location, photos
- Map view of all sightings
- Export search results

---

### Epic 8: Reporting and Deliverables

**US-8.1** As a senior ecologist, I want to generate species lists and summary statistics directly from the database, so I don't manually compile data.
**Acceptance Criteria:**
- One-click export of species observed per project
- Summary statistics (species richness, observation count)
- Filter by taxonomy, survey date, survey area
- Export to Excel, CSV, PDF

**US-8.2** As a GIS specialist, I want to auto-generate habitat maps from Fossitt-coded polygons, so I can produce consistent cartography rapidly.
**Acceptance Criteria:**
- Map template selection
- Standard Fossitt symbology applied automatically
- Legends, scale bars, north arrows added
- Export as high-resolution PNG or PDF for reports

**US-8.3** As a senior ecologist, I want to auto-populate report sections with project data, so I reduce copy-paste errors and save writing time.
**Acceptance Criteria:**
- Report templates with data merge fields
- Species tables insert automatically
- Map figures link from GIS module
- Manual override for custom text

---

## Success Metrics

### User Adoption Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Daily Active Users (DAU) | 70% of licensed users | Login analytics |
| Feature Adoption Rate | 80% use mobile app, 60% use workflow modal | Feature usage tracking |
| Time to First Value | New user records first observation within 48 hours | Onboarding funnel |
| Mobile App Usage | 50% of field data entered via mobile | Platform analytics |
| Client Portal Access | 60% of clients log in at least weekly | Portal analytics |

### Efficiency Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Project Setup Time | < 5 minutes (down from 2-3 hours) | Time tracking |
| Field Data Entry Time | < 60 seconds per observation (down from 5 minutes later) | User surveys |
| Map Production Time | 60% reduction | GIS specialist feedback |
| Status Report Generation | < 2 minutes (down from 30 minutes) | Feature timing |
| Time to Project Visibility | Real-time (down from 2-3 day email delay) | System performance |

### Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Data Completeness | 95% observations include GPS, photos, required fields | Data validation reports |
| First-Pass Approval Rate | 80% submissions approved without revisions | Workflow analytics |
| GPS Coordinate Accuracy | 90% within 10m accuracy | Spatial data quality checks |
| Missing Workflow Steps | 0% projects missing required steps | Audit reports |
| Regulatory Compliance | 100% projects follow required assessment process | Compliance audits |

### User Satisfaction Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Net Promoter Score (NPS) | > 40 | Quarterly surveys |
| User Satisfaction (CSAT) | > 4.0 / 5.0 | Post-interaction surveys |
| Feature Satisfaction | > 4.2 / 5.0 for workflow, mobile, mapping | Feature-specific surveys |
| Support Ticket Volume | < 2 tickets per user per year | Support system |
| Client Satisfaction | > 4.5 / 5.0 | Client feedback surveys |

### Business Impact Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Project Delivery Time | 20% faster project completion | Project timeline analysis |
| Cost per Project | 15% reduction in labor hours | Time tracking + billing |
| Projects per Staff Member | 25% increase in throughput | Productivity analysis |
| Client Retention Rate | > 90% | Business analytics |
| Competitive Win Rate | 30% increase in new client acquisitions | Sales tracking |
| Revenue per Consultant | 20% increase | Financial reports |

### Engagement Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Observations per Field Day | 40+ species observations per surveyor per day | Platform analytics |
| Photo Upload Rate | 80% of surveys include photos | Media analytics |
| Workflow Completion Rate | 85% projects complete all 16 steps | Workflow analytics |
| Client Portal Engagement | 3+ logins per client per active project | Access logs |
| Review Turnaround Time | < 24 hours for senior review | Workflow timing |

---

## Appendix: User Research Insights

### Pain Point Analysis (from User Interviews)

**Top 5 Pain Points - Senior Ecologists:**
1. "I don't know where projects stand without asking everyone" (mentioned by 9/10)
2. "Compiling reports is copy-paste hell from multiple sources" (9/10)
3. "I worry we've missed required assessment steps" (8/10)
4. "Can't find the latest version of anything" (8/10)
5. "Spend more time managing than doing ecology" (7/10)

**Top 5 Pain Points - Field Ecologists:**
1. "Double data entry wastes hours every week" (10/10)
2. "Photos are disorganized chaos" (9/10)
3. "No visibility if my data was useful" (8/10)
4. "Carrying multiple devices is a pain" (8/10)
5. "Excel crashes and I lose data" (6/10)

**Top 5 Pain Points - Clients:**
1. "No visibility into project status" (10/10)
2. "Find out about delays too late" (9/10)
3. "Can't tell if work is high quality until final report" (7/10)
4. "Every consultant uses different systems" (6/10)
5. "Expensive change requests due to miscommunication" (6/10)

### Opportunity Sizing

**Total Addressable Market:**
- Ireland: ~150 ecological consultancies
- Average 8 staff per consultancy
- ~1,200 potential users in Ireland
- UK expansion: ~10,000 potential users
- Annual contract value: €1,500 - €5,000 per user

**User Segments Priority:**
1. **Primary:** Small/medium consultancies (2-20 staff) - 80% of market
2. **Secondary:** Solo practitioners - 15% of market
3. **Tertiary:** Large consultancies (20+ staff) - 5% of market, high value

---

**Document End**
