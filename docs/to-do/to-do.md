# Dulra - Completed Items & To-Do List

> **Last Updated:** February 11, 2026

---

## Completed

### GIS Mapping - Buffer Zones (Step 3)

- Removed unused buffer panel component and styling code
- User must now select at least one buffer before moving to next step
- Warning shown when no buffers are selected
- Warning shown when custom buffer exceeds 15km
- Layer changes now properly tracked as unsaved

### GIS Mapping - Boundary (Step 2)

- "Draw Site Boundary" hint now auto-hides after 5 seconds instead of staying permanently
- Fixed crash when drawing is cancelled or has incomplete shape
- Drawing a new boundary now replaces the previous one instead of creating multiple shapes
- Delete boundary now works correctly and clears the map properly
- Added safety checks so broken or incomplete shapes are ignored

### GIS Mapping - Edit Configuration

- Boundary can now be edited again after the step has been completed
- Buffer zone colours now match across all screens (were showing different colours before)
- Warning dialog shown when editing if other steps have already been started
- If boundary or buffers are changed, later steps are automatically marked for review
- A yellow banner appears on affected steps telling the user to check their data

### GIS Mapping - Layers (Step 4)

- Buffer zones now show correct colours on the Layers screen (were all blue before)
- "Save & Continue" button now works properly after editing (was stuck disabled)

### Data Gathering - Preview Screen

- Buffer zones now appear on the map in the completed Data Gathering view (were missing)

### Data Gathering - Deep Research Panel

- Overview tab now shows the actual habitat and species names, not just counts
- AI analysis now starts automatically when the panel opens (no need to click a button)
- NHA and pNHA sites now get proper AI analysis using Synopsis PDF documents from NPWS
- pNHA sites now link directly to their individual Synopsis PDF (instead of the portfolio PDF)
- AI analysis now includes species data from NBDC (protection status, Irish records, designations)
- Data sources section in the AI tab now shows which sources were actually used (PDF, NBDC, web scraping)
- AI badges show "Synopsis PDF analysed" for NHA/pNHA and "NBDC enriched" when species data was found

### Data Gathering - Auto-Search (0.4.1)

- Data Gathering step now automatically searches all ecological databases (NPWS, GBIF, EPA) when opened
- Three searches run in parallel with a progress banner showing real-time status
- Each source has a status indicator: blue pulse (searching), green (done), grey (skipped), red (error)
- Banner auto-hides 5 seconds after all searches complete
- If boundary is changed in GIS Mapping, all caches are invalidated and auto-search re-triggers
- SessionStorage prevents duplicate auto-searches on page refresh or re-navigation
- Manual search buttons and buffer selection still work as before for re-searching

---

## To-Do

_(Items will be added as we review each screen)_
