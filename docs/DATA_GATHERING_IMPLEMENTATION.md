# Data Gathering Implementation

**Son Güncelleme:** 2026-02-01
**Durum:** Tamamlandı

---

## 1. Genel Bakış

Data Gathering (Step 2), ekolojik veri toplama adımıdır. Kullanıcılar bu adımda:

- NPWS'den korunan alan bilgilerini arar
- GBIF ve NBDC'den tür kayıtlarını arar
- EPA'dan su özellikleri (nehir, göl, havza) verilerini arar
- Bulguları projeye kaydeder
- Saha çalışması için hedef notlar oluşturur
- Verileri CSV, GeoJSON veya JSON formatında export eder

### Wizard Yapısı

Data Gathering, GIS Mapping gibi wizard-style sub-steps yapısına sahiptir:

| #   | ID        | Label            | Icon       | Amaç                          |
| --- | --------- | ---------------- | ---------- | ----------------------------- |
| 1   | `info`    | Project Info     | `Info`     | GIS'ten gelen verilerin özeti |
| 2   | `sites`   | Designated Sites | `MapPin`   | NPWS araması                  |
| 3   | `species` | Species Records  | `Bug`      | GBIF + NBDC araması           |
| 4   | `aquatic` | Aquatic Features | `Droplets` | EPA araması                   |
| 5   | `review`  | Review & Export  | `Check`    | Özet ve export                |

---

## 2. Database Schema

### 2.1 Projects Tablosu Değişiklikleri

```sql
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS townland text,
  ADD COLUMN IF NOT EXISTS county text,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS enabled_buffer_distances numeric[] DEFAULT ARRAY[2, 5]::numeric[];
```

| Kolon                      | Tip       | Açıklama                                     |
| -------------------------- | --------- | -------------------------------------------- |
| `townland`                 | text      | Townland adı (reverse geocoding ile)         |
| `county`                   | text      | İlçe adı                                     |
| `province`                 | text      | Eyalet (Leinster, Munster, Connacht, Ulster) |
| `enabled_buffer_distances` | numeric[] | GIS'te seçilen buffer mesafeleri (km)        |

### 2.2 Desk Research Findings Tablosu Değişiklikleri

```sql
ALTER TABLE desk_research_findings
  ADD COLUMN IF NOT EXISTS distance_from_boundary_km numeric,
  ADD COLUMN IF NOT EXISTS is_protected boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS red_list_status text,
  ADD COLUMN IF NOT EXISTS relevance_level text CHECK (relevance_level IN ('high', 'medium', 'low'));
```

| Kolon                       | Tip     | Açıklama                             |
| --------------------------- | ------- | ------------------------------------ |
| `distance_from_boundary_km` | numeric | Proje sınırından uzaklık (km)        |
| `is_protected`              | boolean | Korunan tür/alan mı?                 |
| `red_list_status`           | text    | IUCN Red List durumu                 |
| `relevance_level`           | text    | İlgililik seviyesi (high/medium/low) |

### 2.3 Target Notes Tablosu (Yeni)

```sql
CREATE TABLE target_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  finding_id uuid REFERENCES desk_research_findings(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN (
    'access_point', 'check_feature', 'habitat', 'fauna',
    'flora', 'management', 'damage', 'ownership'
  )),
  title text NOT NULL,
  description text,
  location jsonb,
  priority text DEFAULT 'normal' CHECK (priority IN ('high', 'normal', 'low')),
  is_verified boolean DEFAULT false,
  verified_by uuid REFERENCES profiles(id),
  verified_at timestamp with time zone,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX idx_target_notes_project_id ON target_notes(project_id);
CREATE INDEX idx_target_notes_category ON target_notes(category);

-- RLS Policies
ALTER TABLE target_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view target notes for their projects"
  ON target_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = target_notes.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create target notes for their projects"
  ON target_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = target_notes.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update target notes for their projects"
  ON target_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = target_notes.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete target notes for their projects"
  ON target_notes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = target_notes.project_id
      AND pm.user_id = auth.uid()
    )
  );
```

### 2.4 Target Note Kategorileri

