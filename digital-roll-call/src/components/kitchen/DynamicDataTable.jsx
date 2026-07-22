import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Button, IconButton, Box, Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

export default function DynamicDataTable({
  columns,
  rows,
  comment,
  readOnly = false,
  onColumnsChange,
  onRowsChange,
  onCommentChange
}) {

  const handleColumnLabelChange = (colId, newLabel) => {
    const newColumns = columns.map(c => c.id === colId ? { ...c, label: newLabel } : c);
    onColumnsChange(newColumns);
  };

  const handleAddColumn = () => {
    const newColId = `col${Date.now()}`;
    const newColumns = [...columns, { id: newColId, label: 'New Column' }];
    onColumnsChange(newColumns);

    const newRows = rows.map(row => ({ ...row, [newColId]: '' }));
    onRowsChange(newRows);
  };

  const handleDeleteColumn = (colId) => {
    const newColumns = columns.filter(c => c.id !== colId);
    onColumnsChange(newColumns);

    const newRows = rows.map(row => {
      const newRow = { ...row };
      delete newRow[colId];
      return newRow;
    });
    onRowsChange(newRows);
  };

  const handleRowCellChange = (rowIndex, colId, value) => {
    const newRows = rows.map((row, rIdx) => {
      if (rIdx === rowIndex) {
        return { ...row, [colId]: value };
      }
      return row;
    });
    onRowsChange(newRows);
  };

  const handleAddRow = () => {
    const newRow = columns.reduce((acc, col) => {
      acc[col.id] = '';
      return acc;
    }, {});
    onRowsChange([...rows, newRow]);
  };

  const handleDeleteRow = (rowIndex) => {
    const newRows = rows.filter((_, rIdx) => rIdx !== rowIndex);
    onRowsChange(newRows);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell key={col.id}>
                  {readOnly ? (
                    <Typography variant="h6">{col.label}</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TextField
                        value={col.label}
                        onChange={(e) => handleColumnLabelChange(col.id, e.target.value)}
                        variant="standard"
                        fullWidth
                      />
                      <IconButton size="small" onClick={() => handleDeleteColumn(col.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </TableCell>
              ))}
              {!readOnly && (
                <TableCell>
                  <Button startIcon={<AddIcon />} onClick={handleAddColumn}>
                    Add Column
                  </Button>
                </TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((col) => (
                  <TableCell key={col.id}>
                    {readOnly ? (
                      row[col.id]
                    ) : (
                      <TextField
                        value={row[col.id] || ''}
                        onChange={(e) => handleRowCellChange(rowIndex, col.id, e.target.value)}
                        variant="standard"
                        fullWidth
                      />
                    )}
                  </TableCell>
                ))}
                {!readOnly && (
                  <TableCell>
                    <IconButton onClick={() => handleDeleteRow(rowIndex)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {!readOnly && (
        <Button startIcon={<AddIcon />} onClick={handleAddRow} sx={{ mt: 2 }}>
          Add Row
        </Button>
      )}

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Comments
        </Typography>
        {readOnly ? (
          <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>{comment || 'No comment.'}</Typography>
        ) : (
          <TextField
            label="Daily Kitchen Notes"
            multiline
            rows={4}
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            variant="outlined"
            fullWidth
          />
        )}
      </Box>
    </Paper>
  );
}


