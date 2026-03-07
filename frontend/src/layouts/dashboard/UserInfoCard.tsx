"use client";

import {
  Avatar,
  Box,
  IconButton,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { UserDT } from "@/types/user";

type Props = {
  user: UserDT | null;
  onEdit?: () => void;
};

export default function UserInfoCard({ user, onEdit }: Props) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.25,
        borderRadius: "6px",
        borderColor: (t) =>
          t.palette.mode === "dark" ? "divider" : "primary.main",
        bgcolor: (t) =>
          t.palette.mode === "dark"
            ? "rgba(255,255,255,0.03)"
            : "rgba(124,135,255,0.08)",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25}>
        <Avatar
          src={user?.avatarUrl}
          sx={{ width: 38, height: 38, bgcolor: "primary.main" }}
          imgProps={{
            referrerPolicy: "no-referrer", // avoids some googleusercontent referrer blocks
            crossOrigin: "anonymous", // helps when CSP allows it
          }}
        >
          {!user?.avatarUrl && user?.name?.charAt(0)}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800 }}>
            {user?.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {user?.email}
          </Typography>
        </Box>

        <IconButton size="small" onClick={onEdit} aria-label="Edit profile">
          <EditRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Paper>
  );
}
