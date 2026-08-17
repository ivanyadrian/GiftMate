import React, { useState } from 'react'
import { Pencil, Save, X } from 'lucide-react'

interface RoomInfoProps {
  room: any
  isOwner: boolean
  myDrawnUser: any
  onSave: (field: string, newValue: any, extraUpdates?: any) => Promise<void>
}

export default function RoomInfo({ room, isOwner, myDrawnUser, onSave }: RoomInfoProps) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<any>('')
  const [editValue2, setEditValue2] = useState<any>('')

  const handleSaveClick = async (field: string, extraUpdates: any = {}) => {
    await onSave(field, editValue, extraUpdates)
    setEditingField(null)
  }

  const renderRow = (
    label: string,
    field: string,
    value: any,
    inputType: string = 'text',
    renderDisplay?: (val: any) => React.ReactNode,
    customEditComponent?: React.ReactNode,
    canEdit: boolean = true
  ) => {
    const isEditing = editingField === field

    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '0.8rem', gap: '0.5rem', minHeight: '30px' }}>
        <strong style={{ minWidth: '150px' }}>{label}:</strong>

        {isEditing ? (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
            {customEditComponent ? customEditComponent : (
              inputType === 'textarea' ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={3}
                  style={{ flex: 1, padding: '0.2rem' }}
                />
              ) : inputType === 'select_draw' ? (
                <select value={editValue} onChange={(e) => setEditValue(e.target.value)} style={{ padding: '0.2rem' }}>
                  <option value="manual">Manuális</option>
                  <option value="auto">Automatikus</option>
                </select>
              ) : (
                <input
                  type={inputType}
                  value={editValue || ''}
                  onChange={(e) => setEditValue(e.target.value)}
                  style={{ padding: '0.2rem' }}
                />
              )
            )}

            <button onClick={() => handleSaveClick(field)} title="Mentés" style={{ cursor: 'pointer', background: 'none', border: 'none', display: 'flex', alignItems: 'center' }}>
              <Save size={20} color="green" />
            </button>
            <button onClick={() => setEditingField(null)} title="Mégse" style={{ cursor: 'pointer', background: 'none', border: 'none', display: 'flex', alignItems: 'center' }}>
              <X size={20} color="red" />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            <span style={inputType === 'textarea' ? { whiteSpace: 'pre-wrap', backgroundColor: '#f9f9f9', padding: '0.5rem', flex: 1 } : {}}>
              {renderDisplay ? renderDisplay(value) : value}
            </span>

            {isOwner && canEdit && (
              <button
                onClick={() => {
                  setEditingField(field)
                  setEditValue(value)
                  if (field === 'budget_amount') setEditValue2(room.currency || 'HUF')
                }}
                title="Szerkesztés"
                style={{ cursor: 'pointer', background: 'none', border: 'none', color: 'gray', display: 'flex', alignItems: 'center' }}
              >
                <Pencil size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', marginTop: '1rem', maxWidth: '600px' }}>
      {renderRow('Szoba neve', 'room_name', room.room_name)}

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.8rem', gap: '0.5rem' }}>
        <strong style={{ minWidth: '150px' }}>Belépési kód:</strong>
        <span style={{ fontSize: '1.5em', fontWeight: 'bold', color: 'blue', letterSpacing: '2px' }}>{room.room_code}</span>
      </div>
      <hr style={{ margin: '1rem 0' }} />

      {renderRow('Helyszín', 'location', room.location)}
      {renderRow('Találkozó dátuma', 'event_date', room.event_date, 'date')}
      {renderRow('Találkozó időpontja', 'event_time', room.event_time, 'time')}

      {renderRow('Költségkeret', 'budget_amount', room.budget_amount, 'number',
        (val) => room.has_budget ? `${val} ${room.currency}` : 'Nincs',
        (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="Összeg" style={{ width: '80px', padding: '0.2rem' }} />
            <select value={editValue2} onChange={e => setEditValue2(e.target.value)} style={{ padding: '0.2rem' }}>
              <option value="HUF">HUF</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
            <button
              onClick={() => handleSaveClick('budget_amount', { has_budget: true, currency: editValue2 })}
              style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
            >
              <Save size={20} color="green" />
            </button>
            <button
              onClick={() => handleSaveClick('budget_amount', { has_budget: false, budget_amount: null, currency: null })}
              style={{ fontSize: '0.8em', marginLeft: '5px' }}
            >
              Kikapcsol
            </button>
            <button onClick={() => setEditingField(null)} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
              <X size={20} color="red" />
            </button>
          </div>
        )
      )}

      {renderRow('Sorsolás típusa', 'draw_type', room.draw_type, 'select_draw', (val) => val === 'auto' ? 'Automatikus' : 'Manuális', undefined, !myDrawnUser)}

      {room.draw_type === 'auto' && (
        <>
          {renderRow('Sorsolás dátuma', 'draw_date', room.draw_date || '', 'date', (val) => val ? val : <span style={{ color: '#999' }}>éééé. hh. nn.</span>, undefined, !myDrawnUser)}
          {renderRow('Sorsolás időpontja', 'draw_time', room.draw_time || '', 'time', (val) => val ? val : <span style={{ color: '#999' }}>--:--</span>, undefined, !myDrawnUser)}
          {renderRow('Időzóna', 'timezone', room.timezone || 'Europe/Budapest', 'text',
            (val) => val,
            (
              <select value={editValue} onChange={e => setEditValue(e.target.value)} style={{ padding: '0.2rem' }}>
                <option value="Europe/Budapest">Közép-európai idő (Budapest, Párizs)</option>
                <option value="Europe/Bucharest">Kelet-európai idő (Bukarest, Kijev)</option>
                <option value="Europe/London">Nyugat-európai idő (London, Dublin)</option>
                <option value="America/New_York">Keleti idő (New York, Miami)</option>
                <option value="America/Chicago">Központi idő (Chicago, Mexikóváros)</option>
                <option value="America/Los_Angeles">Csendes-óceáni idő (Los Angeles, Vancouver)</option>
                <option value="Asia/Kolkata">Indiai idő (Új-Delhi)</option>
                <option value="Asia/Tokyo">Japán idő (Tokió)</option>
                <option value="UTC">Egyezményes világidő (UTC)</option>
              </select>
            ),
            !myDrawnUser
          )}
        </>
      )}

      {renderRow('Leírás', 'description', room.description, 'textarea')}
    </div>
  )
}
