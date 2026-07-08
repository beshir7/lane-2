import "server-only";

// =========================================================================
// Seed dataset — the initial contents of the datastore.
// Server-only: importing this from a Client Component is a build error, which
// guarantees no sample data can leak into a page bundle. Swap this file (or the
// repository below) for a real database in production.
// =========================================================================

import type {
  Athlete,
  Competition,
  ResultsMap,
  CalendarEvent,
  LaneDocument,
  AppNotification,
  ActivityItem,
  TeamUser,
  Post,
  AuditEntry,
  DeviceSession,
  Passport,
  Visa,
  Organizer,
  RaceEntry,
} from "@/lib/types";

export const ATHLETES: Athlete[] = [
  { id: "a01", first: "Amara", last: "Okonkwo", initials: "AO", color: "#f55b6e", nationality: "🇳🇬 NGA", dob: "2001-03-14", age: 25, gender: "F", specialty: "100m / 200m", category: "sprints", squad: "Senior A", status: "active", joined: "2023-01-15", pb: { "100m": "10.92", "200m": "22.18" }, medals: { gold: 4, silver: 2, bronze: 1 }, nextEvent: "Diamond League — Oslo", coach: "M. Bekele", progress: 78, bio: "World U-20 medalist. Joined Lane Athletics in 2023 after collegiate career. Strong start phase, working on top-end speed maintenance through 80m.", contact: { email: "a.okonkwo@lane-team.io", phone: "+234 803 555 0142" }, email: "amara@lane.io", contract: "E", placeOfBirth: "Lagos, Nigeria", residence: "Lagos, Nigeria", maritalStatus: "Single", taxCode: "", fidalNumber: "", club: "Lane Athletics", height: 170, weight: 57, sponsor: "Nike", shoeSize: "8 uk (Nike)", clothingSize: "Small (Nike)" },
  { id: "a02", first: "Kenji", last: "Tanaka", initials: "KT", color: "#5b6ef5", nationality: "🇯🇵 JPN", dob: "1998-07-22", age: 27, gender: "M", specialty: "400m / 4x400m", category: "sprints", squad: "Senior A", status: "active", joined: "2022-08-30", pb: { "400m": "44.31", "200m": "20.84" }, medals: { gold: 6, silver: 3, bronze: 2 }, nextEvent: "World Championships — Tokyo", coach: "L. Andersen", progress: 86, bio: "Olympic finalist 2024. National 400m record holder. Splits ten-second-flat 100m off the blocks.", contact: { email: "k.tanaka@lane-team.io", phone: "+81 90 5555 0142" }, email: "kenji@lane.io", contract: "M", placeOfBirth: "Osaka, Japan", residence: "Tokyo, Japan", maritalStatus: "Single", club: "Lane Athletics", height: 182, weight: 74, sponsor: "Asics", shoeSize: "10 uk (Asics)", clothingSize: "Medium (Asics)" },
  { id: "a03", first: "Sofia", last: "Reyes", initials: "SR", color: "#22d3a0", nationality: "🇪🇸 ESP", dob: "2003-11-02", age: 22, gender: "F", specialty: "1500m / Mile", category: "middle", squad: "Senior B", status: "active", joined: "2024-02-10", pb: { "1500m": "4:02.55", "Mile": "4:23.10", "800m": "1:59.22" }, medals: { gold: 2, silver: 4, bronze: 1 }, nextEvent: "European Champs Trials", coach: "M. Bekele", progress: 64, bio: "Strong kick, transitioning from junior ranks. Targeting sub-4 minute 1500m in 2026 season.", contact: { email: "s.reyes@lane-team.io", phone: "+34 612 555 0142" }, email: "sofia@lane.io", contract: "E", placeOfBirth: "Madrid, Spain", residence: "Madrid, Spain", maritalStatus: "Single", club: "Lane Athletics", height: 168, weight: 52, sponsor: "Adidas", shoeSize: "7 uk (Adidas)", clothingSize: "Small (Adidas)" },
  { id: "a04", first: "Marcus", last: "Bekele", initials: "MB", color: "#f5b14c", nationality: "🇪🇹 ETH", dob: "1996-05-08", age: 30, gender: "M", specialty: "5000m / 10000m", category: "long", squad: "Senior A", status: "active", joined: "2021-04-12", pb: { "5000m": "12:51.18", "10000m": "26:48.30", "3000m": "7:24.55" }, medals: { gold: 9, silver: 4, bronze: 2 }, nextEvent: "Prefontaine Classic", coach: "T. Haile", progress: 92, bio: "Two-time World Championship medalist. Course record holder at Boston 10K. Captain of Lane Long Distance Squad.", contact: { email: "m.bekele@lane-team.io", phone: "+251 91 555 0142" }, email: "marcus@lane.io", contract: "M", placeOfBirth: "Addis Ababa, Ethiopia", residence: "Addis Ababa, Ethiopia", maritalStatus: "Married", club: "Lane Athletics", height: 175, weight: 58, sponsor: "Adidas", shoeSize: "9 uk (Adidas)", clothingSize: "Medium (Adidas)" },
  { id: "a05", first: "Elena", last: "Volkov", initials: "EV", color: "#b96eff", nationality: "🇧🇬 BUL", dob: "2000-09-19", age: 25, gender: "F", specialty: "High Jump", category: "jumps", squad: "Senior A", status: "injury", joined: "2023-06-05", pb: { "High Jump": "2.04m", "Long Jump": "6.42m" }, medals: { gold: 3, silver: 1, bronze: 3 }, nextEvent: "—", coach: "L. Andersen", progress: 32, bio: "Cleared 2.00m at four meets last season. Currently rehabilitating ankle injury — return projected June 2026.", contact: { email: "e.volkov@lane-team.io", phone: "+359 88 555 0142" }, email: "elena@lane.io", contract: "E", placeOfBirth: "Sofia, Bulgaria", residence: "Sofia, Bulgaria", maritalStatus: "Single", club: "Lane Athletics", height: 180, weight: 63, sponsor: "Puma", shoeSize: "9 uk (Puma)", clothingSize: "Medium (Puma)" },
  { id: "a06", first: "David", last: "Mensah", initials: "DM", color: "#4cc9f5", nationality: "🇬🇭 GHA", dob: "1999-12-30", age: 26, gender: "M", specialty: "110mH", category: "hurdles", squad: "Senior A", status: "active", joined: "2022-11-22", pb: { "110mH": "13.12", "60mH": "7.48" }, medals: { gold: 2, silver: 5, bronze: 2 }, nextEvent: "Diamond League — Doha", coach: "L. Andersen", progress: 71, bio: "African Championships gold 2025. Working on touch-down times between hurdles 4-7.", contact: { email: "d.mensah@lane-team.io", phone: "+233 24 555 0142" }, email: "david@lane.io", contract: "M", placeOfBirth: "Accra, Ghana", residence: "Accra, Ghana", maritalStatus: "Single", club: "Lane Athletics", height: 186, weight: 78, sponsor: "Nike", shoeSize: "11 uk (Nike)", clothingSize: "Large (Nike)" },
  { id: "a07", first: "Priya", last: "Sharma", initials: "PS", color: "#f55b6e", nationality: "🇮🇳 IND", dob: "2002-02-04", age: 24, gender: "F", specialty: "Javelin", category: "throws", squad: "Senior B", status: "active", joined: "2023-09-18", pb: { "Javelin": "64.28m" }, medals: { gold: 1, silver: 2, bronze: 4 }, nextEvent: "Asian Championships", coach: "T. Haile", progress: 58, bio: "Asian junior record holder. Improved 4 meters over last 18 months under Coach Haile's program.", contact: { email: "p.sharma@lane-team.io", phone: "+91 98 555 0142" }, email: "priya@lane.io", contract: "E", placeOfBirth: "Delhi, India", residence: "Delhi, India", maritalStatus: "Single", club: "Lane Athletics", height: 172, weight: 66, sponsor: "Adidas", shoeSize: "8 uk (Adidas)", clothingSize: "Medium (Adidas)" },
  { id: "a08", first: "Luca", last: "Romano", initials: "LR", color: "#5b6ef5", nationality: "🇮🇹 ITA", dob: "2004-08-11", age: 21, gender: "M", specialty: "Long Jump / Triple Jump", category: "jumps", squad: "U23", status: "active", joined: "2024-09-01", pb: { "Long Jump": "8.21m", "Triple Jump": "17.04m" }, medals: { gold: 1, silver: 0, bronze: 1 }, nextEvent: "European U23 Champs", coach: "M. Bekele", progress: 49, bio: "Rising prospect. National U23 long jump record holder. Targeting Olympic qualifying standard for 2028.", contact: { email: "l.romano@lane-team.io", phone: "+39 333 555 0142" }, email: "luca@lane.io", contract: null, placeOfBirth: "Rome, Italy", residence: "Rome, Italy", maritalStatus: "Single", club: "Fiamme Gialle", fidalNumber: "IT123456", height: 184, weight: 75, sponsor: "Fila", shoeSize: "10 uk (Fila)", clothingSize: "Medium (Fila)" },
  { id: "a09", first: "Zara", last: "Ahmed", initials: "ZA", color: "#22d3a0", nationality: "🇲🇦 MAR", dob: "2001-06-25", age: 24, gender: "F", specialty: "800m", category: "middle", squad: "Senior A", status: "active", joined: "2022-03-14", pb: { "800m": "1:56.84", "400m": "51.22", "1500m": "4:08.99" }, medals: { gold: 5, silver: 2, bronze: 1 }, nextEvent: "Diamond League — Rome", coach: "M. Bekele", progress: 81, bio: "Continental record holder. Tactical racer, devastating final 200m. Doha Diamond League winner.", contact: { email: "z.ahmed@lane-team.io", phone: "+212 661 555 0142" }, email: "zara@lane.io", contract: "M", placeOfBirth: "Rabat, Morocco", residence: "Rabat, Morocco", maritalStatus: "Single", club: "Lane Athletics", height: 169, weight: 53, sponsor: "Nike", shoeSize: "7 uk (Nike)", clothingSize: "Small (Nike)" },
  { id: "a10", first: "Tom", last: "Whitaker", initials: "TW", color: "#f5b14c", nationality: "🇬🇧 GBR", dob: "1997-04-17", age: 28, gender: "M", specialty: "Discus / Shot Put", category: "throws", squad: "Senior A", status: "active", joined: "2021-10-05", pb: { "Discus": "68.92m", "Shot Put": "21.45m" }, medals: { gold: 4, silver: 3, bronze: 0 }, nextEvent: "British Championships", coach: "T. Haile", progress: 74, bio: "Commonwealth gold medalist. Threw a season-best 68.92m at Stockholm Diamond League last summer.", contact: { email: "t.whitaker@lane-team.io", phone: "+44 7700 555 0142" }, email: "tom@lane.io", contract: "E", placeOfBirth: "Manchester, UK", residence: "Manchester, UK", maritalStatus: "Married", club: "Lane Athletics", height: 196, weight: 118, sponsor: "Adidas", shoeSize: "13 uk (Adidas)", clothingSize: "XL (Adidas)" },
  { id: "a11", first: "Yuki", last: "Sato", initials: "YS", color: "#b96eff", nationality: "🇯🇵 JPN", dob: "2003-01-09", age: 23, gender: "M", specialty: "400mH", category: "hurdles", squad: "Senior B", status: "active", joined: "2024-01-20", pb: { "400mH": "48.66", "400m": "45.92" }, medals: { gold: 0, silver: 2, bronze: 1 }, nextEvent: "Asian Championships", coach: "L. Andersen", progress: 55, bio: "Recent transition from flat 400m. Currently fine-tuning 13/14-step approach pattern.", contact: { email: "y.sato@lane-team.io", phone: "+81 90 5555 0871" }, email: "yuki@lane.io", contract: "M", placeOfBirth: "Nagoya, Japan", residence: "Tokyo, Japan", maritalStatus: "Single", club: "Lane Athletics", height: 180, weight: 70, sponsor: "Asics", shoeSize: "10 uk (Asics)", clothingSize: "Medium (Asics)" },
  { id: "a12", first: "Camille", last: "Dubois", initials: "CD", color: "#4cc9f5", nationality: "🇫🇷 FRA", dob: "1999-10-12", age: 26, gender: "F", specialty: "Pole Vault", category: "jumps", squad: "Senior A", status: "active", joined: "2022-07-08", pb: { "Pole Vault": "4.78m" }, medals: { gold: 3, silver: 2, bronze: 2 }, nextEvent: "Stockholm Diamond League", coach: "L. Andersen", progress: 69, bio: "European indoor silver medalist 2025. Consistent 4.70m+ performer all season.", contact: { email: "c.dubois@lane-team.io", phone: "+33 6 12 555 0142" }, email: "camille@lane.io", contract: "E", placeOfBirth: "Lyon, France", residence: "Paris, France", maritalStatus: "Single", club: "Lane Athletics", height: 174, weight: 62, sponsor: "Nike", shoeSize: "8 uk (Nike)", clothingSize: "Small (Nike)" },
];

