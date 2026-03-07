"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  Typography,
} from "@mui/material";
import { motion } from "framer-motion";

import { CONFIG } from "../../../global-config";

// Simple animation presets
const fadeInUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

const Faq = () => {
  return (
    <motion.div
      id="faqs"
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
          FAQs answered
        </Typography>
        <Typography variant="h5" fontWeight={700} sx={{ mt: 1, mb: 2 }}>
          Questions traders usually ask.
        </Typography>

        <Stack spacing={1}>
          <FaqItem
            question="Which platforms are supported?"
            answer={`Right now ${CONFIG.appName} supports cTrader. MT4, MT5 and other plaform integrations are in active development and will be rolled out to users as they become available.`}
          />

          <FaqItem
            question="What plans do you offer?"
            answer={`We offer two paid plans: Basic ($10/month) and Pro ($20/month). Basic lets you connect one trading platform and track unlimited accounts with an automated trading journal and deep performance analytics. Pro includes unlimited connected platforms and unlimited accounts, plus AI-generated performance reports.`}
          />

          <FaqItem
            question={`Is ${CONFIG.appName} safe to connect to my trading accounts?`}
            answer={`${CONFIG.appName} connects in read-only mode to platform APIs and only reads your trade history and positions. We do not place trades, withdraw funds, or modify orders.`}
          />

          <FaqItem
            question="How long does it take to connect an account?"
            answer="Most users complete a connection in a few minutes. Once connected, trades sync automatically — new trades will appear in your journal without manual uploads."
          />

          <FaqItem
            question="Can I consolidate multiple accounts?"
            answer="Yes. Pro supports unlimited connected accounts so you can monitor and compare performance across many live and demo accounts from a single dashboard. Basic supports one account."
          />

          <FaqItem
            question="Do you offer refunds?"
            answer="Refunds are handled on a case-by-case basis. If you need a refund, contact support with your account details and we’ll review the request promptly."
          />

          <FaqItem
            question="Where can I get help or report an issue?"
            answer={`Email ${CONFIG.supportEmail}. Please include your email and a short description of the issue — we’ll respond as quickly as possible.`}
          />
        </Stack>
      </Box>
    </motion.div>
  );
};

export default Faq;

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <Accordion
      disableGutters
      sx={{
        borderRadius: "10px !important",
        border: (theme) =>
          `1px solid ${
            theme.palette.mode === "dark"
              ? "rgba(255,255,255,0.06)"
              : "rgba(15,16,32,0.06)"
          }`,
        overflow: "hidden",
        background: (theme) =>
          theme.palette.mode === "dark"
            ? "linear-gradient(135deg, #090A12, #111320)"
            : "linear-gradient(135deg, #FFFFFF, #F6F7FF)",
        boxShadow: "none",
        "&::before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}>
        <Typography variant="subtitle2" fontWeight={600}>
          {question}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body2" color="text.secondary">
          {answer}
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
}
