interface LanguageSelectorProps {
  selectedCountry: string;
  onCountryChange: (countryCode: string) => void;
}

const LanguageSelector = ({ selectedCountry, onCountryChange }: LanguageSelectorProps) => {
  const languages = [
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "ke", name: "Kenya", flag: "🇰🇪" },
    { code: "de", name: "Germany", flag: "🇩🇪" },
    { code: "es", name: "Spain", flag: "🇪🇸" },
    { code: "it", name: "Italy", flag: "🇮🇹" },
  ];

  return (
    <div className="flex items-center gap-4 px-4 py-3 overflow-x-auto">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => onCountryChange(lang.code)}
          className={`flex flex-col items-center gap-1 min-w-[60px] transition-opacity ${
            lang.code === selectedCountry ? "opacity-100" : "opacity-50"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-2xl hover:scale-110 transition-transform">
            {lang.flag}
          </div>
          <span className="text-xs text-foreground">{lang.name}</span>
        </button>
      ))}
    </div>
  );
};

export default LanguageSelector;