export const COMPETITIONS: Competition[] = [
  { id: "c01", name: "Diamond League — Oslo", short: "Oslo DL", location: "Bislett Stadium, Oslo 🇳🇴", country: "Norway", date: "2026-06-04", endDate: "2026-06-04", type: "Diamond League", tier: "tier-1", status: "upcoming", entries: 4, results: 0, events: ["100m", "200m", "1500m", "High Jump"], category: "meeting", level: "DL", organizerId: "o3", disciplines: [{ discipline: "100m", gender: "W", date: "2026-06-04" }, { discipline: "200m", gender: "M", date: "2026-06-04" }, { discipline: "1500m", gender: "W", date: "2026-06-04" }, { discipline: "High Jump", gender: "W", date: "2026-06-04" }] },
  { id: "c02", name: "World Championships — Tokyo 2026", short: "Tokyo WC", location: "Japan National Stadium, Tokyo 🇯🇵", country: "Japan", date: "2026-08-13", endDate: "2026-08-21", type: "World Championships", tier: "tier-1", status: "upcoming", entries: 9, results: 0, events: ["100m", "200m", "400m", "800m", "5000m", "10000m", "Discus", "Long Jump"], category: "meeting", level: "int'l", disciplines: [{ discipline: "400m", gender: "M", date: "2026-08-14" }, { discipline: "5000m", gender: "M", date: "2026-08-16" }, { discipline: "10000m", gender: "M", date: "2026-08-18" }] },
  { id: "c03", name: "Diamond League — Doha", short: "Doha DL", location: "Suheim Bin Hamad Stadium 🇶🇦", country: "Qatar", date: "2026-05-10", endDate: "2026-05-10", type: "Diamond League", tier: "tier-1", status: "completed", entries: 3, results: 3, events: ["110mH", "400m", "Discus"], summary: { gold: 1, silver: 1, bronze: 0, points: 28 } },
  { id: "c04", name: "Prefontaine Classic — Eugene", short: "Prefontaine", location: "Hayward Field, Eugene 🇺🇸", country: "USA", date: "2026-05-30", endDate: "2026-05-30", type: "Diamond League", tier: "tier-1", status: "upcoming", entries: 5, results: 0, events: ["5000m", "10000m", "Mile", "Discus"] },
  { id: "c05", name: "European Championships — Madrid", short: "Madrid Euros", location: "Estadio Vallehermoso 🇪🇸", country: "Spain", date: "2026-07-08", endDate: "2026-07-14", type: "Continental", tier: "tier-1", status: "upcoming", entries: 6, results: 0, events: ["100m", "1500m", "High Jump", "Pole Vault", "Long Jump", "Discus"] },
  { id: "c06", name: "Asian Championships — Bangkok", short: "Asian Champs", location: "Suphachalasai Stadium 🇹🇭", country: "Thailand", date: "2026-06-20", endDate: "2026-06-24", type: "Continental", tier: "tier-2", status: "upcoming", entries: 4, results: 0, events: ["200m", "400mH", "Javelin"] },
  { id: "c07", name: "Stockholm Bauhaus-Galan", short: "Stockholm DL", location: "Stockholm Olympic Stadium 🇸🇪", country: "Sweden", date: "2026-06-15", endDate: "2026-06-15", type: "Diamond League", tier: "tier-1", status: "upcoming", entries: 4, results: 0, events: ["800m", "Pole Vault", "Discus"] },
  { id: "c08", name: "British Athletics Championships", short: "British Champs", location: "Manchester Regional Arena 🇬🇧", country: "UK", date: "2026-06-26", endDate: "2026-06-28", type: "National", tier: "tier-2", status: "upcoming", entries: 2, results: 0, events: ["Discus", "Shot Put"] },
  { id: "c09", name: "Diamond League — Rome Golden Gala", short: "Rome DL", location: "Stadio Olimpico, Rome 🇮🇹", country: "Italy", date: "2026-06-12", endDate: "2026-06-12", type: "Diamond League", tier: "tier-1", status: "live", entries: 3, results: 1, events: ["800m", "Long Jump", "200m"], category: "meeting", level: "DL", organizerId: "o1", disciplines: [{ discipline: "800m", gender: "W", date: "2026-06-12" }, { discipline: "Long Jump", gender: "M", date: "2026-06-12" }] },
  { id: "c10", name: "African Championships — Nairobi", short: "African Champs", location: "Moi International Sports Centre 🇰🇪", country: "Kenya", date: "2026-04-22", endDate: "2026-04-26", type: "Continental", tier: "tier-2", status: "completed", entries: 4, results: 4, events: ["100m", "5000m", "110mH"], summary: { gold: 2, silver: 1, bronze: 1, points: 32 }, category: "meeting", level: "int'l" },
  { id: "c11", name: "TCS London Marathon", short: "London Marathon", location: "London 🇬🇧", country: "UK", date: "2026-04-26", endDate: "2026-04-26", type: "Marathon", tier: "tier-1", status: "upcoming", entries: 3, results: 0, events: ["Marathon"], category: "marathon", level: "Platinum", organizerId: "o2", disciplines: [{ discipline: "Marathon", gender: "M", date: "2026-04-26" }, { discipline: "Marathon", gender: "W", date: "2026-04-26" }] },
  { id: "c12", name: "EDP Lisbon Half Marathon", short: "Lisbon HM", location: "Lisbon 🇵🇹", country: "Portugal", date: "2026-03-17", endDate: "2026-03-17", type: "Half Marathon", tier: "tier-2", status: "completed", entries: 2, results: 0, events: ["Half Marathon"], category: "half-marathon", level: "Label", disciplines: [{ discipline: "Half Marathon", gender: "W", date: "2026-03-17" }] },
  { id: "c13", name: "Cross Internacional de Itálica", short: "Itálica Cross", location: "Seville 🇪🇸", country: "Spain", date: "2026-01-18", endDate: "2026-01-18", type: "Cross Country", tier: "tier-2", status: "completed", entries: 2, results: 0, events: ["Cross 10km"], category: "cross", level: "Gold", disciplines: [{ discipline: "Cross 10km", gender: "M", date: "2026-01-18" }] },
  { id: "c14", name: "Paris DL Meeting", short: "Paris DL", location: "Paris-St.Denis 🇫🇷", country: "France", date: "2026-07-07", endDate: "2026-07-07", type: "Diamond League", tier: "tier-1", status: "upcoming", entries: 4, results: 0, events: ["800m", "1500m", "3000m", "5000m"], category: "meeting", level: "DL", organizerId: "o1", disciplines: [{ discipline: "800m", gender: "M", date: "2026-07-07" }, { discipline: "1500m", gender: "W", date: "2026-07-07" }, { discipline: "3000m", gender: "M", date: "2026-07-07" }, { discipline: "5000m", gender: "W", date: "2026-07-07" }] },
];

