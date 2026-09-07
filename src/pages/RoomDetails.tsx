import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRoomDetails } from "../hooks/useRoomDetails";
import { useClipboard } from "../hooks/useClipboard";
import RoomInfo from "../components/RoomInfo";
import RoomDrawResult from "../components/RoomDrawResult";
import RoomMembers from "../components/RoomMembers";
import LottieLoader from "../components/LottieLoader";
import ConfirmModal, {
  type ConfirmVariant,
  type ConfirmIconType,
} from "../components/ui/ConfirmModal";
import SuccessToast from "../components/ui/SuccessToast";
import ErrorToast from "../components/ui/ErrorToast";
import {
  ArrowLeft,
  Copy,
  Check,
  LogOut,
  DoorOpen,
  LoaderCircle,
  Trash2,
} from "lucide-react";

/**
 * RoomDetails Component
 *
 * Serves as the primary view for an individual Secret Santa room.
 * Coordinates room state, participant management, draw execution/reveals,
 * room editing, and destructive actions through a centralized confirmation modal.
 * Business logic is encapsulated in the `useRoomDetails` custom hook.
 */
export default function RoomDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { isCopied, copy: copyCode } = useClipboard();

  // --- Universal Confirmation Modal State ---
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmVariant;
    icon?: ConfirmIconType;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  /**
   * Opens the shared confirmation modal with the provided custom configuration.
   */
  const openConfirm = (config: Omit<typeof confirmConfig, "isOpen">) => {
    setConfirmConfig({ ...config, isOpen: true });
  };

  /**
   * Closes the confirmation modal.
   */
  const closeConfirm = () => {
    setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
  };

  // --- Centralized Room Data & Business Operations Hook ---
  const {
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
  } = useRoomDetails(id);

  // --- Modal Confirmation Triggers ---

  /**
   * Prompts the room owner to initiate the Secret Santa draw manually.
   * Enforces a minimum of 2 participants before triggering the action.
   */
  const confirmManualDraw = () => {
    if (members.length < 2) {
      setErrorMsg("A sorsoláshoz legalább 2 résztvevő szükséges!");
      return;
    }
    openConfirm({
      title: "Sorsolás indítása",
      description:
        "Biztosan elindítod a sorsolást? A rendszer minden résztvevőnek véletlenszerű párt sorsol!",
      confirmText: "Sorsolás indítása",
      variant: "emerald",
      icon: "shuffle",
      onConfirm: async () => {
        closeConfirm();
        await handleManualDraw();
      },
    });
  };

  /**
   * Prompts the room owner to re-roll/re-draw pairings.
   * Warns that existing pairings and reveal states will be irrevocably reset.
   */
  const confirmRedraw = () => {
    openConfirm({
      title: "Újrasorsolás megerősítése",
      description:
        "Biztosan újrasorsolod a résztvevőket? A korábbi húzások és párosítások véglegesen elvesznek!",
      confirmText: "Újrasorsolás",
      variant: "warning",
      icon: "redraw",
      onConfirm: async () => {
        closeConfirm();
        await handleRedraw();
      },
    });
  };

  /**
   * Prompts the room owner to clear all draw results and revert the room to pending state.
   */
  const confirmDeleteDraw = () => {
    openConfirm({
      title: "Sorsolás törlése",
      description:
        "Biztosan törlöd a jelenlegi sorsolást? A sorsolás állapota visszaáll a sorsolás előtti kezdőhelyzetbe!",
      confirmText: "Sorsolás törlése",
      variant: "danger",
      icon: "trash",
      onConfirm: async () => {
        closeConfirm();
        await handleDeleteDraw();
      },
    });
  };

  /**
   * Prompts the room owner to kick/remove a specific member from the room.
   */
  const confirmKickMember = async (targetUserId: string, username: string) => {
    openConfirm({
      title: "Résztvevő eltávolítása",
      description: (
        <span>
          Biztosan el szeretnéd távolítani <strong>"{username}"</strong>{" "}
          felhasználót a szobából?
        </span>
      ),
      confirmText: "Eltávolítás",
      variant: "danger",
      icon: "user-x",
      onConfirm: async () => {
        closeConfirm();
        await handleKickMember(targetUserId, username);
      },
    });
  };

  /**
   * Prompts a participant to leave the room voluntarily.
   */
  const confirmLeaveRoom = () => {
    openConfirm({
      title: "Szoba elhagyása",
      description:
        "Biztosan el szeretnéd hagyni ezt a szobát? A továbbiakban nem veszel részt ebben az eseményben.",
      confirmText: "Szoba elhagyása",
      variant: "danger",
      icon: "logout",
      onConfirm: async () => {
        closeConfirm();
        await handleLeaveRoom();
      },
    });
  };

  /**
   * Prompts the room owner to permanently delete the entire room and all associated records.
   */
  const confirmDeleteRoom = () => {
    openConfirm({
      title: "Szoba végleges törlése",
      description:
        "Biztosan törölni szeretnéd ezt a szobát? A művelet végleges és visszavonhatatlan: a szoba, az összes húzás és a taglista is azonnal törlődik.",
      confirmText: "Szoba törlése",
      variant: "danger",
      icon: "trash",
      onConfirm: async () => {
        closeConfirm();
        await handleDeleteRoom();
      },
    });
  };

  // --- Early Returns & Guard Views ---

  // 1. Initial Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] w-full">
        <LottieLoader className="w-24 h-24" />
      </div>
    );
  }

  // 2. Kicked State: User was removed from the room by the owner
  if (isKicked) {
    return (
      <div className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mb-4 shadow-xs">
          <DoorOpen className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Eltávolítottak a szobából
        </h2>
        <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
          A szoba szervezője eltávolított ebből a szobából, így a továbbiakban
          nem veszel részt ebben az eseményben.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="py-2.5 px-6 bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs hover:scale-105 active:scale-95 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Vissza a Dashboardra</span>
        </button>
      </div>
    );
  }

  // 3. Room Deleted or Not Found State
  if (isRoomDeleted || !room) {
    return (
      <div className="min-h-[calc(100vh-80px)] w-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mb-4 shadow-xs">
          <DoorOpen className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {isRoomDeleted ? "A szoba törölve lett" : "Szoba nem található"}
        </h2>
        <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
          {isRoomDeleted
            ? "A szoba szervezője törölte ezt a szobát, ezért az adatok már nem érhetők el."
            : "A keresett szoba nem létezik, vagy nincs jogosultságod a megtekintéséhez."}
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="py-2.5 px-6 bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm rounded-xl flex items-center gap-2 shadow-xs hover:scale-105 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Vissza a Dashboardra</span>
        </button>
      </div>
    );
  }

  // --- Main Room View ---
  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex flex-col p-4 sm:p-6 lg:p-8 bg-slate-50 text-slate-900 font-sans items-center">
      <div className="w-full max-w-5xl flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Top Navigation Bar: Back Button & Quick Copy Room Code */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="py-2 px-4 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl shadow-2xs flex items-center gap-2 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Vissza</span>
          </button>

          {/* Quick Copy Room Code Button */}
          <button
            onClick={(e) => copyCode(room.room_code, e)}
            className="py-2 px-3.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-2xs flex items-center gap-2"
            title="Kattints a kód másolásához"
          >
            <span className="text-slate-400 font-medium">Kód:</span>
            <span className="font-mono font-bold tracking-wider text-slate-800">
              {room.room_code}
            </span>
            {isCopied(room.room_code) ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        </div>

        {/* Draw Result & Status Card (Always rendered at the top) */}
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
          onManualDraw={confirmManualDraw}
          onRedraw={confirmRedraw}
          onDeleteDraw={confirmDeleteDraw}
        />

        {/* Two-Column Responsive Grid: Members List & Room Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Left Column: Participant List (Matches height of RoomInfo in desktop, scrollable) */}
          <div className="relative w-full min-h-0">
            <div className="lg:absolute lg:inset-0">
              <RoomMembers
                members={members}
                roomCode={room.room_code}
                isOwner={isOwner}
                hasDrawn={hasDrawn}
                onKickMember={confirmKickMember}
              />
            </div>
          </div>

          {/* Right Column: Room Details & Editable Settings */}
          <div className="w-full">
            <RoomInfo
              room={room}
              isOwner={isOwner}
              myDrawnUser={myDrawnUser}
              onSave={handleSave}
            />
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200/80">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full sm:w-auto py-2.5 px-6 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-sm rounded-2xl shadow-2xs flex items-center justify-center gap-2 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Vissza a Dashboardra</span>
          </button>

          {/* Owner Action: Delete Room */}
          {isOwner ? (
            <button
              onClick={confirmDeleteRoom}
              disabled={isDeletingRoom}
              className="w-full sm:w-auto py-2.5 px-6 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
            >
              {isDeletingRoom ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  <span>Törlés folyamatban...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Szoba törlése</span>
                </>
              )}
            </button>
          ) : (
            /* Participant Action: Leave Room (Only available before draw occurs) */
            !hasDrawn && (
              <button
                onClick={confirmLeaveRoom}
                disabled={isLeaving}
                className="w-full sm:w-auto py-2.5 px-6 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
              >
                {isLeaving ? (
                  <>
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                    <span>Kilépés folyamatban...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Szoba elhagyása</span>
                  </>
                )}
              </button>
            )
          )}
        </div>
      </div>

      {/* Shared Universal Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
        variant={confirmConfig.variant}
        icon={confirmConfig.icon}
        onConfirm={confirmConfig.onConfirm}
        onClose={closeConfirm}
      />

      {/* Floating Notifications (Success & Error Toasts) */}
      {successMsg && (
        <SuccessToast
          message={successMsg}
          onClose={() => setSuccessMsg(null)}
        />
      )}

      {errorMsg && (
        <ErrorToast message={errorMsg} onClose={() => setErrorMsg(null)} />
      )}
    </div>
  );
}
