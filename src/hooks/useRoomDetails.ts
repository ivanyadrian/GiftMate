import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

/**
 * useRoomDetails Hook
 *
 * Encapsulates the complete state management and business logic for an individual Secret Santa room.
 * Key responsibilities:
 * - Room metadata and membership fetching via secure PostgreSQL RPCs.
 * - Real-time synchronization across multiple clients via Supabase Realtime channels (Postgres changes & broadcasts).
 * - Secret Santa draw management: manual draw, redraw, reveal, and draw deletion.
 * - Timezone-aware countdown timer for automated draws with a 90-second grace period and 3-second active polling.
 * - Member management (kicking participants, detecting kicked status).
 * - Room departure and complete room deletion.
 * - Client-side validation and partial updates for room settings.
 */
export function useRoomDetails(id: string | undefined) {
  const navigate = useNavigate();

  // --- Room & Member States ---
  const [room, setRoom] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Draw & Participant States ---
  const [myDrawnUser, setMyDrawnUser] = useState<any>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [drawId, setDrawId] = useState<string | null>(null);

  // --- Room Action & Status Flags ---
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeletingRoom, setIsDeletingRoom] = useState(false);
  const [isRoomDeleted, setIsRoomDeleted] = useState(false);
  const [isKicked, setIsKicked] = useState(false);

  // --- Ownership & Timing References ---
  const [isOwner, setIsOwner] = useState(false);
  const isOwnerRef = useRef(false);
  const roomRef = useRef<any>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const channelRef = useRef<any>(null);

  // --- Notification Feedback States ---
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /**
   * Applies drawn partner data to state and restores reveal flag.
   */
  const applyDrawData = (drawData: any) => {
    if (drawData) {
      setDrawId(drawData.draw_id);
      if (
        drawData.is_revealed ||
        localStorage.getItem(`revealed_draw_${drawData.draw_id}`) === "true"
      ) {
        setIsRevealed(true);
      } else {
        setIsRevealed(false);
      }

      setMyDrawnUser({
        username: drawData.username,
        avatar_url: drawData.avatar_url,
        is_revealed: drawData.is_revealed,
        is_deleted: drawData.is_deleted || false,
      });
    } else {
      setMyDrawnUser(null);
    }
  };

  /**
   * Applies formatted member data to state and checks if current user is kicked.
   */
  const applyMembersData = (memberData: any[]) => {
    const formattedMembers = (memberData || []).map((m: any) => ({
      user_id: m.user_id || m.id || m.profile_id || m.member_id,
      joined_at: m.joined_at,
      is_me: m.is_me,
      is_owner: m.is_owner,
      is_deleted: m.is_deleted || false,
      has_viewed_draw: m.has_viewed_draw,
      draw_exists: m.draw_exists,
      profiles: {
        username: m.username,
        avatar_url: m.avatar_url,
      },
    }));
    setMembers(formattedMembers);

    const hasMe = formattedMembers.some((m: any) => m.is_me);
    // If current user is not in the member list and is not the room owner, they have been kicked
    if (formattedMembers.length > 0 && !hasMe && !isOwnerRef.current) {
      setIsKicked(true);
    }
  };

  /**
   * Fetches the partner assigned to the current user in the draw via RPC.
   * Restores reveal state from LocalStorage or database flag.
   */
  const fetchMyDrawnUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc("get_my_draw", {
        p_room_id: id,
      });

      if (error) {
        console.error("Error fetching drawn partner via RPC:", error);
      }

      applyDrawData(data && data.length > 0 ? data[0] : null);
    } catch (err) {
      console.error("Error fetching drawn user:", err);
    }
  };

  /**
   * Fetches the list of all members in the current room via `get_room_members` RPC.
   * Formats member data and verifies whether the current user was kicked.
   */
  const fetchMembers = async () => {
    if (!id) return;
    const { data: memberData, error: memberError } = await supabase.rpc(
      "get_room_members",
      { p_room_id: id },
    );

    if (memberError) {
      console.error("Error fetching members via RPC:", memberError);
      return;
    }

    applyMembersData(memberData);
  };

  /**
   * Automated Draw Countdown Timer:
   * Computes the remaining time until the scheduled automated draw.
   * Handles a 90-second grace period with 3-second active polling while the background
   * cron/edge function completes execution.
   */
  useEffect(() => {
    if (room?.draw_type === "auto" && room?.draw_date && room?.draw_time) {
      const targetTimeAsLocal = new Date(
        `${room.draw_date}T${room.draw_time}`,
      ).getTime();
      const tz = room.timezone || "Europe/Budapest";

      let interval: any = null;
      let pollCounter = 0;

      const checkTime = () => {
        const nowInTzStr = new Date().toLocaleString("en-US", {
          timeZone: tz,
          hour12: false,
        });
        const nowInTzAsLocal = new Date(nowInTzStr).getTime();

        const distance = targetTimeAsLocal - nowInTzAsLocal;

        // If draw date/time has arrived or passed:
        if (distance <= 0) {
          // 90-second grace period for background cron / edge function processing:
          if (distance > -90 * 1000) {
            setTimeLeft("folyamatban");
            pollCounter++;
            // Poll every 3 seconds so the draw result appears immediately once finished:
            if (pollCounter % 3 === 0) {
              fetchMyDrawnUser();
              fetchMembers();
            }
            return;
          } else {
            // If more than 90 seconds have elapsed and no draw occurred:
            setTimeLeft("A sorsolási időpont lejárt!");
            if (interval) clearInterval(interval);
            return;
          }
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        );
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        setTimeLeft(
          `${days > 0 ? `${days} nap ` : ""}${hours} óra ${minutes} perc ${seconds} mp`,
        );
      };

      checkTime();
      interval = setInterval(checkTime, 1000);

      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      setTimeLeft("");
    }
  }, [room?.draw_type, room?.draw_date, room?.draw_time, room?.timezone]);

  /**
   * Room Initialization & Realtime Subscription Hook:
   * 1. Fetches room metadata and establishes ownership status.
   * 2. Sets up initial member and draw data.
   * 3. Subscribes to PostgreSQL changes on `rooms`, `room_members`, `draws`, and `profiles`.
   * 4. Listens for client-to-client broadcast messages (`member_revealed`).
   */
  useEffect(() => {
    let isMounted = true;
    let channel: any = null;

    const fetchRoomAndMembers = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        // 1. Fetch room details, members, and my_draw in ONE atomic network call via get_room_full_details RPC
        const { data: fullDetails, error: rpcError } = await supabase.rpc(
          "get_room_full_details",
          { p_room_id: id },
        );

        if (fullDetails && fullDetails.room) {
          if (!isMounted) return;
          const roomData = fullDetails.room;
          setRoom(roomData);
          roomRef.current = roomData;

          const owner = !!(user && roomData.created_by === user.id);
          setIsOwner(owner);
          isOwnerRef.current = owner;

          applyMembersData(fullDetails.members);
          applyDrawData(fullDetails.my_draw);
        } else {
          // Fallback if RPC is not yet created or returns null
          const { data: roomData, error: roomError } = await supabase
            .from("rooms")
            .select("*")
            .eq("id", id)
            .single();

          if (roomError) {
            console.error(
              "Error fetching room details:",
              roomError || rpcError,
            );
            if (isMounted) {
              setIsRoomDeleted(true);
            }
            return;
          }

          if (!isMounted) return;
          setRoom(roomData);
          roomRef.current = roomData;

          const owner = !!(user && roomData.created_by === user.id);
          setIsOwner(owner);
          isOwnerRef.current = owner;

          await fetchMembers();
          await fetchMyDrawnUser();
        }

        if (!isMounted) return;

        // Clean up any existing channel before establishing a new one
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        channel = supabase
          .channel(`room_hub_${id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "rooms",
              filter: `id=eq.${id}`,
            },
            (payload) => {
              if (isMounted) {
                setRoom((prev: any) => ({ ...prev, ...payload.new }));
              }
            },
          )
          .on(
            "postgres_changes",
            {
              event: "DELETE",
              schema: "public",
              table: "rooms",
              filter: `id=eq.${id}`,
            },
            () => {
              if (isMounted) {
                setIsRoomDeleted(true);
              }
            },
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "room_members",
              filter: `room_id=eq.${id}`,
            },
            () => {
              if (isMounted) fetchMembers();
            },
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "draws",
              filter: `room_id=eq.${id}`,
            },
            () => {
              if (isMounted) {
                fetchMyDrawnUser();
                fetchMembers();
              }
            },
          )
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "profiles" },
            () => {
              if (isMounted) {
                fetchMembers();
                fetchMyDrawnUser();
              }
            },
          )
          .on("broadcast", { event: "member_revealed" }, () => {
            if (isMounted) fetchMembers();
          })
          .subscribe();

        channelRef.current = channel;
      } catch (error) {
        console.error("Error initializing room:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (id) {
      fetchRoomAndMembers();
    }

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [id]);

  /**
   * Executes manual draw via `perform_draw` RPC.
   * Requires at least 2 participants.
   */
  const handleManualDraw = async () => {
    if (members.length < 2) {
      setErrorMsg("A sorsoláshoz legalább 2 résztvevő szükséges!");
      return;
    }

    setIsDrawing(true);
    try {
      const { error } = await supabase.rpc("perform_draw", { p_room_id: id });

      if (error) {
        console.error("Error executing draw:", error);
        setErrorMsg("Hiba történt a sorsolás során: " + error.message);
      } else {
        setSuccessMsg("A sorsolás sikeresen befejeződött!");
        await fetchMyDrawnUser();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Váratlan hiba történt a sorsolás során.");
    } finally {
      setIsDrawing(false);
    }
  };

  /**
   * Reveals the drawn partner to the current user.
   * Records the reveal state in LocalStorage, updates the database via `reveal_my_draw` RPC,
   * and broadcasts the event to inform other members in real time.
   */
  const handleReveal = async () => {
    setIsRevealed(true);
    if (drawId) {
      localStorage.setItem(`revealed_draw_${drawId}`, "true");
    }
    if (id) {
      try {
        const { error } = await supabase.rpc("reveal_my_draw", {
          p_room_id: id,
        });
        if (error) {
          console.error("Error updating reveal status:", error);
        } else {
          fetchMembers();
          if (channelRef.current) {
            channelRef.current.send({
              type: "broadcast",
              event: "member_revealed",
              payload: { room_id: id },
            });
          }
        }
      } catch (err) {
        console.error("Error invoking reveal_my_draw:", err);
      }
    }
  };

  /**
   * Deletes the current draw pairings via `delete_draw` RPC,
   * reverting the room back to a pending state.
   */
  const handleDeleteDraw = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_draw", { p_room_id: id });

      if (error) {
        console.error("Error deleting draw:", error);
        setErrorMsg("Hiba történt a törlés során: " + error.message);
      } else {
        setSuccessMsg("A sorsolás sikeresen törölve lett!");
        setMyDrawnUser(null);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Váratlan hiba történt a törlés során.");
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Re-draws the pairings by first deleting the existing draw and then performing a new one.
   */
  const handleRedraw = async () => {
    setIsDrawing(true);
    try {
      const { error: deleteError } = await supabase.rpc("delete_draw", {
        p_room_id: id,
      });
      if (deleteError) throw deleteError;

      const { error: drawError } = await supabase.rpc("perform_draw", {
        p_room_id: id,
      });
      if (drawError) throw drawError;

      setSuccessMsg("Az újrasorsolás sikeresen megtörtént!");
      await fetchMyDrawnUser();
    } catch (err: any) {
      console.error("Error executing redraw:", err);
      setErrorMsg("Hiba történt az újrasorsolás során: " + err.message);
    } finally {
      setIsDrawing(false);
    }
  };

  /**
   * Saves updated room details with input validation:
   * - Ensures room name is non-empty and within 40 characters.
   * - Validates that updated automated draw schedules are strictly in the future.
   */
  const handleSave = async (
    fieldOrUpdates: string | Record<string, any>,
    newValue?: any,
    extraUpdates: any = {},
  ) => {
    let updates: Record<string, any> = {};

    if (typeof fieldOrUpdates === "string") {
      if (fieldOrUpdates) {
        updates[fieldOrUpdates] = newValue;
      }
      updates = { ...updates, ...extraUpdates };
    } else {
      updates = { ...fieldOrUpdates };
    }

    // Validate Room Name length
    if (updates.room_name !== undefined) {
      if (!updates.room_name || !updates.room_name.trim()) {
        throw new Error("A szoba neve nem lehet üres!");
      }
      if (updates.room_name.trim().length > 40) {
        throw new Error("A szoba neve legfeljebb 40 karakter lehet!");
      }
      updates.room_name = updates.room_name.trim();
    }

    // Validate Automated Draw Schedule is in the future
    if (
      updates.draw_type === "auto" ||
      (updates.draw_type === undefined &&
        room?.draw_type === "auto" &&
        (updates.draw_date !== undefined || updates.draw_time !== undefined))
    ) {
      const dateToValidate =
        updates.draw_date !== undefined ? updates.draw_date : room?.draw_date;
      const timeToValidate =
        updates.draw_time !== undefined ? updates.draw_time : room?.draw_time;
      const tzToValidate =
        updates.timezone !== undefined
          ? updates.timezone
          : room?.timezone || "Europe/Budapest";

      if (dateToValidate && timeToValidate) {
        const targetTimeAsLocal = new Date(
          `${dateToValidate}T${timeToValidate}`,
        ).getTime();
        const nowInTzStr = new Date().toLocaleString("en-US", {
          timeZone: tzToValidate,
          hour12: false,
        });
        const nowInTzAsLocal = new Date(nowInTzStr).getTime();

        if (targetTimeAsLocal <= nowInTzAsLocal) {
          throw new Error(
            "A megadott sorsolási időpont a kiválasztott időzónában már elmúlt! Kérlek, válassz egy jövőbeli időpontot.",
          );
        }
      }
    }

    const { data: updatedRoom, error } = await supabase.rpc(
      "update_room_details",
      {
        p_room_id: id,
        p_updates: updates,
      },
    );

    if (error) throw error;

    if (updatedRoom) {
      setRoom(updatedRoom);
      roomRef.current = updatedRoom;
    } else {
      setRoom({ ...room, ...updates });
    }
  };

  /**
   * Leaves the room as a participant via `leave_room` RPC and navigates to the Dashboard.
   */
  const handleLeaveRoom = async () => {
    setIsLeaving(true);
    try {
      const { error } = await supabase.rpc("leave_room", { p_room_id: id });

      if (error) {
        console.error("Error leaving room:", error);
        setErrorMsg(error.message || "Hiba történt a szoba elhagyása során.");
        return;
      }

      navigate("/dashboard");
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Váratlan hiba történt a szoba elhagyása során.");
    } finally {
      setIsLeaving(false);
    }
  };

  /**
   * Permanently deletes the room and all associated records via `delete_room` RPC.
   */
  const handleDeleteRoom = async () => {
    setIsDeletingRoom(true);
    try {
      const { error } = await supabase.rpc("delete_room", { p_room_id: id });

      if (error) {
        console.error("Error deleting room:", error);
        setErrorMsg(error.message || "Hiba történt a szoba törlése során.");
        return;
      }

      navigate("/dashboard");
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Váratlan hiba történt a szoba törlése közben.");
    } finally {
      setIsDeletingRoom(false);
    }
  };

  /**
   * Removes/kicks a specified member from the room via `kick_room_member` RPC.
   */
  const handleKickMember = async (targetUserId: string, username?: string) => {
    if (!targetUserId) {
      setErrorMsg("Hiba: Nem található a felhasználó azonosítója (user_id).");
      return;
    }

    try {
      const { data, error } = await supabase.rpc("kick_room_member", {
        p_room_id: id,
        p_target_user_id: targetUserId,
      });

      if (error) {
        console.error("Error kicking member:", error);
        setErrorMsg(error.message || "Hiba történt a tag eltávolítása során.");
        return;
      }

      if (data && data.success === false) {
        setErrorMsg(data.error || "Hiba történt a tag eltávolításakor.");
        return;
      }

      setSuccessMsg(
        `"${username || "A résztvevő"}" sikeresen el lett távolítva.`,
      );
      await fetchMembers();
    } catch (err: any) {
      console.error("Error kicking member:", err);
      setErrorMsg("Váratlan hiba történt a tag eltávolításakor.");
    }
  };

  // Check if a draw has occurred in this room
  const hasDrawn = !!myDrawnUser || members.some((m: any) => m.draw_exists);

  return {
    room,
    members,
    loading,
    myDrawnUser,
    hasDrawn,
    isOwner,
    isDrawing,
    isDeleting,
    isRevealed,
    isLeaving,
    isDeletingRoom,
    isRoomDeleted,
    isKicked,
    timeLeft,
    successMsg,
    setSuccessMsg,
    errorMsg,
    setErrorMsg,
    handleSave,
    handleManualDraw,
    handleRedraw,
    handleDeleteDraw,
    handleReveal,
    handleLeaveRoom,
    handleDeleteRoom,
    handleKickMember,
  };
}
