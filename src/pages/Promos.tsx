
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PROMOS_KEY = "betting_promos";

export const getPromos = () => {
  const stored = localStorage.getItem(PROMOS_KEY);
  if (stored) return JSON.parse(stored);
  return [];
};

export const savePromos = (promos: any[]) => {
  localStorage.setItem(PROMOS_KEY, JSON.stringify(promos));
};

const Promos = () => {
  const [promos, setPromos] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setPromos(getPromos());
  }, []);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex flex-col gap-4 mb-4">
        <Button variant="ghost" onClick={() => navigate("/")} className="w-fit">
          ← Back to Betting
        </Button>
        <h2 className="text-2xl font-bold">Promotions</h2>
      </div>
      {promos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl mb-4">🎁</span>
          <div className="text-muted-foreground mb-2 text-lg">No promos available right now.</div>
          <div className="text-muted-foreground text-sm">Check back soon for exciting offers!</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {promos.map((promo, idx) => (
            <div key={idx} className="p-5 bg-card rounded-xl shadow border hover:scale-[1.02] transition flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-3xl">🎉</span>
                <span className="font-bold text-primary text-lg">{promo.title}</span>
              </div>
              <div className="text-foreground mb-1">{promo.description}</div>
              {promo.link && <a href={promo.link} className="text-blue-600 underline font-medium" target="_blank" rel="noopener noreferrer">Learn more</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Promos;
