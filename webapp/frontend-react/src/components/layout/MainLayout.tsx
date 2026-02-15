import { Outlet, Link } from '@tanstack/react-router';
import { Suspense, useState, useEffect } from 'react';
import { ThemeToggle } from './ThemeToggle';
import { LoadingScreen } from './LoadingScreen';
import { useAppConfig } from '@/hooks/useAppConfig';

export function MainLayout() {
  const [isScreenSmall, setIsScreenSmall] = useState(false);
  const { data: config } = useAppConfig();
  const baseUrl = import.meta.env.BASE_URL;

  useEffect(() => {
    const checkScreenSize = () => {
      setIsScreenSmall(window.innerWidth < 960);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return (
    <>
      {/* Mobile Navigation - TODO: Implement if needed */}
      {isScreenSmall && (
        <nav className="bg-cool-gray-900 text-white">
          <div className="p-4">
            <Link to="/dashboard" className="block">
              <img
                src={`${baseUrl}logo/scrutiny-logo-white-text.png`}
                alt="Scrutiny"
                className="h-8"
              />
            </Link>
          </div>
        </nav>
      )}

      {/* Wrapper */}
      <div className="wrapper">
        {/* Header */}
        <div className="header">
          <div className="container">
            <div className="top-bar">
              {/* Logo */}
              <Link to="/dashboard" className="logo">
                <img
                  className="logo-text"
                  src={`${baseUrl}logo/scrutiny-logo-dark-text.png`}
                  alt="Scrutiny"
                />
                <img
                  className="logo-text-on-dark"
                  src={`${baseUrl}logo/scrutiny-logo-white-text.png`}
                  alt="Scrutiny"
                />
              </Link>

              {/* Navigation Links */}
              {!isScreenSmall && (
                <nav className="nav-links ml-8 flex gap-8">
                  <Link
                    to="/dashboard"
                    className="nav-link text-base font-medium px-3 py-1 rounded-md hover:bg-accent hover:text-primary transition-colors"
                    activeProps={{ className: 'text-primary font-semibold bg-accent' }}
                  >
                    S.M.A.R.T
                  </Link>
                  <Link
                    to="/zfs-pools"
                    className="nav-link text-base font-medium px-3 py-1 rounded-md hover:bg-accent hover:text-primary transition-colors"
                    activeProps={{ className: 'text-primary font-semibold bg-accent' }}
                  >
                    ZFS Pools
                  </Link>
                </nav>
              )}

              {/* Spacer */}
              <div className="spacer"></div>

              {/* Version */}
              {config?.version && <code className="text-sm text-muted-foreground mr-3">v{config.version}</code>}

              {/* Theme Toggle */}
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="content">
          <Suspense fallback={<LoadingScreen />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </>
  );
}
