import { User, Users } from 'lucide-react'
import styles from './TransportSelector.module.css'

const OPTIONS = [
  { value: 'individual', label: 'Individual', icon: User, desc: 'Transporte privado para 1 persona' },
  { value: 'grupal',     label: 'Grupal',     icon: Users, desc: 'Transporte compartido en grupo' },
]

export default function TransportSelector({ value, onChange }) {
  return (
    <div className={styles.wrap}>
      {OPTIONS.map(({ value: v, label, icon: Icon, desc }) => {
        const active = value === v
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={[styles.card, active ? styles.active : ''].join(' ')}
            aria-pressed={active}
          >
            <Icon size={22} color={active ? 'var(--primary)' : 'var(--text-500)'} />
            <span className={styles.label}>{label}</span>
            <span className={styles.desc}>{desc}</span>
          </button>
        )
      })}
    </div>
  )
}
