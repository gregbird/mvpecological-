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

---

## To-Do

_(Items will be added as we review each screen)_
