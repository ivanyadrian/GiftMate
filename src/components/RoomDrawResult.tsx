interface RoomDrawResultProps {
  room: any
  myDrawnUser: any
  isRevealed: boolean
  isOwner: boolean
  membersCount: number
  isDrawing: boolean
  isDeleting: boolean
  timeLeft: string
  onReveal: () => void
  onManualDraw: () => void
  onRedraw: () => void
  onDeleteDraw: () => void
}

export default function RoomDrawResult({
  room,
  myDrawnUser,
  isRevealed,
  isOwner,
  membersCount,
  isDrawing,
  isDeleting,
  timeLeft,
  onReveal,
  onManualDraw,
  onRedraw,
  onDeleteDraw
}: RoomDrawResultProps) {
  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', marginTop: '1rem', maxWidth: '600px' }}>
      <h3>Sorsolás eredménye</h3>

      {myDrawnUser ? (
        <div style={{ backgroundColor: '#e8f5e9', padding: '1rem', borderRadius: '8px', border: '1px solid #c8e6c9', textAlign: 'center' }}>
          <h4 style={{ color: '#2e7d32', marginTop: 0 }}>Neki kell ajándékot venned:</h4>

          {!isRevealed ? (
            <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
              <button
                onClick={onReveal}
                style={{
                  backgroundColor: '#4caf50',
                  color: 'white',
                  padding: '1rem 2rem',
                  fontSize: '1.2em',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Felfedés
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '1rem' }}>
              {myDrawnUser.avatar_url ? (
                <img
                  src={myDrawnUser.avatar_url}
                  alt="avatar"
                  style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #4caf50' }}
                />
              ) : (
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#a5d6a7', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #4caf50' }}>
                  <span style={{ fontSize: '2em', color: '#2e7d32' }}>?</span>
                </div>
              )}
              <strong style={{ fontSize: '1.5em', color: '#1b5e20' }}>{myDrawnUser.username || 'Ismeretlen'}</strong>
            </div>
          )}

          {isOwner && (
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={onRedraw}
                disabled={isDrawing || isDeleting}
                style={{
                  backgroundColor: '#ffb300',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (isDrawing || isDeleting) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {isDrawing ? 'Sorsolás...' : 'Újrasorsolás'}
              </button>
              <button
                onClick={onDeleteDraw}
                disabled={isDrawing || isDeleting}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (isDrawing || isDeleting) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {isDeleting ? 'Törlés...' : 'Sorsolás törlése'}
              </button>
            </div>
          )}
        </div>
      ) : (
        room.draw_type === 'manual' ? (
          isOwner ? (
            <div>
              <p style={{ marginBottom: '1rem' }}>A sorsolás még nem történt meg.</p>
              <button
                onClick={onManualDraw}
                disabled={isDrawing || membersCount < 2}
                style={{
                  backgroundColor: membersCount < 2 ? '#ccc' : '#ff9800',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: membersCount < 2 ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                {isDrawing ? 'Sorsolás folyamatban...' : 'Sorsolás indítása'}
              </button>
              {membersCount < 2 && <p style={{ fontSize: '0.85em', color: 'red', marginTop: '0.5rem' }}>Legalább 2 fő kell a sorsoláshoz!</p>}
            </div>
          ) : (
            <p>A sorsolást a szoba tulajdonosa fogja elindítani manuálisan.</p>
          )
        ) : (
          <div>
            <p><strong>Hátralévő idő a sorsolásig:</strong></p>
            <p style={{ fontSize: '1.2em', color: '#e91e63', fontWeight: 'bold' }}>{timeLeft || 'Számítás...'}</p>
          </div>
        )
      )}
    </div>
  )
}
