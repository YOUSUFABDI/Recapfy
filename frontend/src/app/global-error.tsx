"use client";

import { Box, Button, Container, Typography } from "@mui/material";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <Container
          sx={{
            py: 10,
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Something went wrong
            </Typography>

            <Typography color="text.secondary" sx={{ mt: 1 }}>
              An unexpected error occurred.
            </Typography>

            <Box
              sx={{ mt: 4, display: "flex", gap: 2, justifyContent: "center" }}
            >
              {/* <Button variant="contained" onClick={reset}>
                Try again
              </Button> */}

              {/* IMPORTANT: no Link component, no functions */}
              <Button variant="outlined" href="/">
                Go home
              </Button>
            </Box>
          </Box>
        </Container>
      </body>
    </html>
  );
}
