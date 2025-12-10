const BettingFilters = () => {
  const filters = [
    { id: "1x2", label: "1X2" },
    { id: "btts", label: "BTTS" },
    { id: "ovun15", label: "OV/UN 1.5", active: true },
    { id: "ovun25", label: "OV/UN 2.5" },
    { id: "1x2btts", label: "1X2 & BTTS" },
    { id: "1x2ov", label: "1X2 & OV" },
  ];

  return (
    <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-border">
      {filters.map((filter) => (
        <button
          key={filter.id}
          className={`px-4 py-2 rounded-md font-bold text-sm whitespace-nowrap transition-colors ${
            filter.active
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-foreground hover:bg-muted"
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
};

export default BettingFilters;
