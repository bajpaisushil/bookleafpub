import { NextResponse, type NextRequest } from "next/server";

// Optimistic routing only: decides where to send people based on the session
// cookie. The token's signature is checked by the API on every request, so a
// forged cookie gets you a page shell and nothing else.

type Role = "AUTHOR" | "ADMIN";

function readSession(request: NextRequest): { role: Role } | null {
  const token = request.cookies.get("bl_session")?.value;
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) return null;
    return payload.role === "ADMIN" || payload.role === "AUTHOR" ? { role: payload.role } : null;
  } catch {
    return null;
  }
}

const homeFor = (role: Role) => (role === "ADMIN" ? "/admin/tickets" : "/author/books");

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = readSession(request);
  const redirect = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (pathname === "/login") {
    return session ? redirect(homeFor(session.role)) : NextResponse.next();
  }

  if (!session) {
    const next = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
    return redirect(`/login${next}`);
  }

  if (pathname === "/") return redirect(homeFor(session.role));
  if (pathname.startsWith("/admin") && session.role !== "ADMIN") return redirect(homeFor(session.role));
  if (pathname.startsWith("/author") && session.role !== "AUTHOR") return redirect(homeFor(session.role));

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/author/:path*", "/admin/:path*"],
};
