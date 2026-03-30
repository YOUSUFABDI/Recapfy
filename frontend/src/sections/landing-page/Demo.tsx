"use client";

import { Box, Paper, Typography } from "@mui/material";
import { motion } from "framer-motion";

import { CONFIG } from "../../../global-config";

// Simple animation presets
const fadeInUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

const Demo = () => {
  return (
    <motion.div
      id="demo"
      variants={fadeInUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <Box>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ letterSpacing: 1.2 }}
        >
          Demo
        </Typography>
        <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>
          See how {CONFIG.appName} works.
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, mt: 0.5 }}
        >
          Watch the platform demo.
        </Typography>

        <Paper
          sx={{
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow: (theme) =>
              theme.palette.mode === "dark"
                ? "0 24px 65px rgba(0,0,0,0.75)"
                : "0 24px 60px rgba(15,16,32,0.18)",
            background:
              "radial-gradient(circle at 0% 0%, rgba(124,135,255,0.25), transparent 55%), #050816",
          }}
        >
          <Box
            sx={{
              position: "relative",
              pt: "56.25%", // 16:9
            }}
          >
            <Box
              component="iframe"
              src="https://www.youtube.com/embed/wT-L5v3tUYY"
              title={`${CONFIG.appName} demo`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              sx={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                border: 0,
                display: "block",
              }}
            />
          </Box>
        </Paper>
      </Box>
    </motion.div>
  );
};

export default Demo;
