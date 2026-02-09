'use client'

import * as React from 'react'
import { History } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Change type definitions with colors and icons
const CHANGE_TYPES = {
  'Created Report': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: '\uD83D\uDCC4',
  },
  'Updated Assessment': {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: '\uD83D\uDCDD',
  },
  'Data Input': {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    icon: '\uD83D\uDCCB',
  },
  'Created Action': {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: '\u2705',
  },
  'Updated GIS Mapping': {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    icon: '\uD83D\uDCCD',
  },
  'Quality Review': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: '\u2705',
  },
  'Created Project': {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    icon: '\uD83D\uDCC1',
  },
  'Created Assessment': {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200',
    icon: '\uD83D\uDCDD',
  },
} as const

type ChangeType = keyof typeof CHANGE_TYPES

// Avatar color palette
const AVATAR_COLORS = [
  { bg: 'bg-purple-500', text: 'text-white' },
  { bg: 'bg-blue-500', text: 'text-white' },
  { bg: 'bg-green-500', text: 'text-white' },
  { bg: 'bg-pink-500', text: 'text-white' },
  { bg: 'bg-orange-500', text: 'text-white' },
  { bg: 'bg-red-500', text: 'text-white' },
  { bg: 'bg-teal-500', text: 'text-white' },
  { bg: 'bg-indigo-500', text: 'text-white' },
  { bg: 'bg-amber-500', text: 'text-white' },
  { bg: 'bg-cyan-500', text: 'text-white' },
]

interface AuditEntry {
  id: string
  dateTime: string
  userName: string
  changeType: ChangeType
  itemName: string
  siteName: string
  details: string
}

// Mock data matching the Bolt screenshots
const MOCK_AUDIT_DATA: AuditEntry[] = [
  {
    id: '1',
    dateTime: '20/11/2025 01:40:00',
    userName: 'Niamh Walsh',
    changeType: 'Created Report',
    itemName: 'Site A - Woodland',
    siteName: 'Site A - Woodland',
    details: 'Generated detailed ecological impact assessment',
  },
  {
    id: '2',
    dateTime: '20/11/2025 01:15:30',
    userName: 'Liam Byrne',
    changeType: 'Updated Assessment',
    itemName: 'Site B - River Crossing',
    siteName: 'Site B - River Crossing',
    details: 'Updated biodiversity impact assessment scores',
  },
  {
    id: '3',
    dateTime: '20/11/2025 00:50:10',
    userName: 'Sean McCarthy',
    changeType: 'Data Input',
    itemName: 'Site A - Woodland',
    siteName: 'Site A - Woodland',
    details: 'Added bat survey results - 3 species recorded',
  },
  {
    id: '4',
    dateTime: '20/11/2025 00:25:45',
    userName: 'Fionnuala Gallagher',
    changeType: 'Created Action',
    itemName: 'Action-002',
    siteName: '-',
    details: 'Mitigation measure created for river crossing works',
  },
  {
    id: '5',
    dateTime: '20/11/2025 00:00:20',
    userName: 'Conor Ryan',
    changeType: 'Updated GIS Mapping',
    itemName: 'Site B - River Crossing',
    siteName: 'Site B - River Crossing',
    details: 'Updated riparian vegetation mapping',
  },
  {
    id: '6',
    dateTime: '19/11/2025 23:35:00',
    userName: 'Dr. Aoife Murphy',
    changeType: 'Data Input',
    itemName: 'Site C - Wetland',
    siteName: 'Site C - Wetland',
    details: 'Recorded species: Lutra lutra (Otter) - signs of activity',
  },
  {
    id: '7',
    dateTime: '19/11/2025 23:10:15',
    userName: 'Aoife Doyle',
    changeType: 'Quality Review',
    itemName: 'Site A - Woodland',
    siteName: 'Site A - Woodland',
    details: 'Completed quality review - approved with minor comments',
  },
  {
    id: '8',
    dateTime: '19/11/2025 21:30:45',
    userName: 'Eoin Brennan',
    changeType: 'Data Input',
    itemName: 'Site B - River Crossing',
    siteName: 'Site B - River Crossing',
    details: 'Entered water quality measurements',
  },
  {
    id: '9',
    dateTime: '19/11/2025 21:05:20',
    userName: 'Niamh Walsh',
    changeType: 'Created Report',
    itemName: 'Lough Ennell SAC',
    siteName: '-',
    details: 'Generated preliminary ecological assessment report',
  },
  {
    id: '10',
    dateTime: '19/11/2025 20:40:30',
    userName: 'Sean McCarthy',
    changeType: 'Updated Assessment',
    itemName: 'Site A - Woodland',
    siteName: 'Site A - Woodland',
    details: 'Updated impact significance ratings',
  },
  {
    id: '11',
    dateTime: '19/11/2025 20:25:15',
    userName: 'Fionnuala Gallagher',
    changeType: 'Data Input',
    itemName: 'Site B - River Crossing',
    siteName: 'Site B - River Crossing',
    details: 'Botanical survey data entered',
  },
  {
    id: '12',
    dateTime: '19/11/2025 20:10:00',
    userName: 'Liam Byrne',
    changeType: 'Created Action',
    itemName: 'Action-001',
    siteName: '-',
    details: 'Conservation action created for habitat management',
  },
  {
    id: '13',
    dateTime: '19/11/2025 19:55:45',
    userName: 'Liam Byrne',
    changeType: 'Data Input',
    itemName: 'Site A - Woodland',
    siteName: 'Site A - Woodland',
    details: 'Recorded species: Sciurus vulgaris (Red Squirrel)',
  },
  {
    id: '14',
    dateTime: '19/11/2025 19:20:30',
    userName: 'Aoife Doyle',
    changeType: 'Created Assessment',
    itemName: 'Site B - River Crossing',
    siteName: 'Site B - River Crossing',
    details: 'EcIA template selected',
  },
  {
    id: '15',
    dateTime: '19/11/2025 18:45:00',
    userName: 'Conor Ryan',
    changeType: 'Data Input',
    itemName: 'Site A - Woodland',
    siteName: 'Site A - Woodland',
    details: 'Entered habitat classification: WD1 - Oak-birch-holly woodland',
  },
  {
    id: '16',
    dateTime: '19/11/2025 18:12:15',
    userName: 'Siobhan Kelly',
    changeType: 'Updated GIS Mapping',
    itemName: 'Lough Ennell SAC',
    siteName: '-',
    details: 'Updated habitat mapping with new boundary data',
  },
  {
    id: '17',
    dateTime: '19/11/2025 17:45:30',
    userName: "Cian O'Donnell",
    changeType: 'Created Assessment',
    itemName: 'Site A - Woodland',
    siteName: 'Site A - Woodland',
    details: 'PEA template selected',
  },
  {
    id: '18',
    dateTime: '19/11/2025 17:32:00',
    userName: 'Dr. Aoife Murphy',
    changeType: 'Created Project',
    itemName: 'Lough Ennell SAC',
    siteName: '-',
    details: 'Project created for NPWS with code NPWS-001-25',
  },
  {
    id: '19',
    dateTime: '19/11/2025 16:50:00',
    userName: 'Sean McCarthy',
    changeType: 'Data Input',
    itemName: 'Site C - Wetland',
    siteName: 'Site C - Wetland',
    details: 'Bird survey data entered - 12 species recorded',
  },
  {
    id: '20',
    dateTime: '19/11/2025 16:15:30',
    userName: 'Niamh Walsh',
    changeType: 'Quality Review',
    itemName: 'Site B - River Crossing',
    siteName: 'Site B - River Crossing',
    details: 'Quality review started - awaiting senior approval',
  },
]

