import { useState } from 'react'
import { supabase } from '../supabaseClient'

const DEFAULT_AVATARS = [
  '/bird.webp',
  '/cat.webp',
  '/deer.webp',
  '/dog.webp',
  '/ornament.webp',
  '/owl.webp',
]

interface AvatarModalProps {
  onComplete: () => void
  userId: string
}

export default function AvatarModal({ onComplete, userId }: AvatarModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const handleSave = async () => {
    if (!selectedAvatar && !file) {
      setError('Kérlek válassz egy képet, vagy tölts fel egy sajátot!')
      return
    }

    setLoading(true)
    setError(null)
    let avatarUrlToSave = selectedAvatar

    try {
      if (file) {
        // Feltöltés a Supabase Storage-ba
        const fileExt = file.name.split('.').pop()
        const fileName = `user_uploades/${userId}-${Math.random()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        // Publikus URL lekérése
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName)
          
        avatarUrlToSave = publicUrl
      }

      // Felhasználói metaadatok frissítése
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrlToSave }
      })

      if (updateError) throw updateError

      onComplete()
    } catch (err: any) {
      setError(err.message || 'Hiba történt a profilkép mentésekor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        maxWidth: '500px',
        width: '100%',
        color: 'black'
      }}>
        <h2>Válassz Profilképet!</h2>
        <p>Első bejelentkezés alkalmával kérlek válassz vagy tölts fel egy profilképet.</p>
        
        {error && <p style={{ color: 'red' }}>{error}</p>}

        <div>
          <h3>Előre definiált képek:</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {DEFAULT_AVATARS.map((url) => (
              <img 
                key={url} 
                src={url} 
                alt="Avatar" 
                style={{ 
                  width: '60px', 
                  height: '60px', 
                  cursor: 'pointer',
                  borderRadius: '50%',
                  border: selectedAvatar === url && !file ? '3px solid blue' : '1px solid gray'
                }}
                onClick={() => {
                  setSelectedAvatar(url)
                  setFile(null) // Ha rákattint egy meglévőre, töröljük a fájlt
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3>Vagy tölts fel sajátot:</h3>
          <input 
            type="file" 
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                setFile(e.target.files[0])
                setSelectedAvatar(null) // Ha fájlt választ, töröljük a kiválasztott URL-t
              }
            }}
          />
        </div>

        <div style={{ marginTop: '20px' }}>
          <button onClick={handleSave} disabled={loading}>
            {loading ? 'Mentés...' : 'Mentés'}
          </button>
        </div>
      </div>
    </div>
  )
}
