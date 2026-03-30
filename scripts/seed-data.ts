/**
 * Seed script for Dulra development data
 * Run with: npx tsx scripts/seed-data.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://zekaljruvbjezxlumuup.supabase.co'
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpla2FsanJ1dmJqZXp4bHVtdXVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0Nzg4MjMsImV4cCI6MjA4NTA1NDgyM30.Gskvp7ui_VnsAIigf697gtm4EKzp6h7DlpiSLZbjvss'

const supabase = createClient(supabaseUrl, supabaseKey)

// Generate stable UUIDs for seed data
const ORG_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const USER_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'
const CLIENT_ID = 'c3d4e5f6-a7b8-9012-cdef-123456789012'
const PROJECT_1_ID = 'd4e5f6a7-b8c9-0123-def0-234567890123'
const PROJECT_2_ID = 'e5f6a7b8-c9d0-1234-ef01-345678901234'

// Workflow step configuration
const WORKFLOW_STEPS = [
  { step_number: 1, name: 'GIS Mapping', phase: 'desk_research' as const },
  { step_number: 2, name: 'Data Gathering', phase: 'desk_research' as const },
  { step_number: 3, name: 'Desk Assessment', phase: 'desk_research' as const },
  { step_number: 4, name: 'Field Research', phase: 'field_research' as const },
  { step_number: 5, name: 'Data Analysis', phase: 'reporting' as const },
  { step_number: 6, name: 'AI Draft', phase: 'reporting' as const },
  { step_number: 7, name: 'Quality Review', phase: 'reporting' as const },
  { step_number: 8, name: 'Final Submission', phase: 'reporting' as const },
]

async function seed() {
  console.log('🌱 Starting seed...')

  // 1. Create organization
  console.log('Creating organization...')
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .upsert(
      {
        id: ORG_ID,
        name: 'Dulra Ecological Consultants',
        settings: { theme: 'light', language: 'en' },
      },
      { onConflict: 'id' }
    )
    .select()
    .single()

  if (orgError) {
    console.error('Error creating organization:', orgError)
    return
  }
  console.log('✅ Organization created:', org.id)

  // 2. Create profile (using a fixed ID since we don't have real auth)
  console.log('Creating profile...')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: USER_ID,
        email: 'dev@dulra.ie',
        full_name: 'Dev User',
        organization_id: ORG_ID,
        role: 'admin',
      },
      { onConflict: 'id' }
    )
    .select()
    .single()

  if (profileError) {
    console.error('Error creating profile:', profileError)
    return
  }
  console.log('✅ Profile created:', profile.id)

  // 3. Create client
  console.log('Creating client...')
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .upsert(
      {
        id: CLIENT_ID,
        name: 'Irish Wildlife Trust',
        organization_id: ORG_ID,
        contact_name: 'John Murphy',
        contact_email: 'john@iwt.ie',
      },
      { onConflict: 'id' }
    )
    .select()
    .single()

  if (clientError) {
    console.error('Error creating client:', clientError)
    return
  }
  console.log('✅ Client created:', client.id)

  // 4. Create projects
  console.log('Creating projects...')

  const projects = [
    {
      id: PROJECT_1_ID,
      name: 'Killarney National Park Assessment',
      site_code: 'KNP-2024-001',
      organization_id: ORG_ID,
      created_by: USER_ID,
      client_id: CLIENT_ID,
      status: 'active' as const,
      current_phase: 'desk_research' as const,
      health_status: 'on_track' as const,
      survey_type: 'PEA',
      expected_start_date: '2024-03-01',
      expected_end_date: '2024-06-30',
    },
    {
      id: PROJECT_2_ID,
      name: 'Shannon Estuary Survey',
      site_code: 'SES-2024-002',
      organization_id: ORG_ID,
      created_by: USER_ID,
      client_id: CLIENT_ID,
      status: 'active' as const,
      current_phase: 'desk_research' as const,
      health_status: 'on_track' as const,
      survey_type: 'EcIA',
      expected_start_date: '2024-04-01',
      expected_end_date: '2024-08-31',
    },
  ]

  for (const project of projects) {
    const { data: proj, error: projError } = await supabase
      .from('projects')
      .upsert(project, { onConflict: 'id' })
      .select()
      .single()

    if (projError) {
      console.error('Error creating project:', projError)
      continue
    }
    console.log('✅ Project created:', proj.id, proj.name)

    // 5. Create workflow steps for project
    console.log(`Creating workflow steps for ${proj.name}...`)
    for (const step of WORKFLOW_STEPS) {
      const { error: stepError } = await supabase.from('workflow_steps').upsert(
        {
          id: `${proj.id}-step-${step.step_number}`,
          project_id: proj.id,
          step_number: step.step_number,
          name: step.name,
          phase: step.phase,
          status: step.step_number === 1 ? 'in_progress' : 'pending',
        },
        { onConflict: 'id' }
      )

      if (stepError) {
        console.error(`Error creating step ${step.step_number}:`, stepError)
      }
    }
    console.log(`✅ Workflow steps created for ${proj.name}`)

    // 6. Add project member
    const { error: memberError } = await supabase.from('project_members').upsert(
      {
        id: `${proj.id}-member-${profile.id}`,
        project_id: proj.id,
        user_id: profile.id,
        role: 'lead',
      },
      { onConflict: 'id' }
    )

    if (memberError) {
      console.error('Error adding project member:', memberError)
    }
  }

  console.log('\n🎉 Seed completed successfully!')
  console.log('\nYou can now access:')
  console.log(`- Project 1: /projects/${PROJECT_1_ID}`)
  console.log(`- Project 2: /projects/${PROJECT_2_ID}`)
}

seed().catch(console.error)