| Kategori        | Label         | Açıklama                    |
| --------------- | ------------- | --------------------------- |
| `access_point`  | Access Point  | Saha girişi/çıkışı          |
| `check_feature` | Check Feature | Sahada doğrulanacak özellik |
| `habitat`       | Habitat       | Habitat alanı               |
| `fauna`         | Fauna         | Hayvan türü                 |
| `flora`         | Flora         | Bitki türü                  |
| `management`    | Management    | Arazi yönetimi              |
| `damage`        | Damage        | Hasar veya tehdit           |
| `ownership`     | Ownership     | Mülkiyet bilgisi            |

---

## 3. Component Yapısı

```
components/steps/
├── data-gathering-step.tsx           # Ana wizard container
└── data-gathering/
    ├── index.ts                       # Barrel export
    ├── project-info-substep.tsx       # Step 1: GIS data özeti
    ├── designated-sites-substep.tsx   # Step 2: NPWS araması
    ├── species-records-substep.tsx    # Step 3: GBIF + NBDC
    ├── aquatic-features-substep.tsx   # Step 4: EPA araması
    ├── review-export-substep.tsx      # Step 5: Özet ve export
    ├── findings-list.tsx              # Ortak findings list componenti
    ├── target-note-form.tsx           # Target note formu
    └── export-findings-modal.tsx      # Export modal
```

### 3.1 data-gathering-step.tsx

Ana wizard container. GIS Mapping pattern'i kullanır.

**Props:**

```typescript
interface DataGatheringStepProps {
  project: Project
  currentStep: WorkflowStep
  onComplete: () => void
}
```

**Özellikler:**

- 5 sub-step wizard navigation
- Preview mode (step tamamlandıysa)
- Wizard mode (step devam ediyorsa)
- Step indicator header
- Back/Next navigation

### 3.2 project-info-substep.tsx

GIS Mapping'den gelen bilgileri gösterir.

**Props:**

```typescript
interface ProjectInfoSubStepProps {
  project: Project
  bufferDistances: number[]
  savedFindingsCount: number
}
```

**Gösterir:**

