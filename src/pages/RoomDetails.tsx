import { useParams, useNavigate } from 'react-router-dom'
import { useRoomDetails } from '../hooks/useRoomDetails'

import RoomInfo from '../components/RoomInfo'
import RoomDrawResult from '../components/RoomDrawResult'
import RoomMembers from '../components/RoomMembers'

export default function RoomDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const {
    room,
    members,
    loading,
    myDrawnUser,
    isOwner,
    isDrawing,
    isDeleting,
    isRevealed,
    timeLeft,
    handleSave,
    handleManualDraw,
    handleRedraw,
    handleDeleteDraw,
    handleReveal
  } = useRoomDetails(id)

  if (loading) return <div>Betöltés...</div>
  if (!room) return <div>Szoba nem található.</div>

  return (
    <div>
      <h2 style={{ color: 'green' }}>{isOwner ? 'Szoba kezelése' : 'Sikeres szoba létrehozás!'}</h2>

      <RoomInfo 
        room={room} 
        isOwner={isOwner} 
        myDrawnUser={myDrawnUser} 
        onSave={handleSave} 
      />

      <RoomDrawResult 
        room={room}
        myDrawnUser={myDrawnUser}
        isRevealed={isRevealed}
        isOwner={isOwner}
        membersCount={members.length}
        isDrawing={isDrawing}
        isDeleting={isDeleting}
        timeLeft={timeLeft}
        onReveal={handleReveal}
        onManualDraw={handleManualDraw}
        onRedraw={handleRedraw}
        onDeleteDraw={handleDeleteDraw}
      />

      <RoomMembers members={members} />

      <br />
      <div>
        <button onClick={() => navigate('/dashboard')}>
          Vissza a Dashboardra
        </button>
      </div>
    </div>
  )
}
