import { useState, useEffect } from "react";
import {
  Pencil,
  Check,
  Calendar,
  Clock,
  Coins,
  Shuffle,
  FileText,
  Globe,
  Info,
  ChevronDown,
  LoaderCircle,
} from "lucide-react";

interface RoomInfoProps {
  room: any;
  isOwner: boolean;
  myDrawnUser: any;

  onSave: (
    fieldOrUpdates: string | Record<string, any>,
    newValue?: any,
    extraUpdates?: any,
  ) => Promise<void>;
}

/**
 * RoomInfo Component
 *
 * Displays room details (name, event date & time, location, budget, draw mode, description)
 * and provides full editing capabilities for the room organizer with strict client-side validation:
 * - Room name length and required validation.
 * - Budget amount constraints (positive numbers, maximum 7 digits).
 * - Timezone-aware validation ensuring event and draw dates/times are in the future.
 * - Draw mode locks (prevents changing draw settings once pairings are created).
 */
export default function RoomInfo({
  room,
  isOwner,
  myDrawnUser,
  onSave,
}: RoomInfoProps) {
  // Toggle between view mode and edit mode
  const [isEditing, setIsEditing] = useState(false);

  // Local form state for draft edits before committing to database
  const [formData, setFormData] = useState({
    room_name: "",
    location: "",
    event_date: "",
    event_time: "",
    has_budget: false,
    budget_amount: "",
    currency: "Ft",
    draw_type: "manual",
    draw_date: "",
    draw_time: "",
    timezone: "Europe/Budapest",
    description: "",
  });

  // Action status and UI feedback states
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);

  // Synchronize local form state with incoming room data updates
  useEffect(() => {
    if (room) {
      setFormData({
        room_name: room.room_name || "",
        location: room.location || "",
        event_date: room.event_date || "",
        event_time: room.event_time || "",
        has_budget: !!room.has_budget,
        budget_amount: room.budget_amount ? String(room.budget_amount) : "",
        currency: room.currency || "Ft",
        draw_type: room.draw_type || "manual",
        draw_date: room.draw_date || "",
        draw_time: room.draw_time || "",
        timezone: room.timezone || "Europe/Budapest",
        description: room.description || "",
      });
    }
  }, [room]);

  /**
   * Initializes editing mode, populating draft form fields with latest room attributes.
   */
  const handleStartEdit = () => {
    if (room) {
      setFormData({
        room_name: room.room_name || "",
        location: room.location || "",
        event_date: room.event_date || "",
        event_time: room.event_time || "",
        has_budget: !!room.has_budget,
        budget_amount: room.budget_amount ? String(room.budget_amount) : "",
        currency: room.currency || "Ft",
        draw_type: room.draw_type || "manual",
        draw_date: room.draw_date || "",
        draw_time: room.draw_time || "",
        timezone: room.timezone || "Europe/Budapest",
        description: room.description || "",
      });
    }
    setEditError(null);
    setIsEditing(true);
  };

  /**
   * Cancels editing mode, discarding uncommitted local changes.
   */
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError(null);
  };

  /**
   * Checks whether a specific date and time combination falls strictly in the future
   * relative to the provided timezone.
   */
  const isTimeInFuture = (date: string, time: string, tz: string) => {
    if (!date || !time) return false;
    const targetTimeAsLocal = new Date(`${date}T${time}`).getTime();
    const nowInTzStr = new Date().toLocaleString("en-US", {
      timeZone: tz,
      hour12: false,
    });
    const nowInTzAsLocal = new Date(nowInTzStr).getTime();
    return targetTimeAsLocal - nowInTzAsLocal > 0;
  };

  // Resolve user's current local timezone
  const localTz =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Budapest";

  /**
   * Validates all form fields and commits changes to the database via onSave prop.
   * Performs client-side validations:
   * - Required non-empty room name with a 40 character limit.
   * - Positive budget amount with a 7 digit limit.
   * - Future date/time checks for meeting event and automated draw schedule.
   * - Locks draw configuration if pairings are already created.
   */
  const handleSaveAll = async () => {
    // 1. Room Name validation
    if (!formData.room_name.trim()) {
      setEditError("A szoba neve nem lehet üres!");
      return;
    }

    if (formData.room_name.trim().length > 40) {
      setEditError("A szoba neve legfeljebb 40 karakter lehet!");
      return;
    }

    // 2. Budget validation
    if (formData.has_budget) {
      if (!formData.budget_amount || Number(formData.budget_amount) <= 0) {
        setEditError("A költségkeret összege csak pozitív szám lehet!");
        return;
      }
      if (formData.budget_amount.length > 7) {
        setEditError("A költségkeret összege legfeljebb 7 számjegy lehet!");
        return;
      }
    }

    // 3. Event date/time future validation
    if (
      formData.event_date &&
      formData.event_time &&
      !isTimeInFuture(formData.event_date, formData.event_time, localTz)
    ) {
      setEditError(
        "A találkozó megadott időpontja már elmúlt! Kérlek válassz jövőbeli időpontot.",
      );
      return;
    }

    // 4. Automated draw schedule future validation
    if (formData.draw_type === "auto" && !myDrawnUser) {
      if (!formData.draw_date || !formData.draw_time) {
        setEditError(
          "Automatikus sorsoláshoz add meg a sorsolás dátumát és időpontját!",
        );
        return;
      }
      if (
        !isTimeInFuture(
          formData.draw_date,
          formData.draw_time,
          formData.timezone,
        )
      ) {
        setEditError(
          "A megadott sorsolási időpont már elmúlt! Kérlek válassz jövőbeli időpontot.",
        );
        return;
      }
    }

    setSaving(true);
    setEditError(null);

    try {
      // Build clean update payload
      const updates: any = {
        room_name: formData.room_name.trim(),
        location: formData.location.trim() || null,
        event_date: formData.event_date || null,
        event_time: formData.event_time || null,
        has_budget: formData.has_budget && !!formData.budget_amount,
        budget_amount:
          formData.has_budget && formData.budget_amount
            ? Number(formData.budget_amount)
            : null,
        currency:
          formData.has_budget && formData.budget_amount
            ? formData.currency || "Ft"
            : null,
        description: formData.description.trim() || null,
      };

      // Only update draw parameters if the draw has not taken place yet
      if (!myDrawnUser) {
        updates.draw_type = formData.draw_type;
        if (formData.draw_type === "auto") {
          updates.draw_date = formData.draw_date || null;
          updates.draw_time = formData.draw_time || null;
          updates.timezone = formData.timezone || "Europe/Budapest";
        } else {
          updates.draw_date = null;
          updates.draw_time = null;
        }
      }

      await onSave(updates);
      setIsEditing(false);
    } catch (err: any) {
      setEditError(err.message || "Nem sikerült a módosítások mentése.");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Formats a time string (HH:mm:ss) to standard HH:mm display.
   */
  const formatTime = (timeStr?: string) =>
    timeStr ? timeStr.slice(0, 5) : "-";

  /**
   * Formats numeric amounts with thousands separators (e.g. 15 000).
   */
  const formatNumber = (val: number | string | null | undefined): string => {
    if (val === null || val === undefined || val === "") return "";
    const num =
      typeof val === "number" ? val : Number(String(val).replace(/\s/g, ""));
    if (isNaN(num)) return String(val);
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  /**
   * Normalizes and returns clean currency symbols.
   */
  const formatCurrency = (curr?: string) => {
    if (!curr) return "Ft";
    if (curr === "EUR" || curr === "€") return "€";
    if (curr === "USD" || curr === "$") return "$";
    if (curr === "HUF" || curr === "Ft") return "Ft";
    return curr;
  };

  return (
    <div className="relative overflow-hidden bg-white rounded-3xl shadow-sm border border-slate-200 p-5 sm:p-8 flex flex-col gap-6">
      {/* Flush Corner Badge in top right corner */}
      {isOwner && (
        <div className="absolute top-0 right-0">
          <span className="px-3.5 py-1.5 bg-amber-50 text-amber-800 border-l border-b border-amber-200/80 text-xs font-bold rounded-bl-2xl shadow-2xs flex items-center">
            Szervező
          </span>
        </div>
      )}

      {/* Card Header */}
      <div className="flex items-center gap-3 pt-4 xs:pt-0 pb-4 border-b border-slate-100 min-w-0">
        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-xs">
          <Info className="w-5 h-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight">
            {isEditing ? "Szoba adatainak szerkesztése" : "Szoba adatai"}
          </h2>
          {!isEditing && isOwner && (
            <button
              onClick={handleStartEdit}
              className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700"
            >
              <Pencil className="w-3 h-3" />
              Szerkesztés
            </button>
          )}
        </div>
      </div>

      {/* EDIT MODE FORM */}
      {isEditing ? (
        <div className="flex flex-col gap-5 animate-in fade-in duration-200">
          {/* 1. Szoba neve */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Szoba elnevezése *
              </label>
              <span
                className={`text-[10px] font-bold ${
                  formData.room_name.length > 40
                    ? "text-rose-500"
                    : "text-slate-400"
                }`}
              >
                {formData.room_name.length}/40
              </span>
            </div>
            <input
              type="text"
              maxLength={40}
              value={formData.room_name}
              onChange={(e) =>
                setFormData({ ...formData, room_name: e.target.value })
              }
              className="w-full px-3.5 py-2 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
              placeholder="pl. Céges Karácsony 2024"
              autoFocus
            />
          </div>

          {/* 2. Találkozó adatai */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col gap-3.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Találkozó adatai
              </span>
            </div>

            {/* Helyszín */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Helyszíne
                </label>
                <span
                  className={`text-[10px] font-bold ${
                    formData.location.length > 100
                      ? "text-rose-500"
                      : "text-slate-400"
                  }`}
                >
                  {formData.location.length}/100
                </span>
              </div>
              <input
                type="text"
                maxLength={100}
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                className="w-full px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                placeholder="pl. Nappali vagy Microsoft Teams link"
              />
            </div>

            {/* Dátum és Időpont */}
            <div className="grid grid-cols-1 min-[300px]:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Dátuma
                </label>
                <input
                  type="date"
                  value={formData.event_date}
                  onChange={(e) =>
                    setFormData({ ...formData, event_date: e.target.value })
                  }
                  className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-1.5 min-w-0">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Ideje
                </label>
                <input
                  type="time"
                  value={formData.event_time}
                  onChange={(e) =>
                    setFormData({ ...formData, event_time: e.target.value })
                  }
                  className="w-full px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Költségkeret */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Coins className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Költségkeret
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 shrink-0">
                <input
                  type="checkbox"
                  checked={formData.has_budget}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      has_budget: e.target.checked,
                      budget_amount: e.target.checked
                        ? formData.budget_amount || "5000"
                        : "",
                    })
                  }
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Költségkeret megadása</span>
              </label>
            </div>

            {formData.has_budget && (
              <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-150 relative w-full">
                <input
                  type="text"
                  inputMode="numeric"
                  value={
                    formData.budget_amount
                      ? formatNumber(formData.budget_amount)
                      : ""
                  }
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "").slice(0, 7);
                    setFormData({ ...formData, budget_amount: raw });
                  }}
                  placeholder="5 000"
                  className="min-w-0 flex-1 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />

                {/* Valuta választó */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCurrencyOpen((prev) => !prev)}
                    className="px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 flex items-center justify-between gap-1.5 min-w-14 shadow-2xs"
                  >
                    <span>{formatCurrency(formData.currency)}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {isCurrencyOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setIsCurrencyOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-1.5 z-30 w-28 max-w-[calc(100vw-3rem)] bg-white rounded-xl shadow-lg border border-slate-200 py-1 flex flex-col animate-in fade-in zoom-in-95 duration-100">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, currency: "Ft" });
                            setIsCurrencyOpen(false);
                          }}
                          className={`px-3 py-1.5 text-left text-xs font-semibold hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center justify-between ${
                            formatCurrency(formData.currency) === "Ft"
                              ? "bg-emerald-50/70 text-emerald-700 font-bold"
                              : "text-slate-700"
                          }`}
                        >
                          <span>HUF</span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            Ft
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, currency: "€" });
                            setIsCurrencyOpen(false);
                          }}
                          className={`px-3 py-1.5 text-left text-xs font-semibold hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center justify-between ${
                            formatCurrency(formData.currency) === "€"
                              ? "bg-emerald-50/70 text-emerald-700 font-bold"
                              : "text-slate-700"
                          }`}
                        >
                          <span>EUR</span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            €
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, currency: "$" });
                            setIsCurrencyOpen(false);
                          }}
                          className={`px-3 py-1.5 text-left text-xs font-semibold hover:bg-emerald-50 hover:text-emerald-700 transition-colors flex items-center justify-between ${
                            formatCurrency(formData.currency) === "$"
                              ? "bg-emerald-50/70 text-emerald-700 font-bold"
                              : "text-slate-700"
                          }`}
                        >
                          <span>USD</span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            $
                          </span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 4. Sorsolás típusa és időzítése */}
          {!myDrawnUser && (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col gap-3.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Shuffle className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Sorsolás típusa és időzítése
                </span>
              </div>

              <select
                value={formData.draw_type}
                onChange={(e) =>
                  setFormData({ ...formData, draw_type: e.target.value })
                }
                className="w-full px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
              >
                <option value="manual">
                  Manuális sorsolás (szervező indítja)
                </option>
                <option value="auto">Automatikus sorsolás (időzített)</option>
              </select>

              {formData.draw_type === "auto" && (
                <div className="flex flex-col gap-3 pt-2 border-t border-slate-200/80 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 min-[300px]:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Sorsolás dátuma
                      </label>
                      <input
                        type="date"
                        value={formData.draw_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            draw_date: e.target.value,
                          })
                        }
                        className="w-full px-2.5 sm:px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Sorsolás ideje
                      </label>
                      <input
                        type="time"
                        value={formData.draw_time}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            draw_time: e.target.value,
                          })
                        }
                        className="w-full px-2.5 sm:px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Időzóna
                    </label>
                    <select
                      value={formData.timezone}
                      onChange={(e) =>
                        setFormData({ ...formData, timezone: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="Europe/Budapest">
                        Közép-európai idő (Budapest)
                      </option>
                      <option value="Europe/Bucharest">
                        Kelet-európai idő (Bukarest)
                      </option>
                      <option value="Europe/London">
                        Nyugat-európai idő (London)
                      </option>
                      <option value="America/New_York">
                        Keleti idő (New York)
                      </option>
                      <option value="America/Chicago">
                        Központi idő (Chicago)
                      </option>
                      <option value="America/Los_Angeles">
                        Csendes-óceáni idő (Los Angeles)
                      </option>
                      <option value="Asia/Kolkata">
                        Indiai idő (Új-Delhi)
                      </option>
                      <option value="Asia/Tokyo">Japán idő (Tokió)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. Leírás */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Leírás és megjegyzések
                </span>
              </div>
              <span
                className={`text-[10px] font-bold ${
                  formData.description.length > 500
                    ? "text-rose-500"
                    : "text-slate-400"
                }`}
              >
                {formData.description.length}/500
              </span>
            </div>
            <textarea
              maxLength={500}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              placeholder="További infók a résztvevőknek..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
            />
          </div>

          {/* Global Error Banner */}
          {editError && (
            <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 p-3.5 rounded-2xl border border-rose-200 animate-in fade-in duration-200">
              <span className="font-semibold">{editError}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              onClick={handleCancelEdit}
              disabled={saving}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
            >
              Mégse
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2"
            >
              {saving ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  <span>Mentés...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Módosítások mentése</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* READ-ONLY VIEW MODE - 0 PENCILS, COMPLETELY CLEAN */
        <div className="flex flex-col gap-4">
          {/* 1. Room Name Hero Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-r from-slate-50 via-emerald-50/20 to-teal-50/30 border border-slate-200/90 flex flex-col gap-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800/80">
              Szoba elnevezése
            </span>
            <div className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight">
              {room.room_name}
            </div>
          </div>

          {/* 2. Combined Meeting Block (Location + Date & Time) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white hover:bg-slate-50/40 border border-slate-200/90 flex flex-col gap-3.5 transition-all shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Találkozó
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {/* Belső konténer 1: Helyszíne */}
              <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col gap-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Helyszíne
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {room.location || (
                    <span className="text-slate-400 font-normal italic">
                      Nincs megadva
                    </span>
                  )}
                </span>
              </div>

              {/* Belső konténer 2 & 3: Dátum és Idő Grid - 300px felett 1 sorban */}
              <div className="grid grid-cols-1 min-[300px]:grid-cols-2 gap-2.5 sm:gap-3">
                {/* Konténer: Dátuma */}
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col gap-1 min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Dátuma
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                    {room.event_date ? (
                      room.event_date.replace(/-/g, ".")
                    ) : (
                      <span className="text-slate-400 font-normal italic">
                        Nincs megadva
                      </span>
                    )}
                  </span>
                </div>

                {/* Konténer: Ideje */}
                <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex flex-col gap-1 min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Ideje
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                    {room.event_time ? (
                      formatTime(room.event_time)
                    ) : (
                      <span className="text-slate-400 font-normal italic">
                        Nincs megadva
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Budget Card - Egy sorban, de szükség esetén tör új sorba */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white hover:bg-slate-50/40 border border-slate-200/90 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 transition-all shadow-2xs">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <Coins className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Költségkeret
              </span>
            </div>

            <div className="shrink-0 flex items-center">
              {room.has_budget && room.budget_amount ? (
                <span className="inline-flex items-center px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-extrabold text-xs sm:text-sm shadow-2xs">
                  {formatNumber(room.budget_amount)}{" "}
                  {formatCurrency(room.currency)}
                </span>
              ) : (
                <span className="text-xs sm:text-sm text-slate-400 font-normal italic">
                  Nincs
                </span>
              )}
            </div>
          </div>

          {/* 4. Draw Type & Timing Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white hover:bg-slate-50/30 border border-slate-200/90 shadow-2xs flex flex-col gap-3.5 transition-all">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                <Shuffle className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Sorsolás típusa és időzítése
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-bold text-slate-800">
                {room.draw_type === "auto"
                  ? "Automatikus sorsolás"
                  : "Manuális sorsolás"}
              </span>
              <span
                className={`text-xs px-3 py-1 rounded-full font-bold border ${
                  room.draw_type === "auto"
                    ? "bg-blue-50 text-blue-700 border-blue-200/80 shadow-2xs"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {room.draw_type === "auto" ? "Időzített" : "Szervező indítja"}
              </span>
            </div>

            {/* Auto Draw Details Section */}
            {room.draw_type === "auto" && (
              <div className="mt-1 pt-3 border-t flex flex-col gap-2.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                {/* Draw Date */}
                <div className="flex flex-col min-[300px]:flex-row min-[300px]:items-center min-[300px]:justify-between gap-1 min-[300px]:gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 font-semibold shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Sorsolás dátuma:</span>
                  </div>
                  <span className="font-bold text-slate-800 pl-5 min-[300px]:pl-0">
                    {room.draw_date ? room.draw_date.replace(/-/g, ".") : "-"}
                  </span>
                </div>

                {/* Draw Time */}
                <div className="flex flex-col min-[300px]:flex-row min-[300px]:items-center min-[300px]:justify-between gap-1 min-[300px]:gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 font-semibold shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Sorsolás időpontja:</span>
                  </div>
                  <span className="font-bold text-slate-800 pl-5 min-[300px]:pl-0">
                    {room.draw_time ? formatTime(room.draw_time) : "-"}
                  </span>
                </div>

                {/* Timezone */}
                <div className="flex flex-col min-[300px]:flex-row min-[300px]:items-center min-[300px]:justify-between gap-1 min-[300px]:gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-500 font-semibold shrink-0">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    <span>Időzóna:</span>
                  </div>
                  <span className="font-bold text-slate-800 pl-5 min-[300px]:pl-0 truncate">
                    {room.timezone || "Europe/Budapest"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 5. Description Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white hover:bg-slate-50/30 border border-slate-200/90 shadow-2xs flex flex-col gap-2.5 transition-all">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Leírás és megjegyzések
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-100 text-xs sm:text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
              {room.description ? (
                <span>{room.description}</span>
              ) : (
                <span className="text-slate-400 italic">
                  Nincs külön leírás vagy megjegyzés hozzáadva.
                </span>
              )}
            </div>
          </div>

          {/* Single Edit Button for Organizer */}
          {isOwner && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleStartEdit}
                className="w-full sm:w-auto py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-2"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Szoba adatainak szerkesztése</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