// Get unique users from mock data
const UNIQUE_USERS = [...new Set(MOCK_AUDIT_DATA.map((e) => e.userName))].sort()

// Stable user→color mapping
const userColorMap = new Map<string, number>()
UNIQUE_USERS.forEach((name, i) => {
  userColorMap.set(name, i % AVATAR_COLORS.length)
})

function getInitials(name: string) {
  return name
    .replace(/^Dr\.\s*/, '')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function getUserColor(name: string) {
  const idx = userColorMap.get(name) ?? 0
  return AVATAR_COLORS[idx]
}

export default function AuditPage() {
  const [changeTypeFilter, setChangeTypeFilter] = React.useState<string>('all')
  const [userFilter, setUserFilter] = React.useState<string>('all')

  const filteredData = MOCK_AUDIT_DATA.filter((entry) => {
    if (changeTypeFilter !== 'all' && entry.changeType !== changeTypeFilter) return false
    if (userFilter !== 'all' && entry.userName !== userFilter) return false
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <History className="h-8 w-8 text-gray-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
            <p className="text-gray-600">Track all changes and activities across the platform</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Filter by Change Type
            </label>
            <Select value={changeTypeFilter} onValueChange={setChangeTypeFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {Object.keys(CHANGE_TYPES).map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Filter by User</label>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {UNIQUE_USERS.map((user) => (
                  <SelectItem key={user} value={user}>
                    {user}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-3.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Date & Time
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  User Name
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Change Type
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Item Name
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Site Name
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map((entry) => {
                const typeStyle = CHANGE_TYPES[entry.changeType]
                const color = getUserColor(entry.userName)
                return (
                  <tr key={entry.id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-5 py-4 text-sm whitespace-nowrap text-gray-600">
                      <div>{entry.dateTime.split(' ')[0]}</div>
                      <div className="text-gray-400">{entry.dateTime.split(' ')[1]}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback
                            className={`${color.bg} ${color.text} text-xs font-medium`}
                          >
                            {getInitials(entry.userName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-gray-900">{entry.userName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}
                      >
                        <span>{typeStyle.icon}</span>
                        {entry.changeType}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">{entry.itemName}</td>
                    <td className="px-5 py-4 text-sm text-gray-700">{entry.siteName}</td>
                    <td className="max-w-xs px-5 py-4 text-sm text-gray-600">{entry.details}</td>
                  </tr>
                )
              })}

              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-500">
                    No audit entries match the selected filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-3">
          <p className="text-sm text-gray-500">
            Showing {filteredData.length} of {MOCK_AUDIT_DATA.length} entries
          </p>
        </div>
      </div>
    </div>
  )
}
