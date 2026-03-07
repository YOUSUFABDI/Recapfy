"use client";

import NextLink from "next/link";

import { Box, Button, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";

// Simple animation presets
const fadeInUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

const CTA = () => {
  return (
    <motion.div
      id="cta"
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <Box sx={{ textAlign: "center", mt: 2 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
          Ready to level up your trading?
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, maxWidth: 460, mx: "auto" }}
        >
          Join traders who track, learn, and improve with one dashboard. Connect
          cTrader to keep your journal, metrics, and AI reports in sync.
        </Typography>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="center"
        >
          <Button
            component={NextLink}
            href="/signup"
            variant="contained"
            size="large"
          >
            Get started
          </Button>
          <Button
            component={NextLink}
            href="/login"
            variant="outlined"
            size="large"
          >
            Sign in
          </Button>
        </Stack>
      </Box>
    </motion.div>
  );
};

export default CTA;