- Location bilgileri (Townland, County, Province, Grid Reference)
- Buffer zones (renkli badge'ler)
- Data sources listesi (NPWS, GBIF, NBDC, EPA)
- Mevcut bulgu sayısı

### 3.3 designated-sites-substep.tsx

NPWS API ile korunan alan araması.

**Props:**

```typescript
interface DesignatedSitesSubStepProps {
  project: Project
  projectBoundary?: GeoJSON.Feature<GeoJSON.Polygon>
  projectCenter?: { lat: number; lng: number }
  bufferDistances: number[]
  userId: string
  savedFindings: DeskResearchFinding[]
  showMap: boolean
  onToggleMap: () => void
}
```

**Özellikler:**

- Buffer zone seçimi
- NPWS API araması (SAC, SPA, NHA, pNHA)
- Harita ile entegre görüntüleme
- Bulgu kaydetme/silme
- Distance from boundary hesaplama

### 3.4 species-records-substep.tsx

GBIF ve NBDC'den tür kayıtları araması.

**Props:** (designated-sites ile aynı)

**Özellikler:**

- GBIF ve NBDC sekmeleri
- Tür gruplandırma (scientific name bazında)
- Protected species flag'leri
- Record count gösterimi
- Harita entegrasyonu

### 3.5 aquatic-features-substep.tsx

EPA'dan su özellikleri araması.

**Props:** (designated-sites ile aynı)

**Özellikler:**

- Rivers, Lakes, Catchments araması
- WFD status gösterimi (Good, Moderate, Poor, Bad)
- Harita entegrasyonu

### 3.6 review-export-substep.tsx

Özet ve export işlemleri.

**Props:**

```typescript
interface ReviewExportSubStepProps {
  project: Project
  savedFindings: DeskResearchFinding[]
  targetNotes: TargetNoteWithCreator[]
  userId: string
  onComplete: () => void
}
```

**Özellikler:**

- Kayıtlı bulgu özeti (source ve type bazında)
- Target notes listesi ve yönetimi
- Export modal (CSV, GeoJSON, JSON)
- Step tamamlama butonu

### 3.7 findings-list.tsx

Ortak kullanılan findings list componenti.

**Props:**

```typescript
interface FindingsListProps {
  findings: FindingDisplay[]
  savedFindings: DeskResearchFinding[]
  isLoading?: boolean
  onSave: (finding: FindingDisplay) => void
  onViewOnMap?: (finding: FindingDisplay) => void
  emptyMessage?: string
  showFilters?: boolean
}
```

**Özellikler:**

- Sıralama (distance, title, type)
- Pagination (20 sonuç per page)
- Save/unsave toggle
- View on map butonu
- Source link butonu
- Protected species badge
- Red list status badge

### 3.8 target-note-form.tsx

Target note oluşturma formu.

**Props:**

```typescript
interface TargetNoteFormProps {
  projectId: string
  userId: string
  findingId?: string
  onSuccess?: () => void
  onCancel?: () => void
}
```

**Alanlar:**

- Category (dropdown)
- Title (text)
- Description (textarea)
- Priority (dropdown)

### 3.9 export-findings-modal.tsx

Export modal.

**Props:**

```typescript
interface ExportFindingsModalProps {
  projectName: string
  findings: DeskResearchFinding[]
  targetNotes: TargetNoteWithCreator[]
  trigger?: React.ReactNode
}
```

**Özellikler:**

- Format seçimi (CSV, GeoJSON, JSON)
- Findings dahil et/etme
- Target notes dahil et/etme

---

## 4. Hooks

### 4.1 Target Notes Hooks

**Konum:** `hooks/use-project-data.ts`

```typescript
// Target notes listesi
export function useTargetNotes(projectId: string) {
  return useQuery({
    queryKey: ['target-notes', projectId],
    queryFn: () => getProjectTargetNotes(projectId),
    enabled: !!projectId,
  })
}

// Tek target note
export function useTargetNote(noteId: string) {
  return useQuery({
    queryKey: ['target-note', noteId],
    queryFn: () => getTargetNoteById(noteId),
    enabled: !!noteId,
  })
}

// Target notes istatistikleri
export function useTargetNotesStats(projectId: string) {
  return useQuery({
    queryKey: ['target-notes-stats', projectId],
    queryFn: () => getTargetNotesStats(projectId),
    enabled: !!projectId,
  })
}

// Create
export function useCreateTargetNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createTargetNote,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['target-notes', variables.project_id] })
    },
  })
}

// Update
export function useUpdateTargetNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ noteId, data }) => updateTargetNote(noteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target-notes'] })
    },
  })
}

// Delete
export function useDeleteTargetNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteTargetNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target-notes'] })
    },
  })
}

// Verify
export function useVerifyTargetNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ noteId, userId }) => verifyTargetNote(noteId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['target-notes'] })
    },
  })
}
```

---

## 5. Supabase Queries

### 5.1 Target Notes Queries

**Konum:** `lib/supabase/queries/target-notes.ts`

```typescript
// Interface
export interface TargetNoteWithCreator extends TargetNote {
  creator?: { full_name: string; email: string }
  verifier?: { full_name: string; email: string }
}

// Get all target notes for a project
export async function getProjectTargetNotes(projectId: string): Promise<TargetNoteWithCreator[]>

// Get target notes by category
export async function getTargetNotesByCategory(
  projectId: string,
  category: TargetNoteCategory
): Promise<TargetNoteWithCreator[]>

// Get single target note
export async function getTargetNoteById(noteId: string): Promise<TargetNoteWithCreator | null>

// Create target note
export async function createTargetNote(
  data: Omit<TargetNote, 'id' | 'created_at' | 'updated_at'>
): Promise<TargetNote>

// Update target note
export async function updateTargetNote(
  noteId: string,
  data: Partial<TargetNote>
): Promise<TargetNote>

// Delete target note
export async function deleteTargetNote(noteId: string): Promise<void>

// Verify target note
export async function verifyTargetNote(noteId: string, userId: string): Promise<TargetNote>

// Get stats
export async function getTargetNotesStats(projectId: string): Promise<{
  total: number
  byCategory: Record<string, number>
  byPriority: Record<string, number>
  verified: number
  unverified: number
}>
```

---

## 6. External API Entegrasyonları

### 6.1 NPWS (National Parks & Wildlife Service)

**Konum:** `lib/external-apis/npws.ts`

| Fonksiyon                       | Açıklama                                             |
| ------------------------------- | ---------------------------------------------------- |
| `queryDesignatedSites()`        | Bounding box ile site araması                        |
| `getDesignatedSiteByCode()`     | Site code ile detay                                  |
| `searchDesignatedSitesByName()` | İsim ile arama                                       |
| `getSiteTypeDisplayName()`      | Site type label (SAC → Special Area of Conservation) |

**API Endpoint:**

```
https://services-eu1.arcgis.com/HyjXgkV6KGMSF3jt/ArcGIS/rest/services/NPWSDesignatedAreas/FeatureServer
```

### 6.2 GBIF (Global Biodiversity Information Facility)

**Konum:** `lib/external-apis/gbif.ts`

| Fonksiyon                | Açıklama                       |
| ------------------------ | ------------------------------ |
| `searchOccurrences()`    | Bbox ile tür kayıtları araması |
| `getSpecies()`           | Taksonomi detayları            |
| `occurrencesToGeoJSON()` | Map-ready format               |

**API Endpoint:**

```
https://api.gbif.org/v1/
```

### 6.3 NBDC (National Biodiversity Data Centre)

**Konum:** `lib/external-apis/nbdc.ts`

| Fonksiyon                  | Açıklama                     |
| -------------------------- | ---------------------------- |
| `searchRecordsByGridRef()` | Grid reference ile arama     |
| `searchRecordsByBbox()`    | Bounding box ile arama (WFS) |
| `isProtectedSpecies()`     | Korunan tür kontrolü         |
| `recordsToGeoJSON()`       | Map-ready format             |

**API Endpoint:**

```
https://maps.biodiversityireland.ie/geoserver/ows (WFS)
```

### 6.4 EPA (Environmental Protection Agency)

**Konum:** `lib/external-apis/epa.ts`

| Fonksiyon                    | Açıklama             |
| ---------------------------- | -------------------- |
| `searchRivers()`             | WFD rivers araması   |
| `searchLakes()`              | WFD lakes araması    |
| `searchCatchments()`         | Catchment boundaries |
| `searchAllAquaticFeatures()` | Tüm aquatic features |
| `getWFDStatusDisplayName()`  | WFD status label     |

**API Endpoint:**

```
https://gis.epa.ie/geoserver/EPA/wfs (WFS)
https://gis.epa.ie/geoserver/EPA/wms (WMS)
```

---

## 7. Export Formatları

### 7.1 CSV

```csv
# Findings
Title,Source,Type,Distance (km),Protected,Red List Status,Content
"Lough Derg SPA",NPWS,designated_site,2.50,Yes,,"Special Protection Area covering 12500 ha."

# Target Notes
Category,Title,Description,Priority,Verified
check_feature,"Check for badger sett","Near field edge",high,No
```

### 7.2 GeoJSON

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-7.5, 53.2]
      },
      "properties": {
        "type": "finding",
        "id": "uuid",
        "title": "Lough Derg SPA",
        "source": "npws",
        "dataType": "designated_site"
      }
    }
  ]
}
```

### 7.3 JSON

```json
{
  "exportedAt": "2026-02-01T15:30:00Z",
  "project": "Test Project",
  "findings": [
    {
      "id": "uuid",
      "title": "Lough Derg SPA",
      "source": "npws",
      "dataType": "designated_site",
      "content": "...",
      "distance_km": 2.5,
      "isProtected": true
    }
  ],
  "targetNotes": [
    {
      "id": "uuid",
      "category": "check_feature",
      "title": "Check for badger sett",
      "priority": "high"
    }
  ]
}
```

---

## 8. Validation Kuralları

| Step    | Validation                         | Atlanabilir? |
| ------- | ---------------------------------- | ------------ |
| Info    | Project boundary olmalı            | Hayır        |
| Sites   | -                                  | Evet         |
| Species | -                                  | Evet         |
| Aquatic | -                                  | Evet         |
| Review  | En az 1 finding kaydedilmiş olmalı | Hayır        |

---

## 9. Data Flow

```
GIS Mapping (Step 1)
    │
    │ handleSave():
    ├── boundary, center_point, grid_reference
    ├── townland, county, province (reverse geocoding)
    └── enabled_buffer_distances
    │
    ▼
