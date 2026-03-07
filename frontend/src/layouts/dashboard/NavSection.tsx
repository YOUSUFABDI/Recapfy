"use client";

import { Box, Button } from "@mui/material";
import Link from "next/link";
import NavItem from "./NavItem";
import { NavLink } from "../nav-config-dashboard";

export default function NavSection({
  links = [],
  onAnyNavClick,
}: {
  links?: NavLink[];
  onAnyNavClick?: () => void;
}) {
  return (
    <Box sx={{ display: "grid", gap: 1 }}>
      {links[0]?.label === "Connect Platform" && (
        <Button
          component={Link}
          href={links[0]?.href}
          startIcon={links[0]?.icon}
          // variant={links[0]?.label === "Connect Platform" ? "contained" : "text"}
          variant="contained"
          sx={{
            borderRadius: "6px",
            fontWeight: 700,
            alignSelf: "stretch",
            justifyContent: "start",
          }}
          onClick={onAnyNavClick}
        >
          {links[0]?.label}
        </Button>
      )}

      {/* {links.slice(1).map((l) => (
        <NavItem
          key={l.href}
          href={l.href}
          label={l.label}
          icon={l.icon}
          onClick={onAnyNavClick}
        />
      ))} */}
      {links[0]?.label === "Connect Platform"
        ? // If first item was the button, slice it off and map the rest
          links
            .slice(1)
            .map((l) => (
              <NavItem
                key={l.href}
                href={l.href}
                label={l.label}
                icon={l.icon}
                onClick={onAnyNavClick}
              />
            ))
        : // If first item was NOT the button, map everything
          links.map((l) => (
            <NavItem
              key={l.href}
              href={l.href}
              label={l.label}
              icon={l.icon}
              onClick={onAnyNavClick}
            />
          ))}
    </Box>
  );
}
