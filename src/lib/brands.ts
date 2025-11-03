// src/lib/brands.ts
// Danh sách hãng xe (đã lọc trùng và sắp xếp)

// Dùng object để Combobox của ShadcnUI dễ xài (value/label)
export const BRAND_OPTIONS = [
  { value: "404 Error", label: "404 Error" },
  { value: "ACME", label: "ACME" },
  { value: "Adriana", label: "Adriana" },
  { value: "Agitator", label: "Agitator" },
  { value: "Almost Real", label: "Almost Real" },
  { value: "American Diorama", label: "American Diorama" },
  { value: "Aurora Model", label: "Aurora Model" },
  { value: "Autoart", label: "Autoart" },
  { value: "BBR", label: "BBR" },
  { value: "Bburago", label: "Bburago" },
  { value: "BriScaleMicro", label: "BriScaleMicro" },
  { value: "Car-Nel", label: "Car-Nel" },
  { value: "CATCH22", label: "CATCH22" },
  { value: "CM Model", label: "CM Model" }, // (Đã gộp CM-Model)
  { value: "Collector's Model", label: "Collector's Model" },
  { value: "DCM", label: "DCM" },
  { value: "Diecast Factory", label: "Diecast Factory" },
  { value: "DMH", label: "DMH" },
  { value: "Dream Models", label: "Dream Models" },
  { value: "ERA CAR", label: "ERA CAR" },
  { value: "Error", label: "Error" },
  { value: "EV64", label: "EV64" },
  { value: "Frontiart", label: "Frontiart" },
  { value: "Fuelme", label: "Fuelme" }, // (Đã gộp Fuelme Model)
  { value: "Furuya", label: "Furuya" },
  { value: "GCD", label: "GCD" },
  { value: "Good Smile", label: "Good Smile" },
  { value: "GreenLight", label: "GreenLight" },
  { value: "HIKASI", label: "HIKASI" },
  { value: "HKM", label: "HKM" },
  { value: "Hobby Japan", label: "Hobby Japan" },
  { value: "HPI64", label: "HPI64" },
  { value: "Ignition Model", label: "Ignition Model" },
  { value: "Initial D Modeler's", label: "Initial D Modeler's" },
  { value: "Inno Model", label: "Inno Model" }, // (Inno64 là 1 dòng của Inno Model?)
  { value: "Inno64", label: "Inno64" },
  { value: "JEC", label: "JEC" },
  { value: "Kaido House / MiniGT", label: "Kaido House / MiniGT" },
  { value: "KengFai", label: "KengFai" },
  { value: "Kyosho", label: "Kyosho" },
  { value: "LBWK", label: "LBWK" },
  { value: "LCD", label: "LCD" },
  { value: "Liberty Walk", label: "Liberty Walk" },
  { value: "Limited", label: "Limited" },
  { value: "Master", label: "Master" },
  { value: "Micro Turbo", label: "Micro Turbo" },
  { value: "Mini GT", label: "Mini GT" }, // (Đã gộp MiniGT)
  { value: "MiniArt", label: "MiniArt" },
  { value: "Minichamps", label: "Minichamps" },
  { value: "Model Collect", label: "Model Collect" },
  { value: "Motor Helix", label: "Motor Helix" }, // (Đã gộp Motorhelix)
  { value: "Motorhelix Hobby", label: "Motorhelix Hobby" },
  { value: "MY64", label: "MY64" },
  { value: "Official Product", label: "Official Product" },
  { value: "ONEMODEL", label: "ONEMODEL" },
  { value: "Original", label: "Original" },
  { value: "Peako64", label: "Peako64" },
  { value: "PGM", label: "PGM" },
  { value: "Pop Race", label: "Pop Race" }, // (Đã gộp poprace)
  { value: "Sailor Moon", label: "Sailor Moon" },
  { value: "SC Models", label: "SC Models" },
  { value: "Scale Mini", label: "Scale Mini" }, // (Đã gộp ScaleMini)
  { value: "SCArt", label: "SCArt" },
  { value: "Schuco", label: "Schuco" },
  { value: "Smallcarart", label: "Smallcarart" },
  { value: "Space Model", label: "Space Model" },
  { value: "Stance Hunters", label: "Stance Hunters" },
  { value: "star", label: "star" },
  { value: "Star Model", label: "Star Model" },
  { value: "Street Weapon", label: "Street Weapon" },
  { value: "Tarmac Works", label: "Tarmac Works" },
  { value: "Time Micro", label: "Time Micro" }, // (Đã gộp Time Model)
  { value: "Timothy & Pierre", label: "Timothy & Pierre" },
  { value: "Tomica", label: "Tomica" },
  { value: "TPC", label: "TPC" },
  { value: "TSM", label: "TSM" },
  { value: "VMB", label: "VMB" },
  { value: "Werk83", label: "Werk83" },
  { value: "YM Model", label: "YM Model" },
  { value: "Yuanli", label: "Yuanli" },
  { value: "Khác", label: "Khác" }, // Cho "Khác" xuống cuối
];

// Tạo một mảng chỉ gồm các giá trị string (dùng cho Zod validation)
export const BRAND_VALUES = BRAND_OPTIONS.map((option) => option.value);