export const SAMPLE_RESULTS: ResultsMap = {
  c03: [
    { athleteId: "a06", event: "110mH", mark: "13.12", place: 1, points: 8, wind: "+0.4", note: "Season Best" },
    { athleteId: "a02", event: "400m", mark: "44.61", place: 2, points: 7, wind: "—", note: "" },
    { athleteId: "a10", event: "Discus", mark: "67.18m", place: 4, points: 4, wind: "—", note: "" },
  ],
};

export const CALENDAR_EVENTS: CalendarEvent[] = [
  { id: "e1", title: "Track Session — Speed", category: "training", date: "2026-05-21", startHour: 7, duration: 2, athletes: ["a01", "a02"], location: "Track 1" },
  { id: "e2", title: "Strength & Conditioning", category: "training", date: "2026-05-21", startHour: 10, duration: 1.5, athletes: ["a01", "a02", "a06"], location: "Lane Gym" },
  { id: "e3", title: "Coach 1:1 — Amara", category: "meeting", date: "2026-05-21", startHour: 14, duration: 1, athletes: ["a01"], location: "Office B" },
  { id: "e4", title: "Endurance Run 16km", category: "training", date: "2026-05-22", startHour: 6.5, duration: 2, athletes: ["a04", "a09"], location: "River Trail" },
  { id: "e5", title: "Travel: Madrid → Oslo", category: "travel", date: "2026-05-25", startHour: 9, duration: 5, athletes: ["a01", "a02", "a03"], location: "MAD → OSL" },
  { id: "e6", title: "Diamond League — Oslo", category: "competition", date: "2026-06-04", startHour: 18, duration: 4, athletes: ["a01", "a02", "a05", "a09"], location: "Bislett Stadium", competitionId: "c01" },
  { id: "e7", title: "Throws Technical", category: "training", date: "2026-05-22", startHour: 14, duration: 2, athletes: ["a07", "a10"], location: "Throws Cage" },
  { id: "e8", title: "Team Meeting — May Review", category: "meeting", date: "2026-05-23", startHour: 10, duration: 1, athletes: [], location: "All-hands Room" },
  { id: "e9", title: "Travel: Oslo → Stockholm", category: "travel", date: "2026-06-05", startHour: 8, duration: 4, athletes: ["a09", "a12"], location: "OSL → ARN" },
  { id: "e10", title: "Recovery Session", category: "training", date: "2026-05-24", startHour: 11, duration: 1.5, athletes: ["a01", "a06"], location: "Pool" },
  { id: "e11", title: "Diamond League — Rome", category: "competition", date: "2026-06-12", startHour: 19, duration: 4, athletes: ["a08", "a09"], location: "Stadio Olimpico", competitionId: "c09" },
  { id: "e12", title: "Speed Endurance", category: "training", date: "2026-05-26", startHour: 8, duration: 2, athletes: ["a02", "a06"], location: "Track 1" },
  { id: "e13", title: "Hurdle Drills", category: "training", date: "2026-05-27", startHour: 9, duration: 1.5, athletes: ["a06", "a11"], location: "Track 2" },
  { id: "e14", title: "PT — Elena", category: "meeting", date: "2026-05-19", startHour: 11, duration: 1, athletes: ["a05"], location: "Medical Suite" },
  { id: "e15", title: "Long Jump Approach", category: "training", date: "2026-05-21", startHour: 16, duration: 1.5, athletes: ["a08"], location: "Track 1" },
  { id: "e16", title: "Pole Vault Practice", category: "training", date: "2026-05-20", startHour: 15, duration: 2, athletes: ["a12"], location: "Track 2" },
  { id: "e17", title: "Press Briefing — Tokyo", category: "meeting", date: "2026-05-28", startHour: 13, duration: 1, athletes: ["a02"], location: "Media Room" },
  { id: "e18", title: "Travel: Eugene → Home", category: "travel", date: "2026-06-01", startHour: 12, duration: 6, athletes: ["a04"], location: "EUG → HOME" },
];

