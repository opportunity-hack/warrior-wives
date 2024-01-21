import type { Metadata } from "next";
import { Box } from "@chakra-ui/react";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import NavBar from "./components/header/header";
import Footer from "./components/footer/footer";
import { ChakraProviders } from "./providers/chakraProvider";

const montserrat = Montserrat({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Warrior Wives",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning suppressContentEditableWarning>
      <body className={montserrat.className}>
        <ChakraProviders>
          <NavBar />
          <Box className="min-h-[70vh] bg-[#FAFCFF] pt-10 pb-10 w-[100%]">
            <div className="max-w-[1440px] m-auto px-[24px] py-[12px]">{children}</div>
          </Box>
          <Footer />
        </ChakraProviders>
      </body>
    </html>
  );
}
