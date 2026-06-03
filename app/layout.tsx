import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { createClient } from "../utils/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lyft Matrix System",
  description: "Unified Gym & Logistics Management Floor",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createClient();
  
  // 1. Get the current logged-in user session
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Fetch their operational department if they are logged in
  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("department")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  const isTrucking = profile?.department === "lyft_trucking";

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-slate-50 text-slate-900 m-0 p-0 font-sans">
        
        {/* --- SHOW SIDEBAR ONLY IF USER IS LOGGED IN --- */}
        {user ? (
          <div className="flex w-full min-h-screen">
            
            {/* UNIFIED SIDEBAR COMPONENT */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between p-5 border-r border-slate-800 shrink-0">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold tracking-wider text-white">Lyft Matrix</h2>
                  <p className="text-xs text-slate-400 mt-1 truncate">{user.email}</p>
                </div>

                <nav className="flex flex-col space-y-1">
                  {/* COMMON LINKS AVAILABLE TO EVERYONE */}
                  <a href="/dashboard" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 transition text-white no-underline">
                    🏠 Home Dashboard
                  </a>

                  {/* DYNAMIC GYM OPERATIONS SECTION */}
                  {profile?.department === "gym_operations" && (
                    <>
                      <div className="pt-4 pb-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gym Operations</div>
                      <a href="/members" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 transition text-slate-300 no-underline">
                        👥 Members Ledger
                      </a>
                      <a href="/checkin" className="flex items-center px-3 py-2 text-sm font-medium rounded-md hover:bg-slate-800 transition text-slate-300 no-underline">
                        🔑 Front Desk Entry
                      </a>
                    </>
                  )}

                  {/* DYNAMIC LYFT TRUCKING MODULES LINKS */}
                  {isTrucking && (
                    <>
                      <div className="pt-4 pb-1 text-xs font-semibold text-amber-500 uppercase tracking-wider border-t border-slate-800 mt-4">
                        Lyft Trucking Logistics
                      </div>
                      <a href="/work-orders" className="flex items-center px-3 py-2 text-sm font-medium text-amber-100 rounded-md bg-amber-500/10 hover:bg-amber-500/20 transition no-underline">
                        🚚 Fleet Work Orders
                      </a>
                      <a href="/trucking-payroll" className="flex items-center px-3 py-2 text-sm font-medium text-amber-100 rounded-md bg-amber-500/10 hover:bg-amber-500/20 transition no-underline">
                        💵 Payroll Audit Panel
                      </a>
                    </>
                  )}
                </nav>
              </div>

              <div className="text-xs text-slate-500 text-center border-t border-slate-800 pt-4">
                v2.4.0 Engine Architecture
              </div>
            </aside>

            {/* LIVE DATA INJECTION VIEWPORT CONTAINER */}
            <main className="flex-1 overflow-y-auto bg-slate-50 p-8">
              {children}
            </main>

          </div>
        ) : (
          /* --- IF NOT LOGGED IN (LOGIN PAGE VIEW) RENDER FULL SCREEN --- */
          <div className="w-full flex flex-col">{children}</div>
        )}
        
      </body>
    </html>
  );
}
