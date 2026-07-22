import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { addDays, format, getDay, parse, startOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

const EVENT_TYPE_META = {
  holiday: { label: 'Holiday', color: 'error' },
  midterm: { label: 'Midterm', color: 'warning' },
  trip: { label: 'Trip', color: 'info' },
  other: { label: 'Other', color: 'default' },
};

function toCalendarDate(value) {
  if (!value) return new Date();
  const candidate = new Date(`${value}T00:00:00`);
  return Number.isNaN(candidate.getTime()) ? new Date(value) : candidate;
}

function buildCalendarEvent(rawEvent, theme) {
  const start = toCalendarDate(rawEvent.startDate);
  const endValue = rawEvent.endDate && rawEvent.endDate !== rawEvent.startDate
    ? toCalendarDate(rawEvent.endDate)
    : addDays(start, 1);
  const type = rawEvent.type || 'other';
  const meta = EVENT_TYPE_META[type] || EVENT_TYPE_META.other;
  const colorKey = meta.color;

  let paletteColor = theme.palette.grey[500];
  if (colorKey === 'error') paletteColor = theme.palette.error.main;
  if (colorKey === 'warning') paletteColor = theme.palette.warning.main;
  if (colorKey === 'info') paletteColor = theme.palette.info.main;

  return {
    id: rawEvent.id,
    title: rawEvent.title || 'Event',
    start,
    end: endValue,
    allDay: true,
    resource: { ...rawEvent, color: paletteColor, type },
  };
}

function EventDisplay({ event }) {
  const color = event.resource?.color || 'inherit';
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', overflow: 'hidden' }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
      <Typography variant="caption" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {event.title}
      </Typography>
    </Box>
  );
}

