import { useState } from "react";
import { Link } from "react-router-dom";
import { Send, ExternalLink, Check, AlertCircle } from "lucide-react";
import { BsGithub, BsLinkedin } from "react-icons/bs";
import SuccessToast from "../components/ui/SuccessToast";

/**
 * Contact Component
 *
 * Provides a visitor contact and feedback page featuring:
 * - Creator profile introduction and background story.
 * - Direct external links (LinkedIn profile, GitHub repository).
 * - Live contact form integration powered by the Web3Forms API.
 * - Honeypot spam protection and client-side field validation.
 * - Success feedback with inline confirmation card and notification toast.
 * - Direct referral banner linking to the FAQ page.
 */
export default function Contact() {
  // --- External Profile URLs ---
  const linkedinUrl = "https://www.linkedin.com/in/adrián-ivány";
  const githubUrl = "https://github.com/ivanyadrian/GiftMate";

  // --- Form State Management ---
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("general");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [formError, setFormError] = useState("");

  // --- Subject Options ---
  const subjectOptions = [
    { value: "general", label: "Általános észrevétel / kérdés" },
    { value: "bug", label: "Hibabejelentés" },
    { value: "feature", label: "Új funkció ötlet" },
  ];

  /**
   * Handles contact form submission.
   * Performs validation and dispatches the payload to Web3Forms API.
   *
   * @param e - React form submission event.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    // Validate required fields
    if (!name.trim() || !email.trim() || !message.trim()) {
      setFormError("Kérjük, töltsd ki az összes kötelező mezőt!");
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setFormError("Kérjük, érvényes e-mail címet adj meg!");
      return;
    }

    const accessKey = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY;

    // Verify presence of Web3Forms access key
    if (!accessKey) {
      console.error(
        "Web3Forms error: VITE_WEB3FORMS_ACCESS_KEY is not defined in environment variables.",
      );
      setFormError(
        "A kapcsolatfelvételi űrlap jelenleg nem elérhető. Kérlek, keress meg közvetlenül LinkedInen vagy GitHubon!",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Dispatch payload to Web3Forms API endpoint
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: accessKey,
          name: name.trim(),
          email: email.trim(),
          subject: `[GiftMate] ${subjectLabel} - ${name.trim()}`,
          message: message.trim(),
          from_name: "GiftMate Kapcsolat",
          botcheck: "", // Honeypot field (hidden from genuine users)
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSubmitted(true);
        setShowToast(true);
      } else {
        setFormError(
          data.message ||
            "Hiba történt az üzenet küldése során. Kérjük, próbáld újra később!",
        );
      }
    } catch (err) {
      console.error("Web3Forms submission error:", err);
      setFormError(
        "Nem sikerült elküldeni az üzenetet. Kérjük, próbáld újra vagy írj közvetlenül a megadott e-mail címre!",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Resets form fields and restores active submission form state.
   */
  const handleReset = () => {
    setName("");
    setEmail("");
    setSubject("general");
    setMessage("");
    setIsSubmitted(false);
    setFormError("");
  };

  // Resolve human-readable subject label for the email subject header
  const subjectLabel =
    subjectOptions.find((opt) => opt.value === subject)?.label || subject;

  return (
    <div className="min-h-[calc(100vh-140px)] w-full py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto flex flex-col gap-12">
      {/* Success Notification Toast */}
      {showToast && (
        <SuccessToast
          title="Üzenet sikeresen elküldve"
          message="Köszönjük a megkeresést! Hamarosan felvesszük veled a kapcsolatot."
          onClose={() => setShowToast(false)}
        />
      )}

      {/* Hero Header Section */}
      <div className="text-center flex flex-col items-center gap-4 max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Kérdésed vagy ötleted van? <br className="hidden sm:inline" />
          <span className="text-emerald-600">
            Vedd fel velem a kapcsolatot!
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
          Örömmel fogadok minden visszajelzést, hibabejelentést vagy új
          funkciójavaslatot. Ha hibát találtál, kérlek, írd le részletesen a
          tapasztalt problémát, hogy minél hamarabb javíthassam.
        </p>
      </div>

      {/* Main Content Layout: Creator Info & Channels (Left) | Interactive Form (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Creator & Project Channels (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Creator Profile Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-7 flex flex-col gap-6 relative overflow-hidden">
            <div className="flex items-center gap-4">
              {/* Profile Image Container with Drag & Context-Menu Protection */}
              <div
                className="w-14 h-14 rounded-2xl relative select-none overflow-hidden shadow-md shadow-emerald-500/20 shrink-0"
                onContextMenu={(e) => e.preventDefault()}
              >
                <img
                  src="/profile_pic.jpg"
                  alt="Ivány Adrián"
                  draggable={false}
                  className="w-full h-full object-cover object-[center_25%] rounded-2xl pointer-events-none select-none"
                />
                {/* Transparent Overlay Shield to prevent direct image dragging */}
                <div
                  className="absolute inset-0 z-10 bg-transparent"
                  aria-hidden="true"
                />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-snug">
                  Ivány Adrián
                </h2>
                <p className="text-xs sm:text-sm font-medium text-emerald-600">
                  Pályakezdő Webfejlesztő
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed text-justify">
              Egy praktikus családi probléma hívta életre a projektet. A
              karácsonyi nevek húzását szinte lehetetlen volt úgy összehozni,
              hogy mindenki egyszerre ráérjen. Az alapötletet aztán
              összekötöttem a hasznossal. Portfólióprojektként fejlesztettem
              tovább, így a kötelező minimumnál jóval komplexebb, funkciókban
              jóval gazdagabb megoldás született.
            </p>
          </div>

          {/* Contact Direct Channels */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-7 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Elérhetőségek
            </h3>

            {/* LinkedIn Profile Channel */}
            <a
              href={linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 group-hover:text-emerald-600 group-hover:border-emerald-200 transition-colors shrink-0 shadow-2xs">
                  <BsLinkedin className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                    LinkedIn
                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <div className="text-xs text-slate-500">
                    Kapcsolatfelvétel
                  </div>
                </div>
              </div>
            </a>

            {/* GitHub Repository Channel */}
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 group-hover:text-emerald-600 group-hover:border-emerald-200 transition-colors shrink-0 shadow-2xs">
                  <BsGithub className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                    GitHub
                    <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <div className="text-xs text-slate-500">Forráskód</div>
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* Right Column: Interactive Contact Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-8 lg:p-10 relative">
          {isSubmitted ? (
            /* Success Feedback Card */
            <div className="flex flex-col items-center text-center py-8 gap-5 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center text-emerald-600 shadow-inner">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div className="flex flex-col gap-2 max-w-md">
                <h3 className="text-2xl font-bold text-slate-900">
                  Köszönöm az üzenetedet!
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Az üzenet sikeresen elküldve. Hamarosan átnézem és ha
                  indokolt, felveszem veled a kapcsolatot a megadott e-mail
                  címen ({email}).
                </p>
              </div>

              <div className="mt-4 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Új üzenet küldése</span>
                </button>
              </div>
            </div>
          ) : (
            /* Active Message Form */
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Küldj közvetlen üzenetet
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Minden beérkező megkeresést személyesen elolvasok és indokolt
                  esetben válaszolok rá.
                </p>
              </div>

              {/* Form Validation / Submission Error Banner */}
              {formError && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 text-xs sm:text-sm font-medium animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sender Name */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="contact-name"
                    className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"
                  >
                    Neved <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input-field"
                  />
                </div>

                {/* Sender Email */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="contact-email"
                    className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"
                  >
                    E-mail címed <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Subject Selection */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="contact-subject"
                  className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"
                >
                  Üzenet témája
                </label>
                <select
                  id="contact-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="input-field"
                >
                  {subjectOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message Body */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="contact-message"
                  className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5"
                >
                  Üzenet szövege <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="contact-message"
                  required
                  rows={5}
                  placeholder="Írd le részletesen kérdésedet, a tapasztalt hibát vagy javasolt funkciódat..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="input-field resize-y min-h-30"
                />
              </div>

              {/* Form Submission Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <p className="text-xs text-slate-400 order-2 sm:order-1">
                  A csillaggal (<span className="text-rose-500">*</span>) jelölt
                  mezők kitöltése kötelező.
                </p>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-green w-full sm:w-auto inline-flex gap-2.5 rounded-xl order-1 sm:order-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Küldés folyamatban...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Üzenet elküldése</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Bottom FAQ Referral Card */}
      <div className="bg-linear-to-r from-emerald-50 via-teal-50/50 to-emerald-50 rounded-3xl border border-emerald-100/80 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Kérdésed van az oldallal kapcsolatban?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Mielőtt kapcsolatba lépnél velem, arra kérlek, hogy előtte nézd át
              a GY.I.K. szekciót, hátha ott választ találsz a kérdésedre.
            </p>
          </div>
        </div>

        <Link
          to="/faq"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold shadow-2xs hover:shadow-sm transition-all whitespace-nowrap"
        >
          <span>GY.I.K. Megtekintése</span>
        </Link>
      </div>
    </div>
  );
}
