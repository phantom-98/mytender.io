// src/components/StyledMuiComponents.js
import { MenuItem, Select } from "@mui/material";
import { styled } from "@mui/material";

export const StyledSelect = styled(Select)(({ theme }) => ({
  height: "38px",
  padding: "0 8px",
  backgroundColor: "white",
  border: "none",
  outline: "none",
  boxShadow: "none",
  fontFamily: '"Manrope", sans-serif',
  fontSize: "14px",
  "& .MuiOutlinedInput-notchedOutline": {
    border: "none"
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    border: "none"
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    border: "none"
  },
  "&.MuiOutlinedInput-root": {
    border: "none",
    backgroundColor: "white"
  },
  "& .MuiSelect-select": {
    fontFamily: '"Manrope", sans-serif',
    fontSize: "14px",
    backgroundColor: "white"
  },
  "&:hover": {
    backgroundColor: "white"
  },
  "&.Mui-focused": {
    backgroundColor: "white"
  },
  "& .MuiInputBase-input": {
    backgroundColor: "white"
  },
  // Remove underline
  "&:before": {
    borderBottom: "none !important"
  },
  "&:after": {
    borderBottom: "none !important"
  },
  "&:hover:not(.Mui-disabled):before": {
    borderBottom: "none !important"
  },
  "& .MuiInput-underline:before": {
    borderBottom: "none !important"
  },
  "& .MuiInput-underline:after": {
    borderBottom: "none !important"
  },
  "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
    borderBottom: "none !important"
  }
}));

export const StyledMenuItem = styled(MenuItem)({
  fontFamily: '"Manrope", sans-serif',
  fontSize: "14px"
});
