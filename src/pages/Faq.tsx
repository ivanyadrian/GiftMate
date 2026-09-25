import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Search, FaceSlightlyFrowning } from "lucide-react";

/**
 * Interface representing a single FAQ entry with categorization and metadata.
 */
interface FaqItem {
  id: string;
  category: "security" | "draw" | "rooms" | "account";
  question: string;
  answer: string;
  badge?: string;
}

/**
 * Interface representing a category filter option.
 */
interface FaqCategory {
  id: string;
  label: string;
}

/**
 * Faq Component
 *
 * Comprehensive Frequently Asked Questions knowledge base:
 * - Topic-based category filtering (Security, Draw logic, Room administration, Account & Data privacy).
 * - Real-time keyword search across both questions and answers with instant clearing.
 * - Smooth CSS Grid accordion transitions (`grid-rows-[0fr]` to `grid-rows-[1fr]`).
 * - Direct referral card redirecting users to the Contact page for unlisted inquiries.
 */
export default function Faq() {
  // --- Search & Filter State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // --- Accordion Open/Collapsed State ---
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    "q-1": false,
  });

  /**
   * Toggles the open/collapsed state of a specific accordion item.
   *
   * @param id - Unique identifier of the target FAQ item.
   */
  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // --- FAQ Dataset ---
  const faqItems: FaqItem[] = [
    {
      id: "q-1",
      category: "security",
      question: "Láthatja a szoba szervezője, hogy ki kit húzott a sorsoláson?",
      answer:
        "Garantáltan nem! A szervező előtt is teljesen rejtve marad minden. A sorsolás eredményét a rendszer olyan szinten levédi, hogy azt senki nem kérdezheti le vagy lesheti meg előre. Nincs kivételezés és nincs csalási lehetőség: amint lefut a húzás, a szoba létrehozója is csak azt az egyetlen nevet fogja ismerni, amit a rendszer neki sorsolt.",
      badge: "Biztonság & Titoktartás",
    },
    {
      id: "q-2",
      category: "draw",
      question: "Húzhatja valaki saját magát a sorsolás során?",
      answer:
        "Nem, ezt a rendszer teljes mértékben kizárja. A sorsolásért felelős algoritmus garantálja, hogy egyetlen résztvevő sem húzhatja saját magát.",
      badge: "Algoritmus",
    },
    {
      id: "q-3",
      category: "draw",
      question:
        "Mi a különbség az automatikus és a manuális sorsolási mód között?",
      answer:
        "Manuális sorsolás esetén a szoba szervezője határozza meg a megfelelő pillanatot, és egyetlen gombnyomással azonnal lefolytatja a húzást. Automatikus sorsolás esetén előre beállítható egy konkrét dátum, pontos időpont és időzóna. A rendszer a háttérben figyeli az időt, és az adott másodpercben automatikusan lebonyolítja a párosítást.",
      badge: "Sorsolási típusok",
    },
    {
      id: "q-4",
      category: "rooms",
      question: "Módosíthatók a szoba adatai a sorsolás lefutása után?",
      answer:
        "A sorsolási paraméterek (sorsolási mód, sorsolási dátum/időpont) a sorsolás megtörténtekor véglegesen zárolásra kerülnek. Az általános információk – mint a szoba neve, az átadás pontos helyszíne, a leírás és az ajánlott költségkeret – a sorsolás után is szabadon frissíthetők a szervező által.",
      badge: "Szobakezelés",
    },
    {
      id: "q-5",
      category: "rooms",
      question:
        "Ki lehet lépni a szobából, vagy el lehet távolítani tagot a sorsolás után?",
      answer:
        "Sorsolás után a szervező nem távolíthat el senkit, mivel ez megszakítaná az aktív ajándékozási láncot. Ha mégis változtatni szeretnétek a résztvevőkön, a szervezőnek először vissza kell vonnia a sorsolást, elvégezni a tagok módosítását, majd új sorsolást indítani.",
      badge: "Szobaszabályok",
    },
    {
      id: "q-6",
      category: "account",
      question:
        "Mi történik, ha egy résztvevő törli a fiókját a sorsolás után?",
      answer:
        "A GiftMate adatbázis-architektúrája fel van készítve erre az eshetőségre: ha egy felhasználó véglegesen törli a fiókját egy már lezajlott sorsolás után, a profilja automatikusan egy anonim 'Törölt felhasználó' (ghost) állapotba kerül át. Ezzel a többi játékos húzása nem vész el, a kör nem szakad meg, és az ajándékozási lánc érintetlen marad. A résztvevők számára a 'ghost' állapotba került felhasználó egyértelműen beazonosítható.",
      badge: "Fiók & Adatvédelem",
    },
    {
      id: "q-7",
      category: "security",
      question: "Ingyenes a GiftMate használata?",
      answer:
        "Igen! A GiftMate 100%-ban ingyenes, reklámmentes és nyílt forráskódú webalkalmazás. Nincsenek prémium csomagok, rejtett költségek vagy adatértékesítés.",
      badge: "Ingyenesség",
    },
    {
      id: "q-8",
      category: "account",
      question:
        "Törölhetem a fiókomat, ha van olyan szobám, aminek én vagyok a szervezője?",
      answer:
        "Igen, de ez a szobák aktuális állapotától függ. Ha olyan szoba tulajdonosa vagy, ahol a sorsolás már lezajlott, a fiókodat a játékosok védelmében mindaddig nem törölheted, amíg abban a szobában vissza nem vonod a sorsolást. Amennyiben a sorsolás még nem történt meg, a fiókod törlésével az általad indított szobák is véglegesen megszűnnek: a résztvevők azonnal kiléptetésre kerülnek, a szoba pedig nyom nélkül törlődik a rendszerből.",
      badge: "Fiók & Szervezés",
    },
    {
      id: "q-9",
      category: "account",
      question: "Véglegesen törlődik minden adatom a fiókom megszüntetésekor?",
      answer:
        "Igen, maradéktalanul! A fiókod törlése egy tranzakcióbiztos folyamat: az authentikációs rendszerből véglegesen törlődik az e-mail címed, jelszavad és minden hozzád köthető további adat. Ezzel párhuzamosan a felhőtárhelyről is megsemmisül a feltöltött egyedi profilképed.",
      badge: "Teljes Adattörlés",
    },
    {
      id: "q-10",
      category: "account",
      question:
        "Mi történik, ha a korábban feltöltött profilképemet lecserélem egy újra?",
      answer:
        "Az új fotó azonnal átveszi a korábbi helyét: a rendszer a régi képedet véglegesen törli a felhőtárhelyről, és csak az újat menti el. Így egy felhasználóhoz egyszerre mindig legfeljebb 1 darab feltöltött kép tartozik a szerveren.",
      badge: "Képtörlés & Szellem-profil",
    },
  ];

  // --- Category Filter Options ---
  const categories: FaqCategory[] = [
    { id: "all", label: "Összes kérdés" },
    { id: "security", label: "Biztonság" },
    { id: "draw", label: "Sorsolás" },
    { id: "rooms", label: "Szobakezelés" },
    { id: "account", label: "Fiók" },
  ];

  // --- Filtered Dataset Computation ---
  // Filters FAQ entries according to the active category pill and live fuzzy search term.
  const filteredItems = faqItems.filter((item) => {
    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === "" ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-[calc(100vh-140px)] w-full py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex flex-col gap-10">
      {/* Page Header */}
      <div className="text-center flex flex-col items-center gap-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-bold tracking-wider uppercase shadow-2xs">
          <span>Gyakran Ismételt Kérdések</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          <span className="text-emerald-600">Minden, amit</span> a GiftMate{" "}
          <br className="hidden sm:inline" />
          működéséről <span className="text-emerald-600">tudni érdemes</span>
        </h1>
      </div>

      {/* Search Input Bar */}
      <div className="relative w-full max-w-2xl mx-auto">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Keresés a kérdések és válaszok között..."
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-slate-800 text-sm shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all placeholder:text-slate-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-semibold text-slate-400 hover:text-slate-600"
          >
            Törlés
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100/80 border border-slate-200/80"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* FAQ Accordion List */}
      <div className="flex flex-col gap-3.5">
        {filteredItems.length === 0 ? (
          /* Empty Search State */
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center flex flex-col items-center gap-3">
            <FaceSlightlyFrowning className="w-8 h-8 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">
              Nem találtunk a keresésednek megfelelő kérdést.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
            >
              Szűrők visszaállítása
            </button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isOpen = !!openItems[item.id];
            return (
              /* Accordion Item Card */
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Accordion Toggle Header */}
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full p-5 sm:p-6 text-left flex items-start justify-between gap-4 cursor-pointer select-none active:scale-100"
                >
                  <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    {item.badge && (
                      <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                        {item.badge}
                      </span>
                    )}
                    <span className="text-base sm:text-lg font-bold text-slate-800 leading-snug">
                      {item.question}
                    </span>
                  </div>
                  <div
                    className={`p-1.5 rounded-full bg-slate-100 text-slate-500 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 bg-emerald-50 text-emerald-600" : ""
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {/* Collapsible Content Area (CSS Grid Row Animation) */}
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 sm:px-6 pb-6 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100">
                      <p>{item.answer}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Direct Contact Referral Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800">
              Nem találtál választ a kérdésedre?
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              Írj nekem bátran, és készséggel válaszolok minden felmerülő
              kérdésre!
            </p>
          </div>
        </div>

        <Link to="/contact" className="btn-green font-extrabold">
          Kapcsolatfelvétel
        </Link>
      </div>
    </div>
  );
}