export default function SchoolCalendar({ events = [], readOnly = true, onDateClick, onEventClick, onSaveEvent, onDeleteEvent }) {
  const theme = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftEvent, setDraftEvent] = useState({ title: '', type: 'holiday', startDate: '', endDate: '' });
  const [editMode, setEditMode] = useState(false);
  const [activeEventId, setActiveEventId] = useState(null);

  const calendarEvents = useMemo(() => events.map((event) => buildCalendarEvent(event, theme)), [events, theme]);

  const handleNavigate = (action) => {
    const nextDate = new Date(currentDate);
    if (action === 'PREV') {
      nextDate.setMonth(nextDate.getMonth() - 1);
    } else if (action === 'NEXT') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (action === 'TODAY') {
      nextDate.setTime(new Date());
    }
    setCurrentDate(nextDate);
  };

  const jumpToMonth = (monthIndex, year) => {
    const nextDate = new Date(currentDate);
    nextDate.setFullYear(year);
    nextDate.setMonth(monthIndex);
    setCurrentDate(nextDate);
  };

  const monthOptions = Array.from({ length: 12 }, (_, index) => index);
  const yearOptions = [new Date().getFullYear(), new Date().getFullYear() + 1];

  const openQuickDialog = (date, existingEvent = null) => {
    const isoDate = format(date, 'yyyy-MM-dd');
    if (existingEvent) {
      setEditMode(true);
      setActiveEventId(existingEvent.id);
      setDraftEvent({
        title: existingEvent.title || '',
        type: existingEvent.type || 'holiday',
        startDate: existingEvent.startDate || isoDate,
        endDate: existingEvent.endDate || existingEvent.startDate || isoDate,
      });
    } else {
      setEditMode(false);
      setActiveEventId(null);
      setDraftEvent({
        title: '',
        type: 'holiday',
        startDate: isoDate,
        endDate: isoDate,
      });
    }
    setDialogOpen(true);
  };

  const closeQuickDialog = () => {
    setDialogOpen(false);
    setEditMode(false);
    setActiveEventId(null);
    setDraftEvent({ title: '', type: 'holiday', startDate: '', endDate: '' });
  };

  const saveDraft = () => {
    if (!draftEvent.title || !draftEvent.startDate) return;
    const payload = {
      title: draftEvent.title,
      type: draftEvent.type,
      startDate: draftEvent.startDate,
      endDate: draftEvent.endDate || draftEvent.startDate,
    };
    if (editMode && activeEventId) {
      onSaveEvent?.({ ...payload, id: activeEventId });
    } else {
      onSaveEvent?.(payload);
    }
    closeQuickDialog();
  };

  const deleteDraft = () => {
    if (editMode && activeEventId) {
      onDeleteEvent?.(activeEventId);
    }
    closeQuickDialog();
  };

  const Toolbar = ({ date, onNavigate: nav }) => (
    <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center" sx={{ mb: 1.25, flexWrap: 'wrap', gap: 1 }}>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
        <Button size="small" variant="outlined" onClick={() => nav('PREV')} sx={{ minWidth: 32, px: 1 }}>
          ←
        </Button>
        <Button size="small" variant="outlined" onClick={() => nav('NEXT')} sx={{ minWidth: 32, px: 1 }}>
          →
        </Button>
        <Typography variant="subtitle1" fontWeight="600">
          {format(date, 'MMMM yyyy')}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexWrap: 'wrap', gap: 0.75 }}>
        <FormControl size="small" sx={{ minWidth: 96 }}>
          <InputLabel id="month-select-label">Month</InputLabel>
          <Select
            labelId="month-select-label"
            value={date.getMonth()}
            label="Month"
            onChange={(event) => jumpToMonth(Number(event.target.value), date.getFullYear())}
          >
            {monthOptions.map((month) => (
              <MenuItem key={month} value={month}>
                {format(new Date(date.getFullYear(), month, 1), 'MMM')}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 88 }}>
          <InputLabel id="year-select-label">Year</InputLabel>
          <Select
            labelId="year-select-label"
            value={date.getFullYear()}
            label="Year"
            onChange={(event) => jumpToMonth(date.getMonth(), Number(event.target.value))}
          >
            {yearOptions.map((year) => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
    </Stack>
  );

  return (
    <Box>
      <Box
        sx={{
          '& .rbc-calendar': { minHeight: 540, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, p: 0.75 },
          '& .rbc-toolbar': { display: 'none' },
          '& .rbc-header': { padding: '6px 2px', backgroundColor: theme.palette.action.hover, color: theme.palette.text.secondary, textTransform: 'uppercase', fontSize: '0.72rem' },
          '& .rbc-month-view': { borderColor: theme.palette.divider },
          '& .rbc-date-cell': { padding: '2px' },
          '& .rbc-date-cell > a': { fontSize: '0.8rem' },
          '& .rbc-off-range-bg': { backgroundColor: theme.palette.action.hover },
          '& .rbc-today': { backgroundColor: theme.palette.primary.light + '22' },
          '& .rbc-event': {
            backgroundColor: theme.palette.background.paper,
            border: 'none',
            color: theme.palette.text.primary,
            borderRadius: 999,
            padding: '2px 6px',
            boxShadow: `0 1px 3px ${theme.palette.action.hover}`,
          },
          '& .rbc-event-label': { display: 'none' },
          '& .rbc-button-link': { color: theme.palette.text.primary },
        }}
      >
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          date={currentDate}
          view="month"
          views={['month']}
          onNavigate={handleNavigate}
          toolbar
          components={{ toolbar: Toolbar, event: EventDisplay }}
          onSelectSlot={readOnly ? undefined : (slotInfo) => openQuickDialog(slotInfo.start)}
          onSelectEvent={readOnly ? undefined : (event) => openQuickDialog(toCalendarDate(event.start), event.resource)}
          selectable={!readOnly}
          popup={false}
          step={60}
          timeslots={1}
          defaultView="month"
          formats={{ dayFormat: 'EEE' }}
          allDayAccessor="allDay"
          startAccessor="start"
          endAccessor="end"
        />
      </Box>

      <Dialog open={dialogOpen} onClose={closeQuickDialog} fullWidth maxWidth="xs">
        <DialogTitle>{editMode ? 'Edit event' : 'Add event'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" fullWidth value={draftEvent.title} onChange={(event) => setDraftEvent({ ...draftEvent, title: event.target.value })} />
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={draftEvent.type} label="Type" onChange={(event) => setDraftEvent({ ...draftEvent, type: event.target.value })}>
                <MenuItem value="holiday">Holiday</MenuItem>
                <MenuItem value="midterm">Midterm</MenuItem>
                <MenuItem value="trip">Trip</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Start date" type="date" fullWidth value={draftEvent.startDate} onChange={(event) => setDraftEvent({ ...draftEvent, startDate: event.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField label="End date" type="date" fullWidth value={draftEvent.endDate} onChange={(event) => setDraftEvent({ ...draftEvent, endDate: event.target.value })} InputLabelProps={{ shrink: true }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Stack direction="row" spacing={1} sx={{ flexGrow: 1, justifyContent: 'space-between' }}>
            {editMode ? <Button color="error" onClick={deleteDraft}>Delete</Button> : <Box />}
            <Stack direction="row" spacing={1}>
              <Button onClick={closeQuickDialog}>Cancel</Button>
              <Button variant="contained" onClick={saveDraft}>Save</Button>
            </Stack>
          </Stack>
        </DialogActions>
      </Dialog>

      <Stack direction="row" spacing={1.5} sx={{ mt: 1.5, flexWrap: 'wrap' }}>
        {Object.entries(EVENT_TYPE_META).map(([type, meta]) => (
          <Stack key={type} direction="row" spacing={0.75} alignItems="center">
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor:
                  meta.color === 'error' ? theme.palette.error.main :
                  meta.color === 'warning' ? theme.palette.warning.main :
                  meta.color === 'info' ? theme.palette.info.main : theme.palette.grey[500],
              }}
            />
            <Typography variant="caption">{meta.label}</Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