Data Gathering (Step 2)
    │
    │ useProject() hook
    │
    ├── Sub-step 1: Project Info
    │   └── Display: boundary info, location, buffer zones
    │
    ├── Sub-step 2: Designated Sites
    │   ├── NPWS API search (bbox + buffer)
    │   ├── Calculate distance from boundary
    │   └── Save to desk_research_findings
    │
    ├── Sub-step 3: Species Records
    │   ├── GBIF + NBDC API search
    │   ├── isProtectedSpecies() check
    │   └── Save to desk_research_findings
    │
    ├── Sub-step 4: Aquatic Features
    │   ├── EPA API search
    │   └── Save to desk_research_findings
    │
    └── Sub-step 5: Review & Export
        ├── Findings summary
        ├── Target notes management
        ├── Export (CSV/GeoJSON/JSON)
        └── Complete step
    │
    ▼
Desk Assessment (Step 3)
```

---

## 10. TypeScript Types

### 10.1 Finding Display Type

```typescript
export interface FindingDisplay {
  id: string
  source: string
  dataType: string
  title: string
  content?: string
  location?: GeoJSON.Geometry
  isSaved: boolean
  sourceUrl?: string
  rawData?: Record<string, unknown>
  metadata?: {
    siteCode?: string
    siteType?: string
    scientificName?: string
    commonName?: string
    recordCount?: number
    distance?: number
    isProtected?: boolean
    redListStatus?: string
    designation?: string
  }
}
```

### 10.2 Target Note Types

```typescript
export type TargetNoteCategory =
  | 'access_point'
  | 'check_feature'
  | 'habitat'
  | 'fauna'
  | 'flora'
  | 'management'
  | 'damage'
  | 'ownership'

