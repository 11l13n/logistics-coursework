import { useMemo, useState } from "react";
import { Link as RouterLink, Outlet, useLocation } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import BadgeIcon from "@mui/icons-material/Badge";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import BusinessIcon from "@mui/icons-material/Business";
import AssignmentIcon from "@mui/icons-material/Assignment";
import RouteIcon from "@mui/icons-material/Route";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import InsightsIcon from "@mui/icons-material/Insights";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import MapIcon from "@mui/icons-material/Map";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { useAuth } from "../auth/AuthContext";

const drawerWidth = 272;

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: <DashboardIcon />, roles: ["ADMIN", "DISPATCHER", "DRIVER"] },
  { label: "Пользователи", path: "/users", icon: <PeopleIcon />, roles: ["ADMIN"] },
  { label: "Водители", path: "/drivers", icon: <BadgeIcon />, roles: ["ADMIN", "DISPATCHER"] },
  { label: "Автомобили", path: "/vehicles", icon: <DirectionsCarIcon />, roles: ["ADMIN", "DISPATCHER"] },
  { label: "Клиенты", path: "/clients", icon: <BusinessIcon />, roles: ["ADMIN", "DISPATCHER"] },
  { label: "Заявки", path: "/cargo-requests", icon: <AssignmentIcon />, roles: ["ADMIN", "DISPATCHER"] },
  { label: "Планирование", path: "/planning", icon: <MapIcon />, roles: ["ADMIN", "DISPATCHER"] },
  { label: "Маршруты", path: "/routes", icon: <RouteIcon />, roles: ["ADMIN", "DISPATCHER", "DRIVER"] },
  { label: "Путевые листы", path: "/waybills", icon: <ReceiptLongIcon />, roles: ["ADMIN", "DISPATCHER", "DRIVER"] },
  { label: "Мой рейс", path: "/driver", icon: <LocalShippingIcon />, roles: ["DRIVER"] },
  { label: "Отчеты", path: "/reports", icon: <InsightsIcon />, roles: ["ADMIN", "DISPATCHER"] }
];

export default function AppLayout({ mode, onToggleMode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = useMemo(() => navItems.filter((item) => item.roles.includes(user.role)), [user.role]);

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Toolbar sx={{ px: 2.5 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Avatar sx={{ bgcolor: "background.paper", color: "primary.main", width: 38, height: 38 }}>
            <LocalShippingIcon />
          </Avatar>
          <Box>
            <Typography sx={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 26, fontWeight: 700 }}>
              Logistics IS
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(247, 246, 241, 0.6)" }}>
              Планирование перевозок
            </Typography>
          </Box>
        </Stack>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1.25, py: 1.5 }}>
        {items.map((item) => (
          <ListItemButton
            key={item.path}
            component={RouterLink}
            to={item.path}
            selected={location.pathname === item.path}
            sx={{
              borderRadius: 999,
              mb: 0.5,
              color: "rgba(247, 246, 241, 0.82)",
              "& .MuiListItemIcon-root": { color: "rgba(247, 246, 241, 0.72)" },
              "&.Mui-selected": {
                bgcolor: "rgba(247, 246, 241, 0.14)",
                color: "#f7f6f1",
                "& .MuiListItemIcon-root": { color: "#f7f6f1" }
              },
              "&.Mui-selected:hover": { bgcolor: "rgba(247, 246, 241, 0.18)" },
              "&:hover": { bgcolor: "rgba(247, 246, 241, 0.09)" }
            }}
            onClick={() => setMobileOpen(false)}
          >
            <ListItemIcon sx={{ minWidth: 42 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 700 }} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ flex: 1 }} />
      <Divider />
      <Box sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <Avatar sx={{ bgcolor: "background.paper", color: "primary.main", width: 36, height: 36 }}>
            {user.fullName?.charAt(0) || "U"}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" fontWeight={800} noWrap>
              {user.fullName}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(247, 246, 241, 0.6)" }}>
              {user.role}
            </Typography>
          </Box>
          <Tooltip title={mode === "dark" ? "Светлая тема" : "Темная тема"}>
            <IconButton onClick={onToggleMode} sx={{ color: "rgba(247, 246, 241, 0.82)" }}>
              {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Выйти">
            <IconButton onClick={logout} sx={{ color: "rgba(247, 246, 241, 0.82)" }}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          borderBottom: 1,
          borderColor: "divider",
          display: { xs: "block", md: "none" }
        }}
      >
        <Toolbar>
          <IconButton onClick={() => setMobileOpen(true)}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { width: drawerWidth }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": { width: drawerWidth, borderRightStyle: "solid" }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, mt: { xs: 8, md: 0 }, width: { md: `calc(100% - ${drawerWidth}px)` } }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
