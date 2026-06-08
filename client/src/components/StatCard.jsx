import { Card, CardContent, Stack, Typography, Box } from "@mui/material";
import { alpha } from "@mui/material/styles";

export default function StatCard({ title, value, icon, accent = "primary.main" }) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 44,
              height: 44,
              display: "grid",
              placeItems: "center",
              borderRadius: 2,
              bgcolor: (theme) => {
                const [paletteKey, shade = "main"] = accent.split(".");
                const color = theme.palette[paletteKey]?.[shade] || accent;
                return alpha(color, 0.12);
              },
              color: accent
            }}
          >
            {icon}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography color="text.secondary" variant="body2">
              {title}
            </Typography>
            <Typography variant="h5" fontWeight={900}>
              {value}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
