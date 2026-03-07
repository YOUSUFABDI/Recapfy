import { Box } from "@mui/material";

export default function Tag({ text }: { text: string }) {
  return (
    <Box
      sx={{
        px: 1.4,
        py: 0.4,
        borderRadius: 999,
        fontSize: 12,
        bgcolor: (theme) =>
          theme.palette.mode === "dark"
            ? "rgba(124,135,255,0.22)"
            : "rgba(124,135,255,0.12)",
        color: (theme) =>
          theme.palette.mode === "dark"
            ? "#E5E7FF"
            : theme.palette.text.primary,
      }}
    >
      {text}
    </Box>
  );
}
