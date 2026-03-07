"use client";

import { useState } from "react";
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Avatar,
  Chip,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme,
  alpha,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import {
  ContentCopy as CopyIcon,
  Email as EmailIcon,
  CalendarMonth as CalendarIcon,
  Security as SecurityIcon,
  CreditCard as CreditCardIcon,
  ShowChart as ChartIcon,
  Hub as HubIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  AccessTime as PendingIcon,
  Diamond as DiamondIcon,
  Verified as VerifiedIcon,
  AutoAwesome as MagicIcon,
  Block as BlockIcon,
  Edit as EditIcon, // Added Edit Icon
} from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { UserDetails } from "../types/types";
import { toast } from "sonner";
import {
  useToggleUserAccessMutation,
  useChangeUserRoleMutation, // Import the new hook
} from "@/store/admin/admin";

// --- Helper Components ---
const StatusChip = ({ status }: { status: string }) => {
  const theme = useTheme();
  let color = theme.palette.text.secondary;
  let bg = theme.palette.action.hover;
  let icon = <PendingIcon fontSize="small" />;

  const s = status?.toUpperCase();

  if (["ACTIVE", "FINISHED", "PAID"].includes(s)) {
    color = theme.palette.success.main;
    bg = alpha(theme.palette.success.main, 0.1);
    icon = <CheckIcon fontSize="small" />;
  } else if (["CANCELED", "FAILED", "EXPIRED"].includes(s)) {
    color = theme.palette.error.main;
    bg = alpha(theme.palette.error.main, 0.1);
    icon = <CancelIcon fontSize="small" />;
  } else if (["PENDING", "PAUSED"].includes(s)) {
    color = theme.palette.warning.main;
    bg = alpha(theme.palette.warning.main, 0.1);
  }

  return (
    <Chip
      label={status}
      size="small"
      icon={icon}
      sx={{
        fontWeight: 700,
        color: color,
        backgroundColor: bg,
        border: `1px solid ${alpha(color, 0.2)}`,
        "& .MuiChip-icon": { color: "inherit" },
      }}
    />
  );
};

