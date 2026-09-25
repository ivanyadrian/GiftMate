import { Link } from "react-router-dom";
import { ShieldCheck, WifiSync, CheckCircle2, ArrowRight } from "lucide-react";

/**
 * Interface representing an individual step in the workflow timeline.
 */
interface WorkflowStep {
  number: string;
  badgeText: string;
  badgeClass: string;
  circleBg: string;
  title: string;
  description: string;
  features: string[];
}

/**
 * Interface representing a platform feature highlight card.
 */
interface PlatformHighlight {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

/**
 * HowItWorks Component
 *
 * Informational walkthrough page illustrating the end-to-end GiftMate workflow:
 * 1. Room Creation (custom parameters, budget limits, generated 6-digit passcodes).
 * 2. Room Joining (instant pass-code access, unique aliases per room).
 * 3. Draw Execution (manual trigger or scheduled countdown, self-draw prevention).
 * 4. Pair Reveal & Tracking (interactive reveal card, live participant status).
 *
 * Key Layout Characteristics:
 * - Dynamic vertical timeline connector rendered with progressive Tailwind gradients.
 * - Feature guarantee cards highlighting encryption, fairness, and live sync.
 * - Bottom CTA bar routing directly to room creation or user dashboard.
 */
export default function HowItWorks() {
  // --- Workflow Steps Configuration ---
  const steps: WorkflowStep[] = [
    {
      number: "1",
      badgeText: "1. Lépés • Előkészítés",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      circleBg: "bg-gradient-to-br from-emerald-300 to-emerald-400 text-white",
      title: "Hozd létre a szobát",
      description:
        "Nevezd el a szobát, add meg a témát és az átadás időpontját. Ha szeretnél, állíts be ajándékkeretet is — a rendszer pedig azonnal generál egy egyedi, 6 jegyű belépőkódot. A szoba létrehozója automatikusan 'szervező' lesz, ez nem átadható!",
      features: ["Opcionális költségkeret", "Utólag is szerkeszthető"],
    },
    {
      number: "2",
      badgeText: "2. Lépés • Csatlakozás",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      circleBg: "bg-gradient-to-br from-emerald-400 to-emerald-500 text-white",
      title: "Hívd meg a társaságot",
      description:
        "Küldd el a kódot a barátaidnak vagy kollégáidnak. Egy gyors regisztráció, majd a kód megadása után máris ott vannak a szobában, készen a sorsolásra.",
      features: ["Egyszerű, gyors belépés", "Szobánkénti egyedi név szükséges"],
    },
    {
      number: "3",
      badgeText: "3. Lépés • Sorsolás",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      circleBg: "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white",
      title: "Indítsd el a húzást",
      description:
        "Kezdődhet azonnal, vagy a szervező időzíthet visszaszámlálót is. Az algoritmus mindenkinek úgy oszt párt, hogy senki sem kaphatja saját magát. Nem szükséges páros létszám hozzá, páratlan esetén is mindenki kap és ad is ajándékot.",
      features: ["Önhúzás kizárva", "Indítható azonnal vagy időzítve"],
    },
    {
      number: "4",
      badgeText: "4. Lépés • Eredmény",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      circleBg: "bg-gradient-to-br from-emerald-600 to-emerald-700 text-white",
      title: "Fedezzétek fel a párokat",
      description:
        "Minden résztvevő saját tempójában, egy látványos animációval fedheti fel a számára sorsolt személyt. A résztvevők listáján mindenki láthatja, hogy kik azok, akik már tudják, hogy kit sorsolt számukra a rendszer.",
      features: [
        "Látványos felfedési animáció",
        "Élő állapotkövetés mindenkinél",
      ],
    },
  ];

  // --- Platform Guarantee & Feature Highlights ---
  const highlights: PlatformHighlight[] = [
    {
      icon: ShieldCheck,
      title: "Garantált titoktartás",
      description:
        "A párosítási algoritmus gondoskodik a teljes objektivitásról, az eredményeket pedig szigorúan rejtve tartja: még a szoba létrehozója sem lesheti meg, hogy kinek kit sorsolt a rendszer.",
    },
    {
      icon: WifiSync,
      title: "Valós idejű szinkronizáció",
      description:
        "Nincs szükség az oldal folyamatos frissítésére. Az új résztvevők belépése, a visszaszámláló percei, a profilmódosítások mind élőben jelennek meg a szobában tartózkodó összes felhasználó képernyőjén.",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-140px)] w-full py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col gap-14">
      {/* Hero Header Section */}
      <div className="text-center flex flex-col items-center gap-4 max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          Hogyan működik a GiftMate? <br className="hidden sm:inline" />
          <span className="text-emerald-600">
            {" "}
            Mindössze 4 egyszerű lépésben
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed">
          Felejtsd el a kézzel írt papírcetliket, a véletlen önmagunk húzását és
          a bonyolult találkozók egyeztetést. A GiftMate egyszerűvé és
          megbízhatóvá teszi a teljes ajándéksorsolást.
        </p>
      </div>

      {/* Connected Process Flow (Timeline) */}
      <div className="relative flex flex-col gap-8 sm:gap-10">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const lineGradients = [
            "from-emerald-400 to-emerald-500",
            "from-emerald-500 to-emerald-600",
            "from-emerald-600 to-emerald-700",
          ];
          const lineGradient =
            lineGradients[index] || "from-emerald-500 to-emerald-600";

          return (
            <div
              key={step.number}
              className="relative flex flex-col sm:flex-row items-start gap-5 sm:gap-8 group"
            >
              {/* Left Column: Number Circle + Dynamic Connector */}
              <div className="relative hidden sm:flex flex-col items-center shrink-0 self-stretch">
                {/* Number Circle / Step Indicator */}
                <div
                  className={`w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl flex items-center justify-center font-black text-lg sm:text-xl shadow-md z-10 ${step.circleBg}`}
                >
                  <span className="leading-none">{step.number}</span>
                </div>

                {/* Connector Line to the next step (omitted on the last step to terminate neatly) */}
                {!isLast && (
                  <div
                    className={`absolute top-16 -bottom-8 sm:-bottom-10 w-0.5 bg-linear-to-b ${lineGradient}`}
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Right Column: Step Content Card */}
              <div className="flex-1 w-full bg-white rounded-3xl border border-slate-200/80 shadow-xs transition-all p-6 sm:p-8 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border tracking-wider uppercase w-fit ${step.badgeClass}`}
                  >
                    <span>{step.badgeText}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {step.title}
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Key Points (Feature Pills) */}
                <div className="border-t border-slate-100 pt-4 flex flex-wrap gap-2.5">
                  {step.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs font-semibold text-slate-700"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Highlights & Guarantees Section */}
      <div className="bg-slate-50 rounded-3xl xs:p-10 flex flex-col gap-8">
        <div className="text-center max-w-2xl mx-auto flex flex-col gap-2">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Megbízható működés és garantált diszkréció
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            A rendszer minden funkciója a gördülékeny és biztonságos szervezést
            támogatja.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {highlights.map((h, i) => {
            const Icon = h.icon;
            return (
              <div
                key={i}
                className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/70 shadow-2xs flex items-start gap-4 transition-colors"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    {h.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {h.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Call-To-Action Card */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-6 sm:p-8 lg:p-12 shadow-md flex flex-col lg:flex-row items-center justify-between gap-6 text-center lg:text-left">
        {/* Call to Action Message */}
        <div className="flex flex-col gap-2 max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
            Hozz létre egy új szobát, vagy csatlakozz egy meglévőhöz kódoddal!
          </h2>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center lg:items-stretch xl:items-center justify-center gap-3 w-full sm:w-auto shrink-0">
          <Link
            to="/create-room"
            className="w-full sm:w-auto lg:w-full xl:w-auto px-6 py-3.5 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer whitespace-nowrap"
          >
            <span>Szoba létrehozása</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>
          <Link
            to="/dashboard"
            className="w-full sm:w-auto lg:w-full xl:w-auto px-6 py-3.5 rounded-xl bg-emerald-800/60 hover:bg-emerald-800 text-white font-semibold text-sm border border-emerald-400/30 transition-all flex items-center justify-center cursor-pointer whitespace-nowrap"
          >
            Vezérlőpult
          </Link>
        </div>
      </div>
    </div>
  );
}