export const DOCUMENTS: LaneDocument[] = [
  { id: "d01", name: "Passport — Okonkwo.pdf", type: "pdf", category: "passport", size: "2.1 MB", athleteId: "a01", uploaded: "2025-11-12", expires: "2030-03-14", icon: "filePdf" },
  { id: "d02", name: "Visa USA — Okonkwo.pdf", type: "pdf", category: "visa", size: "1.4 MB", athleteId: "a01", uploaded: "2026-02-04", expires: "2026-06-30", icon: "filePdf" },
  { id: "d03", name: "Medical Cert — Tanaka 2026.pdf", type: "pdf", category: "medical", size: "3.8 MB", athleteId: "a02", uploaded: "2026-01-10", expires: "2027-01-10", icon: "filePdf" },
  { id: "d04", name: "Insurance — Lane Team 2026.pdf", type: "pdf", category: "insurance", size: "4.2 MB", athleteId: null, uploaded: "2026-01-01", expires: "2026-12-31", icon: "filePdf" },
  { id: "d05", name: "Passport — Bekele.pdf", type: "pdf", category: "passport", size: "2.3 MB", athleteId: "a04", uploaded: "2024-09-22", expires: "2029-05-08", icon: "filePdf" },
  { id: "d06", name: "Headshot — Reyes.jpg", type: "image", category: "media", size: "1.8 MB", athleteId: "a03", uploaded: "2026-03-19", expires: null, icon: "fileImage" },
  { id: "d07", name: "Contract — Volkov.pdf", type: "pdf", category: "contract", size: "892 KB", athleteId: "a05", uploaded: "2023-06-05", expires: "2026-06-05", icon: "filePdf" },
  { id: "d08", name: "Visa Japan — Mensah.pdf", type: "pdf", category: "visa", size: "1.6 MB", athleteId: "a06", uploaded: "2026-04-02", expires: "2026-09-13", icon: "filePdf" },
  { id: "d09", name: "Medical Cert — Reyes 2026.pdf", type: "pdf", category: "medical", size: "2.9 MB", athleteId: "a03", uploaded: "2026-02-22", expires: "2027-02-22", icon: "filePdf" },
  { id: "d10", name: "Training Plan Q2 2026.pdf", type: "pdf", category: "plan", size: "5.3 MB", athleteId: null, uploaded: "2026-03-31", expires: null, icon: "filePdf" },
  { id: "d11", name: "Race Bib Confirmation — Oslo.pdf", type: "pdf", category: "competition", size: "412 KB", athleteId: null, uploaded: "2026-05-10", expires: null, icon: "filePdf" },
  { id: "d12", name: "Press Kit — Lane 2026.pdf", type: "pdf", category: "media", size: "12.1 MB", athleteId: null, uploaded: "2026-04-04", expires: null, icon: "filePdf" },
  { id: "d13", name: "Team Photo — Spring '26.jpg", type: "image", category: "media", size: "4.6 MB", athleteId: null, uploaded: "2026-04-18", expires: null, icon: "fileImage" },
  { id: "d14", name: "Doping Form — Whitaker.pdf", type: "pdf", category: "medical", size: "734 KB", athleteId: "a10", uploaded: "2026-05-01", expires: "2026-08-01", icon: "filePdf" },
];

