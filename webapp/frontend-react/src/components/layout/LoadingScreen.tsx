export function LoadingScreen() {
  const baseUrl = import.meta.env.BASE_URL;

  return (
    <div className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-[var(--loading-bg)] text-white">
      <img
        src={`${baseUrl}logo/scrutiny-logo-white.svg`}
        alt="Scrutiny logo"
        className="w-[120px] max-w-[120px]"
      />

      <div className="flex items-center justify-between mt-10 w-14">
        <div className="w-3 h-3 bg-[var(--loading-accent)] rounded-full animate-bounce-delay-1" />
        <div className="w-3 h-3 bg-[var(--loading-accent)] rounded-full animate-bounce-delay-2" />
        <div className="w-3 h-3 bg-[var(--loading-accent)] rounded-full animate-bounce-delay-3" />
      </div>

      <style>{`
        @keyframes bounce-delay {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1.0);
          }
        }

        .animate-bounce-delay-1 {
          animation: bounce-delay 1s infinite ease-in-out both;
          animation-delay: -0.32s;
        }

        .animate-bounce-delay-2 {
          animation: bounce-delay 1s infinite ease-in-out both;
          animation-delay: -0.16s;
        }

        .animate-bounce-delay-3 {
          animation: bounce-delay 1s infinite ease-in-out both;
        }
      `}</style>
    </div>
  );
}