const SectionCard = ({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) => {
  return (
    <Paper sx={{ p: 3, height: "100%" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={3}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {icon && <Box sx={{ color: "text.secondary" }}>{icon}</Box>}
          <Typography variant="h6">{title}</Typography>
        </Stack>
        {action}
      </Stack>
      {children}
    </Paper>
  );
};

// --- Main View Component ---

type Props = {
  user: UserDetails | null;
};

const UserDetailView = ({ user }: Props) => {
  const theme = useTheme();

  // State for Access Toggle
  const [openConfirm, setOpenConfirm] = useState(false);

  // State for Role Change
  const [openRoleDialog, setOpenRoleDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("");

  // RTK Mutations
  const [toggleAccess, { isLoading: isAccessLoading }] =
    useToggleUserAccessMutation();
  const [changeRole, { isLoading: isRoleLoading }] =
    useChangeUserRoleMutation();

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography color="text.secondary">User not found.</Typography>
      </Container>
    );
  }

  // Derived Data
  const hasAccess = user.hasAccess;
  const activeSubscription = user.subscriptions?.[0] || null;
  const payments = activeSubscription?.payments || [];
  const joinedDate = new Date(user.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    toast.success("User ID copied");
  };

  // --- Handlers ---

  const handleToggleAccess = async () => {
    try {
      await toggleAccess({ userId: user.id }).unwrap();
      toast.success(
        hasAccess
          ? "Access revoked successfully"
          : "Free access granted successfully",
      );
      setOpenConfirm(false);
    } catch (error) {
      toast.error("Failed to update access.");
      console.error(error);
    }
  };

  const handleOpenRoleDialog = () => {
    setSelectedRole(user.role || "USER");
    setOpenRoleDialog(true);
  };

  const handleRoleChange = async () => {
    if (!selectedRole) return;
    try {
      await changeRole({
        userId: user.id,
        role: selectedRole as "USER" | "ADMIN",
      }).unwrap();

      toast.success(`Role updated to ${selectedRole}`);
      setOpenRoleDialog(false);
    } catch (error) {
      toast.error("Failed to update role");
      console.error(error);
    }
  };

  // --- Dynamic UI Variables ---
  const dialogTitle = hasAccess
    ? "Revoke Free Access?"
    : "Grant Lifetime Access?";
  const dialogDescription = hasAccess ? (
    <>
      Are you sure you want to <strong>remove access</strong> for{" "}
      <strong>{user.name || user.email}</strong>?
    </>
  ) : (
    <>
      Are you sure you want to give <strong>{user.name || user.email}</strong>{" "}
      full access to the platform?
    </>
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* 1. HEADER SECTION */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid>
            <Avatar
              src={user.avatarUrl}
              alt={user.name || "User"}
              sx={{
                width: 100,
                height: 100,
                borderRadius: "6px",
                fontSize: "2.5rem",
                bgcolor: "primary.main",
                boxShadow: theme.shadows[3],
              }}
            >
              {(user.name || user.email || "U").charAt(0).toUpperCase()}
            </Avatar>
          </Grid>

          <Grid size="grow">
            <Stack spacing={1}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={2}
              >
                <Typography variant="h4">
                  {user.name || "Unnamed User"}
                </Typography>

                {/* ROLE CHIP WITH EDIT BUTTON */}
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Chip
                    label={user.role || "USER"}
                    color={user.role === "ADMIN" ? "secondary" : "default"}
                    size="small"
                    variant={user.role === "ADMIN" ? "filled" : "outlined"}
                    sx={{ fontWeight: "bold" }}
                  />
                  <Tooltip title="Change Role">
                    <IconButton
                      size="small"
                      onClick={handleOpenRoleDialog}
                      sx={{
                        opacity: 0.5,
                        "&:hover": { opacity: 1, color: "primary.main" },
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>

                {hasAccess && (
                  <Chip
                    icon={<DiamondIcon />}
                    label="Free Access"
                    color="success"
                    size="small"
                    variant="filled"
                    sx={{ fontWeight: "bold" }}
                  />
                )}
              </Stack>

              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontFamily: "monospace" }}
                >
                  ID: {user.id}
                </Typography>
                <Tooltip title="Copy ID">
                  <IconButton size="small" onClick={handleCopyId}>
                    <CopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 1, sm: 3 }}
                color="text.secondary"
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <EmailIcon fontSize="small" />
                  <Typography variant="body2">{user.email}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <CalendarIcon fontSize="small" />
                  <Typography variant="body2">Joined {joinedDate}</Typography>
                </Stack>
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* 2. LEFT COLUMN */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3}>
            {/* Quick Stats */}
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" mb={2}>
                Activity Overview
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Stack
                    p={2}
                    bgcolor={alpha(theme.palette.primary.main, 0.05)}
                    borderRadius="6px"
                    alignItems="center"
                  >
                    <HubIcon color="primary" sx={{ mb: 1 }} />
                    <Typography variant="h4" fontWeight="bold">
                      {user._count?.ctraderConnections || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Connections
                    </Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Stack
                    p={2}
                    bgcolor={alpha(theme.palette.secondary.main, 0.05)}
                    borderRadius="6px"
                    alignItems="center"
                  >
                    <ChartIcon color="secondary" sx={{ mb: 1 }} />
                    <Typography variant="h4" fontWeight="bold">
                      {user._count?.trades || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total Trades
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
            </Paper>

            {/* SUBSCRIPTION SECTION */}
            <SectionCard
              title={hasAccess ? "Free Access Active" : "Current Plan"}
              icon={hasAccess ? <DiamondIcon /> : <CreditCardIcon />}
              action={
                <Button
                  startIcon={hasAccess ? <BlockIcon /> : <MagicIcon />}
                  variant="contained"
                  color={hasAccess ? "error" : "inherit"}
                  size="small"
                  onClick={() => setOpenConfirm(true)}
                  sx={
                    !hasAccess
                      ? {
                          bgcolor: theme.palette.text.primary,
                          color: theme.palette.background.paper,
                          "&:hover": {
                            bgcolor: alpha(theme.palette.text.primary, 0.8),
                          },
                        }
                      : {}
                  }
                >
                  {hasAccess ? "Revoke Access" : "Grant Free Access"}
                </Button>
              }
            >
              {/* Content same as before... */}
              {hasAccess ? (
                <Stack
                  spacing={2}
                  alignItems="center"
                  textAlign="center"
                  py={1}
                >
                  <Avatar
                    sx={{
                      width: 56,
                      height: 56,
                      bgcolor: "success.main",
                      color: "common.white",
                    }}
                  >
                    <VerifiedIcon fontSize="medium" />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Lifetime Access Granted
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      User has full platform capabilities.
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <>
                  {activeSubscription ? (
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Plan Name
                        </Typography>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Typography variant="h6">
                            {activeSubscription.plan?.name || "Unknown Plan"}
                          </Typography>
                          <StatusChip status={activeSubscription.status} />
                        </Stack>
                      </Box>
                      <Divider />
                      <Stack direction="row" justifyContent="space-between">
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Cost
                          </Typography>
                          <Typography variant="body2">
                            ${activeSubscription.plan?.priceMonthly} / Month
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="caption" color="text.secondary">
                            Renews
                          </Typography>
                          <Typography variant="body2">
                            {new Date(
                              activeSubscription.currentPeriodEnd,
                            ).toLocaleDateString()}
                          </Typography>
                        </Box>
                      </Stack>
                    </Stack>
                  ) : (
                    <Stack
                      alignItems="center"
                      justifyContent="center"
                      spacing={2}
                      sx={{ py: 3, opacity: 0.6 }}
                    >
                      <CreditCardIcon fontSize="large" color="inherit" />
                      <Typography variant="body2">
                        No active subscription
                      </Typography>
                    </Stack>
                  )}
                </>
              )}
            </SectionCard>
          </Stack>
        </Grid>

        {/* 3. RIGHT COLUMN: Details & History */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* ... Content same as before (Security & Payments) ... */}
          <Stack spacing={3}>
            {/* Account Security / Info */}
            <SectionCard title="Security & Info" icon={<SecurityIcon />}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>
                    <Typography>{user.email}</Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      Google Account
                    </Typography>
                    <Typography>
                      {user.googleId ? "Linked" : "Not Linked"}
                    </Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      Password Set
                    </Typography>
                    <Typography>{user.hasPassword ? "Yes" : "No"}</Typography>
                  </Stack>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      Last Updated
                    </Typography>
                    <Typography>
                      {new Date(user.updatedAt).toLocaleString()}
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
            </SectionCard>

            {/* Payment History */}
            {!hasAccess && (
              <SectionCard title="Payment History" icon={<CreditCardIcon />}>
                {payments.length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Gateway</TableCell>
                          <TableCell align="right">Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payments.map((payment) => (
                          <TableRow key={payment.id} hover>
                            <TableCell>
                              {new Date(payment.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              ${Number(payment.amount)}{" "}
                              <Typography
                                component="span"
                                variant="caption"
                                color="text.secondary"
                              >
                                {payment.currency.toUpperCase()}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ textTransform: "capitalize" }}>
                              {payment.gateway.toLowerCase()}
                            </TableCell>
                            <TableCell align="right">
                              <StatusChip status={payment.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Box
                    sx={{
                      p: 4,
                      textAlign: "center",
                      color: "text.secondary",
                      border: "1px dashed",
                      borderColor: "divider",
                      borderRadius: "6px",
                    }}
                  >
                    <Typography variant="body2">
                      No payment history available
                    </Typography>
                  </Box>
                )}
              </SectionCard>
            )}
          </Stack>
        </Grid>
      </Grid>

      {/* --- DIALOG 1: ACCESS CONFIRMATION --- */}
      <Dialog
        open={openConfirm}
        onClose={() => !isAccessLoading && setOpenConfirm(false)}
        PaperProps={{ sx: { borderRadius: 2, p: 1 } }}
        sx={{
          "& .MuiBackdrop-root": {
            backdropFilter: "blur(5px)",
            backgroundColor: "rgba(0, 0, 0, 0.2)",
          },
        }}
      >
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>{dialogDescription}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenConfirm(false)}
            disabled={isAccessLoading}
          >
            Cancel
          </Button>
          <LoadingButton
            onClick={handleToggleAccess}
            loading={isAccessLoading}
            variant="contained"
            color={hasAccess ? "error" : "success"}
          >
            {hasAccess ? "Confirm Revoke" : "Confirm Grant"}
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* --- DIALOG 2: CHANGE ROLE (NEW) --- */}
      <Dialog
        open={openRoleDialog}
        onClose={() => !isRoleLoading && setOpenRoleDialog(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 2, p: 1 } }}
        sx={{
          "& .MuiBackdrop-root": {
            backdropFilter: "blur(5px)",
            backgroundColor: "rgba(0, 0, 0, 0.2)",
          },
        }}
      >
        <DialogTitle>Change User Role</DialogTitle>
        <DialogContent>
          <Box pt={1}>
            <DialogContentText sx={{ mb: 2 }}>
              Select the new role for <strong>{user.name}</strong>. Admins have
              full access to the dashboard.
            </DialogContentText>
            <FormControl fullWidth>
              <InputLabel id="role-select-label">Role</InputLabel>
              <Select
                labelId="role-select-label"
                value={selectedRole}
                label="Role"
                onChange={(e: SelectChangeEvent) =>
                  setSelectedRole(e.target.value)
                }
              >
                <MenuItem value="USER">User</MenuItem>
                <MenuItem value="ADMIN">Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenRoleDialog(false)}
            disabled={isRoleLoading}
          >
            Cancel
          </Button>
          <LoadingButton
            onClick={handleRoleChange}
            loading={isRoleLoading}
            variant="contained"
            color="primary"
          >
            Update Role
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserDetailView;
