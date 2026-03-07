"use client";

import * as React from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Paper,
  Stack,
  Typography,
  Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import PowerSettingsNewRoundedIcon from "@mui/icons-material/PowerSettingsNew";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import type { AccountDT } from "@/types/account";

type AccountLabel =
  | string
  | {
      broker?: string;
      isLive?: boolean;
      login?: string;
      label?: string;
      onClick?: () => void;
      _key?: string;
    };

type Props = {
  title: string;
  subtitle?: string;
  onManage?: () => void;
  onDisconnectAll?: () => void;
  accounts?: AccountLabel[];
  maxVisible?: number;
  data: AccountDT[];
  isSyncing?: boolean;
  lastUpdated?: number | null;
};

function toDisplayParts(a: AccountLabel) {
  if (typeof a === "string") {
    const label = a;
    return {
      key: label,
      label,
      isLive: /live/i.test(a),
      brokerLetter: a.trim().charAt(0).toUpperCase() || "A",
      onClick: undefined as undefined | (() => void),
    };
  }
  const label =
    a.label ??
    `${a.broker ?? "Broker"} - ${a.isLive ? "Live" : "Demo"} - ${
      a.login ?? ""
    }`;

  return {
    key: a._key ?? a.login ?? label,
    label,
    isLive: !!a.isLive,
    brokerLetter: (a.broker?.[0] ?? "A").toUpperCase(),
    onClick: a.onClick,
  };
}

export default function ConnectedPlatformCard({
  title,
  subtitle = "Connected",
  onManage,
  onDisconnectAll,
  accounts = [],
  maxVisible = 6,
  data,
}: Props) {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? accounts : accounts.slice(0, maxVisible);
  const remaining = Math.max(accounts.length - visible.length, 0);

  return (
    <Paper
      sx={(t) => {
        const brand = t.palette.brand?.main ?? t.palette.primary.main;
        const brandContrast =
          t.palette.brand?.contrastText ?? t.palette.primary.contrastText;
        return {
          p: 2,
          borderRadius: "6px",
          background: `linear-gradient(135deg, ${alpha(
            brand,
            0.45
          )} 0%, ${alpha(brand, 0.85)} 100%)`,
          color: brandContrast,
          position: "relative",
          height: "100%",
          display: "flex",
          overflow: "hidden",
        };
      }}
    >
      <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              color: "inherit",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={title}
          >
            {title}
          </Typography>
          {/* <Chip
            label={subtitle}
            size="small"
            color="success"
            sx={{
              fontWeight: 700,
              borderRadius: "6px",
              bgcolor: (t) => alpha(t.palette.success.main, 0.15),
              color: "inherit",
              border: (t) => `1px solid ${alpha(t.palette.common.white, 0.25)}`,
            }}
          /> */}
        </Box>

        {/* List */}
        <Box
          sx={(t) => ({
            mt: 0.5,
            borderRadius: "6px",
            backgroundColor: alpha(t.palette.common.black, 0.18),
            backdropFilter: "blur(6px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: accounts.length ? 140 : 84,
            maxHeight: 240,
          })}
        >
          <List
            dense
            sx={{
              py: 0.5,
              overflowY: "auto",
              "&::-webkit-scrollbar": { height: 8, width: 8 },
              "&::-webkit-scrollbar-thumb": (t) => ({
                background: alpha(t.palette.common.white, 0.25),
                borderRadius: "6px",
              }),
            }}
          >
            {visible.map((acc) => {
              const p = toDisplayParts(acc);
              return (
                <ListItem
                  key={p.key}
                  sx={{
                    px: 1,
                    py: 0.5,
                    "&:hover": {
                      backgroundColor: (t) =>
                        alpha(t.palette.common.white, 0.06),
                    },
                    cursor: p.onClick ? "pointer" : "default",
                    transition: "background-color 120ms ease",
                  }}
                  onClick={p.onClick}
                  secondaryAction={
                    <Chip
                      label={p.isLive ? "Live" : "Demo"}
                      size="small"
                      sx={(t) => ({
                        height: 22,
                        fontSize: 12,
                        borderRadius: "6px",
                        color: "inherit",
                        bgcolor: alpha(
                          p.isLive
                            ? t.palette.success.main
                            : t.palette.info.main,
                          0.18
                        ),
                        border: `1px solid ${alpha("#fff", 0.2)}`,
                      })}
                    />
                  }
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={(t) => ({
                        width: 28,
                        height: 28,
                        fontSize: 14,
                        bgcolor: alpha(t.palette.common.white, 0.22),
                        color: t.palette.common.white,
                        border: `1px solid ${alpha("#000", 0.2)}`,
                      })}
                    >
                      {p.brokerLetter}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primaryTypographyProps={{
                      noWrap: true,
                      title: p.label,
                      sx: { color: "inherit", fontWeight: 600 },
                    }}
                    primary={p.label}
                  />
                </ListItem>
              );
            })}
          </List>

          {remaining > 0 && !expanded && (
            <>
              <Divider sx={{ opacity: 0.25 }} />
              <Box sx={{ p: 1, display: "flex", justifyContent: "center" }}>
                <Button
                  size="small"
                  onClick={() => setExpanded(true)}
                  startIcon={<AccountTreeRoundedIcon />}
                  sx={{
                    bgcolor: "background.paper",
                    color: "text.primary",
                    fontWeight: 700,
                    borderRadius: "6px",
                    px: 1.5,
                    "&:hover": { bgcolor: "background.default" },
                  }}
                >
                  Show {remaining} more
                </Button>
              </Box>
            </>
          )}
        </Box>

        {/* Actions */}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          {onManage && (
            <Button
              onClick={onManage}
              variant="contained"
              size="small"
              startIcon={<InsightsRoundedIcon />}
              sx={{
                bgcolor: "background.paper",
                color: "text.primary",
                fontWeight: 700,
                borderRadius: "10px",
                "&:hover": { bgcolor: "background.default" },
              }}
            >
              Manage
            </Button>
          )}

          {onDisconnectAll && (
            <Tooltip title="">
              <Button
                onClick={onDisconnectAll}
                variant="outlined"
                size="small"
                startIcon={<PowerSettingsNewRoundedIcon />}
                sx={{
                  color: "inherit",
                  fontWeight: 700,
                  borderRadius: "10px",
                  "&:hover": {
                    borderColor: "background.default",
                    bgcolor: "transparent",
                  },
                }}
              >
                Disconnect
              </Button>
            </Tooltip>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}
