import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Lightbulb, LoaderCircle } from "lucide-react";
import RoomCard from "../components/ui/RoomCard";
import ErrorToast from "../components/ui/ErrorToast";

/**
 * CreateRoom Component
 *
 * A two-step wizard form for setting up a new room.
 * Key features:
 * - Step 1: Basic room information (name, theme/event type, optional budget with currency).
 * - Step 2: Logistics & schedule (draw type, auto-draw date/time, meeting location, event date/time, description).
 * - Real-time Live Preview: Interactive `RoomCard` on desktop that instantly reflects form changes.
 * - Timezone-aware date/time future validation with a 10-second tick interval.
 * - Atomic room creation using the server-side `create_room` PostgreSQL RPC, ensuring unique code generation
 *   and automatic owner membership in a single transaction.
 */
export default function CreateRoom() {
  const navigate = useNavigate();

  // --- Wizard Step & UI Feedback States ---
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, setValidationTrigger] = useState(0);

  /**
   * Periodic re-render timer (every 10s) to continuously re-evaluate future date/time
   * validity as current time progresses.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setValidationTrigger((prev) => prev + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // --- Step 1 Form States (Basic Info & Budget) ---
  const [roomName, setRoomName] = useState("");
  const [eventType, setEventType] = useState("general");
  const [hasBudget, setHasBudget] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [currency, setCurrency] = useState("HUF");

  // --- Step 2 Form States (Schedule & Logistics) ---
  const [drawType, setDrawType] = useState("manual");
  const [drawDate, setDrawDate] = useState("");
  const [drawTime, setDrawTime] = useState("");
  const [timezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Budapest",
  );

  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [description, setDescription] = useState("");

  // Available room event themes determining banner illustrations and styling
  const eventTypes = [
    { id: "general", label: "Általános" },
    { id: "school", label: "Iskolai" },
    { id: "work", label: "Munkahelyi" },
    { id: "family", label: "Családi / Baráti" },
  ];

  /**
   * Formats numeric input with thousand space separators (e.g. "15000" -> "15 000").
   */
  const formatNumber = (val: string): string => {
    const raw = val.replace(/\D/g, "");
    if (!raw) return "";
    return raw.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  /**
   * Checks whether the specified date and time string represent a strictly future moment
   * within the provided timezone.
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

  /**
   * Submits the complete room creation form.
   * Validates all form inputs, verifies authentication, and invokes the `create_room` RPC.
   */
  const handleCreate = async () => {
    setValidationTrigger((prev) => prev + 1);

    // Validate Room Name
    if (!roomName.trim()) {
      setErrorMsg("Kérlek, add meg a szoba nevét!");
      return;
    }
    if (roomName.trim().length > 40) {
      setErrorMsg("A szoba neve maximum 40 karakter lehet!");
      return;
    }

    // Validate Budget Amount if budget toggle is enabled
    if (
      hasBudget &&
      (!budgetAmount || Number(budgetAmount) <= 0 || budgetAmount.length > 7)
    ) {
      setErrorMsg(
        "Kérlek, adj meg egy érvényes költségkeret összeget (maximum 7 számjegy)!",
      );
      return;
    }

    // Validate Location
    if (!location.trim()) {
      setErrorMsg("Kérlek, add meg a találkozó helyszínét!");
      return;
    }
    if (location.length > 100) {
      setErrorMsg("A helyszín maximum 100 karakter lehet!");
      return;
    }

    // Validate Description Length
    if (description && description.length > 500) {
      setErrorMsg("A leírás maximum 500 karakter lehet!");
      return;
    }

    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Validate Automated Draw Schedule if selected
    if (drawType === "auto") {
      if (!drawDate || !drawTime) {
        setErrorMsg(
          "Kérlek, add meg az automatikus sorsolás dátumát és időpontját!",
        );
        return;
      }
      if (!isTimeInFuture(drawDate, drawTime, timezone)) {
        setErrorMsg(
          "Az automatikus sorsolás megadott időpontja a múltban van! Kérlek, válassz egy jövőbeli időpontot.",
        );
        return;
      }
    }

    // Validate Event Date and Time
    if (!eventDate || !eventTime) {
      setErrorMsg("Kérlek, add meg a találkozó dátumát és időpontját!");
      return;
    }

    if (!isTimeInFuture(eventDate, eventTime, localTz)) {
      setErrorMsg(
        "A találkozó megadott időpontja a múltban van! Kérlek, válassz egy jövőbeli időpontot.",
      );
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setErrorMsg("Be kell jelentkezned a szoba létrehozásához!");
        setLoading(false);
        return;
      }

      // Invoke atomic server-side room creation RPC
      const { data: roomId, error } = await supabase.rpc("create_room", {
        p_room_name: roomName.trim(),
        p_event_type: eventType,
        p_location: location.trim(),
        p_event_date: eventDate || null,
        p_event_time: eventTime || null,
        p_description: description.trim() || null,
        p_has_budget: hasBudget,
        p_budget_amount:
          hasBudget && budgetAmount ? Number(budgetAmount) : null,
        p_currency: hasBudget ? currency : null,
        p_draw_type: drawType,
        p_draw_date: drawType === "auto" && drawDate ? drawDate : null,
        p_draw_time: drawType === "auto" && drawTime ? drawTime : null,
        p_timezone: drawType === "auto" && timezone ? timezone : null,
      });

      if (error) throw error;

      if (roomId) {
        navigate(`/room/${roomId}`);
      }
    } catch (error: any) {
      console.error("Hiba a létrehozáskor:", error);
      setErrorMsg("Hiba történt a szoba létrehozása során: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Validation flag for enabling progression from Step 1 to Step 2
  const isStep1Valid =
    roomName.trim() !== "" &&
    roomName.trim().length <= 40 &&
    (!hasBudget ||
      (budgetAmount !== "" &&
        Number(budgetAmount) > 0 &&
        budgetAmount.length <= 7));

  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex flex-col p-4 sm:p-6 lg:p-8 bg-slate-50 text-slate-900 font-sans items-center">
      {/* Floating Error Toast Notification */}
      {errorMsg && (
        <ErrorToast message={errorMsg} onClose={() => setErrorMsg(null)} />
      )}

      <div className="w-full max-w-5xl flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Column: Two-Step Wizard Form */}
        <div className="flex-1 w-full flex flex-col gap-4">
          {/* Stepper Progress Indicator */}
          <div className="flex items-center gap-3 px-1">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${
                step === 1
                  ? "text-emerald-600 font-extrabold"
                  : "text-slate-400"
              }`}
            >
              1. Lépés
            </span>
            <div className="flex-1 h-px bg-slate-200" />
            <span
              className={`text-[11px] font-bold uppercase tracking-wider transition-colors ${
                step === 2
                  ? "text-emerald-600 font-extrabold"
                  : "text-slate-400"
              }`}
            >
              2. Lépés
            </span>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-6 pb-4 border-b border-slate-100">
              Szoba létrehozása
            </h1>

            {/* --- STEP 1: Basic Information & Budget --- */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Room Name Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      className="block text-sm font-semibold text-slate-700"
                      htmlFor="room-name"
                    >
                      Szoba neve <span className="text-rose-500">*</span>
                    </label>
                    <span
                      className={`text-xs font-semibold ${roomName.length > 40 ? "text-rose-500 font-bold" : "text-slate-400"}`}
                    >
                      {roomName.length}/40
                    </span>
                  </div>
                  <input
                    id="room-name"
                    type="text"
                    maxLength={40}
                    required
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="pl. Karácsonyi Ajándékozás 2026"
                    className={`input-field ${roomName.length > 40 ? "border-rose-400 focus:ring-rose-200" : ""}`}
                    autoFocus
                  />
                </div>

                {/* Event Theme / Banner Dropdown */}
                <div>
                  <label
                    className="block text-sm font-semibold text-slate-700 mb-1.5"
                    htmlFor="event-type"
                  >
                    Borítókép / Esemény témája
                  </label>
                  <select
                    id="event-type"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="input-field cursor-pointer font-medium"
                  >
                    {eventTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Budget Toggle & Amount Fields */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={hasBudget}
                      onChange={(e) => setHasBudget(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Költségkeret megadása (opcionális)
                    </span>
                  </label>

                  {hasBudget && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-200">
                      <div className="sm:col-span-2 relative flex items-center">
                        <input
                          id="budget-amount"
                          type="text"
                          inputMode="numeric"
                          value={formatNumber(budgetAmount)}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, "");
                            if (raw.length <= 7) {
                              setBudgetAmount(raw);
                            }
                          }}
                          placeholder="pl. 5 000"
                          className={`input-field pr-12 ${budgetAmount.length > 7 || (budgetAmount && Number(budgetAmount) <= 0) ? "border-rose-400 focus:ring-rose-200" : ""}`}
                        />
                        <span
                          className={`absolute right-3.5 text-[11px] font-semibold pointer-events-none select-none ${
                            budgetAmount.length > 7
                              ? "text-rose-500 font-bold"
                              : "text-slate-400"
                          }`}
                        >
                          {budgetAmount.length}/7
                        </span>
                      </div>
                      <div>
                        <select
                          id="currency"
                          value={currency}
                          onChange={(e) => setCurrency(e.target.value)}
                          className="input-field cursor-pointer font-medium"
                        >
                          <option value="HUF">HUF</option>
                          <option value="EUR">EUR</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 1 Navigation Buttons */}
                <div className="pt-4 flex flex-col-reverse min-[300px]:flex-row items-center justify-between gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="w-full min-[300px]:w-auto py-2.5 px-4 text-slate-500 hover:text-slate-800 text-sm font-semibold transition-colors text-center"
                  >
                    Mégse
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!isStep1Valid}
                    className="w-full min-[300px]:w-auto btn-green gap-2 px-6"
                  >
                    <span>Tovább</span>
                  </button>
                </div>
              </div>
            )}

            {/* --- STEP 2: Draw Type & Schedule Details --- */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Draw Type Selector */}
                <div>
                  <label
                    className="block text-sm font-semibold text-slate-700 mb-1.5"
                    htmlFor="draw-type"
                  >
                    Sorsolás típusa
                  </label>
                  <select
                    id="draw-type"
                    value={drawType}
                    onChange={(e) => setDrawType(e.target.value)}
                    className="input-field cursor-pointer font-medium"
                  >
                    <option value="manual">Manuális sorsolás</option>
                    <option value="auto">Automatikus sorsolás</option>
                  </select>
                </div>

                {/* Conditional Auto-Draw Schedule Inputs */}
                {drawType === "auto" && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-4 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          className="block text-xs font-semibold text-slate-500 tracking-wider mb-1.5"
                          htmlFor="draw-date"
                        >
                          Sorsolás dátuma{" "}
                          <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="draw-date"
                          type="date"
                          value={drawDate}
                          onChange={(e) => setDrawDate(e.target.value)}
                          className="input-field bg-white"
                        />
                      </div>
                      <div>
                        <label
                          className="block text-xs font-semibold text-slate-500 tracking-wider mb-1.5"
                          htmlFor="draw-time"
                        >
                          Sorsolás időpontja{" "}
                          <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="draw-time"
                          type="time"
                          value={drawTime}
                          onChange={(e) => setDrawTime(e.target.value)}
                          className="input-field bg-white"
                        />
                      </div>
                    </div>
                    {drawDate &&
                      drawTime &&
                      !isTimeInFuture(drawDate, drawTime, timezone) && (
                        <div className="text-xs font-semibold text-rose-500">
                          A sorsolási időpont a múltban van! Kérlek, válassz
                          jövőbeli időpontot.
                        </div>
                      )}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 space-y-4">
                  {/* Location Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        className="block text-xs font-semibold text-slate-500 tracking-wider"
                        htmlFor="location"
                      >
                        Helyszín <span className="text-rose-500">*</span>
                      </label>
                      <span
                        className={`text-[10px] font-semibold ${location.length > 100 ? "text-rose-500 font-bold" : "text-slate-400"}`}
                      >
                        {location.length}/100
                      </span>
                    </div>
                    <input
                      id="location"
                      type="text"
                      maxLength={100}
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="pl. Nagyiéknál"
                      className={`input-field ${location.length > 100 ? "border-rose-400 focus:ring-rose-200" : ""}`}
                    />
                  </div>

                  {/* Event Date and Time Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        className="block text-xs font-semibold text-slate-500 tracking-wider mb-1.5"
                        htmlFor="event-date"
                      >
                        Esemény dátuma <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="event-date"
                        type="date"
                        required
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label
                        className="block text-xs font-semibold text-slate-500 tracking-wider mb-1.5"
                        htmlFor="event-time"
                      >
                        Esemény időpontja{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="event-time"
                        type="time"
                        required
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>

                  {eventDate &&
                    eventTime &&
                    !isTimeInFuture(eventDate, eventTime, localTz) && (
                      <div className="text-xs font-semibold text-rose-500">
                        A találkozó megadott időpontja a múltban van!
                      </div>
                    )}

                  {/* Description Textarea */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        className="block text-xs font-semibold text-slate-500 tracking-wider"
                        htmlFor="description"
                      >
                        Leírás (opcionális)
                      </label>
                      <span
                        className={`text-[10px] font-semibold ${description.length > 500 ? "text-rose-500 font-bold" : "text-slate-400"}`}
                      >
                        {description.length}/500
                      </span>
                    </div>
                    <textarea
                      id="description"
                      maxLength={500}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="További infók a résztvevőknek..."
                      className="input-field min-h-20 resize-y"
                    />
                  </div>
                </div>

                {/* Step 2 Navigation Buttons */}
                <div className="pt-4 flex flex-col-reverse min-[300px]:flex-row items-center justify-between gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full min-[300px]:w-auto py-2.5 px-4 text-slate-500 hover:text-slate-800 text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors text-center"
                  >
                    <span>Vissza</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={loading}
                    className="w-full min-[300px]:w-auto btn-green gap-2 px-8"
                  >
                    {loading ? (
                      <>
                        <LoaderCircle className="w-4 h-4 animate-spin" />
                        <span>Létrehozás...</span>
                      </>
                    ) : (
                      <>
                        <span>Létrehozás</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Interactive Preview Card */}
        <div className="w-full lg:w-96 shrink-0 flex flex-col gap-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between px-1">
            <span>Élő előnézet</span>
            <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
              Frissül
            </span>
          </div>

          <RoomCard
            roomName={roomName}
            eventType={eventType}
            hasBudget={hasBudget}
            budgetAmount={budgetAmount}
            currency={currency}
            location={location}
            eventDate={eventDate}
            eventTime={eventTime}
            description={description}
            drawType={drawType}
            drawDate={drawDate}
            drawTime={drawTime}
            memberCount={0}
            simplified={false}
          />

          {/* Quick Tip Box */}
          <div className="bg-emerald-50/80 rounded-2xl p-4 flex gap-3 text-emerald-800 text-xs border border-emerald-100/50">
            <div className="bg-white p-1.5 rounded-xl shrink-0 h-fit shadow-xs">
              <Lightbulb className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="leading-relaxed">
              <span className="font-bold">Tipp: </span>A szoba létrehozása után
              egy 6 jegyű kóddal tudod meghívni az ismerőseidet, barátaidat és
              családtagjaidat.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