export type TargetNotePriority = 'high' | 'normal' | 'low'

export interface TargetNote {
  id: string
  project_id: string
  finding_id: string | null
  category: TargetNoteCategory
  title: string
  description: string | null
  location: Json | null
  priority: TargetNotePriority
  is_verified: boolean
  verified_by: string | null
  verified_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}
```

---

## 11. Dosya Listesi

### Yeni Oluşturulan Dosyalar

| Dosya                                                          | Açıklama             |
| -------------------------------------------------------------- | -------------------- |
| `components/steps/data-gathering/index.ts`                     | Barrel export        |
| `components/steps/data-gathering/project-info-substep.tsx`     | GIS data özeti       |
| `components/steps/data-gathering/designated-sites-substep.tsx` | NPWS araması         |
| `components/steps/data-gathering/species-records-substep.tsx`  | GBIF + NBDC          |
| `components/steps/data-gathering/aquatic-features-substep.tsx` | EPA araması          |
| `components/steps/data-gathering/review-export-substep.tsx`    | Özet ve export       |
| `components/steps/data-gathering/findings-list.tsx`            | Findings list        |
| `components/steps/data-gathering/target-note-form.tsx`         | Target note formu    |
| `components/steps/data-gathering/export-findings-modal.tsx`    | Export modal         |
| `lib/supabase/queries/target-notes.ts`                         | Target notes queries |

### Güncellenen Dosyalar

| Dosya                                      | Değişiklik              |
| ------------------------------------------ | ----------------------- |
| `types/database.ts`                        | Yeni kolonlar ve tipler |
| `components/steps/data-gathering-step.tsx` | Wizard yapısı           |
| `components/steps/gis-mapping-step.tsx`    | Location save           |
| `lib/supabase/queries/projects.ts`         | updateProjectBoundary   |
| `hooks/use-project-data.ts`                | Target notes hooks      |
| `lib/supabase/queries/index.ts`            | target-notes export     |

---

## 12. Changelog

### 2026-02-01

- Database migrations uygulandı
- TypeScript types güncellendi
- GIS Mapping'den location kaydetme eklendi
- Target notes altyapısı oluşturuldu
- Data gathering wizard yapısına dönüştürüldü
- 8 yeni sub-step component oluşturuldu
- TypeScript hataları düzeltildi
- Dokümantasyon oluşturuldu
