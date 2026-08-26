import { auth } from "@/auth";
import { NextResponse } from "next/server";

const protectedDirectories = [
  "/groups",
  "/members",
  "/all-groups",
  "/all-members",
  "/verification",
  "/community",
];

// Vulnerability scanners hammer these paths thousands of times a day; without
// this check each one renders the full ~251 KB not-found page, which was the
// bulk of our Render bandwidth usage.
const scannerPatterns =
  /\.(php\d?|asp|aspx|jsp|cgi|sql|bak|rar|7z|tar|gz|zip|ini|log|sh|dll|exe)$|\/(wp-[\w-]*|wordpress|phpmyadmin|cgi-bin)(\/|$)|\/\.(?!well-known)[\w.-]+/i;

export default auth((req) => {
  if (scannerPatterns.test(req.nextUrl.pathname)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  if (!req.auth?.user) {
    const url = new URL(req.url);

    if (protectedDirectories.some((dir) => url.pathname.startsWith(dir))) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/sign-in`
      );
    }
  }
});

// Read more: https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
    "/",
    "/groups/:path*",
    "/members/:path*",
    "/all-groups",
    "/all-members",
    "/verification",
    "/community",
  ],
};
