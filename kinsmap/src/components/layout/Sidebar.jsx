import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const NAV_ITEMS = [
  { to: '/tree', label: 'Tree', icon: '🌳', end: true },
  { to: '/events', label: 'Events', icon: '🔔' },
  { to: '/flashcard', label: 'Flashcard', icon: '🃏' },
  { to: '/settings', label: 'Members', icon: '👥', adminOnly: true, matchSettings: true },
  { to: '/settings', label: 'Settings', icon: '⚙️', adminOnly: true },
  { to: '/archive', label: 'Archive', icon: '🗂️', adminOnly: true },
]

function navClassName({ isActive }) {
  return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-indigo-50 text-indigo-700'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`
}

function mobileNavClassName({ isActive }) {
  return `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
    isActive ? 'text-indigo-700' : 'text-gray-500'
  }`
}

export default function Sidebar() {
  const { userRole } = useAuth()
  const isAdmin = userRole === 'owner' || userRole === 'admin'

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin)

  return (
    <>
      <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white md:block">
        <nav className="flex flex-col gap-1 p-4">
          {visibleItems.map((item) => (
            <NavLink
              key={`${item.to}-${item.label}`}
              to={item.to}
              end={item.end}
              className={navClassName}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-gray-200 bg-white px-1 pb-safe md:hidden">
        {visibleItems
          .filter((item) => !item.label.includes('Archive'))
          .slice(0, 5)
          .map((item) => (
            <NavLink
              key={`mobile-${item.to}-${item.label}`}
              to={item.to}
              end={item.end}
              className={mobileNavClassName}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
      </nav>
    </>
  )
}
