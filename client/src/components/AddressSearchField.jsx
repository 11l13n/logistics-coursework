import { useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import http, { getErrorMessage } from "../api/http";

export default function AddressSearchField({
  label,
  value,
  onChange,
  onSelect,
  required = false,
  helperText,
  placeholder,
  multiline = false,
  minRows = 1,
  maxRows = 3
}) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const search = async () => {
    const query = String(value || "").trim();
    setError("");
    setSearched(false);
    if (query.length < 3) {
      setError("Введите не менее 3 символов адреса");
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data } = await http.get("/geocoding/search", { params: { q: query } });
      setResults(data);
      setSearched(true);
    } catch (requestError) {
      setResults([]);
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const selectResult = (place) => {
    setResults([]);
    setSearched(false);
    onSelect(place);
  };

  return (
    <Stack spacing={1}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="flex-start">
        <TextField
          label={label}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              search();
            }
          }}
          required={required}
          fullWidth
          placeholder={placeholder}
          helperText={helperText}
          multiline={multiline}
          minRows={multiline ? minRows : undefined}
          maxRows={multiline ? maxRows : undefined}
        />
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={18} /> : <SearchIcon />}
          onClick={search}
          disabled={loading}
          sx={{ height: 44, minWidth: { xs: "100%", sm: 104 }, px: 2, flexShrink: 0, borderRadius: 2.5 }}
        >
          Найти
        </Button>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {searched && !results.length && !error && <Alert severity="info">Адрес не найден</Alert>}

      {results.length > 0 && (
        <Paper variant="outlined">
          <List dense disablePadding>
            {results.map((place) => (
              <ListItemButton key={place.id} onClick={() => selectResult(place)}>
                <ListItemText primary={place.address} />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}
    </Stack>
  );
}
