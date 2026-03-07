"use client";

import React from "react";
import {
  Box,
  Card,
  Table,
  Stack,
  Avatar,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  Typography,
  TableContainer,
  TablePagination,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Paper,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import { useAllUser } from "../hooks/use-all-users";
import { UserDT } from "@/types/user";

const UserView = () => {
  const {
    users,
    meta,
    isLoading,
    isFetching,
    page,
    limit,
    search,
    setPage,
    setLimit,
    setSearch,
    refetch,
  } = useAllUser();

  // Handle Page Change (MUI is 0-indexed, API is 1-indexed)
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage + 1);
  };

  // Handle Limit Change
  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setLimit(parseInt(event.target.value, 10));
    setPage(1); // Reset to first page
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header Section */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 4 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Users
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your application users and permissions.
          </Typography>
        </Box>
        <Box>{/* Add "Create User" button here if needed */}</Box>
      </Stack>

      {/* Filter & Action Bar */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            fullWidth
            placeholder="Search user by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ maxWidth: 500 }}
          />
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Refresh List">
            <IconButton onClick={refetch} disabled={isFetching}>
              <RefreshIcon
                sx={{
                  animation: isFetching ? "spin 1s linear infinite" : "none",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              />
            </IconButton>
          </Tooltip>
        </Stack>
      </Card>

      {/* Data Table */}
      <Card>
        <TableContainer>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Stats</TableCell>
                <TableCell>Joined</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                // Loading Skeleton (Simple version)
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                // Empty State
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                    <Typography variant="body1" color="text.secondary">
                      No users found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                // User Rows
                users.map((user: any) => (
                  <TableRow hover key={user.id}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar
                          src={user.avatarUrl || ""}
                          alt={user.name || "User"}
                          sx={{ width: 40, height: 40 }}
                        >
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 600 }}
                          >
                            {user.name || "Unknown Name"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {user.email}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={user.role}
                        size="small"
                        color={user.role === "ADMIN" ? "primary" : "default"}
                        variant={user.role === "ADMIN" ? "filled" : "outlined"}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={user.status ? "Active" : "Inactive"}
                        size="small"
                        color={user.status ? "success" : "error"}
                        sx={{
                          bgcolor: (theme) =>
                            user.status
                              ? theme.palette.mode === "dark"
                                ? "rgba(34, 197, 94, 0.16)"
                                : "rgba(34, 197, 94, 0.16)"
                              : undefined,
                          color: user.status ? "success.main" : undefined,
                        }}
                      />
                    </TableCell>

                    <TableCell align="center">
                      <Stack
                        direction="row"
                        justifyContent="center"
                        spacing={1}
                      >
                        <Tooltip title="Trades">
                          <Chip
                            label={`${user._count?.trades || 0} Trades`}
                            size="small"
                            variant="outlined"
                          />
                        </Tooltip>
                      </Stack>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {format(new Date(user.createdAt), "MMM dd, yyyy")}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Tooltip title="View Details">
                        <IconButton
                          color="primary"
                          // Link to detail page:
                          href={`/dashboard/user/${user.id}`}
                          // Component={Link}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {meta && (
          <TablePagination
            component="div"
            count={meta.total}
            page={page - 1} // Convert 1-based to 0-based
            onPageChange={handleChangePage}
            rowsPerPage={limit}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25]}
          />
        )}
      </Card>
    </Box>
  );
};

export default UserView;