export const NOTIFICATIONS: AppNotification[] = [
  { id: "n1", type: "alert", icon: "warningTri", title: "Visa expires in 39 days", body: "Amara Okonkwo · USA visa", time: "2 min ago", unread: true, category: "doc" },
  { id: "n2", type: "info", icon: "trophy", title: "Result entered: Doha 400m", body: "Kenji Tanaka · 2nd · 44.61s · +0.4", time: "1h ago", unread: true, category: "result" },
  { id: "n3", type: "info", icon: "calendar", title: "Event tomorrow: Diamond League — Oslo", body: "4 athletes entered", time: "3h ago", unread: true, category: "event" },
  { id: "n4", type: "info", icon: "users", title: "Sara Petersen invited Aoife M.", body: "as Coach to Lane Athletics", time: "yesterday", unread: false, category: "team" },
  { id: "n5", type: "info", icon: "medal", title: "Personal best!", body: "Marcus Bekele · 5000m · 12:51.18", time: "2 days ago", unread: false, category: "result" },
  { id: "n6", type: "warn", icon: "alert", title: "Calendar conflict resolved", body: "Sofia Reyes — Strength session moved", time: "3 days ago", unread: false, category: "event" },
];

export const ACTIVITY: ActivityItem[] = [
  { id: "ac1", user: "Marcus Bekele", initials: "MB", color: "#f5b14c", action: "logged a personal best", target: "12:51.18 · 5000m", time: "2 min ago", icon: "medal" },
  { id: "ac2", user: "Sara Petersen", initials: "SP", color: "#f55b6e", action: "uploaded", target: "Visa Japan — Mensah.pdf", time: "12 min ago", icon: "upload" },
  { id: "ac3", user: "Lena Andersen", initials: "LA", color: "#5b6ef5", action: "scheduled", target: "Hurdle Drills · May 27 · 9:00", time: "1h ago", icon: "calendar" },
  { id: "ac4", user: "Tewodros Haile", initials: "TH", color: "#22d3a0", action: "added athlete", target: "Priya Sharma", time: "yesterday", icon: "user" },
  { id: "ac5", user: "Lane System", initials: "L²", color: "#0a0b0d", action: "synced 14 calendar events to", target: "Google Calendar", time: "2h ago", icon: "cloud" },
  { id: "ac6", user: "Daniel Kim", initials: "DK", color: "#b96eff", action: "updated permissions for", target: "Coach role", time: "3 days ago", icon: "shield" },
];

