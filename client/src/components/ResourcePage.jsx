import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import http, { getErrorMessage } from "../api/http";
import { inputDateTime } from "../utils/format";

export default function ResourcePage({
  title,
  endpoint,
  columns,
  fields,
  initialValues,
  searchPlaceholder = "Поиск",
  filter,
  filters,
  extraParams = {},
  transformBeforeSubmit,
  rowActions = []
}) {
  const filterConfigs = filters || (filter ? [filter] : []);
  const filterSignature = filterConfigs.map((filterConfig) => filterConfig.queryKey).join("|");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState(() =>
    filterConfigs.reduce((values, filterConfig) => {
      if (filterConfig.defaultValue) values[filterConfig.queryKey] = filterConfig.defaultValue;
      return values;
    }, {})
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState(initialValues);

  const params = useMemo(() => {
    const result = { ...extraParams };
    if (search) result.search = search;
    filterConfigs.forEach((filterConfig) => {
      const value = filterValues[filterConfig.queryKey];
      if (value) result[filterConfig.queryKey] = value;
    });
    return result;
  }, [search, filterSignature, filterValues, extraParams]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await http.get(endpoint, { params });
      setRows(data);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [endpoint, params]);

  const openCreate = () => {
    setEditingRow(null);
    setForm(initialValues);
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    const next = { ...initialValues, ...row };
    fields.forEach((field) => {
      if (field.getValue) next[field.name] = field.getValue(row);
      if (field.type === "datetime-local") next[field.name] = inputDateTime(row[field.name]);
      if (field.type === "date" && row[field.name]) next[field.name] = inputDateTime(row[field.name]).slice(0, 10);
    });
    setEditingRow(row);
    setForm(next);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingRow(null);
  };

  const getFormPayload = () =>
    fields.reduce((payload, field) => {
      payload[field.name] = form[field.name];
      return payload;
    }, {});

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    const formPayload = getFormPayload();
    const payload = transformBeforeSubmit ? transformBeforeSubmit(formPayload, editingRow) : formPayload;

    try {
      if (editingRow) {
        await http.put(`${endpoint}/${editingRow.id}`, payload);
      } else {
        await http.post(endpoint, payload);
      }
      closeDialog();
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const remove = async (row) => {
    if (!window.confirm("Удалить запись?")) return;

    try {
      await http.delete(`${endpoint}/${row.id}`);
      await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  const runRowAction = async (action, row) => {
    try {
      const shouldReload = await action.onClick(row);
      if (shouldReload !== false) await load();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={900}>
            {title}
          </Typography>
        </Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
          {filterConfigs.map((filterConfig) => (
            filterConfig.type === "date" ? (
              <TextField
                key={filterConfig.queryKey}
                label={filterConfig.label}
                type="date"
                size="small"
                value={filterValues[filterConfig.queryKey] || ""}
                onChange={(event) =>
                  setFilterValues((prev) => ({ ...prev, [filterConfig.queryKey]: event.target.value }))
                }
                sx={{ minWidth: filterConfig.minWidth || 180 }}
                InputLabelProps={{ shrink: true }}
              />
            ) : (
              <FormControl size="small" sx={{ minWidth: filterConfig.minWidth || 180 }} key={filterConfig.queryKey}>
                <InputLabel>{filterConfig.label}</InputLabel>
                <Select
                  label={filterConfig.label}
                  value={filterValues[filterConfig.queryKey] || ""}
                  onChange={(event) =>
                    setFilterValues((prev) => ({ ...prev, [filterConfig.queryKey]: event.target.value }))
                  }
                >
                  <MenuItem value="">{filterConfig.emptyLabel || "Все"}</MenuItem>
                  {filterConfig.options.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )
          ))}
          <TextField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            InputProps={{ startAdornment: <SearchIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} /> }}
          />
          <Tooltip title="Обновить">
            <IconButton onClick={load} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
            Добавить
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.field} align={column.align} sx={column.sx}>
                  {column.label}
                </TableCell>
              ))}
              <TableCell align="right">Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id} hover>
                {columns.map((column) => (
                  <TableCell key={column.field} align={column.align} sx={column.sx}>
                    {column.render ? column.render(row) : row[column.field]}
                  </TableCell>
                ))}
                <TableCell align="right">
                  {rowActions
                    .filter((action) => !action.isVisible || action.isVisible(row))
                    .map((action) => (
                      <Tooltip title={action.label} key={action.label}>
                        <IconButton color={action.color || "default"} onClick={() => runRowAction(action, row)}>
                          {action.icon}
                        </IconButton>
                      </Tooltip>
                    ))}
                  <Tooltip title="Редактировать">
                    <IconButton onClick={() => openEdit(row)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Удалить">
                    <IconButton color="error" onClick={() => remove(row)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 5, color: "text.secondary" }}>
                  Записей нет
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "24px",
            overflow: "hidden"
          }
        }}
      >
        <Box component="form" onSubmit={submit}>
          <DialogTitle sx={{ px: 3, py: 2.25, fontSize: 28, fontWeight: 900, textAlign: "center" }}>
            {editingRow ? "Редактирование" : "Новая запись"}
          </DialogTitle>
          <DialogContent dividers sx={{ px: 3, py: 2.5 }}>
            <Grid container spacing={1.75}>
              {fields.map((field) => (
                <Grid item xs={12} md={field.fullWidth ? 12 : 6} key={field.name}>
                  {field.render ? (
                    field.render({ form, setForm, editingRow })
                  ) : field.type === "select" ? (
                    <FormControl fullWidth size="small" required={field.required}>
                      <InputLabel>{field.label}</InputLabel>
                      <Select
                        label={field.label}
                        value={form[field.name] ?? ""}
                        onChange={(event) => setForm((prev) => ({ ...prev, [field.name]: event.target.value }))}
                      >
                        {field.options.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  ) : (
                    <TextField
                      fullWidth
                      required={field.required}
                      label={field.label}
                      type={field.type || "text"}
                      value={form[field.name] ?? ""}
                      onChange={(event) => setForm((prev) => ({ ...prev, [field.name]: event.target.value }))}
                      multiline={field.multiline}
                      minRows={field.multiline ? 2 : undefined}
                      placeholder={field.placeholder}
                      helperText={field.helperText}
                      InputLabelProps={["date", "datetime-local"].includes(field.type) ? { shrink: true } : undefined}
                    />
                  )}
                </Grid>
              ))}
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, bgcolor: "action.hover" }}>
            <Button onClick={closeDialog} sx={{ minWidth: 120, borderRadius: 2.5 }}>
              Отмена
            </Button>
            <Button type="submit" variant="contained" sx={{ minWidth: 150, borderRadius: 2.5 }}>
              Сохранить
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Stack>
  );
}
