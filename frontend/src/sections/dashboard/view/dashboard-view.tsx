import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Grid, // This refers to Grid v2 in MUI v7
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  CreditCard,
  DollarSign,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDashboard } from "../hooks/use-dashboard";

export default function DashboardPageView() {
  const { stats, isLoading, formatCurrency, refetch, theme } = useDashboard();

  if (isLoading) {
    return (
      <Box
        display="flex"
        height="50vh"
        justifyContent="center"
        alignItems="center"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) return <Typography>Error loading dashboard.</Typography>;

  return (
    <Box sx={{ p: 3, maxWidth: 1600, mx: "auto" }}>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={4}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Admin Overview
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Welcome back. Here is what is happening today.
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshCw size={16} />}
          variant="outlined"
          onClick={refetch}
        >
          Refresh
        </Button>
      </Stack>

      {/* KPI Cards */}
      {/* Use 'container' on the parent. 'spacing' is standard. */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <KpiCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={<DollarSign size={24} color={theme.palette.success.main} />}
          subtitle="Lifetime earnings"
        />
        <KpiCard
          title="MRR"
          value={formatCurrency(stats.mrr)}
          icon={<Activity size={24} color={theme.palette.warning.main} />}
          subtitle="Monthly Recurring Revenue"
        />
        <KpiCard
          title="Active Subscriptions"
          value={stats.activeSubscriptions}
          icon={<CreditCard size={24} color={theme.palette.info.main} />}
          subtitle="Current paid users"
        />
        <KpiCard
          title="Total Users"
          value={stats.totalUsers}
          icon={<Users size={24} color={theme.palette.primary.main} />}
          subtitle={`${(stats.usersGrowth || 0).toFixed(1)}% growth this month`}
        />
      </Grid>

      <Grid container spacing={3}>
        {/* Revenue Chart */}
        {/* FIX: Use 'size' prop for MUI v7 Grid instead of item + xs/md */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper
            sx={{ p: 3, height: 400, display: "flex", flexDirection: "column" }}
          >
            <Typography variant="h6" fontWeight="bold" mb={3}>
              Revenue History
            </Typography>
            <Box sx={{ flexGrow: 1, width: "100%", minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.revenueChart || []}>
                  <defs>
                    <linearGradient
                      id="colorRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={theme.palette.primary.main}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={theme.palette.primary.main}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={theme.palette.divider}
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: theme.palette.text.secondary }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: theme.palette.text.secondary }}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      borderRadius: "6px",
                      border: "none",
                      boxShadow: theme.shadows[3],
                    }}
                    formatter={(val: number | undefined) => [
                      val !== undefined ? `$${val}` : "$0",
                      "Revenue",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={theme.palette.primary.main}
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Signups */}
        {/* FIX: Use 'size' prop for MUI v7 Grid */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, height: 400, overflow: "hidden" }}>
            <Typography variant="h6" fontWeight="bold" mb={3}>
              Recent Signups
            </Typography>
            <Stack spacing={2} sx={{ overflowY: "auto", maxHeight: 320 }}>
              {(stats.recentUsers || []).map((user: any) => (
                <Stack
                  key={user.id}
                  direction="row"
                  spacing={2}
                  alignItems="center"
                  sx={{
                    p: 1.5,
                    borderRadius: "6px",
                    "&:hover": { bgcolor: theme.palette.action.hover },
                  }}
                >
                  <Avatar
                    src={user.avatarUrl || undefined}
                    alt={user.name || "U"}
                  />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" fontWeight="600">
                      {user.name || "Unnamed User"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.email}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {user.createdAt
                      ? formatDistanceToNow(new Date(user.createdAt), {
                          addSuffix: true,
                        })
                      : "Unknown"}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

// Subcomponent for Cards
const KpiCard = ({ title, value, icon, subtitle }: any) => (
  // FIX: Use 'size' prop for MUI v7 Grid
  <Grid size={{ xs: 12, sm: 6, md: 3 }}>
    <Paper
      sx={{
        p: 3,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        mb={2}
      >
        <Box
          sx={{
            p: 1.5,
            borderRadius: "50%",
            bgcolor: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.04)",
          }}
        >
          {icon}
        </Box>
      </Stack>
      <Box>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 1, display: "block" }}
        >
          {subtitle}
        </Typography>
      </Box>
    </Paper>
  </Grid>
);