export const TEAM_USERS: TeamUser[] = [
  { id: "u1", name: "Lena Andersen", role: "r-admin", email: "lena@lane.io", initials: "LA", color: "#5b6ef5", active: true, last: "Online now" },
  { id: "u2", name: "Marcus Bekele", role: "r-coach", email: "marcus.b@lane.io", initials: "MB", color: "#f5b14c", active: true, last: "2 min ago" },
  { id: "u3", name: "Tewodros Haile", role: "r-coach", email: "teddy@lane.io", initials: "TH", color: "#22d3a0", active: true, last: "1h ago" },
  { id: "u4", name: "Sara Petersen", role: "r-manager", email: "sara@lane.io", initials: "SP", color: "#f55b6e", active: true, last: "30 min ago" },
  { id: "u5", name: "Daniel Kim", role: "r-admin", email: "daniel@lane.io", initials: "DK", color: "#b96eff", active: true, last: "Just now" },
  { id: "u6", name: "Aoife Murphy", role: "r-coach", email: "aoife@lane.io", initials: "AM", color: "#4cc9f5", active: false, last: "3 days ago" },
];

export const POSTS: Post[] = [
  { id: "p1", title: "Tanaka qualifies for Tokyo World Champs final", status: "published", author: "Sara Petersen", color: "#f55b6e", date: "2026-05-18", views: 4280, category: "News" },
  { id: "p2", title: "Lane Athletics announces 2026 indoor season preview", status: "published", author: "Lena Andersen", color: "#5b6ef5", date: "2026-04-22", views: 2118, category: "News" },
  { id: "p3", title: "Behind the scenes: Bekele's 5,000m breakthrough", status: "draft", author: "Marcus Bekele", color: "#f5b14c", date: "2026-05-20", views: 0, category: "Feature" },
  { id: "p4", title: "How we plan a Diamond League travel block", status: "scheduled", author: "Sara Petersen", color: "#f55b6e", date: "2026-05-28", views: 0, category: "Inside" },
  { id: "p5", title: "Welcome Priya Sharma to Lane Athletics", status: "published", author: "Tewodros Haile", color: "#22d3a0", date: "2026-03-19", views: 1842, category: "News" },
  { id: "p6", title: "African Champs recap — Nairobi 2026", status: "published", author: "Marcus Bekele", color: "#f5b14c", date: "2026-04-26", views: 3160, category: "Recap" },
];

