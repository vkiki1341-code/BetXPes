import { Trophy, BarChart3, Gift, FileText, Info } from "lucide-react";


import { useNavigate, useLocation } from "react-router-dom";

const NavigationTabs = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const tabs = [
    { id: "market", label: "Market", icon: Trophy, path: "/" },
    { id: "mybets", label: "My Bets", icon: FileText, path: "/mybets" },
  ];

  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-card border-b border-border">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path || (tab.id === "market" && location.pathname === "/");
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors relative ${
              isActive
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="text-sm font-medium">{tab.label}</span>
            {tab.badge && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center text-xs font-bold">
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
      <button className="ml-auto p-2 rounded-full bg-accent text-accent-foreground">
        <Info className="w-5 h-5" />
      </button>
    </div>
  );
};

export default NavigationTabs;
