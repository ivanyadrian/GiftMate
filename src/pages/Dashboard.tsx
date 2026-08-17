import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import type { User } from '@supabase/supabase-js'
import AvatarModal from '../components/AvatarModal'

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [myRooms, setMyRooms] = useState<any[]>([])
  const navigate = useNavigate()

  const fetchMyRooms = async (userId: string) => {
    const { data, error } = await supabase
      .from('room_members')
      .select('room_id, rooms (room_name, room_code)')
      .eq('user_id', userId)

    if (!error && data) {
      setMyRooms(data)
    }
  }

  const handleCreateRoom = () => {
    navigate('/create-room')
  }

  const handleJoinRoom = async () => {
    if (roomCode.length !== 6) {
      alert('A szoba kódjának pontosan 6 karakter hosszúnak kell lennie!')
      return
    }

    if (!user) return

    setJoinLoading(true)
    try {
      const { data: roomId, error: joinError } = await supabase
        .rpc('join_room_by_code', { p_room_code: roomCode })

      if (joinError) {
        console.error('Hiba a csatlakozáskor:', joinError)
        alert(joinError.message || 'Hiba történt a csatlakozás során.')
        setJoinLoading(false)
        return
      }

      navigate(`/room/${roomId}`)
      
    } catch (err: any) {
      console.error(err)
      alert('Váratlan hiba történt.')
    } finally {
      setJoinLoading(false)
    }
  }

  const refreshUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user && !user.user_metadata?.avatar_url) {
      setShowAvatarModal(true)
    } else {
      setShowAvatarModal(false)
    }
  }

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
        if (!session.user.user_metadata?.avatar_url) {
          setShowAvatarModal(true)
        }
        await fetchMyRooms(session.user.id)
      } else {
        navigate('/login')
      }
      setLoading(false)
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          setUser(session.user)
          if (!session.user.user_metadata?.avatar_url) {
            setShowAvatarModal(true)
          } else {
            setShowAvatarModal(false)
          }
          fetchMyRooms(session.user.id)
        } else {
          setUser(null)
          setMyRooms([])
          navigate('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [navigate])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) return <div>Betöltés...</div>
  if (!user) return null

  return (
    <div>

      {showAvatarModal && (
        <AvatarModal
          userId={user.id}
          onComplete={refreshUser}
        />
      )}

      <div>
        {user.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt="Profilkép"
            style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Nincs kép
          </div>
        )}
      </div>

      <p>Sikeresen bejelentkeztél!</p>
      <p>Név: {user.user_metadata?.display_name}</p>
      <p>Email: {user.email}</p>
      <button onClick={handleLogout} style={{ marginBottom: '2rem' }}>Kijelentkezés</button>

      <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '400px' }}>
        <h3>Szobák</h3>

        <div style={{ marginBottom: '1.5rem' }}>
          <h4>Új szoba</h4>
          <button onClick={handleCreateRoom} style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}>
            Szoba létrehozása
          </button>
        </div>

        <div>
          <h4>Meglévő szoba</h4>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="6 karakteres kód"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              style={{ padding: '0.5rem', width: '150px', textTransform: 'uppercase' }}
            />
            <button 
              onClick={handleJoinRoom} 
              disabled={roomCode.length !== 6 || joinLoading}
              className={`px-6 py-2 rounded text-white font-medium whitespace-nowrap ${
                roomCode.length === 6 && !joinLoading ? 'bg-green-500 hover:bg-green-600 cursor-pointer' : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {joinLoading ? 'Csatlakozás...' : 'Csatlakozás'}
            </button>
          </div>
        </div>
        
        <hr style={{ margin: '1.5rem 0' }} />

        <div>
          <h4>Saját szobáim</h4>
          {myRooms.length === 0 ? (
            <p style={{ fontSize: '0.9em', color: 'gray' }}>Még nem vagy tagja egyetlen szobának sem.</p>
          ) : (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {myRooms.map((mr, index) => (
                <li key={index} style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9f9f9', padding: '0.5rem', borderRadius: '4px' }}>
                  <span>
                    <strong>{mr.rooms?.room_name}</strong> 
                    <span style={{ fontSize: '0.8em', color: 'gray', marginLeft: '8px' }}>(Kód: {mr.rooms?.room_code})</span>
                  </span>
                  <button 
                    onClick={() => navigate(`/room/${mr.room_id}`)}
                    style={{ padding: '0.2rem 0.5rem', cursor: 'pointer', fontSize: '0.85em' }}
                  >
                    Megnyitás
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}