export const AUDIT_LOG: AuditEntry[] = [
  { id: "au1", ts: "May 21 09:42:11", who: "Lena Andersen", whoColor: "#5b6ef5", action: "update", variant: "danger", target: "permission · admin.users → Coach", ip: "192.168.1.4" },
  { id: "au2", ts: "May 21 09:38:02", who: "Sara Petersen", whoColor: "#f55b6e", action: "create", variant: "success", target: "athlete · Priya Sharma", ip: "10.34.2.18" },
  { id: "au3", ts: "May 21 09:21:55", who: "Marcus Bekele", whoColor: "#f5b14c", action: "update", variant: "info", target: "result · Doha · 400m · Kenji Tanaka", ip: "192.168.1.7" },
  { id: "au4", ts: "May 21 08:55:01", who: "Lane System", whoColor: "#0a0b0d", action: "system", variant: "", target: "backup · daily snapshot completed", ip: "—" },
  { id: "au5", ts: "May 20 22:11:18", who: "Daniel Kim", whoColor: "#b96eff", action: "login", variant: "info", target: "session · 2FA verified", ip: "73.20.x.x" },
  { id: "au6", ts: "May 20 18:43:09", who: "Sara Petersen", whoColor: "#f55b6e", action: "upload", variant: "success", target: "document · Visa Japan — Mensah.pdf", ip: "10.34.2.18" },
  { id: "au7", ts: "May 20 14:02:33", who: "Lena Andersen", whoColor: "#5b6ef5", action: "delete", variant: "danger", target: "athlete · (test) Karol Tomek", ip: "192.168.1.4" },
  { id: "au8", ts: "May 20 12:30:00", who: "Tewodros Haile", whoColor: "#22d3a0", action: "update", variant: "info", target: "calendar · Hurdle Drills · May 27", ip: "41.78.x.x" },
];

export const SESSIONS: DeviceSession[] = [
  { id: "s1", device: "MacBook Pro · Chrome 124", icon: "desktop", loc: "Oslo, NO · 192.168.1.4", current: true, last: "Active now" },
  { id: "s2", device: "iPhone 15 Pro · Lane iOS app", icon: "mobile", loc: "Oslo, NO · 88.247.x.x", current: false, last: "2 hours ago" },
  { id: "s3", device: "Windows · Edge 124", icon: "windows", loc: "Stockholm, SE · 95.18.x.x", current: false, last: "3 days ago" },
];

// =========================================================================
// Agency data — organizers, passports, visas, race entries
// =========================================================================

