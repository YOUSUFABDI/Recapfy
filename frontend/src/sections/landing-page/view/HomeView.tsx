"use client";

import { Box, Container, Divider } from "@mui/material";

import CTA from "@/sections/landing-page/CTA";
import Demo from "@/sections/landing-page/Demo";
import Faq from "@/sections/landing-page/Faq";
import Features from "@/sections/landing-page/Features";
import Footer from "@/sections/landing-page/Footer";
import Header from "@/sections/landing-page/Header";
import Hero from "@/sections/landing-page/Hero";
import Pricing from "@/sections/landing-page/Pricing";
import ScrollToTopButton from "@/components/ScrollToTopButton";

const HomeView = () => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        scrollBehavior: "smooth", // nice smooth scrolling in supported browsers
        "&::before": {
          content: '""',
          position: "fixed",
          inset: 0,
          opacity: (theme) => (theme.palette.mode === "dark" ? 0.5 : 0.4),
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 0% 0%, rgba(124,135,255,0.18), transparent 55%), radial-gradient(circle at 100% 100%, rgba(124,135,255,0.14), transparent 55%)",
          zIndex: -3,
        },
      }}
    >
      {/* HEADER */}
      <Header />

      {/* HERO*/}
      <Hero />

      {/* FEATURES */}
      <Features />

      {/* PRICING */}
      <Pricing />

      {/* Main content (pricing + rest) */}
      <Container
        maxWidth="md"
        sx={{
          flex: 1,
          py: { xs: 6, md: 9 },
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* DEMO */}
        <Demo />

        {/* FAQ */}
        <Faq />

        {/* CTA */}
        <CTA />

        <Divider sx={{ mt: 4 }} />

        {/* Footer */}
        <Footer />

        <ScrollToTopButton />
      </Container>
    </Box>
  );
};

export default HomeView;
