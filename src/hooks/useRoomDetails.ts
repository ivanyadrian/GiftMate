import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useRoomDetails(id: string | undefined) {
  const [room, setRoom] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [myDrawnUser, setMyDrawnUser] = useState<any>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRevealed, setIsRevealed] = useState(false)
  const [drawId, setDrawId] = useState<string | null>(null)

  const [isOwner, setIsOwner] = useState(false)
  const [timeLeft, setTimeLeft] = useState<string>('')

  const fetchMyDrawnUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .rpc('get_my_draw', { p_room_id: id })

      if (error) {
        console.error('Hiba a húzott felhasználó lekérésekor (RPC):', error)
      }

      if (data && data.length > 0) {
        const drawData = data[0]
        setDrawId(drawData.draw_id)
        if (localStorage.getItem(`revealed_draw_${drawData.draw_id}`) === 'true') {
          setIsRevealed(true)
        } else {
          setIsRevealed(false)
        }

        setMyDrawnUser({
          username: drawData.username,
          avatar_url: drawData.avatar_url
        })
      } else {
        setMyDrawnUser(null)
      }
    } catch (err) {
      console.error('Hiba a húzott felhasználó lekérésekor:', err)
    }
  }

  useEffect(() => {
    if (room?.draw_type === 'auto' && room?.draw_date && room?.draw_time) {
      const targetTimeAsLocal = new Date(`${room.draw_date}T${room.draw_time}`).getTime()
      const tz = room.timezone || 'Europe/Budapest'

      const interval = setInterval(() => {
        const nowInTzStr = new Date().toLocaleString('en-US', { timeZone: tz, hour12: false })
        const nowInTzAsLocal = new Date(nowInTzStr).getTime()

        const distance = targetTimeAsLocal - nowInTzAsLocal

        if (distance <= 0) {
          setTimeLeft('A sorsolás folyamatban van vagy lejárt!')
          clearInterval(interval)
        } else {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24))
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
          const seconds = Math.floor((distance % (1000 * 60)) / 1000)

          setTimeLeft(`${days} nap ${hours} óra ${minutes} perc ${seconds} mp`)
        }
      }, 1000)

      return () => clearInterval(interval)
    } else if (room?.draw_type === 'auto') {
      setTimeLeft('A sorsolási időpontot érvénytelen!')
    }
  }, [room?.draw_type, room?.draw_date, room?.draw_time, room?.timezone])

  useEffect(() => {
    let roomChannel: any = null
    let membersChannel: any = null
    let drawsChannel: any = null

    const fetchMembers = async () => {
      const { data: memberData, error: memberError } = await supabase
        .rpc('get_room_members', { p_room_id: id })

      if (memberError) {
        console.error('Hiba a tagok lekérésekor:', memberError)
        return
      }

      const formattedMembers = (memberData || []).map((m: any) => ({
        joined_at: m.joined_at,
        is_me: m.is_me,
        is_owner: m.is_owner,
        profiles: {
          username: m.username,
          avatar_url: m.avatar_url
        }
      }))
      setMembers(formattedMembers)
    }

    const fetchRoomAndMembers = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', id)
          .single()

        if (roomError) throw roomError
        setRoom(roomData)

        if (user && roomData.created_by === user.id) {
          setIsOwner(true)
        }

        await fetchMembers()
        await fetchMyDrawnUser()

        const uniqueId = Math.random().toString(36).substring(7)

        roomChannel = supabase
          .channel(`room_${id}_${uniqueId}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${id}` },
            (payload) => {
              setRoom((prev: any) => ({ ...prev, ...payload.new }))
            }
          )
          .subscribe()

        membersChannel = supabase
          .channel(`members_${id}_${uniqueId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${id}` },
            (payload) => {
              console.log('Realtime esemény a room_members táblán:', payload)
              fetchMembers()
            }
          )
          .subscribe()

        drawsChannel = supabase
          .channel(`draws_${id}_${uniqueId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'draws', filter: `room_id=eq.${id}` },
            (payload) => {
              console.log('Realtime esemény a draws táblán:', payload)
              fetchMyDrawnUser()
            }
          )
          .subscribe()

      } catch (error) {
        console.error('Hiba a szoba lekérdezésekor:', error)
        alert('Nem sikerült betölteni a szoba adatait.')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchRoomAndMembers()
    }

    return () => {
      if (roomChannel) supabase.removeChannel(roomChannel)
      if (membersChannel) supabase.removeChannel(membersChannel)
      if (drawsChannel) supabase.removeChannel(drawsChannel)
    }
  }, [id])

  const handleManualDraw = async () => {
    if (members.length < 2) {
      alert('A sorsoláshoz legalább 2 résztvevő szükséges!')
      return
    }
    if (!window.confirm('Biztosan elindítod a sorsolást? Ezt nem lehet visszavonni!')) return

    setIsDrawing(true)
    try {
      const { error } = await supabase.rpc('perform_draw', { p_room_id: id })

      if (error) {
        console.error('Hiba a sorsoláskor:', error)
        alert('Hiba történt a sorsolás során: ' + error.message)
      } else {
        alert('A sorsolás sikeresen befejeződött!')
        await fetchMyDrawnUser()
      }
    } catch (err: any) {
      console.error(err)
      alert('Váratlan hiba történt.')
    } finally {
      setIsDrawing(false)
    }
  }

  const handleReveal = () => {
    setIsRevealed(true)
    if (drawId) {
      localStorage.setItem(`revealed_draw_${drawId}`, 'true')
    }
  }

  const handleDeleteDraw = async () => {
    if (!window.confirm('Biztosan törlöd a jelenlegi sorsolást? Ezt nem lehet visszavonni!')) return

    setIsDeleting(true)
    try {
      const { error } = await supabase.rpc('delete_draw', { p_room_id: id })

      if (error) {
        console.error('Hiba a sorsolás törlésekor:', error)
        alert('Hiba történt a törlés során: ' + error.message)
      } else {
        alert('A sorsolás sikeresen törölve lett!')
        setMyDrawnUser(null)
      }
    } catch (err: any) {
      console.error(err)
      alert('Váratlan hiba történt.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRedraw = async () => {
    if (!window.confirm('Biztosan újrasorsolod a résztvevőket? A korábbi húzások elvesznek!')) return

    setIsDrawing(true)
    try {
      const { error: deleteError } = await supabase.rpc('delete_draw', { p_room_id: id })
      if (deleteError) throw deleteError

      const { error: drawError } = await supabase.rpc('perform_draw', { p_room_id: id })
      if (drawError) throw drawError

      alert('Az újrasorsolás sikeresen megtörtént!')
      await fetchMyDrawnUser()
    } catch (err: any) {
      console.error('Hiba az újrasorsoláskor:', err)
      alert('Hiba történt az újrasorsolás során: ' + err.message)
    } finally {
      setIsDrawing(false)
    }
  }

  const handleSave = async (field: string, newValue: any, extraUpdates: any = {}) => {
    try {
      let updates = { [field]: newValue, ...extraUpdates }

      if (field === 'draw_type' && newValue === 'auto') {
        updates.draw_date = null
        updates.draw_time = null
      }

      if (['draw_date', 'draw_time', 'timezone'].includes(field)) {
        const newDate = field === 'draw_date' ? newValue : room.draw_date
        const newTime = field === 'draw_time' ? newValue : room.draw_time
        const newTz = field === 'timezone' ? newValue : (room.timezone || 'Europe/Budapest')

        if (newDate && newTime) {
          const targetTimeAsLocal = new Date(`${newDate}T${newTime}`).getTime()
          const nowInTzStr = new Date().toLocaleString('en-US', { timeZone: newTz, hour12: false })
          const nowInTzAsLocal = new Date(nowInTzStr).getTime()

          if (targetTimeAsLocal - nowInTzAsLocal <= 0) {
            alert('A megadott időpont a kiválasztott időzónában már elmúlt! Kérlek, válassz egy jövőbeli időpontot.')
            return
          }
        }
      }

      const { error } = await supabase
        .from('rooms')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      setRoom({ ...room, ...updates })
    } catch (error) {
      console.error('Hiba a mentéskor:', error)
      alert('Nem sikerült a mentés.')
    }
  }

  return {
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
  }
}
