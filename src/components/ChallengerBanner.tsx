const ChallengerBanner = () => {
  return (
    <div className="mx-4 my-4 bg-gradient-to-r from-accent to-purple-600 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-2xl">🏆</div>
        <span className="text-xl font-bold text-accent-foreground italic">
          Challenger Series
        </span>
      </div>
      <button className="bg-accent-foreground text-accent px-6 py-2 rounded-md font-bold hover:bg-opacity-90 transition-colors">
        Join Now
      </button>
    </div>
  );
};

export default ChallengerBanner;
