import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function CreateRoom() {
  const navigate = useNavigate()
  
  // Lépések állapota
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // 1. lépés állapota
  const [roomName, setRoomName] = useState('')
  const [hasBudget, setHasBudget] = useState(false)
  const [budgetAmount, setBudgetAmount] = useState('')
  const [currency, setCurrency] = useState('HUF')

  // 2. lépés állapota
  const [drawType, setDrawType] = useState('manual')
  const [drawDate, setDrawDate] = useState('')
  const [drawTime, setDrawTime] = useState('')
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Budapest')
  
  const [location, setLocation] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [description, setDescription] = useState('')

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const handleCreate = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Be kell jelentkezned a szoba létrehozásához!')
        setLoading(false)
        return
      }

      const roomCode = generateRoomCode()

      const { data, error } = await supabase
        .from('rooms')
        .insert({
          room_name: roomName,
          location,
          event_date: eventDate,
          event_time: eventTime,
          description,
          has_budget: hasBudget,
          budget_amount: hasBudget && budgetAmount ? Number(budgetAmount) : null,
          currency: hasBudget ? currency : null,
          draw_type: drawType,
          draw_date: drawType === 'auto' ? drawDate : null,
          draw_time: drawType === 'auto' ? drawTime : null,
          timezone: drawType === 'auto' ? timezone : null,
          created_by: user.id,
          room_code: roomCode
        })
        .select()

      if (error) throw error

      if (data && data.length > 0) {
        const roomId = data[0].id
        
        // Hozzáadjuk a készítőt a room_members táblához
        const { error: memberError } = await supabase
          .from('room_members')
          .insert({
            room_id: roomId,
            user_id: user.id
          })
          
        if (memberError) {
          console.error('Hiba a tagokhoz adáskor:', memberError)
        }

        navigate(`/room/${roomId}`)
      }
    } catch (error: any) {
      console.error('Hiba a létrehozáskor:', error)
      alert('Hiba történt a szoba létrehozása során: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const isTimeInFuture = (date: string, time: string, tz: string) => {
    if (!date || !time) return false
    const targetTimeAsLocal = new Date(`${date}T${time}`).getTime()
    const nowInTzStr = new Date().toLocaleString('en-US', { timeZone: tz, hour12: false })
    const nowInTzAsLocal = new Date(nowInTzStr).getTime()
    return targetTimeAsLocal - nowInTzAsLocal > 0
  }

  const isAutoTimeValid = drawType === 'manual' || (drawDate !== '' && drawTime !== '' && isTimeInFuture(drawDate, drawTime, timezone))

  const isStep1Valid = roomName.trim() !== '' && (!hasBudget || budgetAmount !== '')
  const isStep2Valid = 
    isAutoTimeValid &&
    location.trim() !== '' && 
    eventDate !== '' && 
    eventTime !== ''

  return (
    <div>
      <h2>Szoba létrehozása (Lépés {step}/2)</h2>
      
      {step === 1 && (
        <div>
          <div>
            <label>Szoba neve: </label>
            <input 
              type="text" 
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
          </div>
          <br />

          <div>
            <label>
              <input 
                type="checkbox" 
                checked={hasBudget}
                onChange={(e) => setHasBudget(e.target.checked)}
              />
              Költségkeret megadása (opcionális)
            </label>
          </div>
          <br />

          {hasBudget && (
            <div>
              <label>Összeg: </label>
              <input 
                type="number" 
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
              />
              
              <label> Valuta: </label>
              <select 
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="HUF">HUF</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
              <br /><br />
            </div>
          )}
          
          <div>
            <button onClick={() => setStep(2)} disabled={!isStep1Valid}>
              Tovább
            </button>
            {' '}
            <button onClick={() => navigate('/dashboard')}>
              Mégse
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div>
            <label>Sorsolás típusa: </label>
            <select value={drawType} onChange={(e) => setDrawType(e.target.value)}>
              <option value="manual">Manuális sorsolás</option>
              <option value="auto">Automatikus sorsolás</option>
            </select>
          </div>
          <br />

          {drawType === 'auto' && (
            <div>
              <div>
                <label>Sorsolás dátuma: </label>
                <input 
                  type="date" 
                  value={drawDate}
                  onChange={(e) => setDrawDate(e.target.value)}
                />
              </div>
              <br />
              <div>
                <label>Sorsolás időpontja: </label>
                <input 
                  type="time" 
                  value={drawTime}
                  onChange={(e) => setDrawTime(e.target.value)}
                />
              </div>
              <br />
              <div>
                <label>Időzóna: </label>
                <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
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
              </div>
              <br />
              {drawType === 'auto' && drawDate !== '' && drawTime !== '' && !isTimeInFuture(drawDate, drawTime, timezone) && (
                <div style={{ color: 'red', fontSize: '0.9em', marginTop: '-10px', marginBottom: '10px' }}>
                  A megadott időpont a kiválasztott időzónában már elmúlt! Kérlek, válassz egy jövőbeli időpontot.
                </div>
              )}
            </div>
          )}

          <div>
            <label>Helyszín: </label>
            <input 
              type="text" 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <br />

          <div>
            <label>Találkozó dátuma: </label>
            <input 
              type="date" 
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
          <br />

          <div>
            <label>Találkozó időpontja: </label>
            <input 
              type="time" 
              value={eventTime}
              onChange={(e) => setEventTime(e.target.value)}
            />
          </div>
          <br />

          <div>
            <label>Leírás (opcionális): </label>
            <br />
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              cols={30}
            />
          </div>
          <br />

          <div>
            <button onClick={() => setStep(1)}>
              Vissza
            </button>
            {' '}
            <button onClick={handleCreate} disabled={!isStep2Valid || loading}>
              {loading ? 'Mentés...' : 'Létrehozás'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
