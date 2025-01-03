import React from "react";
import { styled } from "@mui/material/styles";
import TextField from "@mui/material/TextField";

const CustomTextField = styled(TextField)({
  "& .MuiOutlinedInput-root": {
    width: "400px", // Apply the width directly here
    fontFamily: '"Manrope", sans-serif', // Apply font family
    height: "40px", // Specific height
    "& .MuiOutlinedInput-input": {
      padding: "10px" // Adjust padding to center the text
    }
  },
  "& .MuiInputLabel-root": {
    fontFamily: '"Manrope", sans-serif', // Apply font family to the label
    top: "-5px" // Adjust label position
  },
  "& .MuiInputLabel-outlined": {
    transform: "translate(14px, 14px) scale(1)" // Adjust label transformation for outline variant
  },
  "& .MuiInputLabel-shrink": {
    transform: "translate(14px, -6px) scale(0.75)" // Adjust label transformation when the label is shrunk
  }
});

export default CustomTextField;
