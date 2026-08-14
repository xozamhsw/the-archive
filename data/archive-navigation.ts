import type { ArchiveJourneyItem } from "@/types/navigation";

export const archiveJourney: ArchiveJourneyItem[] = [
  {
    number: "00",
    label: "Beranda",
    title: "Opening",
    href: "/",
    description: "Pintu pertama menuju The Archive.",
    navVisible: true,
  },
  {
    number: "01",
    label: "Gallery",
    title: "Memory Gallery",
    href: "/gallery",
    description: "Potongan kenangan yang pernah kita simpan bersama.",
    navVisible: true,
  },
  {
    number: "02",
    label: "Photobooth",
    title: "Photobooth",
    href: "/photobooth",
    description: "Tempat membuat satu kenangan baru hari ini.",
    navVisible: true,
  },
  {
    number: "03",
    label: "Wall",
    title: "Friendship Wall",
    href: "/wall",
    description: "Pesan kecil yang datang dari orang-orang baik.",
    navVisible: true,
  },
  {
    number: "04",
    label: "Capsule",
    title: "Time Capsule",
    href: "/capsule",
    description: "Sesuatu untuk dibaca kembali ketika waktunya tiba.",
    navVisible: true,
  },
  {
    number: "05",
    label: "Ending",
    title: "Ending",
    href: "/ending",
    description: "Sampai jumpa di kenangan berikutnya.",
    navVisible: false,
  },
];

export const publicNavigation = archiveJourney.filter(
  (item) => item.navVisible,
);
