import { Box, CircularProgress } from "@mui/material";

const LoadingScreen = () => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "400px",
      }}
    >
      <CircularProgress />
    </Box>
  );
};

export default LoadingScreen;