export const ORGANIZERS: Organizer[] = [
  { id: "o1", name: "Jean Pierre Wattelle", email: "jpwatelle@wanadoo.fr", phone: "+33 661 230 695", nation: "French" },
  { id: "o2", name: "Spencer Barden", email: "spencer@sbarden.co.uk", phone: "+44 121 7138415", nation: "British" },
  { id: "o3", name: "Per Skoog", email: "karlstadgp@perskoog.se", phone: "+46 70 555 0110", nation: "Swedish" },
  { id: "o4", name: "Marius Kranendonk", email: "marius@gscmail.nl", phone: "+31 24 351 5077", nation: "Dutch" },
];

export const PASSPORTS: Passport[] = [
  { id: "pp01", athleteId: "a01", number: "A1234567", nation: "Nigeria", issued: "2021-03-14", expiry: "2031-03-14", note: "" },
  { id: "pp02", athleteId: "a02", number: "TK7554321", nation: "Japan", issued: "2020-01-10", expiry: "2030-01-10", note: "" },
  { id: "pp03", athleteId: "a04", number: "EP7119744", nation: "Ethiopia", issued: "2022-05-25", expiry: "2027-05-24", note: "" },
  { id: "pp04", athleteId: "a09", number: "MA9988776", nation: "Morocco", issued: "2019-06-25", expiry: "2026-08-15", note: "Renewal in progress" },
  { id: "pp05", athleteId: "a06", number: "GH5566778", nation: "Ghana", issued: "2023-02-01", expiry: "2028-02-01", note: "" },
];

export const VISAS: Visa[] = [
  { id: "v01", athleteId: "a01", kind: "US", type: "US B1/B2", event: "Road", validFrom: "2023-09-23", validTo: "2026-07-30", embassy: "Nigeriana", sentToFederation: false, note: "" },
  { id: "v02", athleteId: "a04", kind: "Schengen", type: "Schengen M90", event: "Meeting", validFrom: "2024-04-21", validTo: "2026-10-11", embassy: "Italiana", sentToFederation: true, note: "" },
  { id: "v03", athleteId: "a04", kind: "UK", type: "UK M180", event: "Road", validFrom: "2024-04-08", validTo: "2026-10-08", embassy: "Italiana", sentToFederation: false, note: "" },
  { id: "v04", athleteId: "a09", kind: "US", type: "US P1 VISA", event: "Road / Meeting", validFrom: "2022-09-01", validTo: "2026-12-31", embassy: "Marocchina", sentToFederation: true, note: "" },
  { id: "v05", athleteId: "a06", kind: "Schengen", type: "Schengen M90", event: "Meeting", validFrom: "2023-05-01", validTo: "2025-09-13", embassy: "Ghanese", sentToFederation: false, note: "Expired — renew" },
  { id: "v06", athleteId: "a02", kind: "US", type: "US B1/B2", event: "Meeting", validFrom: "2023-01-01", validTo: "2028-01-01", embassy: "Giapponese", sentToFederation: false, note: "" },
  { id: "v07", athleteId: "a03", kind: "Schengen", type: "Schengen single entry", event: "Meeting", validFrom: "2026-01-01", validTo: "2026-07-24", embassy: "Spagnola", sentToFederation: false, note: "" },
];

export const ENTRIES: RaceEntry[] = [
  // Oslo DL (upcoming) — pipeline in progress
  { id: "en01", competitionId: "c01", athleteId: "a01", discipline: "100m", gender: "W", status: "ok" },
  { id: "en02", competitionId: "c01", athleteId: "a02", discipline: "200m", gender: "M", status: "accepted" },
  { id: "en03", competitionId: "c01", athleteId: "a09", discipline: "1500m", gender: "W", status: "proposed" },
  { id: "en04", competitionId: "c01", athleteId: "a05", discipline: "High Jump", gender: "W", status: "waiting" },
  // Tokyo WC (upcoming)
  { id: "en05", competitionId: "c02", athleteId: "a02", discipline: "400m", gender: "M", status: "proposed" },
  { id: "en06", competitionId: "c02", athleteId: "a04", discipline: "5000m", gender: "M", status: "accepted" },
  { id: "en07", competitionId: "c02", athleteId: "a04", discipline: "10000m", gender: "M", status: "proposed" },
  // Rome DL (live) — has results
  { id: "en08", competitionId: "c09", athleteId: "a09", discipline: "800m", gender: "W", status: "ok", position: 1, time: "1:57.30", wind: "", note: "Meeting record" },
  { id: "en09", competitionId: "c09", athleteId: "a08", discipline: "Long Jump", gender: "M", status: "ok", position: 3, time: "8.05m", wind: "+0.6", note: "" },
  // London Marathon (upcoming)
  { id: "en10", competitionId: "c11", athleteId: "a04", discipline: "Marathon", gender: "M", status: "accepted" },
  { id: "en11", competitionId: "c11", athleteId: "a09", discipline: "Marathon", gender: "W", status: "waiting" },
  // Paris DL (upcoming)
  { id: "en12", competitionId: "c14", athleteId: "a03", discipline: "1500m", gender: "W", status: "proposed" },
  { id: "en13", competitionId: "c14", athleteId: "a04", discipline: "5000m", gender: "M", status: "ok" },
];
