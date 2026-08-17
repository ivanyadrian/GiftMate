interface RoomMembersProps {
  members: any[]
}

export default function RoomMembers({ members }: RoomMembersProps) {
  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', marginTop: '1rem', maxWidth: '600px' }}>
      <h3>Csatlakozott játékosok ({members.length} fő)</h3>
      {members.length === 0 ? (
        <p>Még nincsenek játékosok a szobában.</p>
      ) : (
        <ul style={{ paddingLeft: '0', listStyleType: 'none' }}>
          {members.map((m, index) => (
            <li key={index} style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {m.profiles?.avatar_url ? (
                <img
                  src={m.profiles.avatar_url}
                  alt="avatar"
                  style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.8em', color: '#555' }}>?</span>
                </div>
              )}
              <div>
                <strong>
                  {m.profiles?.username || 'Ismeretlen felhasználó'}
                  {m.is_owner && ' 👑'}
                  {m.is_me && ' (Te)'}
                </strong>
                <span style={{ fontSize: '0.85em', color: 'gray', marginLeft: '10px' }}>
                  (Csatlakozott: {new Date(m.joined_at).toLocaleString('hu-HU')})
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
